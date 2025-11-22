# WorkflowDrivenAgent

The `WorkflowDrivenAgent` new approach, is a specialized agent that executes workflows instead of using LLM-based reasoning. This agent maintains the workflow state and can handle suspension and resumption operations for long-running workflows.

## Features

- **Workflow Execution**: Executes workflows defined using the `@kaibanjs/workflow` package
- **State Management**: Maintains workflow state between executions
- **Suspension and Resumption**: Supports workflows that can be suspended and resumed
- **Team Compatibility**: Integrates seamlessly with the existing team system
- **Error Handling**: Robust error handling with detailed logging
- **Real-time Logging**: Specific logs for workflow events mixed with general team logs

## Basic Usage

```typescript
import { Agent } from 'kaibanjs';
import { createStep, createWorkflow } from '@kaibanjs/workflow';
import { z } from 'zod';

// Create workflow steps
const processStep = createStep({
  id: 'process',
  inputSchema: z.object({ data: z.string() }),
  outputSchema: z.object({ result: z.string() }),
  execute: async ({ inputData }) => {
    const { data } = inputData as { data: string };
    return { result: data.toUpperCase() };
  },
});

// Create the workflow
const workflow = createWorkflow({
  id: 'example-workflow',
  inputSchema: z.object({ data: z.string() }),
  outputSchema: z.object({ result: z.string() }),
});

workflow.then(processStep);
workflow.commit();

// Create the agent using the Agent wrapper
const agent = new Agent({
  type: 'WorkflowDrivenAgent',
  name: 'Workflow Agent',
  workflow: workflow,
});

// Use the agent in a team
// The agent will be automatically initialized when assigned to a team
```

## Team Integration

The `WorkflowDrivenAgent` integrates seamlessly with the existing team system:

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

// Execute the team
const result = await team.start({ data: 'input data' });
```

## Complex Workflows

The agent can handle complex workflows with multiple patterns:

```typescript
// Workflow with sequential, conditional, and parallel steps
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

// Build complex workflow: sequential -> conditional -> final
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

## Workflows with Suspension

The agent can handle workflows that suspend to require manual intervention:

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

    // Suspend for manual approval
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

## State Management

The agent maintains workflow state internally:

- **currentRunId**: ID of the current workflow run
- **workflowStatus**: Current workflow status (idle, running, suspended, completed, failed)
- **lastResult**: Last workflow result
- **lastError**: Last workflow error
- **metadata**: Execution metadata (iterations, times, etc.)

## Runtime Context

The agent automatically creates a runtime context that includes:

- Task data (id, description, status, inputs)
- Agent information (name)
- Task context

This context is available to all workflow steps.

## Events and Monitoring

The agent automatically subscribes to workflow events for monitoring and logging:

```typescript
// The agent automatically subscribes to workflow events
// and generates specific logs for each event:
// - 🚀 WorkflowDrivenAgent started workflow execution
// - ⚡ WorkflowDrivenAgent started step: [stepId]
// - ✅ WorkflowDrivenAgent completed step: [stepId]
// - ❌ WorkflowDrivenAgent failed step: [stepId]
// - ✅ WorkflowDrivenAgent completed workflow execution
// - 🏁 WorkflowDrivenAgent completed task successfully
```

## Logging and Monitoring

The agent generates detailed logs that integrate with the team's logging system:

- **Real-time logs**: Each workflow event is logged immediately
- **Specific logs**: `WorkflowAgentStatusUpdate` category to distinguish from other agents
- **Backward compatibility**: `ReactChampionAgent` logs maintain their original format
- **Integration with workflowLogs**: Logs appear mixed in the general team flow

## Error Handling

The agent handles different types of errors:

- **Workflow Failed**: When the workflow fails during execution
- **Workflow Suspended**: When the workflow suspends for manual intervention
- **Execution Error**: Errors during workflow execution
- **Step Failed**: When a specific workflow step fails

## Main Methods

### `workOnTask(task, inputs, context)`

Executes the assigned workflow with task inputs.

### `workOnTaskResume(task)`

Resumes a suspended workflow.

### `workOnFeedback(task, feedbackList, context)`

Not applicable for workflow-based agents (returns error).

### `reset()`

Resets the agent and workflow state.

### `getCleanedAgent()`

Returns a clean version of the agent without sensitive information.

## Test Examples

```typescript
// Basic team integration test
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

// Real-time logging test
it('should log workflow execution steps in real-time', async () => {
  const team = new Team({
    name: 'Logging Team',
    agents: [workflowAgent],
    tasks: [task],
  });

  const result = await team.start({ data: 'test' });

  // Verify workflow logs
  const workflowLogs = team.store.getState().workflowLogs;
  const workflowAgentLogs = workflowLogs.filter(
    (log) => log.logType === 'WorkflowAgentStatusUpdate'
  );

  expect(workflowAgentLogs.length).toBeGreaterThan(0);
});
```

## Compatibility

The `WorkflowDrivenAgent` is fully compatible with:

- Existing team system
- Logging and monitoring system
- Error handling system
- Agent state system
- Backward compatibility with `ReactChampionAgent`

## Dependencies

- `@kaibanjs/workflow`: For workflow definition and execution
- `zod`: For schema validation
- Existing store system for team integration

## Differences with ReactChampionAgent

- **No LLM**: Does not use LLM-based reasoning
- **No role/goal/background**: Focuses solely on workflow execution
- **Specific logging**: Logs categorized as `WorkflowAgentStatusUpdate`
- **Workflow state**: Maintains internal workflow state
- **Suspension handling**: Native support for suspendible workflows
