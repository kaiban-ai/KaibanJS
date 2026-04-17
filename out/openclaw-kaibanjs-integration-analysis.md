# KaibanJS × OpenClaw — Análisis de Integración y Propuestas

> **Estado:** Documento de análisis — sin implementación  
> **Fecha:** Marzo 2026  
> **Propósito:** Evaluar vías de compatibilidad e integración entre KaibanJS y OpenClaw

---

## 1. Resumen ejecutivo

**KaibanJS** es un framework TypeScript/Node.js para orquestar equipos de agentes IA con estado explícito (Zustand), soporte multi-LLM vía LangChain y un sistema de herramientas basado en `StructuredTool`.

**OpenClaw** es una plataforma de agentes IA autónomos orientada a canales de mensajería (WhatsApp, Telegram, Discord, etc.) con un gateway WebSocket/HTTP, un sistema de plugins TypeScript en tiempo de ejecución, un ecosistema de skills basado en MCP (ClawHub, 5 700+ skills) y capacidades nativas de browser/canvas/cron.

Ambos marcos son complementarios: KaibanJS aporta **orquestación multi-agente y flujos de trabajo complejos**; OpenClaw aporta **presencia en canales, skills listas para usar, automatización de interfaz** y una gateway robusta para exposición de agentes. La integración abre al menos **cinco vías concretas** con distinto nivel de esfuerzo e impacto.

---

## 2. Análisis de cada plataforma

### 2.1 KaibanJS — capacidades clave

| Capa                 | Descripción                                                                                                               |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Orquestación**     | `Team` con DAG de tareas, ejecución paralela/secuencial, dependencias, pausa/reanuda/stop                                 |
| **Agentes**          | `ReactChampionAgent` (bucle ReAct) + `WorkflowDrivenAgent` (flujo determinista con `@kaibanjs/workflow`)                  |
| **Herramientas**     | Cualquier `StructuredTool` de LangChain; registro por nombre en el agente                                                 |
| **MCP actual**       | Vía `@langchain/mcp-adapters` (`MultiServerMCPClient`); los tools MCP devueltos son `StructuredTool`, integración directa |
| **LLMs**             | OpenAI, Anthropic, Google, Mistral, DeepSeek, xAI (y cualquier instancia `BaseChatModel`)                                 |
| **Observabilidad**   | `@kaibanjs/opentelemetry` con exporters a Langfuse, Phoenix, BrainTrust, SigNoz, Jaeger                                   |
| **A2A**              | Playgrounds con protocolo Google Agent-to-Agent (Express + SSE)                                                           |
| **Estado en UI**     | Zustand store expuesto vía `team.useStore()` para React                                                                   |
| **Skills (roadmap)** | Issue abierta: Stage 1 = skills a nivel agente (SKILL.md); Stage 2 = team-level + DeepAgent                               |

### 2.2 OpenClaw — capacidades clave

| Capa                     | Descripción                                                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| **Gateway**              | WebSocket (`ProtocolGateway`) + HTTP (`OpenResponses POST /v1/responses`) multiplex en el mismo puerto                          |
| **Canales**              | WhatsApp, Telegram, Discord, Slack, Google Chat, Signal, iMessage, MS Teams                                                     |
| **Skills / MCP**         | ClawHub: 5 700+ skills; toda skill = MCP server; `@langchain/mcp-adapters` compatible                                           |
| **Herramientas nativas** | `browser`, `canvas`, `exec`, `web_search`, `web_fetch`, `nodes`, `cron`, `message`, `sessions_spawn`                            |
| **Plugins**              | TypeScript en tiempo de ejecución vía `jiti`; registran tools, RPC, handlers HTTP, CLI commands, hooks                          |
| **Agent loop**           | intake → context → model inference → tool execution → streaming → persistence; serializado por sesión                           |
| **Hooks de ciclo**       | `before_tool_call`, `after_tool_call`, `session_start/end`, `message_received/sending/sent`, `before_prompt_build`, `agent_end` |
| **Sub-agentes**          | `sessions_spawn` (sub-runs dentro de OpenClaw) + ACP runtime                                                                    |
| **Autenticación**        | Bearer token (password o token mode)                                                                                            |
| **Streaming**            | SSE estándar con eventos `response.output_text.delta`, etc.                                                                     |

---

## 3. Puntos de convergencia técnica

Antes de describir las vías de integración, es útil identificar donde los dos marcos **ya hablan el mismo idioma**:

1. **MCP como lenguaje común.** Ambos consumen/exponen herramientas como MCP servers. KaibanJS ya usa `@langchain/mcp-adapters`; OpenClaw expone cada skill de ClawHub como MCP server. → Cualquier skill de ClawHub puede ser tool en KaibanJS de forma nativa.

2. **LangChain `StructuredTool` como contrato.** Los tools que devuelve `MultiServerMCPClient.getTools()` son `StructuredTool`; son lo mismo que los tools de KaibanJS. No hay adaptador de datos necesario.

3. **OpenResponses API = interfaz estándar.** El endpoint `POST /v1/responses` de OpenClaw sigue el spec de OpenAI Responses API. KaibanJS puede consumirlo via `ChatOpenAI` apuntando a la base URL del gateway.

4. **Plugin system TS en runtime.** OpenClaw carga plugins TypeScript en proceso. Un plugin puede exponer la lógica de un `Team` de KaibanJS como tool o RPC del gateway.

5. **A2A / sesiones spawn.** KaibanJS ya implementa el protocolo Google A2A en playgrounds; OpenClaw tiene `sessions_spawn` (agente interno) y soporte ACP. Existe base para comunicación agente-a-agente bidireccional.

---

## 4. Propuestas de integración

### Via A — KaibanJS consume skills de ClawHub vía MCP _(Bajo esfuerzo, alto valor inmediato)_

**Concepto:** Usar el ecosistema de 5 700+ skills de ClawHub directamente como herramientas en agentes KaibanJS, igual que ya se hace con Tavily MCP.

**Flujo técnico:**

```
ClawHub Skill (MCP Server)
    ↓  MultiServerMCPClient (@langchain/mcp-adapters)
    ↓  getTools() → StructuredTool[]
    ↓
KaibanJS Agent.tools[]
    ↓
ReactChampionAgent loop → tool.invoke(input)
```

**Ejemplo de configuración:**

```typescript
// En el agente KaibanJS, conectar a un MCP server de ClawHub
const mcpClient = new MultiServerMCPClient({
  mcpServers: {
    // Skill de búsqueda web de ClawHub
    "claw-web-search": {
      command: "npx",
      args: ["-y", "@clawhub/tavily-skill@latest"],
      env: { TAVILY_API_KEY: process.env.TAVILY_API_KEY }
    },
    // Skill de GitHub de ClawHub
    "claw-github": {
      command: "npx",
      args: ["-y", "@clawhub/github-skill@latest"],
      env: { GITHUB_TOKEN: process.env.GITHUB_TOKEN }
    }
  }
});

const tools = await mcpClient.getTools();
const agent = new Agent({ tools, ... });
```

**Qué requiere:**

- Identificar los paquetes npm de las skills de ClawHub deseadas
- Gestión de API keys por skill
- Posiblemente un wrapper para skills que usen el gateway OpenClaw gestionado

**Valor:**

- Acceso inmediato a 5 700+ herramientas probadas
- Sin código de adaptación: el contrato `StructuredTool` es idéntico
- KaibanJS como orquestador multi-agente con el ecosistema de herramientas de OpenClaw

---

### Via B — KaibanJS Team expuesto como agente OpenClaw vía OpenResponses _(Esfuerzo medio, integración profunda)_

**Concepto:** Crear un servidor Express/Fastify que envuelva un `Team` de KaibanJS y lo exponga en el endpoint `POST /v1/responses` compatible con OpenResponses. OpenClaw lo consume como si fuera un proveedor LLM externo, permitiendo que un equipo completo de agentes KaibanJS aparezca como "un agente" dentro del ecosistema OpenClaw.

**Flujo técnico:**

```
Usuario (WhatsApp / Telegram / Discord)
    ↓  Canal OpenClaw
    ↓  Gateway OpenClaw
    ↓  POST /v1/responses  ←→  KaibanJS OpenResponses Adapter
                                    ↓
                               Team.start({ inputs })
                                    ↓
                               Agentes KaibanJS (ReAct, Workflow)
                                    ↓
                               Resultado final → SSE response
```

**Componentes a construir:**

1. **`KaibanOpenResponsesAdapter`**: servidor HTTP que:

   - Acepta `POST /v1/responses` con el schema de OpenResponses
   - Mapea `input` a `Team.start({ inputs: { message: input } })`
   - Suscribe a `team.subscribeToChanges()` y emite eventos SSE mientras el workflow avanza
   - Devuelve el `finalAnswer` como `response.output_text.done`
   - Devuelve token counts reales (KaibanJS los tiene en `workflowLogs`)

2. **Configuración en OpenClaw** (via `openclaw.json`):

```json5
{
  agents: {
    list: [
      {
        id: 'kaiban-team',
        provider: 'openai-compat',
        model: 'kaiban',
        endpoint: 'http://localhost:3100/v1/responses',
        auth: { token: 'KAIBAN_SECRET' },
      },
    ],
  },
}
```

**Valor:**

- El Team de KaibanJS hereda todos los canales de OpenClaw (WhatsApp, etc.) sin código adicional
- El usuario final interactúa via su canal preferido; OpenClaw enruta; KaibanJS orquesta
- OpenClaw aporta autenticación, rate limiting, cron scheduling sobre el team KaibanJS

---

### Via C — Plugin OpenClaw que embebe un Team KaibanJS _(Esfuerzo alto, integración nativa)_

**Concepto:** Crear un plugin TypeScript oficial para OpenClaw (`@kaibanjs/openclaw-plugin`) que se carga en proceso en el gateway y registra tools, hooks y RPC para interactuar con Teams de KaibanJS desde dentro del agente OpenClaw.

**Lo que el plugin registraría:**

```typescript
// Plugin structure
export default {
  manifest: {
    name: "kaibanjs",
    version: "1.0.0",
    tools: ["kaiban_run_team", "kaiban_get_status", "kaiban_send_feedback"]
  },

  register(api) {
    // Tool: ejecutar un Team KaibanJS
    api.tools.register({
      name: "kaiban_run_team",
      description: "Run a KaibanJS multi-agent team workflow",
      schema: z.object({
        teamId: z.string(),
        inputs: z.record(z.string())
      }),
      async execute({ teamId, inputs }) {
        const team = getTeam(teamId);
        const result = await team.start({ inputs });
        return result.outputs;
      }
    });

    // Hook: antes del prompt → inyectar contexto del team
    api.hooks.on("before_prompt_build", async ({ session, prependContext }) => {
      const teamStatus = await getActiveTeamStatus(session.id);
      if (teamStatus) prependContext.push(`Current team status: ${teamStatus}`);
    });

    // RPC: exponer control del team vía Gateway WS
    api.gateway.rpc("kaiban.team.pause", async ({ teamId }) => { ... });
    api.gateway.rpc("kaiban.team.resume", async ({ teamId }) => { ... });
  }
}
```

**Valor:**

- Integración de primera clase: el agente OpenClaw puede invocar Teams KaibanJS como cualquier otra tool
- Bidireccional: el team puede enviar mensajes al usuario via `sessions_send` del gateway
- Sin servidor intermedio; todo en proceso

---

### Via D — OpenClaw como canal de input/output para KaibanJS _(Esfuerzo bajo-medio, caso de uso específico)_

**Concepto:** Usar la API de mensajería de OpenClaw (`sessions_send`, `message tool`) como mecanismo de comunicación para notificaciones, feedback humano y entrega de resultados de KaibanJS, sin integrar los dos frameworks a nivel de ejecución.

**Flujos de uso:**

**D.1 — Notificaciones de progreso del workflow:**

```typescript
// subscriber en KaibanJS que notifica via OpenClaw
team.subscribeToChanges((state) => {
  if (state.workflowStatus === 'FINISHED') {
    await openclawGateway.sendMessage({
      channel: 'whatsapp',
      to: userId,
      text: `✅ Workflow completado:\n${state.result}`,
    });
  }
});
```

**D.2 — Validación humana (`externalValidationRequired: true`) via chat:**

```typescript
// Task con validación humana → el validador recibe mensaje en WhatsApp
task = new Task({
  externalValidationRequired: true,
  agent: reviewAgent,
});

// Al necesitar validación, KaibanJS envía pregunta via OpenClaw
// El usuario responde en WhatsApp → trigger de team.validateTask()
```

**D.3 — Feedback loop via mensajería:**

```
Agente KaibanJS genera borrador
    ↓  team.provideFeedback()
    ↓  OpenClaw gateway (WhatsApp/Telegram)
    ↓  Usuario revisa y responde
    ↓  Webhook → team.provideFeedback(userResponse)
    ↓  KaibanJS retoma el workflow
```

**Valor:**

- Habilita casos de uso de "human-in-the-loop" multi-canal
- Muy bajo acoplamiento: KaibanJS llama HTTP/WS del gateway; no hay dependencia de paquetes
- Inmediato: solo necesita las credenciales del gateway OpenClaw

---

### Via E — KaibanJS como proveedor LLM custom en OpenClaw _(Esfuerzo medio, integración elegante)_

**Concepto:** Registrar un "proveedor LLM" personalizado en OpenClaw que, en lugar de llamar a un modelo, delega toda la inferencia a un agente o team de KaibanJS. Aprovecha que OpenClaw soporta proveedores OpenAI-compatible via `apiBaseUrl`.

**Mecanismo:**
OpenClaw tiene soporte para `provider: "openai-compat"` con endpoint personalizable. KaibanJS expone un servidor `POST /v1/chat/completions` (Chat Completions format) donde:

- El input es el historial de mensajes del agente OpenClaw
- El "LLM" es en realidad un Team KaibanJS que procesa la tarea y devuelve `choices[0].message.content`
- Tool calls del agente OpenClaw se traducen a tasks/inputs del team

```typescript
// KaibanJS Chat Completions server
app.post('/v1/chat/completions', async (req, res) => {
  const { messages, stream } = req.body;
  const lastUserMessage = messages.findLast(m => m.role === 'user');

  const team = new Team({ ... }); // team configurado
  const output = await team.start({
    inputs: { task: lastUserMessage.content }
  });

  res.json({
    choices: [{
      message: { role: 'assistant', content: output.result }
    }],
    usage: { /* token counts de KaibanJS */ }
  });
});
```

**Valor:**

- OpenClaw enruta mensajes de usuarios al "LLM" KaibanJS transparentemente
- El agente OpenClaw puede usar todas sus herramientas nativas (browser, cron, etc.) mientras KaibanJS orquesta el "pensamiento"
- Separación clara de responsabilidades: OpenClaw = canales + tools de sistema; KaibanJS = lógica de negocio multi-agente

---

## 5. Sinergias con el roadmap de Skills de KaibanJS

El [issue de Skills architecture](https://github.com/kaiban-ai/KaibanJS/issues) en KaibanJS (Stage 1: SKILL.md a nivel agente; Stage 2: team-level + DeepAgent) tiene una sinergia directa con OpenClaw:

| Roadmap KaibanJS                     | Conexión con OpenClaw                                                                                                                           |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Skills como SKILL.md**             | OpenClaw también define skills como archivos Markdown con frontmatter. Podría adoptarse el mismo formato para interoperabilidad cross-framework |
| **Progressive disclosure de skills** | El hook `before_prompt_build` de OpenClaw hace exactamente lo mismo: inyectar contexto de skills antes de construir el prompt                   |
| **Team-level skills**                | ClawHub skills son el equivalente de un pool de skills compartido; KaibanJS podría importar skills ClawHub vía MCP como "team skills"           |
| **DeepAgent (Stage 2b)**             | OpenClaw tiene `sessions_spawn` para sub-agentes y ACP runtime; podría integrarse en el tipo `DeepAgent` en vez de solo LangGraph               |

**Propuesta transversal:** El formato SKILL.md de KaibanJS (Stage 1) podría diseñarse para ser compatible con el sistema de skills de OpenClaw (también Markdown con frontmatter + instrucciones en el body). Esto permitiría que una skill escrita una vez funcione en ambos frameworks.

---

## 6. Matriz de priorización

| Via                                        | Esfuerzo   | Valor    | Acoplamiento | Recomendación           |
| ------------------------------------------ | ---------- | -------- | ------------ | ----------------------- |
| **A — ClawHub skills vía MCP**             | Bajo       | Alto     | Ninguno      | ✅ Implementar primero  |
| **D — Canal de mensajería**                | Bajo-Medio | Medio    | Bajo         | ✅ Implementar temprano |
| **B — KaibanJS como OpenResponses server** | Medio      | Muy Alto | Medio        | 🔶 Segunda prioridad    |
| **E — KaibanJS como proveedor LLM**        | Medio      | Alto     | Bajo         | 🔶 Segunda prioridad    |
| **C — Plugin nativo OpenClaw**             | Alto       | Muy Alto | Alto         | 🔷 Largo plazo          |

---

## 7. Riesgos y consideraciones

### 7.1 Seguridad

- El endpoint `POST /v1/responses` de OpenClaw es **acceso operador completo**; nunca exponerlo públicamente si wrappea un KaibanJS Team con acceso a datos sensibles.
- Los plugins OpenClaw corren **en proceso** con el gateway; código KaibanJS en un plugin tiene los mismos privilegios.

### 7.2 Latencia y timeouts

- Un Team KaibanJS con múltiples agentes puede tardar varios minutos. El timeout default de OpenClaw es 600s; las vías B y E deben configurar `agents.defaults.timeoutSeconds` acorde.
- SSE streaming (Via B) es crítico para buena UX: el adapter debe emitir eventos de progreso intermedios, no solo el resultado final.

### 7.3 Gestión de estado

- KaibanJS es stateful (Zustand store por Team instance). Para escalar horizontalmente en OpenClaw, se necesita una estrategia de persistencia del store (Redis, DB) o una instancia por sesión de gateway.

### 7.4 Compatibilidad de versiones

- `@langchain/mcp-adapters` está en `devDependencies` en KaibanJS; para la Via A en producción debe moverse a `dependencies` o instalarse explícitamente en proyectos consumidores.

### 7.5 Ecosistema de skills ClawHub

- 65% de las skills ClawHub son wrappers de MCP servers; el resto son nativas. Las skills nativas (que requieren el gateway OpenClaw corriendo) no funcionarán standalone vía MCP sin una instancia de OpenClaw.

---

## 8. Arquitectura de referencia (Vision completa)

```
┌─────────────────────────────────────────────────────────────┐
│                      USUARIO FINAL                           │
│            WhatsApp │ Telegram │ Discord │ Web              │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    OPENCLAW GATEWAY                          │
│  - Gestión de canales   - Cron scheduling                   │
│  - Auth / rate limiting - Sessions management               │
│  - Browser / Canvas     - Plugin system (TS runtime)        │
│                           │                                  │
│         ┌─────────────────▼──────────────────┐              │
│         │     @kaibanjs/openclaw-plugin       │  (Via C)     │
│         │  tools: kaiban_run_team, feedback   │              │
│         │  hooks: before_prompt_build         │              │
│         └─────────────────┬──────────────────┘              │
└───────────────────────────│─────────────────────────────────┘
                            │ Via B/C/E
┌───────────────────────────▼─────────────────────────────────┐
│                    KAIBANJS TEAM                             │
│                                                              │
│  Agent 1 (ReactChampion)   Agent 2 (WorkflowDriven)         │
│  tools:                    tools:                            │
│   - ClawHub MCP skills ◄── Via A: MultiServerMCPClient       │
│   - @kaibanjs/tools        - @kaibanjs/tools                 │
│                                                              │
│  @kaibanjs/opentelemetry → Langfuse / Phoenix               │
└─────────────────────────────────────────────────────────────┘
                            │ Via D
┌───────────────────────────▼─────────────────────────────────┐
│              OPENCLAW MESSAGING (canal de retorno)           │
│   team.subscribeToChanges() → gateway.sendMessage()         │
│   Human-in-the-loop: validateTask / provideFeedback          │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. Próximos pasos sugeridos

Si se decide avanzar con alguna vía, el orden recomendado es:

1. **[Via A] Proof of concept:** Crear un ejemplo en `playground/nodejs-esm/` que conecte 3-5 skills de ClawHub (web search, GitHub, Notion) como tools en un `Team` KaibanJS. Validar estabilidad, latencias y manejo de errores MCP.

2. **[Via D] Integración de mensajería:** Crear un subscriber de ejemplo que envíe notificaciones de progreso a un canal Telegram/WhatsApp vía OpenClaw gateway cuando un workflow KaibanJS termina o necesita validación humana.

3. **[Via B] OpenResponses Adapter:** Diseñar y prototipar el `KaibanOpenResponsesAdapter` en un package separado `packages/openclaw/` o como playground dedicado. Validar SSE streaming con Teams de larga duración.

4. **[Skills Roadmap] Convergencia de formato:** Al diseñar el formato SKILL.md de KaibanJS (Stage 1), revisar el formato de skills de OpenClaw para garantizar compatibilidad o al menos similaridad estructural, facilitando migración bidireccional de skills.

5. **[Via C] Plugin oficial:** Una vez validadas las vías A, B y D, consolidar en un plugin TypeScript oficial `@kaibanjs/openclaw` que se instale con `openclaw plugins install @kaibanjs/openclaw`.

---

## 10. Referencias

- [Documentación KaibanJS](https://docs.kaibanjs.com)
- [Documentación OpenClaw](https://docs.openclaw.ai)
- [OpenClaw Tools](https://docs.openclaw.ai/tools)
- [OpenClaw Plugin System](https://docs.openclaw.ai/plugin)
- [OpenClaw OpenResponses API](https://docs.openclaw.ai/gateway/openresponses-http-api)
- [OpenClaw Agent Loop](https://docs.openclaw.ai/concepts/agent-loop)
- [ClawHub MCP Skills Guide](https://openclawlaunch.com/guides/openclaw-mcp)
- [LangChain MCP Adapters](https://github.com/langchain-ai/langchainjs/tree/main/libs/langchain-mcp-adapters)
- [KaibanJS Skills Architecture Issue](../out/issue-skills-architecture.md)
