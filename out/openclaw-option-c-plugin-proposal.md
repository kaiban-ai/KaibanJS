## Propuesta de integración — Opción C (Plugin OpenClaw genérico que embebe un `Team` KaibanJS)

> **Estado:** Propuesta de diseño e implementación  
> **Alcance:** Plugin OpenClaw nativo que se instala una vez y permite que cada desarrollador asocie **su propio `Team` KaibanJS** mediante configuración (no viene con un Team fijo).

---

## 1. Objetivo

Implementar un plugin nativo OpenClaw empaquetado en el monorepo KaibanJS (ubicación sugerida en `packages/`) que:

1. El usuario instala el plugin una vez con `openclaw plugins install ./packages/openclaw-plugin`.
2. En su `~/.openclaw/openclaw.json` configura qué módulo del usuario exporta el `Team` a ejecutar.
3. El plugin registra una tool (por ejemplo `kaiban_run_team`) que el agente principal de OpenClaw invoca cuando necesite ejecutar el workflow KaibanJS.
4. Para que el agente sepa “cuándo” llamar esa tool correctamente, la metadata clave del `Team` vive **en el módulo del usuario** y el plugin usa esa metadata para construir el `description` de la tool (preferencia **B**).

---

## 2. Problema y solución (por qué la metadata debe venir del módulo)

Pregunta clave (tu duda): si la descripción “real” del `Team` está dentro del archivo donde se implementa, ¿cómo sabe OpenClaw cuándo ejecutar la tool?

**Respuesta:** OpenClaw no “lee” heurísticamente `background/goal/tasks` del `Team` KaibanJS desde el código. El matching principal lo hace el LLM contra el **catálogo de tools** que OpenClaw le ofrece en el prompt (incluyendo `name`, `description` y el esquema de `parameters`).

Por eso, el plugin debe:

- Registrar la tool con un `description` explícito.
- Ese `description` debe ser suficientemente específico para guiar al LLM.
- Con tu preferencia **B**, ese `description` lo provee el desarrollador mediante un export `teamMetadata.description`.

---

## 3. Arquitectura del plugin

### 3.1 Flujo de ejecución

```mermaid
flowchart LR
  U[Usuario en canal] --> G[OpenClaw Gateway]
  G --> A[Agente OpenClaw (LLM)]
  A -->|tool call| P[Plugin OpenClaw: kaibanjs]
  P --> M[Import dinámico módulo del usuario]
  M --> T[Team KaibanJS]
  T --> P
  P --> A[Resultado tool]
  A --> G
  G --> U
```

### 3.2 ¿Qué hace el plugin?

1. **En startup / registro de plugin**:

   - Importa dinámicamente el módulo del usuario indicado por `plugins.entries.<pluginId>.config.team.modulePath`.
   - Lee `teamMetadata.description`.
   - Registra la tool `kaiban_run_team` con:
     - `name` fijo (o parametrizable)
     - `description` = `teamMetadata.description`
     - `parameters` genéricos (para no acoplar el plugin al schema interno del Team).

2. **En runtime (cuando el agente llama la tool)**:
   - Ejecuta `createTeam({ inputs, ctx })`.
   - Llama `team.start({ inputs })`.
   - Convierte `workflowResult.result` a texto.
   - Retorna el resultado con el formato de `AgentToolResult` esperado por OpenClaw.

---

## 4. Contrato requerido del módulo del usuario (preferencia B)

El módulo del usuario debe exportar:

1. `export const teamMetadata = { description: string }`
2. `export function createTeam(args: { inputs: Record<string, unknown>, ctx?: ... }): Team`

Ejemplo mínimo (TS):

```ts
// team.ts (usuario)
import type { Team } from 'kaibanjs';
import { Team, Agent, Task } from 'kaibanjs';

export const teamMetadata = {
  description:
    'Ejecuta el workflow KaibanJS para convertir la petición del usuario en una respuesta final. Úsalo cuando el usuario solicite planificación, análisis o generación de contenido estructurado.',
};

export function createTeam({
  inputs,
}: {
  inputs: Record<string, unknown>;
}): Team {
  const topic = String(inputs.topic ?? inputs.message ?? '');
  // ... crea agentes/tareas según tu lógica ...
  return new Team({
    name: 'Mi Team',
    agents: [],
    tasks: [],
    inputs: { topic },
    env: { OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? '' },
  });
}
```

### Notas importantes

- El plugin **no** intenta deducir el significado de `inputs`. El usuario define qué usa su `Team`.
- El plugin sí necesita un `description` claro y accionable: ese es el corazón de la preferencia B.

---

## 5. Contrato de configuración del plugin (OpenClaw)

El plugin debe aceptar una configuración en `openclaw.json` con una sección `team`.

Campos propuestos:

- `team.modulePath` (string, requerido): path relativo/absoluto (según convención) al módulo del usuario en el host donde corre el Gateway.
- `team.exportName` (string, opcional, default: `"createTeam"`): nombre del export factory.
- `team.metadataExportName` (string, opcional, default: `"teamMetadata"`): nombre del export metadata.
- `team.defaults` (object, opcional): inputs por defecto que el tool añadirá/mezclará con `inputs` que reciba el agente.

Ejemplo de config:

```json5
{
  plugins: {
    enabled: true,
    entries: {
      'kaibanjs-plugin': {
        enabled: true,
        config: {
          team: {
            modulePath: './teams/team.ts',
            exportName: 'createTeam',
            metadataExportName: 'teamMetadata',
            defaults: {
              // Ej: reglas o valores por defecto del Team
            },
          },
        },
      },
    },
  },
  agents: {
    list: [
      {
        id: 'main',
        default: true,
        tools: {
          allow: ['kaiban_run_team'],
        },
      },
    ],
  },
}
```

---

## 6. Instalación del plugin en OpenClaw

### 6.1 Construcción/distribución del plugin (KaibanJS)

Como el plugin debe poder instalarse desde:

`openclaw plugins install ./packages/openclaw-plugin`

la estrategia recomendada es:

1. Instalar directamente el plugin desde `packages/` (este paquete ya contiene `openclaw.plugin.json` + `index.ts` en la raíz).
2. El usuario apunta a su `Team` propio vía `plugins.entries.<pluginId>.config.team.modulePath`.

### 6.2 Comando de instalación (en la máquina del Gateway)

```bash
openclaw plugins install ./packages/openclaw-plugin
openclaw stop
openclaw start
```

**Razonamiento:** aunque algunas partes del sistema puedan “hot reload” de manera parcial, para estar seguros con config de plugins y channel integrations, el flujo recomendado es reiniciar el Gateway tras cambios en `openclaw.json`.

---

## 7. Registro de la tool (cómo se “machea” con el agente)

La tool debe registrarse con:

- `name`: `kaiban_run_team`
- `description`: `teamMetadata.description` exportado por el módulo del usuario
- `parameters`:
  - `inputs`: `object` con `additionalProperties: true` (para no bloquear schemas de inputs distintos entre usuarios)

Descripción del `description`:

- El LLM utiliza este texto para decidir si invocar o no la tool.
- Con tu preferencia B, el `description` “representa” el propósito del Team de forma autoritativa (lo define el usuario).

---

## 8. (Opcional) Prompt mutation con `before_prompt_build`

El plugin puede registrar opcionalmente un hook `before_prompt_build` para incluir instrucciones en el prompt del agente.

Esto NO reemplaza el rol del `description` del tool, pero ayuda a:

- reforzar reglas de uso (“cuando el usuario pida X, usa `kaiban_run_team`”)
- minimizar respuestas inventadas cuando el agente no llama la tool

Ejemplo de lógica (conceptual):

- `prependSystemContext`:
  - “Si necesitas ejecutar un workflow KaibanJS para producir la respuesta final, llama a `kaiban_run_team` con `inputs` que contengan el mensaje del usuario.”

---

## 9. Compatibilidad con versiones recientes de OpenClaw (y riesgos)

OpenClaw cambia con frecuencia. Para mantener compatibilidad:

1. **Usar API estable del plugin SDK**:

   - `openclaw.plugin.json` + `api.registerTool(...)`
   - Evitar depender de hooks frágiles para interceptación de mensajes de salida.

2. **Evitar reliance en `message_sending`**:

   - Hay issues reportados en algunas versiones donde ciertos hooks tipados no se ejecutan como se espera.
   - Este diseño basa la integración en tool-call → resultado, que es el camino más directo y menos acoplado.

3. **Hooks solo como “asistencia”**:

   - Si `before_prompt_build` no funcionara en alguna versión/escenario, el plugin aún funciona: el agente puede llamar la tool igual gracias a su `description`.

4. **Restart recomendado**:

   - cambios en `openclaw.json` (especialmente habilitación de plugins y allowlists) deben acompañarse por restart del Gateway.

5. **Trust boundary**:
   - el plugin importa y ejecuta código del usuario en el proceso del Gateway (native plugin).
   - Documentar que el módulo del Team debe considerarse “trusted”.

---

## 10. Plan de pruebas (checklist)

1. **Carga del plugin**

   - `openclaw plugins list` y `openclaw plugins inspect kaibanjs-plugin`
   - verificar que valida `configSchema` y que el plugin carga sin errores.

2. **Tool availability**

   - asegurar `agents.list[].tools.allow` incluye `kaiban_run_team`

3. **Match por description**

   - enviar una solicitud al agente explícita (“necesito el workflow KaibanJS…”) y confirmar que llama a la tool (observando logs).

4. **Ejecución y salida**

   - confirmar que `workflowResult.result` se convierte correctamente a texto y regresa como contenido del tool.

5. **Errores**
   - validar fallos comunes: `modulePath` incorrecto, exportName/método inexistente, `teamMetadata.description` vacío.

---

## 11. Entregables (qué documentar y dónde)

Este documento cubre la propuesta. Los entregables a implementar (en repo) deberían incluir:

- Paquete de plugin genérico en `packages/` (ej. `packages/openclaw-plugin/`)
- Bundle compatible con OpenClaw extension bajo `./packages/openclaw-plugin/`
- `openclaw.plugin.json` del plugin
- Contrato (README) para el desarrollador del módulo que exporta:
  - `teamMetadata.description`
  - `createTeam(...)`
