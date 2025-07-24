# WorkflowDrivenAgent

El `WorkflowDrivenAgent` es un agente especializado que ejecuta workflows en lugar de usar razonamiento basado en LLM. Este agente mantiene el estado del workflow y puede manejar operaciones de suspensión y reanudación para workflows de larga duración.

## Características

- **Ejecución de Workflows**: Ejecuta workflows definidos usando el paquete `@kaibanjs/workflow`
- **Manejo de Estado**: Mantiene el estado del workflow entre ejecuciones
- **Suspensión y Reanudación**: Soporta workflows que pueden suspenderse y reanudarse
- **Compatibilidad con Teams**: Se integra perfectamente con el sistema de teams existente
- **Manejo de Errores**: Manejo robusto de errores inspirado en `ReactChampionAgent`

## Uso Básico

```typescript
import { WorkflowDrivenAgent } from './workflowDrivenAgent';
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

// Crear el agente
const agent = new WorkflowDrivenAgent({
  name: 'Workflow Agent',
  role: 'Execute workflows',
  goal: 'Process data using workflows',
  background: 'Specialized workflow execution agent',
  workflow: workflow,
});

// Usar el agente en un team
// El agente se inicializará automáticamente cuando se asigne a un team
```

## Integración con Teams

El `WorkflowDrivenAgent` se integra perfectamente con el sistema de teams existente:

```typescript
import { Team } from 'kaibanjs';

const team = new Team({
  name: 'Workflow Team',
  agents: [
    new WorkflowDrivenAgent({
      name: 'Data Processor',
      role: 'Process data using workflows',
      goal: 'Execute data processing workflows',
      background: 'Specialized for data processing',
      workflow: dataProcessingWorkflow,
    }),
    new ReactChampionAgent({
      name: 'Analyst',
      role: 'Analyze results',
      goal: 'Provide insights on processed data',
      background: 'Data analysis expert',
    }),
  ],
  tasks: [
    {
      id: 'process-data',
      description: 'Process the input data using workflow',
      agent: 'Data Processor',
    },
    {
      id: 'analyze-results',
      description: 'Analyze the processed data',
      agent: 'Analyst',
    },
  ],
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

const approvalAgent = new WorkflowDrivenAgent({
  name: 'Approval Agent',
  role: 'Handle approval workflows',
  goal: 'Process approvals with manual intervention',
  background: 'Specialized for approval processes',
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
- Información del agente (nombre, rol, objetivo)
- Contexto de la tarea

Este contexto está disponible para todos los pasos del workflow.

## Eventos y Monitoreo

El agente se suscribe a eventos del workflow para monitoreo:

```typescript
// El agente automáticamente se suscribe a eventos del workflow
const run = workflow.createRun();
run.watch((event) => {
  console.log('Workflow event:', event);
});
```

## Manejo de Errores

El agente maneja diferentes tipos de errores:

- **Workflow Failed**: Cuando el workflow falla durante la ejecución
- **Workflow Suspended**: Cuando el workflow se suspende para intervención manual
- **Execution Error**: Errores durante la ejecución del workflow

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

## Ejemplos

Ver `workflowDrivenAgent.example.ts` para ejemplos completos de uso.

## Compatibilidad

El `WorkflowDrivenAgent` es completamente compatible con:

- Sistema de teams existente
- Sistema de logs y monitoreo
- Sistema de manejo de errores
- Sistema de estado de agentes

## Dependencias

- `@kaibanjs/workflow`: Para la definición y ejecución de workflows
- `zod`: Para validación de esquemas
- Sistema de stores existente para integración con teams
