# Plan: Opción B — Playground KaibanJS como agente OpenClaw vía OpenResponses

> **Objetivo:** Implementar la Vía B del [análisis de integración](../openclaw-kaibanjs-integration-analysis.md) como un **Playground dedicado** en este repo. El Team de KaibanJS se expone en `POST /v1/responses` compatible con OpenResponses; OpenClaw consume ese endpoint como si fuera un proveedor externo.

---

## 1. Alcance del Playground

- **Nombre sugerido:** `playground/openclaw-openresponses` (o `playground/kaiban-openresponses-adapter`).
- **Responsabilidad única:** Servidor HTTP que implementa la API OpenResponses y delega la ejecución a un `Team` de KaibanJS.
- **Consumidor:** OpenClaw (gateway ya levantado) configurado para usar este servidor como backend del agente.

---

## 2. Componentes a implementar

### 2.1 Servidor Express (o Fastify)

- Escuchar en un puerto configurable (ej. `3100`).
- Ruta única de API: `POST /v1/responses`.
- Opcional: `GET /health` para comprobar que el adapter está vivo.
- CORS y `Content-Type: application/json` donde aplique.
- Variables de entorno: `PORT`, `KAIBAN_OPENRESPONSES_SECRET` (token que OpenClaw enviará en `Authorization: Bearer …`).

### 2.2 KaibanOpenResponsesAdapter (lógica del endpoint)

Módulo que:

1. **Request**

   - Acepta el body según [OpenResponses](https://docs.openclaw.ai/gateway/openresponses-http-api): `input` (string o array de ítems), `stream` (boolean), `instructions`, etc.
   - Extrae el “mensaje actual” del usuario:
     - Si `input` es string → usar como mensaje.
     - Si `input` es array → tomar el último ítem de tipo `message` con rol `user` (o el último `function_call_output` si aplica) y usar su contenido como input del Team.
   - Respeta `stream: true/false` para decidir respuesta SSE vs JSON.

2. **Ejecución**

   - Crea (o reutiliza) una instancia del `Team` de KaibanJS definida en el playground.
   - Llama a `team.start({ inputs: { message: userMessage } })` (o un mapa más rico si se desea pasar `instructions` como contexto).
   - Espera la promesa hasta `status === 'FINISHED'` (o ERRORED/BLOCKED).

3. **Respuesta no streaming**

   - Devuelve un JSON tipo OpenResponses:
     - `object: "response"`, `status`, `output` (array de ítems; al menos un ítem de tipo `output_text` con el texto final).
     - `usage`: token counts si KaibanJS los expone (p. ej. desde `workflowLogs` o `stats`); si no, valores por defecto (ej. 0).

4. **Respuesta streaming (SSE)**

   - `Content-Type: text/event-stream`.
   - Suscribirse a `team.subscribeToChanges()` con propiedades relevantes (p. ej. `teamWorkflowStatus`, `workflowLogs`) para emitir eventos de progreso.
   - Eventos mínimos a emitir (según spec OpenResponses):
     - `response.created`
     - `response.output_item.added` / `response.content_part.added`
     - `response.output_text.delta` (opcional: chunks de texto si el team va produciendo salida incremental; si no hay, un único “chunk” con el resultado final).
     - `response.output_text.done`
     - `response.completed`
     - `data: [DONE]`
   - En caso de error: `response.failed` y cerrar stream.

5. **Autenticación**

   - Leer `Authorization: Bearer <token>` y comparar con `KAIBAN_OPENRESPONSES_SECRET`.
   - Si no coincide o falta, responder `401 Unauthorized`.

6. **Errores**
   - 400 si el body es inválido o falta `input`.
   - 401 si el token es inválido.
   - 500 si `team.start()` falla o el workflow termina en ERRORED; body JSON con `error: { message, type }`.

### 2.3 Team de ejemplo en el playground

- Definir un Team sencillo (p. ej. un agente ReAct o un pequeño DAG de tareas) que reciba `message` (o `task`) en `inputs` y devuelva una respuesta de texto en `result`.
- Usar el mismo patrón que en `playground/nodejs-esm` o `playground/react`: Agent + Task(s) + Team, con `env` para API keys (OpenAI, etc.).
- El Team debe ser el que inyecta el adapter al llamar a `team.start({ inputs })`.

### 2.4 Configuración y env

- Archivo `.env.example` con:
  - `PORT=3100`
  - `KAIBAN_OPENRESPONSES_SECRET=<secret compartido con OpenClaw>`
  - `OPENAI_API_KEY` (o las que use el Team).
- Documentar que el mismo secret debe configurarse en OpenClaw como token del agente que apunta a este adapter.

---

## 3. Estructura de carpetas sugerida

```
playground/openclaw-openresponses/
├── package.json
├── tsconfig.json
├── .env.example
├── README.md                    # Cómo ejecutar este playground
├── src/
│   ├── index.ts                 # Arranque Express, registro de rutas
│   ├── adapter.ts               # KaibanOpenResponsesAdapter: parse request, run team, format response
│   ├── sse.ts                   # Utilidades para emitir eventos SSE
│   └── team/
│       └── index.ts             # createTeam(): factory del Team de KaibanJS usado por el adapter
├── OPENCLAW-SETUP.md            # README para quien tiene OpenClaw levantado (pasos en OpenClaw)
└── tests/                       # (opcional) tests de integración del endpoint
```

---

## 4. Orden de implementación sugerido

1. **Scaffold del playground**

   - Crear carpeta, `package.json` (Express, kaibanjs, dotenv, types), `tsconfig.json`, `.env.example`.
   - Punto de entrada `src/index.ts` que levante Express y registre `POST /v1/responses` (handler temporal que devuelva 501 o un mensaje fijo).

2. **Team de ejemplo**

   - Implementar `src/team/index.ts` con un Team mínimo que reciba `message` en inputs y devuelva texto (p. ej. un solo agente con una tarea).

3. **Adapter sin streaming**

   - Implementar en `adapter.ts`: parse del body OpenResponses, extracción del mensaje, llamada a `team.start({ inputs })`, formateo de la respuesta JSON (output_text, usage).
   - Añadir auth por Bearer token en el handler de la ruta.
   - Probar con `curl` sin streaming.

4. **Adapter con streaming**

   - En el mismo `adapter.ts`, si `stream === true`: abrir SSE, suscribirse a `team.subscribeToChanges()`, emitir eventos en el orden esperado por OpenResponses y enviar el texto final en `response.output_text.done` (y opcionalmente deltas si en el futuro el team expone salida incremental).
   - Probar con `curl -N` y `stream: true`.

5. **README del playground**

   - Cómo clonar/instalar, variables de entorno, cómo ejecutar, cómo probar con `curl` (con y sin stream).

6. **OPENCLAW-SETUP.md (README para OpenClaw)**

   - Documentar pasos en el OpenClaw ya levantado: configurar agente con provider openai-compat (o el que use OpenClaw para OpenResponses), endpoint `http://<host>:3100/v1/responses`, auth con el mismo secret, y cómo enviar una prueba (p. ej. desde un canal o desde curl al gateway).

7. **Ajustes y opcionales**
   - Timeouts (evitar que OpenClaw corte antes de que el team termine; documentar `agents.defaults.timeoutSeconds` si aplica).
   - Logging y manejo de errores robusto.
   - Tests de integración opcionales contra `POST /v1/responses`.

---

## 5. Criterios de éxito

- Con OpenClaw configurado según `OPENCLAW-SETUP.md`, un mensaje enviado por un canal (WhatsApp, Telegram, etc.) llega al gateway, OpenClaw llama a `http://<adapter>:3100/v1/responses`, el adapter ejecuta el Team de KaibanJS y la respuesta vuelve al usuario en el canal.
- Con `stream: true`, el cliente recibe eventos SSE y el mensaje final coherente con OpenResponses.
- Con `stream: false`, el cliente recibe un único JSON con `output` y `usage`.

---

## 6. Referencias

- [openclaw-kaibanjs-integration-analysis.md](../openclaw-kaibanjs-integration-analysis.md) — Vía B (sección 4).
- [OpenClaw OpenResponses API](https://docs.openclaw.ai/gateway/openresponses-http-api) — request/response y eventos SSE.
- KaibanJS: `Team.start()`, `team.subscribeToChanges()`, `WorkflowResult`, store `workflowLogs` / `workflowResult`.
