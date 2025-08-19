# WorkflowDrivenAgent

El `WorkflowDrivenAgent` es un agente especializado que ejecuta workflows en lugar de usar razonamiento basado en LLM. Este agente mantiene el estado del workflow y puede manejar operaciones de suspensión y reanudación para workflows de larga duración.

## Características

- **Ejecución de Workflows**: Ejecuta workflows definidos usando el paquete `@kaibanjs/workflow`
- **Manejo de Estado**: Mantiene el estado del workflow entre ejecuciones
- **Suspensión y Reanudación**: Soporta workflows que pueden suspenderse y reanudarse
- **Compatibilidad con Teams**: Se integra perfectamente con el sistema de teams existente
- **Manejo de Errores**: Manejo robusto de errores con logging detallado
- **Logging en Tiempo Real**: Logs específicos para eventos de workflow mezclados con logs generales del equipo

## Uso Básico

```typescript
import { Agent } from 'kaibanjs';
import { createStep, createWorkflow } from '@kaibanjs/workflow';
import { z } from 'zod';

// Crear pasos del workflow
const processStep = createStep({
  id: 'process',
  inputSchema: z.object({ data: z.string() }),
  outputSchema: z.object({ result: z.string() }),
  execute: async ({ inputData }) => {
    const { data } = inputData as { data: string };
    return { result: data.toUpperCase() };
  },
});

// Crear el workflow
const workflow = createWorkflow({
  id: 'example-workflow',
  inputSchema: z.object({ data: z.string() }),
  outputSchema: z.object({ result: z.string() }),
});

workflow.then(processStep);
workflow.commit();

// Crear el agente usando el Agent wrapper
const agent = new Agent({
  type: 'WorkflowDrivenAgent',
  name: 'Workflow Agent',
  workflow: workflow,
});

// Usar el agente en un team
// El agente se inicializará automáticamente cuando se asigne a un team
```

## Integración con Teams

El `WorkflowDrivenAgent` se integra perfectamente con el sistema de teams existente:

```typescript
import { Agent, Task, Team } from 'kaibanjs';

const team = new Team({
  name: 'Workflow Team',
  agents: [
    new Agent({
      type: 'WorkflowDrivenAgent',
      name: 'Data Processor',
      workflow: dataProcessingWorkflow,
    }),
    new Agent({
      type: 'ReactChampionAgent',
      name: 'Analyst',
      role: 'Analyze results',
      goal: 'Provide insights on processed data',
      background: 'Data analysis expert',
    }),
  ],
  tasks: [
    new Task({
      description: 'Process the input data using workflow',
      expectedOutput: 'Processed data result',
      agent: 'Data Processor',
    }),
    new Task({
      description: 'Analyze the processed data',
      expectedOutput: 'Analysis insights',
      agent: 'Analyst',
    }),
  ],
});

// Ejecutar el equipo
const result = await team.start({ data: 'input data' });
```

## Workflows Complejos

El agente puede manejar workflows complejos con múltiples patrones:

```typescript
// Workflow con pasos secuenciales, condicionales y paralelos
const addStep = createStep({
  id: 'add',
  inputSchema: z.object({ a: z.number(), b: z.number() }),
  outputSchema: z.number(),
  execute: async ({ inputData }) => {
    const { a, b } = inputData as { a: number; b: number };
    return a + b;
  },
});

const multiplyStep = createStep({
  id: 'multiply',
  inputSchema: z.number(),
  outputSchema: z.number(),
  execute: async ({ inputData, getInitData }) => {
    const sum = inputData as number;
    const { a, b } = getInitData() as { a: number; b: number };
    return sum * a * b;
  },
});

const evenStep = createStep({
  id: 'even',
  inputSchema: z.number(),
  outputSchema: z.string(),
  execute: async ({ inputData }) => {
    const num = inputData as number;
    return `even: ${num}`;
  },
});

const finalStep = createStep({
  id: 'final',
  inputSchema: z.any(),
  outputSchema: z.object({
    sequentialResult: z.number(),
    conditionalResult: z.string(),
    finalResult: z.number(),
  }),
  execute: async ({ getStepResult }) => {
    const sequentialResult = getStepResult('multiply') as number;
    const conditionalResult = getStepResult('even') as string;
    return {
      sequentialResult,
      conditionalResult,
      finalResult: sequentialResult,
    };
  },
});

const complexWorkflow = createWorkflow({
  id: 'complex-workflow',
  inputSchema: z.object({ a: z.number(), b: z.number() }),
  outputSchema: z.object({
    sequentialResult: z.number(),
    conditionalResult: z.string(),
    finalResult: z.number(),
  }),
});

// Construir workflow complejo: secuencial -> condicional -> final
complexWorkflow
  .then(addStep)
  .then(multiplyStep)
  .branch([
    [async ({ inputData }) => (inputData as number) % 2 === 0, evenStep],
    [async () => true, evenStep], // fallback
  ])
  .then(finalStep);

complexWorkflow.commit();

const complexAgent = new Agent({
  type: 'WorkflowDrivenAgent',
  name: 'Complex Workflow Agent',
  workflow: complexWorkflow,
});
```

## Workflows con Suspensión

El agente puede manejar workflows que se suspenden para requerir intervención manual:

```typescript
const approvalStep = createStep({
  id: 'approval',
  inputSchema: z.object({ data: z.string() }),
  outputSchema: z.object({ approved: z.boolean() }),
  suspendSchema: z.object({ reason: z.string() }),
  resumeSchema: z.object({ approved: z.boolean() }),
  execute: async ({ inputData, suspend, isResuming, resumeData }) => {
    if (isResuming) {
      return { approved: resumeData.approved };
    }

    // Suspender para aprobación manual
    await suspend({ reason: 'requires_manual_approval' });
    return { approved: false };
  },
});

const approvalWorkflow = createWorkflow({
  id: 'approval-workflow',
  inputSchema: z.object({ data: z.string() }),
  outputSchema: z.object({ approved: z.boolean() }),
});

approvalWorkflow.then(approvalStep);
approvalWorkflow.commit();

const approvalAgent = new Agent({
  type: 'WorkflowDrivenAgent',
  name: 'Approval Agent',
  workflow: approvalWorkflow,
});
```

## Manejo de Estado

El agente mantiene el estado del workflow internamente:

- **currentRunId**: ID del run actual del workflow
- **workflowStatus**: Estado actual del workflow (idle, running, suspended, completed, failed)
- **lastResult**: Último resultado del workflow
- **lastError**: Último error del workflow
- **metadata**: Metadatos de ejecución (iteraciones, tiempos, etc.)

## Contexto de Runtime

El agente crea automáticamente un contexto de runtime que incluye:

- Datos de la tarea (id, descripción, estado, inputs)
- Información del agente (nombre)
- Contexto de la tarea

Este contexto está disponible para todos los pasos del workflow.

## Eventos y Monitoreo

El agente se suscribe automáticamente a eventos del workflow para monitoreo y logging:

```typescript
// El agente automáticamente se suscribe a eventos del workflow
// y genera logs específicos para cada evento:
// - 🚀 WorkflowDrivenAgent started workflow execution
// - ⚡ WorkflowDrivenAgent started step: [stepId]
// - ✅ WorkflowDrivenAgent completed step: [stepId]
// - ❌ WorkflowDrivenAgent failed step: [stepId]
// - ✅ WorkflowDrivenAgent completed workflow execution
// - 🏁 WorkflowDrivenAgent completed task successfully
```

## Logging y Monitoreo

El agente genera logs detallados que se integran con el sistema de logging del equipo:

- **Logs en tiempo real**: Cada evento del workflow se registra inmediatamente
- **Logs específicos**: Categoría `WorkflowAgentStatusUpdate` para distinguir de otros agentes
- **Backward compatibility**: Los logs de `ReactChampionAgent` mantienen su formato original
- **Integración con workflowLogs**: Los logs aparecen mezclados en el flujo general del equipo

## Manejo de Errores

El agente maneja diferentes tipos de errores:

- **Workflow Failed**: Cuando el workflow falla durante la ejecución
- **Workflow Suspended**: Cuando el workflow se suspende para intervención manual
- **Execution Error**: Errores durante la ejecución del workflow
- **Step Failed**: Cuando un paso específico del workflow falla

## Métodos Principales

### `workOnTask(task, inputs, context)`

Ejecuta el workflow asignado con los inputs de la tarea.

### `workOnTaskResume(task)`

Reanuda un workflow suspendido.

### `workOnFeedback(task, feedbackList, context)`

No aplicable para agentes basados en workflow (retorna error).

### `reset()`

Resetea el estado del agente y del workflow.

### `getCleanedAgent()`

Retorna una versión limpia del agente sin información sensible.

## Ejemplos de Tests

```typescript
// Test básico de integración con teams
it('should work with teams', async () => {
  const task = new Task({
    description: 'Execute the workflow',
    expectedOutput: 'The workflow result',
    agent: workflowAgent,
  });

  const team = new Team({
    name: 'Test Team',
    agents: [workflowAgent],
    tasks: [task],
  });

  const result = await team.start({ a: 1, b: 2 });
  expect(result.result).toBe(3);
});

// Test de logging en tiempo real
it('should log workflow execution steps in real-time', async () => {
  const team = new Team({
    name: 'Logging Team',
    agents: [workflowAgent],
    tasks: [task],
  });

  const result = await team.start({ data: 'test' });

  // Verificar logs del workflow
  const workflowLogs = team.store.getState().workflowLogs;
  const workflowAgentLogs = workflowLogs.filter(
    (log) => log.logType === 'WorkflowAgentStatusUpdate'
  );

  expect(workflowAgentLogs.length).toBeGreaterThan(0);
});
```

## Compatibilidad

El `WorkflowDrivenAgent` es completamente compatible con:

- Sistema de teams existente
- Sistema de logs y monitoreo
- Sistema de manejo de errores
- Sistema de estado de agentes
- Backward compatibility con `ReactChampionAgent`

## Dependencias

- `@kaibanjs/workflow`: Para la definición y ejecución de workflows
- `zod`: Para validación de esquemas
- Sistema de stores existente para integración con teams

## Diferencias con ReactChampionAgent

- **Sin LLM**: No usa razonamiento basado en LLM
- **Sin role/goal/background**: Se enfoca únicamente en ejecución de workflows
- **Logging específico**: Logs categorizados como `WorkflowAgentStatusUpdate`
- **Estado de workflow**: Mantiene estado interno del workflow
- **Manejo de suspensión**: Soporte nativo para workflows suspendibles
