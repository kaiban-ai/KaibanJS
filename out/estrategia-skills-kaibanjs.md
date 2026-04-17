# Evaluación y estrategia: arquitectura de Skills en KaibanJS

**Documento de análisis y propuesta de implementación**  
_Inspirado en LangChain Deep Agents y el modelo de Skills de Anthropic_

---

## 1. Resumen ejecutivo

Este documento evalúa la viabilidad de introducir una arquitectura de **Skills** en KaibanJS, contrastando el estado actual del código con el estado del arte (LangChain Deep Agents, Anthropic Agent Skills) y proponiendo una estrategia por etapas con hitos escalonados. Se concluye con una **recomendación clara** y un plan de implementación que preserva la compatibilidad hacia atrás y la identidad de KaibanJS como orquestador multiagente y kanban.

**Recomendación:** **Experimentar** primero con Skills a nivel de agente (sin adoptar aún la estructura completa de Deep Agents), y en paralelo **evaluar** la introducción de un tercer tipo de agente opcional basado en LangGraph/Deep Agents para usuarios que requieran planificación explícita y subagentes.

---

## 2. Estado actual de KaibanJS

### 2.1 Arquitectura de agentes

| Tipo                    | Clase                 | Ubicación                           | Comportamiento                                                                                                                                       |
| ----------------------- | --------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ReactChampionAgent**  | `ReactChampionAgent`  | `src/agents/reactChampionAgent.ts`  | Loop ReAct: LLM (LangChain) → parseo de salida → thought / tool / final answer; herramientas por nombre; opcional `BlockTaskTool` vía `kanbanTools`. |
| **WorkflowDrivenAgent** | `WorkflowDrivenAgent` | `src/agents/workflowDrivenAgent.ts` | Sin loop LLM; ejecuta un `Workflow` de `@kaibanjs/workflow`; suspend/resume.                                                                         |

- **Factory:** `src/index.ts` — `Agent` usa `createAgent(type, config)`. Si `type === 'WorkflowDrivenAgent'` se instancia `WorkflowDrivenAgent`; en caso contrario, `ReactChampionAgent`.
- **Configuración base:** `BaseAgentParams`: `id`, `name`, `role`, `goal`, `background`, `tools?`, `llmConfig?`, `maxIterations?`, `forceFinalAnswer?`, `promptTemplates?`, `env?`, `kanbanTools?`, `llmInstance?`.

### 2.2 Herramientas (tools) y acciones

- **Tipo base:** `src/tools/baseTool.ts` — `BaseTool` = `StructuredTool` de `@langchain/core/tools`.
- **Kanban:** `BlockTaskTool` en `src/tools/blockTaskTool.ts` (acción `BLOCK_TASK`).
- **Paquete:** `packages/tools` exporta herramientas LangChain (Tavily, Firecrawl, RAG, etc.).
- **Vinculación:** En **ReactChampionAgent** las herramientas se reciben en `tools` y (si aplica) se añade `BlockTaskTool`. **No** se usan como tool-calling nativo del LLM: se inyectan en el **system prompt** (nombre, descripción, schema JSON) y el agente devuelve JSON con `action`/`actionInput`; el código resuelve por nombre y llama `tool.invoke(actionInput)`.
- **WorkflowDrivenAgent:** no tiene array de tools en el agente; las “acciones” viven dentro de los pasos del workflow (p. ej. `AgentExecutor` o AI SDK dentro de un step).
- **Equipos:** Los equipos no poseen tools; solo los agentes. Cada tarea tiene un agente asignado y ese agente usa sus tools al ejecutar la tarea.

### 2.3 Skills y conceptos similares

- **No existe** un concepto de primera clase “Skill” en el core.
- Búsquedas por “skill”/“Skill” solo aparecen en config o env (strings), no en un tipo o registro dedicado.
- Lo más cercano: **tools**, **kanban tools** y **prompt templates** (`promptTemplates` en `BaseAgent` / `src/utils/prompts.ts`).

### 2.4 Uso de LangChain

- **Chat models:** `@langchain/openai`, `@langchain/anthropic`, `@langchain/google-genai`, etc., según `llmConfig.provider`.
- **Prompts y runnables:** `ChatPromptTemplate`, `RunnableWithMessageHistory`, `ChatMessageHistory` (in-memory), `StringOutputParser`.
- **Tools:** `StructuredTool` de `@langchain/core/tools`.
- El agente tipo LangChain en core es **ReactChampionAgent** con un **loop ReAct propio** (no usa `createToolCallingAgent` ni `AgentExecutor`).

### 2.5 Equipos y ejecución

- **Team** (`src/index.ts`): `ITeamParams` con `name`, `agents`, `tasks`, `inputs`, `env`, `insights`, `memory`.
- Un solo store (`createTeamStore`) compuesto por: agentStore, taskStore, workflowLoopStore, workflowDrivenAgentStore.
- Ejecución determinista vía `subscribeDeterministicExecution`: grafo de dependencias y cola; se llama `workOnTask(agent, task, context)` por tarea.
- Las herramientas son **siempre del agente** que ejecuta la tarea.

---

## 3. Estado del arte: Skills y Deep Agents

### 3.1 Skills (Anthropic / LangChain)

- **Definición:** Una skill es una **carpeta** que contiene un archivo **SKILL.md** con:
  - **Frontmatter YAML** (metadata): nombre, descripción, versión, autor, licencia, `allowed-tools`, etc.
  - **Cuerpo Markdown:** instrucciones que el agente sigue cuando activa la skill.
- **Progressive disclosure:**
  1. **Descubrimiento:** solo se carga el frontmatter (~100 tokens) para que el agente sepa cuándo usar la skill.
  2. **Activación:** se carga el cuerpo completo del SKILL.md cuando el agente decide que la skill es relevante.
  3. **Ejecución:** se cargan recursos referenciados (scripts, docs) bajo demanda.
- **Ventajas frente a “muchas tools”:**
  - **Eficiencia de tokens:** no hace falta poner todas las definiciones de tools en contexto desde el inicio.
  - **Menor carga cognitiva:** menos tools atómicas que confundan al modelo.
  - **Reutilización y composición:** skills compartibles entre agentes y combinables en sesión.
  - **Evolución:** el agente puede crear o ampliar skills al encontrar nuevas tareas (visión Anthropic).

### 3.2 Deep Agents (LangChain)

- **Paquete:** `deepagents` (npm), también existe en Python. Repositorio: [langchain-ai/deepagentsjs](https://github.com/langchain-ai/deepagentsjs).
- **Características:** planificación (`write_todos`), sistema de archivos (read/write/edit file, ls, glob, grep), shell (`execute`), **subagentes** (`task`), streaming, checkpointing (LangGraph).
- **Skills en Deep Agents (JS):**
  - Se configuran con `skills: ["/skills/"]` (rutas virtuales POSIX respecto al backend).
  - Requieren un **backend** (StateBackend, StoreBackend o FilesystemBackend) donde pre-cargar los archivos de skills (p. ej. contenido de SKILL.md).
  - Middleware: `SkillsMiddleware` cuando se pasa `skills`.
  - Los skills se cargan bajo demanda según el prompt (progressive disclosure).
- **Diferencias arquitectónicas con ReAct:**
  - Deep Agents está construido sobre **LangGraph** (grafo de nodos, estado, checkpointing).
  - ReAct (como en KaibanJS) es un loop LLM fijo: think → act → observe.
  - LangGraph permite planificación explícita, subagentes y flujos condicionales; ReAct es más simple y no tiene “plan” explícito ni delegación a subagentes.

### 3.3 Skills vs tools/acciones

| Aspecto               | Tools / acciones (actual)    | Skills (propuesto)                                |
| --------------------- | ---------------------------- | ------------------------------------------------- |
| **Granularidad**      | Atómicas, una invocación     | Conjunto de instrucciones + recursos              |
| **Carga en contexto** | Todas en system prompt       | Solo frontmatter; cuerpo bajo demanda             |
| **Ubicación lógica**  | Por agente (array `tools`)   | Por agente o compartidas (carpeta/registry)       |
| **Reutilización**     | Misma tool en varios agentes | Misma skill en varios agentes/equipos             |
| **Dominio**           | Ejecución (API, búsqueda…)   | “Cómo hacer X” (procedimientos, airline, negocio) |
| **Eficiencia tokens** | Crece con el número de tools | Acotada por progressive disclosure                |

Conclusión: **Skills no sustituyen a las tools;** las complementan. Las tools siguen siendo la capa de ejecución; las skills son la capa de “know-how” y cuándo cargar qué instrucciones.

---

## 4. Dónde ubicar Skills: agente vs equipo

- **Recomendación:** **Skills asociados al agente** en primera instancia.
  - Coherente con el modelo actual (tools por agente).
  - Cada agente puede tener su conjunto de skills (p. ej. agente “operaciones” con skills de airline, agente “soporte” con skills de FAQ).
- **Skills a nivel equipo** (opcional, fase posterior):
  - Un “skill pool” del equipo permitiría skills compartidas (p. ej. “política de cancelación”) sin duplicar por agente.
  - Requeriría extensión del store y de la API del Team (p. ej. `team.skills` o `team.skillPaths`).

Para la primera fase se propone **solo skills a nivel agente**; la decisión de skills a nivel equipo se deja para después de validar el uso en agentes.

---

## 5. Impacto arquitectónico y compatibilidad

### 5.1 Impacto en el código actual

- **BaseAgentParams / IAgentParams:** Añadir opcional `skills?: SkillConfig[]` o `skillPaths?: string[]` sin eliminar `tools`.
- **ReactChampionAgent:**
  - Integrar en el system prompt una capa de “skills disponibles”: solo frontmatter (nombre + descripción) por skill; si el runtime soporta “cargar skill bajo demanda”, el cuerpo del SKILL.md se inyectaría en un turno posterior cuando el agente indique que usa esa skill.
  - Alternativa mínima: tratar skills como **bloques de texto** que se concatenan al prompt (sin progressive disclosure en v1).
- **WorkflowDrivenAgent:** Las skills podrían ser irrelevantes si el comportamiento lo define solo el workflow; o podrían usarse dentro de un step (p. ej. un step que use un agente con skills). No es prioritario en la primera fase.
- **Stores:** No es estrictamente necesario un nuevo slice; las skills pueden ser configuración del agente y resolverse en tiempo de construcción del prompt.

### 5.2 Compatibilidad hacia atrás

- Si `skills` es opcional y por defecto `[]`, el comportamiento actual se mantiene.
- Las tools siguen siendo el mecanismo de ejecución; no se elimina ni se depreca la API actual de tools.
- Los dos tipos de agente existentes siguen siendo válidos; la propuesta no obliga a adoptar Deep Agents como único modelo.

### 5.3 Complejidad técnica

- **Nivel bajo (solo prompt):** Añadir skills como texto al system prompt (lista de nombre + descripción, y opcionalmente cuerpo completo). Complejidad baja, sin dependencias nuevas.
- **Nivel medio (progressive disclosure):** Resolver SKILL.md desde rutas o URLs, parsear YAML frontmatter, inyectar solo frontmatter al inicio y cargar el cuerpo cuando el agente “active” la skill. Requiere convención de formato (SKILL.md) y un pequeño módulo de carga/parseo.
- **Nivel alto (Deep Agent–like):** Integrar `deepagents` o LangGraph como nuevo tipo de agente, con backend de archivos, SkillsMiddleware y subagentes. Mayor esfuerzo y posible fricción con el modelo Team/Task actual (quien “ejecuta” sería el grafo, no solo un agente ReAct).

---

## 6. Posicionamiento estratégico

- **KaibanJS** se posiciona como orquestador **multiagente** y **kanban** (tareas, dependencias, equipos), con integración LangChain para el LLM y las tools.
- Introducir **Skills** refuerza:
  - **Modularidad:** know-how encapsulado en skills reutilizables.
  - **Reutilización:** mismas skills en distintos agentes/equipos.
  - **Capacidades por dominio (p. ej. airline):** skills específicas de aerolínea (políticas, procedimientos) sin saturar el prompt con tools.
- Mantener **ReAct + WorkflowDriven** como núcleo permite no atar KaibanJS a un solo runtime (LangGraph); un tercer tipo “DeepAgent” puede ofrecerse como opción para quien necesite planificación y subagentes.

---

## 7. Recomendación final

- **Implementar (en forma acotada):** Sí, pero en modo **experimentación**.
- **Experimentar:** Sí — introducir el concepto de Skill en KaibanJS primero a nivel de **agente**, con formato SKILL.md (frontmatter + cuerpo) y carga opcional por rutas o contenido estático.
- **Nuevos tipos de agente:** **Evaluar** en paralelo la opción de un agente tipo “DeepAgent” (basado en `deepagents` o LangGraph) para casos de uso que requieran planificación explícita y subagentes; no obligatorio para usar skills.
- **Descartar:** No — el concepto de Skills aporta valor (tokens, modularidad, dominio) y es compatible con el diseño actual.

En resumen: **Experimentar con Skills a nivel de agente** (fases 1–2) y **evaluar** un tercer tipo de agente (Deep Agent) en función de demanda y recursos, sin reemplazar los agentes actuales.

---

## 8. Etapas e hitos de implementación

### Fase 0: Decisión y diseño (sin cambios de código)

- **Hito 0.1:** Aprobación de este documento y decisión de seguir con la rama “Skills en agente”.
- **Hito 0.2:** Definición del formato de Skill en KaibanJS (SKILL.md con YAML + Markdown; campos mínimos: `name`, `description`).
- **Hito 0.3:** Decisión sobre soporte inicial: solo frontmatter en prompt vs. progressive disclosure en una segunda iteración.

### Fase 1: Skills mínimos (solo prompt)

- **Hito 1.1:** Definir interfaz `SkillConfig` (o equivalente) y `skills?: SkillConfig[]` en `BaseAgentParams` / `IAgentParams`; mantener compatibilidad (default `[]`).
- **Hito 1.2:** Cargar skills desde rutas o desde objeto en memoria (contenido de SKILL.md); parser de frontmatter YAML + cuerpo Markdown (librería estándar o `gray-matter`).
- **Hito 1.3:** En `ReactChampionAgent`, inyectar en el system prompt una sección “Skills disponibles” con nombre y descripción (frontmatter) de cada skill; opcionalmente, en esta fase, incluir también el cuerpo completo (sin progressive disclosure).
- **Hito 1.4:** Tests unitarios: agente con `skills: []` se comporta igual que hoy; agente con una skill tiene el texto esperado en el prompt.
- **Criterio de cierre:** Un agente puede recibir una lista de skills y su descripción (y opcionalmente cuerpo) aparece en el prompt; no se modifica el flujo de tools.

### Fase 2: Progressive disclosure (carga bajo demanda)

- **Hito 2.1:** Diseñar convención para que el LLM indique “uso la skill X” (p. ej. acción especial `use_skill` o marcador en el thought); parsear esa salida en el loop ReAct.
- **Hito 2.2:** Al detectar “uso skill X”, cargar el cuerpo completo del SKILL.md e inyectarlo en el siguiente mensaje (o en el contexto del turno) sin duplicar todo el listado de cuerpos al inicio.
- **Hito 2.3:** Limitar el número de skills cargadas por turno o por tarea para control de tokens (configuración opcional).
- **Criterio de cierre:** El agente recibe solo frontmatter al inicio; el cuerpo de una skill se añade solo cuando el agente indica que la usa.

### Fase 3: Skills reutilizables y dominio airline

- **Hito 3.1:** Documentar y publicar un conjunto mínimo de skills de ejemplo (p. ej. “búsqueda web”, “resumen”) en formato SKILL.md.
- **Hito 3.2:** Incluir al menos una skill de ejemplo “airline” (procedimiento o política) y validar con un flujo de playground o test E2E.
- **Hito 3.3:** Opcional: registry o carpeta estándar `skills/` en el proyecto del usuario, con carga por convención desde rutas.
- **Criterio de cierre:** Skills documentadas y al menos un caso de uso airline cubierto con skills.

### Fase 4: Evaluación de agente tipo Deep Agent (opcional)

- **Hito 4.1:** Spike técnico: integrar `deepagents` (npm) en un branch o módulo aparte; ejecutar un agente con `createDeepAgent` y skills contra un backend en memoria o filesystem.
- **Hito 4.2:** Diseñar adaptador: cómo un “DeepAgent” se expone como `BaseAgent` (o como un tercer tipo en `createAgent`) para que el Team pueda asignarle tareas y usar el mismo store/eventos (si aplica).
- **Hito 4.3:** Decisión go/no-go: si el adaptador es viable y hay demanda, añadir tipo `DeepAgent` o `LangGraphAgent` en la factory; si no, dejar Skills solo en ReactChampionAgent y cerrar esta rama.
- **Criterio de cierre:** Decisión documentada y, en caso go, un agente tipo Deep Agent ejecutable dentro de un Team (aunque sea experimental).

### Fase 5: Skills a nivel equipo (opcional, posterior)

- **Hito 5.1:** Definir `skillPaths` o `skills` en `ITeamParams` y en el store (o en contexto disponible para los agentes).
- **Hito 5.2:** Regla de resolución: skills del agente + skills del equipo (sin duplicados); prioridad agente > equipo o merge por nombre.
- **Hito 5.3:** Tests y documentación.
- **Criterio de cierre:** Un equipo puede definir skills compartidas y los agentes del equipo las ven en su contexto.

---

## 9. Resumen de dependencias y upgrades

- **LangChain actual:** `@langchain/core` ^0.3.66, `langchain` 0.3.24, etc. No es estrictamente necesario subir versión solo para Skills en la Fase 1–2.
- **Deep Agents (solo si se implementa Fase 4):** `deepagents` (npm); comprobar compatibilidad con `@langchain/langgraph` y con las versiones de `@langchain/core` que usa KaibanJS.
- **Nuevas dependencias posibles (Fases 1–2):** Parser YAML/frontmatter (p. ej. `gray-matter`) para SKILL.md; valorar si se puede evitar con dependencias ya presentes.

---

## 10. Referencias

- [Using skills with Deep Agents (LangChain Blog)](https://www.blog.langchain.com/using-skills-with-deep-agents/)
- [Anthropic – Equipping agents with agent skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)
- [Customize Deep Agents (LangChain JS)](https://docs.langchain.com/oss/javascript/deepagents/customization) — sección Skills
- [deepagentsjs (GitHub)](https://github.com/langchain-ai/deepagentsjs) — ejemplos de skills en `examples/skills`
- [SKILL.md / Agent Skills Format](https://www.mdskills.ai/specs/skill-md) — especificación de frontmatter
- Código KaibanJS: `src/agents/`, `src/tools/`, `src/utils/prompts.ts`, `src/index.ts`, `src/stores/`

---

_Documento generado en el marco de la evaluación de la tarea “Skills architecture in KaibanJS”. No se ha modificado código del proyecto._
