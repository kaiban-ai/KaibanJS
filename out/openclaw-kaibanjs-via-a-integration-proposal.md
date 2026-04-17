## Propuesta de integración — Via A: KaibanJS consumiendo skills de ClawHub vía MCP

> **Estado:** Propuesta de diseño e implementación  
> **Alcance:** Solo Via A (KaibanJS → ClawHub skills vía MCP)  
> **Target:** Monorepo KaibanJS (core + playgrounds / ejemplos)

---

## 1. Objetivos y alcance

- **Objetivo principal:**  
  Integrar el ecosistema de skills de ClawHub (expuestas como MCP servers) dentro de KaibanJS, de forma que cualquier agente KaibanJS pueda usar dichas skills como tools `StructuredTool` sin código de pegamento adicional.

- **Objetivos específicos:**

  - **O1**: Permitir registrar uno o varios MCP servers de ClawHub en agentes KaibanJS utilizando `@langchain/mcp-adapters`.
  - **O2**: Proveer un **ejemplo oficial** (playground / demo) donde un `Team` de KaibanJS consume 3–5 skills de ClawHub (por ejemplo: búsqueda web, GitHub, Notion).
  - **O3**: Definir una **convención de configuración** para:
    - Ruta y comando de cada MCP server (paquete npm de la skill ClawHub).
    - Variables de entorno necesarias (`API_KEY`, `TOKEN`, etc.).
  - **O4**: Documentar claramente en la guía de KaibanJS cómo:
    - Añadir nuevas skills de ClawHub.
    - Gestionar errores, timeouts y logs de MCP.

- **Fuera de alcance (para esta vía):**
  - Exponer KaibanJS como agente dentro de OpenClaw (Via B/C/E).
  - Integración de canales de mensajería (Via D).
  - Estandarización del formato SKILL.md entre KaibanJS y OpenClaw (esto se tocará solo tangencialmente).

---

## 2. Arquitectura propuesta

### 2.1 Visión de alto nivel

```text
ClawHub Skill (MCP Server: npm package)
    ↓  @langchain/mcp-adapters (MultiServerMCPClient)
    ↓  getTools() → StructuredTool[]
    ↓
KaibanJS Agent / Team (ReactChampionAgent, WorkflowDrivenAgent, etc.)
    ↓
Loop del agente → tool.invoke(input) → Skill ClawHub ejecutada
```

- Cada skill de ClawHub se distribuye como **paquete npm** que implementa un MCP server (`npx @clawhub/<skill>@latest`).
- KaibanJS ya soporta **MCP via LangChain**:
  - `MultiServerMCPClient` se encarga de levantar procesos hijo para cada MCP server.
  - `getTools()` devuelve una lista de `StructuredTool` (`LangChainTool`), nativamente compatibles con el sistema de tools de KaibanJS.
- La integración consiste en:
  - Declarar la configuración de MCP servers (ClawHub skills) en el código KaibanJS.
  - Conectar esas tools a los agentes / equipos de KaibanJS.
  - Proporcionar ejemplos y utilidades para que los usuarios finales puedan enchufar nuevas skills de ClawHub con esfuerzo mínimo.

### 2.2 Componentes afectados en KaibanJS

- **Playgrounds / ejemplos:**

  - `playground/nodejs-esm/` (o equivalente más actual)
    - Añadir un ejemplo `clawhub-mcp-skills.ts` o similar.
  - Opcional: ejemplo React en `playground/react/` que muestre un flujo completo con estado en UI.

- **Dependencias de runtime:**

  - Mover o asegurar `@langchain/mcp-adapters` como **dependency** (no solo `devDependency`) en el paquete que use MCP (probablemente `packages/core` o `packages/agents`, según organización actual).

- **Documentación:**
  - Nueva sección en docs (o en `out/`) explicando:
    - Qué es MCP.
    - Cómo conectar ClawHub como fuente de tools.
    - Ejemplos de configuración.

---

## 3. Diseño técnico detallado

### 3.1 Configuración de MCP servers (ClawHub skills)

Se define un helper reutilizable que centralice la creación de un cliente MCP con soporte para ClawHub:

```typescript
// packages/core/src/mcp/clawhubClient.ts (ruta orientativa)
import { MultiServerMCPClient } from '@langchain/mcp-adapters';

export type ClawHubSkillConfig = {
  command?: string; // default: "npx"
  args: string[];
  env?: Record<string, string | undefined>;
};

export type ClawHubMCPConfig = {
  servers: Record<string, ClawHubSkillConfig>;
};

export async function createClawHubMCPClient(config: ClawHubMCPConfig) {
  const mcpClient = new MultiServerMCPClient({
    mcpServers: Object.fromEntries(
      Object.entries(config.servers).map(([name, skill]) => [
        name,
        {
          command: skill.command ?? 'npx',
          args: skill.args,
          env: skill.env,
        },
      ])
    ),
  });

  // getTools() devuelve StructuredTool[]
  const tools = await mcpClient.getTools();

  return { mcpClient, tools };
}
```

**Ventajas de este enfoque:**

- Encapsula la lógica de inicialización MCP en un módulo pequeño y reutilizable.
- Permite cambiar fácilmente cómo se configuran las skills (por ejemplo, `openclaw.json`, `.env`, etc.) sin tocar los agentes.
- Deja claro que los MCP servers son procesos externos, con sus propias `env`.

### 3.2 Ejemplo de configuración de ClawHub skills

Ejemplo de configuración mínima para 3 skills representativas:

```typescript
import { createClawHubMCPClient } from '@kaibanjs/core/mcp/clawhubClient';

const { tools } = await createClawHubMCPClient({
  servers: {
    'claw-web-search': {
      args: ['-y', '@clawhub/tavily-skill@latest'],
      env: {
        TAVILY_API_KEY: process.env.TAVILY_API_KEY,
      },
    },
    'claw-github': {
      args: ['-y', '@clawhub/github-skill@latest'],
      env: {
        GITHUB_TOKEN: process.env.GITHUB_TOKEN,
      },
    },
    'claw-notion': {
      args: ['-y', '@clawhub/notion-skill@latest'],
      env: {
        NOTION_API_KEY: process.env.NOTION_API_KEY,
      },
    },
  },
});
```

**Consideraciones:**

- El uso de `npx -y` permite obtener siempre la última versión de la skill; se puede documentar también la opción de **versiones fijas** (`@clawhub/<skill>@1.2.3`) para producción.
- Cada skill ClawHub especifica sus variables de entorno en su propia documentación; la guía de KaibanJS debe enlazar a esa documentación.

### 3.3 Integración en un agente KaibanJS

Ejemplo genérico con un agente estilo ReAct:

```typescript
import { ReactChampionAgent } from '@kaibanjs/agents';
import { createClawHubMCPClient } from '@kaibanjs/core/mcp/clawhubClient';

async function createAgentWithClawHubSkills() {
  const { tools } = await createClawHubMCPClient({
    servers: {
      'claw-web-search': {
        args: ['-y', '@clawhub/tavily-skill@latest'],
        env: { TAVILY_API_KEY: process.env.TAVILY_API_KEY },
      },
      'claw-github': {
        args: ['-y', '@clawhub/github-skill@latest'],
        env: { GITHUB_TOKEN: process.env.GITHUB_TOKEN },
      },
    },
  });

  const agent = new ReactChampionAgent({
    name: 'clawhub-enabled-agent',
    description: 'Agent capable of using ClawHub skills via MCP',
    tools, // ← StructuredTool[]
    // ... resto de configuración (llm, system prompt, etc.)
  });

  return agent;
}
```

### 3.4 Integración en un `Team` KaibanJS

En un entorno multi-agente típico, un solo `Team` puede compartir las mismas tools MCP, o se puede pasar un subconjunto de tools a cada agente.

```typescript
import { Team } from '@kaibanjs/core';
import { ReactChampionAgent } from '@kaibanjs/agents';
import { createClawHubMCPClient } from '@kaibanjs/core/mcp/clawhubClient';

async function createTeamWithClawHubSkills() {
  const { tools: clawhubTools } = await createClawHubMCPClient({
    servers: {
      'claw-web-search': {
        args: ['-y', '@clawhub/tavily-skill@latest'],
        env: { TAVILY_API_KEY: process.env.TAVILY_API_KEY },
      },
      'claw-github': {
        args: ['-y', '@clawhub/github-skill@latest'],
        env: { GITHUB_TOKEN: process.env.GITHUB_TOKEN },
      },
    },
  });

  const researchAgent = new ReactChampionAgent({
    name: 'researcher',
    tools: clawhubTools.filter(
      (t) => t.name.includes('web') || t.name.includes('tavily')
    ),
    // ...
  });

  const githubAgent = new ReactChampionAgent({
    name: 'github-specialist',
    tools: clawhubTools.filter((t) => t.name.includes('github')),
    // ...
  });

  const team = new Team({
    name: 'clawhub-demo-team',
    agents: [researchAgent, githubAgent],
    // ... definición de workflow / DAG de tareas
  });

  return team;
}
```

---

## 4. Ejemplo de implementación en playground

### 4.1 Ubicación propuesta

- Nuevo ejemplo en:
  - `playground/nodejs-esm/clawhub-mcp-demo.ts` (nombre tentativo).

### 4.2 Flujo de ejemplo

Caso de uso sugerido: **“Planificar una tarea técnica que requiera información de web y GitHub”**.

1. El usuario proporciona una solicitud (por CLI o simple script Node).
2. El `Team` KaibanJS:
   - Usa la skill `claw-web-search` para obtener contexto reciente.
   - Usa la skill `claw-github` para inspeccionar un repo (issues, PRs, etc.).
   - Consolida la información y devuelve un plan estructurado.

Pseudo-implementación:

```typescript
// playground/nodejs-esm/clawhub-mcp-demo.ts
import { createTeamWithClawHubSkills } from './shared/clawhubTeam'; // helper compartido

async function main() {
  const team = await createTeamWithClawHubSkills();

  const result = await team.start({
    inputs: {
      task: 'Analiza el estado del repo X en GitHub y dame un plan de trabajo para la próxima semana',
    },
  });

  console.log('Resultado final del team:', result.outputs);
}

main().catch((err) => {
  console.error('Error en demo ClawHub MCP:', err);
  process.exit(1);
});
```

### 4.3 Gestión de dependencias y scripts

- En el package donde viva el playground:
  - Asegurar que `@langchain/mcp-adapters` está en `dependencies`.
  - Añadir scripts npm:

```json5
{
  scripts: {
    'demo:clawhub-mcp': 'tsx playground/nodejs-esm/clawhub-mcp-demo.ts',
  },
}
```

- Documentar las variables de entorno necesarias en un `.env.example` o en la sección de docs correspondiente:

```bash
TAVILY_API_KEY=...
GITHUB_TOKEN=...
NOTION_API_KEY=...
```

---

## 5. Manejo de errores, timeouts y logging

### 5.1 Errores de conexión / arranque de MCP server

Posibles casos:

- El paquete npm de la skill no está instalado / falla `npx`.
- Faltan variables de entorno requeridas.
- El proceso MCP se cierra inesperadamente.

Estrategia propuesta:

- En `createClawHubMCPClient`:
  - Capturar errores de inicialización y:
    - Lanzar error explícito con mensaje amigable (incluyendo nombre de skill).
    - Opcionalmente, permitir un **modo tolerante** (configurable) que:
      - Ignore la skill fallida.
      - Continúe con las restantes y devuelva un warning.

### 5.2 Timeouts y latencia

- Definir recomendaciones en la documentación:
  - Usar skills de ClawHub con cuidado en workflows críticos de latencia.
  - Establecer timeouts razonables por tool, si `@langchain/mcp-adapters` o la propia skill lo permite.
  - Integrar la información de latencia en los logs de KaibanJS (OpenTelemetry).

### 5.3 Logging y observabilidad

- Integración con `@kaibanjs/opentelemetry`:
  - Incluir metadatos de tool call:
    - Nombre del MCP server (skill).
    - Argumentos relevantes.
    - Duración y resultado (éxito / error).
  - Permitir filtrar en observabilidad las llamadas a ClawHub para monitorización.

---

## 6. Estrategia de configuración y DX

### 6.1 Configuración via código (MVP)

- Primera iteración (MVP): la configuración de skills ClawHub se hace **directamente en código**:
  - El ejemplo de playground incluye un mapa `servers` con 2–3 skills.
  - Se utilizan variables de entorno para credenciales.

Ventajas:

- Menor complejidad inicial.
- Facilita al usuario ver exactamente cómo se mapean las skills.

### 6.2 Opcional (futuro): configuración declarativa

Para fases posteriores (no imprescindible en esta propuesta), se podría:

- Soportar un fichero de configuración tipo:

```json5
// clawhub.skills.json
{
  servers: {
    'claw-web-search': {
      package: '@clawhub/tavily-skill',
      version: 'latest',
      env: ['TAVILY_API_KEY'],
    },
    'claw-github': {
      package: '@clawhub/github-skill',
      version: 'latest',
      env: ['GITHUB_TOKEN'],
    },
  },
}
```

- Y un pequeño loader que convierta este JSON en configuración para `createClawHubMCPClient`.

---

## 7. Roadmap de implementación (Via A)

### 7.1 Fase 1 — MVP técnico

- **T1**: Garantizar `@langchain/mcp-adapters` como dependency de runtime donde se use.
- **T2**: Implementar `createClawHubMCPClient` (o helper equivalente) en el paquete core adecuado.
- **T3**: Crear un `Team` de ejemplo que use 2–3 skills de ClawHub.
- **T4**: Añadir script npm `demo:clawhub-mcp` en el proyecto de ejemplo.

### 7.2 Fase 2 — UX y documentación

- **T5**: Añadir documentación en:
  - Docs web de KaibanJS (o en `out/`) explicando:
    - Qué es MCP.
    - Cómo usar ClawHub paso a paso.
    - Lista de skills recomendadas para empezar.
- **T6**: Proporcionar un `.env.example` y sección de troubleshooting para:
  - Problemas de npx / red.
  - Skills que requieren OpenClaw gateway en vez de MCP puro (aclarar limitaciones).

### 7.3 Fase 3 — Refinamiento y sinergias con Skills KaibanJS

- **T7**: Explorar cómo mapear una skill de ClawHub a un futuro formato `SKILL.md` de KaibanJS:
  - Incluir metadatos (nombre, descripción, tags, required envs).
  - Permitir que una skill definida en SKILL.md pueda apuntar internamente a un MCP server ClawHub.
- **T8**: Definir ejemplos de “team-level skills” que combinen varias skills de ClawHub bajo un mismo wrapper de KaibanJS.

---

## 8. Riesgos específicos de Via A y mitigaciones

- **R1 — Skills que dependen del gateway OpenClaw gestionado:**

  - Algunas skills ClawHub no son MCP puros, sino wrappers sobre un gateway OpenClaw SaaS / self-hosted.
  - **Mitigación:**
    - Documentar claramente qué skills pueden ejecutarse standalone vía MCP y cuáles requieren una instancia de OpenClaw.
    - Incluir en la doc una pequeña tabla de compatibilidad.

- **R2 — Cambios de API en `@langchain/mcp-adapters` o en las propias skills:**

  - **Mitigación:**
    - Fijar versiones mínimas recomendadas en la doc y en ejemplos.
    - Añadir tests básicos en el repo de KaibanJS que validen que al menos 1–2 skills ClawHub siguen funcionando.

- **R3 — Costes de tokens y rate limits de terceros (Tavily, GitHub, etc.):**
  - **Mitigación:**
    - Incentivar en la doc el uso de claves con límites adecuados y entornos de prueba.
    - Añadir recomendaciones de caching / throttling en casos de uso intensivo.

---

## 9. Resultado esperado

Tras implementar esta propuesta de Via A:

- Cualquier proyecto construido sobre KaibanJS podrá:
  - Añadir **skills de ClawHub** como tools prácticamente “plug & play”.
  - Combinar tools nativas de KaibanJS con skills de ClawHub dentro del mismo agente o team.
- El monorepo de KaibanJS dispondrá de:
  - Un **ejemplo funcional** demostrando el uso de 2–3 skills ClawHub.
  - Una base sólida para futuras integraciones más profundas (Vías B, C, D, E).

---

## 10. Preguntas abiertas para cerrar diseño

Antes de pasar a implementación conviene resolver (o al menos alinear criterios) sobre:

1. **Ubicación exacta del helper MCP (`createClawHubMCPClient`):**

   - ¿Debe vivir en `@kaibanjs/core`, en un paquete específico `@kaibanjs/mcp`, o mantenerse solo como util en los playgrounds?

2. **Alcance del soporte oficial de ClawHub:**

   - ¿Se documentará solo como “ejemplo recomendado” o como integración “oficialmente soportada” en KaibanJS?

3. **Nivel de testeo automatizado deseado:**

   - ¿Queremos tests E2E que levanten realmente un MCP server de ClawHub (vía `npx`) o solo tests unitarios con mocks?

4. **Estrategia de versionado de skills:**
   - ¿Promocionamos `@latest` para DX rápida o fijamos versiones en los ejemplos de producción?

Quedo pendiente de tu feedback / ajustes sobre esta propuesta para afinar detalles (nombres de ficheros, ubicación exacta en el monorepo, número y tipo de skills de demo, etc.) antes de pasar a la fase de implementación.
