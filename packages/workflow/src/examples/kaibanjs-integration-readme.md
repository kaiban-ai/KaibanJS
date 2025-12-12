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

## Structured Output Chaining

When a `WorkflowDrivenAgent` is preceded by another agent (like `ReactChampionAgent`) in a team, the system can automatically pass structured outputs from the previous task as inputs to the workflow. This feature enables seamless data flow between different agent types.

### How It Works

1. **Previous Task with `outputSchema`**: The preceding task must have an `outputSchema` defined (Zod schema)
2. **Automatic Extraction**: The system automatically extracts and validates the structured output from the previous task
3. **Input Mapping**: The structured output is merged with team inputs and passed to the `WorkflowDrivenAgent`
4. **Schema Matching**: If the workflow's `inputSchema` matches the previous task's `outputSchema`, the output is passed directly at the root level

### Example: ReactChampion → WorkflowDriven

```typescript
import { Agent, Task, Team } from 'kaibanjs';
import { createStep, createWorkflow } from '@kaibanjs/workflow';
import { z } from 'zod';

// Define output schema for ReactChampionAgent task
const textAnalysisSchema = z.object({
  title: z.string(),
  summary: z.string(),
  keywords: z.array(z.string()),
  wordCount: z.number(),
  sentiment: z.enum(['positive', 'neutral', 'negative']),
  topics: z.array(z.string()),
});

// ReactChampionAgent for text analysis
const textAnalyzerAgent = new Agent({
  name: 'Text Analyzer',
  role: 'Text Analysis Expert',
  goal: 'Analyze text and extract structured information',
  background: 'Expert in NLP and text analysis',
  type: 'ReactChampionAgent',
});

// Task 1: Analyze text with structured output
const analyzeTextTask = new Task({
  description: 'Analyze the following text: {text}',
  expectedOutput: 'Structured analysis with title, summary, keywords, etc.',
  outputSchema: textAnalysisSchema, // ⚠️ Required for structured output passing
  agent: textAnalyzerAgent,
});

// Workflow that processes the structured analysis
const validateStep = createStep({
  id: 'validate',
  inputSchema: textAnalysisSchema, // ⚠️ Must match the outputSchema above
  outputSchema: z.object({
    isValid: z.boolean(),
    analysis: textAnalysisSchema,
  }),
  execute: async ({ inputData }) => {
    const { title, summary, keywords } = inputData;
    return {
      isValid: title.length > 0 && summary.length > 0 && keywords.length > 0,
      analysis: inputData,
    };
  },
});

const processingWorkflow = createWorkflow({
  id: 'processing-workflow',
  inputSchema: textAnalysisSchema, // ⚠️ Must match the outputSchema of Task 1
  outputSchema: z.object({
    isValid: z.boolean(),
    analysis: textAnalysisSchema,
  }),
});

processingWorkflow.then(validateStep);
processingWorkflow.commit();

// WorkflowDrivenAgent for processing
const processorAgent = new Agent({
  type: 'WorkflowDrivenAgent',
  name: 'Analysis Processor',
  workflow: processingWorkflow,
});

// Task 2: Process the structured output from Task 1
const processAnalysisTask = new Task({
  description: 'Process and validate the text analysis',
  expectedOutput: 'Validated analysis result',
  agent: processorAgent,
});

// Create team - Task 2 will automatically receive Task 1's output
const team = new Team({
  name: 'Structured Output Chain Team',
  agents: [textAnalyzerAgent, processorAgent],
  tasks: [analyzeTextTask, processAnalysisTask],
  inputs: {
    text: 'Sample text to analyze',
  },
});
```

### Constraints and Disclaimers

⚠️ **Important Considerations When WorkflowDrivenAgent is Preceded by Another Agent:**

1. **`outputSchema` Requirement**:

   - The preceding task **MUST** have an `outputSchema` defined
   - Without `outputSchema`, the output will be passed as a string in the context, not as structured input
   - The `outputSchema` must be a valid Zod schema

2. **Schema Matching**:

   - For optimal behavior, the workflow's `inputSchema` should match the previous task's `outputSchema`
   - When schemas match, the output is passed directly at the root level
   - When schemas don't match, the output is passed under the task ID key (e.g., `{ [taskId]: output }`)

3. **Multiple Dependencies**:

   - If a task has multiple dependencies with `outputSchema`, all outputs are merged
   - Outputs are passed under their respective task IDs
   - The workflow must handle multiple inputs or use `getInitData()` to access specific task outputs

4. **Input Precedence**:

   - Structured outputs from dependencies have **higher precedence** than team inputs
   - If both team inputs and structured outputs have the same keys, structured outputs will override team inputs
   - This ensures that task outputs take priority over initial team configuration

5. **Validation**:

   - The system validates outputs against their `outputSchema` before passing them
   - If validation fails, the original result is still passed but a warning is logged
   - Invalid outputs may cause the workflow to fail if strict validation is required

6. **Type Safety**:

   - While the system attempts to maintain type safety, runtime validation is performed
   - Always ensure your workflow's `inputSchema` can handle the actual output structure
   - Consider using Zod's `.passthrough()` or `.catchall()` for flexible schemas

7. **Backward Compatibility**:

   - If no `outputSchema` is defined, the system falls back to the original behavior
   - Outputs are passed as strings in the context, not as structured inputs
   - Existing teams without `outputSchema` continue to work as before

8. **Error Handling**:
   - If a dependency task fails, its output won't be available
   - The workflow will receive team inputs only (or other successful dependencies)
   - Always handle cases where expected structured inputs might be missing

### Best Practices

1. **Always Define `outputSchema`**: When you want structured output passing, always define `outputSchema` on the preceding task
2. **Match Schemas**: Design your workflow's `inputSchema` to match the previous task's `outputSchema` for seamless integration
3. **Handle Missing Inputs**: Use optional fields or default values in your workflow to handle cases where structured inputs might not be available
4. **Test Schema Compatibility**: Verify that your schemas are compatible before deploying to production
5. **Use Descriptive Task IDs**: When accessing outputs from multiple dependencies, use clear task IDs to avoid confusion

### Example: Handling Multiple Dependencies

```typescript
// If you have multiple dependencies, access them via task IDs
const multiInputStep = createStep({
  id: 'process-multi',
  inputSchema: z.object({
    task1Output: z.object({ data: z.string() }),
    task2Output: z.object({ count: z.number() }),
  }),
  outputSchema: z.object({ result: z.string() }),
  execute: async ({ inputData, getInitData }) => {
    // Access specific task outputs from merged inputs
    const allInputs = getInitData() as Record<string, unknown>;
    const task1Id = 'task-1-id'; // Your actual task ID
    const task2Id = 'task-2-id'; // Your actual task ID

    const task1Output = allInputs[task1Id] as { data: string };
    const task2Output = allInputs[task2Id] as { count: number };

    return {
      result: `${task1Output.data} - ${task2Output.count}`,
    };
  },
});
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
