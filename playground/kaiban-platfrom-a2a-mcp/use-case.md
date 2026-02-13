# Propuesta: Example “Airline Group Booking Quote” (KaibanJS)

## 1. Resumen del use case

**Fuente:** [AI Agent for Airlines: Instant Group Booking Quote Automation](https://www.kaiban.io/use-cases/airline-group-booking-optimization)

- **Área:** Commercial → Sales and Revenue → Group Bookings
- **Objetivo:** Automatizar la generación de cotizaciones para solicitudes de reservas grupales (RFPs), desde consulta hasta quote (y en el futuro booking/negociación).
- **Problemas que aborda:** Procesamiento manual, respuestas lentas (24–72 h), backlog de leads, equipos reducidos.

**Workflow descrito en el use case:**

1. **Inquiry** – Agente de viajes o líder del grupo contacta (email, formulario, etc.).
2. **AI Analysis** – El agente extrae, valida y solicita información faltante si hace falta.
3. **Availability & Quote** – Comprueba disponibilidad (realtime), aplica reglas de precio y envía una cotización instantánea.
4. **Customer Decision** – El cliente acepta o rechaza.
5. **Booking** – Si acepta, el agente completa la reserva.
6. **Negotiation** – Si rechaza, el agente negocia o escala a un humano.

Para este ejemplo nos centramos en el flujo **Inquiry → AI Analysis → Availability & Quote** (generación de quote). Booking y Negotiation se dejan como extensión futura o se simulan en el output (texto/instrucciones).

---

## 2. Arquitectura propuesta (alineada a los ejemplos existentes)

Misma estructura que `airline-revenue-management-kaibanjs` y `sourcing-freelance-pilot-kaibanjs`:

| Componente                          | Responsabilidad                                                                                                                                                                              |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Card**                            | Metadata A2A (nombre, descripción, skills, URL, capabilities).                                                                                                                               |
| **Controller/agent.ts**             | Definición de Agents, Tasks, Tools y Team (orquestación). Incluye **Kaiban Card Sync Agent** con tools MCP (get_card, move_card, update_card, create_card_activities).                       |
| **Controller/kaiban-mcp-client.ts** | Cliente MCP con `@modelcontextprotocol/sdk` (transporte Streamable HTTP). Expone tools Kaiban MCP como tools KaibanJS (JSON Schema→Zod). `getCard()`, `moveCardToBlocked()` para executor.   |
| **Executor**                        | Recibir request A2A, extraer `card_id`, `board_id`, `team_id`, `agent_id`, `agent_name`; validar card vía MCP `getCard()`; crear team y ejecutar; en error llamar MCP `moveCardToBlocked()`. |
| **Handler**                         | Montar Agent Card + TaskStore + Executor y rutas A2A (y estáticos si aplica).                                                                                                                |
| **Input desde Kaiban.io**           | Llega vía A2A; el **Task 0** (MCP) obtiene `card.description` con `get_card` y lo pasa como **userMessage** (inquiry) al resto del team.                                                     |

Principios que se respetan:

- **Tools** → Solo para **obtener** información (disponibilidad, reglas de precio); sin lógica de negocio compleja.
- **Agents** → Definen **roles** (extractor, validador, generador de quote, etc.).
- **Tasks** → Definen **acciones y lógica** (qué hace cada paso, prompts, esquemas de salida).
- **Team** → Orquesta el flujo y recibe el input que viene de Kaiban.io (vía A2A/card).

---

## 3. Agentes (roles) – implementación actual

| Agente                                    | Rol                           | Goal                                                                                                                                        |
| ----------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Kaiban Card Sync Agent**                | Kaiban Platform Sync          | Usar tools MCP (get_card, move_card, update_card, create_card_activities) para obtener card, mover TODO→DOING→DONE y registrar actividades. |
| **Inquiry Extraction & Validation Agent** | Group Booking Data Specialist | Extraer y validar inquiry: origen/destino (IATA), fechas, pax; devolver objeto + valid, missingFields?, validationMessage?.                 |
| **Availability & Pricing Agent**          | Group Sales Specialist        | Usar tools mock (disponibilidad + reglas de precio), decidir disponibilidad y calcular precio grupal.                                       |
| **Quote Generation Agent**                | Quote Author                  | Redactar la cotización final en texto listo para enviar al cliente (resumen, precio, condiciones, próximos pasos).                          |

Extraction y Validation están fusionados en un solo agente/task (como en sourcing-freelance-pilot).

---

## 4. Tasks (acciones y lógica) – implementación actual

- **Task 0 – Get card and move to doing** (Kaiban Card Sync Agent, tools MCP)
  - Input: `card_id`, `board_id`, `team_id`, `agent_id`, `agent_name` (del team).
  - Acción: Llamar `get_card(card_id)`, extraer `description`; si column_key es `todo`, llamar `move_card` a `doing` y opcionalmente `create_card_activities`.
  - Output: `userMessage` = texto de la card (inquiry). Sirve de input al siguiente task.

- **Task 1 – Extract and validate inquiry**
  - Input: `userMessage` (del Task 0).
  - Acción: Extraer origen, destino, fechas, pax, etc.; validar obligatorios; devolver `valid`, `missingFields?`, `validationMessage?`.
  - Output: Objeto estructurado + validación.

- **Task 2 – Check availability and apply pricing**
  - Input: Resultado del Task 1.
  - Acción: Si válido, llamar tools mock (disponibilidad + pricing); si no válido, no llamar tools. Resumir disponibilidad y precio.
  - Output: Disponibilidad (sí/no), precio total, desglose.

- **Task 3 – Generate quote**
  - Input: Inquiry + resultado Task 2.
  - Acción: Redactar quote en texto claro o mensaje pidiendo datos faltantes / disponibilidad no confirmada.
  - Output: Texto de la cotización listo para el cliente.

- **Task 4 – Update card and move to done** (Kaiban Card Sync Agent, tools MCP)
  - Input: Quote del Task 3; `card_id`, `board_id`, `team_id`, `agent_id`, `agent_name`.
  - Acción: Llamar `update_card` con el resultado (quote), `move_card` a `done`, `create_card_activities` para registrar.
  - Output: `success: true`.

Orden: 0 → 1 → 2 → 3 → 4. Si el team falla en cualquier punto, el **executor** (no el agente) llama a MCP `move_card(card_id, 'blocked')` y `create_card_activities` (variant 1 de manejo de errores).

---

## 5. Tools

### 5.1 Tools Kaiban MCP (vía kaiban-mcp-client)

El cliente MCP (`@modelcontextprotocol/sdk`, transporte **Streamable HTTP**) conecta a Kaiban MCP y expone estas tools con esquema Zod derivado del JSON Schema del servidor (`zod-from-json-schema`), para que el agente entienda bien los argumentos:

- **get_card** – Obtener una card por `card_id`. Usado en Task 0 y en el executor para validar card.
- **move_card** – Mover card a columna (`card_id`, `column_key`, `actor`). Usado en Task 0 (doing), Task 4 (done) y en executor en error (blocked).
- **update_card** – Actualizar card (p. ej. resultado/quote). Usado en Task 4.
- **create_card_activities** – Registrar actividades (cambios de estado/columna). Usado en Task 0, Task 4 y en executor en error.

Configuración: `KAIBAN_MCP_URL` (o `KAIBAN_TENANT` + `KAIBAN_ENVIRONMENT`), `KAIBAN_API_TOKEN`.

### 5.2 Tools mock (solo recuperación de información)

- **AvailabilityTool** (`check_availability`) – Mock: disponibilidad por ruta/fechas/pax. Input: `origin`, `destination`, `outboundDate`, `returnDate?`, `paxCount`. Output: `available`, `availableSeats`, `flightOptions[]`, `message?`.
- **PricingRulesTool** (`get_pricing_rules`) – Mock: precio base y descuentos por ruta y tramos de pax. Input: `origin`, `destination`, `paxCount`, `cabinClass?`. Output: `baseFarePerPax`, `groupDiscountPercent`, `totalPrice`, `currency`, `rulesSummary`.

La lógica de “qué hacer con esa información” vive en las tasks y en el agente de Availability & Pricing.

---

## 6. Team y orquestación

- **Nombre:** `Group Booking Quote Team`.
- **Inputs del team:** `card_id`, `board_id`, `team_id`, `agent_id`, `agent_name` (extraídos por el executor de la actividad Kaiban A2A). El `userMessage` (inquiry) no se pasa al inicio; lo obtiene el **Task 0** vía MCP `get_card`.
- **Flujo:**
  1. Task 0 (Get card & move to doing) – MCP; sale `userMessage` (card.description).
  2. Task 1 (Extract & Validate) sobre `userMessage`.
  3. Task 2 (Availability + Pricing) – si válido usa tools mock; si no, mensaje de validación.
  4. Task 3 (Generate quote) con inquiry + resultado de 2.
  5. Task 4 (Update card & move to done) – MCP: escribe quote en card, mueve a done, registra actividades.

Implementación: un solo Team secuencial en `agent.ts` con 5 tasks y 4 agents (Kaiban Card Sync, Extract & Validate, Availability & Pricing, Quote Generation). Sin workflow ni sub-team.

---

## 7. Datos mock

- **Availability:**
  - Por ejemplo: 2–3 rutas fijas (LHR–MIA, JFK–LAX, …) con fechas “válidas” en un rango; el resto “no disponible” o “solicitar fechas alternativas”.
  - Respuesta mock: `available`, `availableSeats`, 1–2 `flightOptions` con fecha y vuelo ficticio.

- **Pricing:**
  - Por ruta: precio base por pax (ej. 450, 520, 600 USD).
  - Tramos de grupo: 10–19 pax → -5 %, 20–49 → -10 %, 50+ → -15 %.
  - Salida: `totalPrice`, `pricePerPax`, `discountApplied`, `currency`.

- **Inquiry de ejemplo (para tests y demo):**
  - Texto libre: “We need a quote for 25 people, London to Miami, outbound 15 March 2026, return 22 March 2026, economy. Contact: events@company.com.”

Todo esto puede vivir en el mismo repo: por ejemplo `samples/group-booking-inquiry-example.txt` y datos mock en el código de los tools o en un `data/mock-availability.ts`, `data/mock-pricing.ts`.

---

## 8. Estructura de archivos (implementación actual)

```
examples/airline-group-booking-quote-kaibanjs/
├── .env.example
├── package.json
├── tsconfig.json
├── vitest.config.mts
├── samples/
│   └── .gitkeep
├── src/
│   ├── index.ts
│   ├── shared/
│   │   └── logger.ts
│   └── agents/
│       └── airline-group-booking-quote/
│           ├── card.ts
│           ├── controller/
│           │   ├── agent.ts              # Agents, Tasks, Tools, Team (5 tasks, 4 agents)
│           │   └── kaiban-mcp-client.ts  # Cliente MCP (Streamable HTTP), getKaibanTools, getCard, moveCardToBlocked
│           ├── executor.ts               # Parsea actividad A2A, valida card vía MCP, crea team, en error MCP move to blocked
│           └── handler.ts
└── tests/
    ├── setup.ts
    ├── agentCards.test.ts
    └── helpers/
        ├── a2aClient.ts
        ├── createTestApp.ts
        └── testServer.ts
```

Dependencias relevantes: `@modelcontextprotocol/sdk`, `zod-from-json-schema`, `kaibanjs`, `@a2a-js/sdk`, `@kaiban/sdk` (solo para tipos A2A). No se usa `kaiban-controller.ts` ni `@langchain/mcp-adapters`.

---

## 9. Flujo end-to-end (A2A + Kaiban MCP)

1. Kaiban.io crea/mueve una card (inquiry en `card.description`) y envía la actividad al agente vía A2A.
2. **Executor** recibe el request A2A, extrae `card_id`, `board_id`, `team_id`, `agent_id`, `agent_name` de la actividad Kaiban.
3. **Executor** valida la card vía MCP `getCard(card_id)`: comprueba que tenga descripción y esté en columna `todo`.
4. **Executor** llama a `createGroupBookingQuoteTeam(context)` y luego `team.start()`. El team recibe `card_id`, `board_id`, `team_id`, `agent_id`, `agent_name`.
5. **Team** ejecuta: Task 0 (MCP get card & move to doing) → Task 1 (Extract & Validate) → Task 2 (Availability + Pricing) → Task 3 (Generate quote) → Task 4 (MCP update card & move to done).
6. Si en cualquier paso el team falla, el **executor** llama a MCP `moveCardToBlocked(cardId, boardId, teamId, actor)` y `create_card_activities` para marcar la card como bloqueada.
7. A2A responde con estado completed; Kaiban.io muestra la card con la quote (o en blocked si hubo error).

La “decisión del cliente” (aceptar/rechazar) y “Booking”/“Negotiation” no se implementan; el output puede incluir un párrafo tipo “Para aceptar esta cotización, responda con… / Para negociar, contacte…”.

---

## 10. Card A2A (skills / tags sugeridos)

- **name:** `Airline Group Booking Quote Agent`
- **description:** Algo como: “Agent that generates instant group booking quotes from unstructured inquiries: extracts and validates request details, checks availability and pricing, and returns a ready-to-send quote.”
- **skills:**
  - `id`: `group-booking-quote`
  - `name`: `Group Booking Quote`
  - **tags:** `group-booking`, `airline`, `quote`, `availability`, `pricing`, `sales`, `revenue`, `group-sales`, etc.

---

## 11. Resumen de decisiones (implementación actual)

| Tema      | Decisión                                                                                                                          |
| --------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Alcance   | Solo flujo hasta **quote** (Inquiry → Analysis → Availability & Quote). Booking/Negotiation como texto en la quote o fase futura. |
| Kaiban    | **MCP** (no `@kaiban/sdk` para card/column/activities). Cliente `@modelcontextprotocol/sdk` con transporte **Streamable HTTP**.   |
| Agents    | 4: Kaiban Card Sync (MCP tools), Extract & Validation, Availability & Pricing (mock tools), Quote Generation.                     |
| Tools     | MCP: get_card, move_card, update_card, create_card_activities. Mock: Availability, PricingRules.                                  |
| Team      | Secuencial 5 tasks en un solo team; Task 0 y 4 usan MCP desde el Kaiban Card Sync Agent.                                          |
| Workflow  | Sin `@kaibanjs/workflow`; solo Team + Tasks.                                                                                      |
| Input A2A | Executor extrae `card_id`, `board_id`, `team_id`, `agent_id`, `agent_name`; el inquiry lo obtiene el Task 0 vía `get_card`.       |
| Error     | Si el team falla, el executor llama MCP `move_card` a `blocked` y `create_card_activities` (variant 1).                           |
| Schemas   | Tools MCP: JSON Schema del servidor convertido a Zod con `zod-from-json-schema` para que el agente entienda bien los argumentos.  |
| Config    | `KAIBAN_MCP_URL` (o `KAIBAN_TENANT` + `KAIBAN_ENVIRONMENT`), `KAIBAN_API_TOKEN`.                                                  |

Implementación realizada en `examples/airline-group-booking-quote-kaibanjs/` con la arquitectura descrita.
