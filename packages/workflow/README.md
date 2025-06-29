# @kaibanjs/workflow

A modern, type-safe workflow engine for building complex business processes with support for sequential execution, parallel processing, conditional branching, loops, and real-time streaming.

## Features

- **Type-safe workflow definitions** using Zod schemas for input/output validation
- **Multiple execution patterns**: sequential, parallel, conditional, loops (do-while, do-until, foreach)
- **Real-time streaming** with ReadableStream for live execution monitoring
- **Suspend and resume** functionality for long-running workflows
- **State management** with Zustand for reactive updates
- **Error handling** with comprehensive error propagation
- **Data mapping** between steps with flexible transformation options
- **Nested workflows** support for complex compositions
- **Browser and Node.js compatible**

## Installation

```bash
npm install @kaibanjs/workflow
```

## Quick Start

### Basic Sequential Workflow

```typescript
import { createStep, createWorkflow } from '@kaibanjs/workflow';
import { z } from 'zod';

// Create steps
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

// Create and configure workflow
const workflow = createWorkflow({
  id: 'math-workflow',
  inputSchema: z.object({ a: z.number(), b: z.number() }),
  outputSchema: z.number(),
});

workflow.then(addStep).then(multiplyStep);
workflow.commit();

// Execute workflow
const run = workflow.createRun();
const result = await run.start({ inputData: { a: 2, b: 3 } });

console.log(result); // { status: 'completed', result: 30 }
```

### Real-time Streaming

```typescript
const run = workflow.createRun();
const { stream, getWorkflowState } = run.stream({ inputData: { a: 2, b: 3 } });

// Read from the stream
const reader = stream.getReader();
try {
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    console.log('Event:', value);
    // value contains: { type, payload, timestamp, runId, workflowId }
  }
} finally {
  reader.releaseLock();
}

// Get final result
const finalResult = await getWorkflowState();
```

### State Monitoring

```typescript
const run = workflow.createRun();

// Subscribe to state changes
const unsubscribe = run.watch((event) => {
  console.log('Step status:', event.payload.stepStatus);
  console.log('Workflow state:', event.payload.workflowState);
});

// Execute workflow
await run.start({ inputData: { a: 2, b: 3 } });

// Clean up
unsubscribe();
```

## Core Concepts

### Steps

Steps are the basic building blocks of workflows. Each step has:

- **Input/Output schemas**: Zod schemas for type validation
- **Execute function**: Async function that performs the work
- **Optional suspend/resume schemas**: For interactive workflows

```typescript
const step = createStep({
  id: 'process-data',
  inputSchema: z.object({ data: z.string() }),
  outputSchema: z.object({ processed: z.string() }),
  execute: async ({ inputData }) => {
    return { processed: inputData.data.toUpperCase() };
  },
});
```

### Workflows

Workflows orchestrate steps using various execution patterns:

```typescript
const workflow = createWorkflow({
  id: 'my-workflow',
  inputSchema: z.object({ data: z.string() }),
  outputSchema: z.object({ result: z.string() }),
});

// Sequential execution
workflow.then(step1).then(step2);

// Parallel execution
workflow.parallel([step1, step2]).then(combineStep);

// Conditional branching
workflow.branch([
  [async ({ inputData }) => inputData.value > 10, highValueStep],
  [async () => true, defaultStep], // fallback
]);

// Loops
workflow.dowhile(loopStep, async ({ getStepResult }) => {
  const result = getStepResult(loopStep.id);
  return result.count < 5;
});

workflow.foreach(processStep, { concurrency: 3 });

workflow.commit(); // Finalize workflow definition
```

### Runs

Runs represent individual executions of a workflow:

```typescript
const run = workflow.createRun({ runId: 'unique-run-id' });

// Start execution
const result = await run.start({ inputData: { ... } });

// Resume suspended execution
const resumeResult = await run.resume({
  step: 'suspendable-step',
  resumeData: { continue: true, value: 5 },
});
```

## Advanced Patterns

### Data Mapping

Transform data between steps:

```typescript
workflow
  .then(userStep)
  .map(async ({ getStepResult }) => {
    const userResult = getStepResult(userStep.id);
    return {
      profile: {
        id: userResult.user.id,
        name: userResult.user.name,
      },
    };
  })
  .then(profileStep);
```

### Suspend and Resume

Create interactive workflows:

```typescript
const suspendableStep = createStep({
  id: 'approval',
  inputSchema: z.object({ amount: z.number() }),
  outputSchema: z.object({ approved: z.boolean() }),
  resumeSchema: z.object({ approved: z.boolean() }),
  suspendSchema: z.object({ reason: z.string() }),
  execute: async ({ inputData, suspend, isResuming, resumeData }) => {
    if (isResuming) {
      return { approved: resumeData.approved };
    }

    if (inputData.amount > 1000) {
      await suspend({ reason: 'requires_approval' });
      return { approved: false };
    }

    return { approved: true };
  },
});
```

### Nested Workflows

Compose complex workflows:

```typescript
const nestedWorkflow = createWorkflow({
  id: 'nested',
  inputSchema: z.number(),
  outputSchema: z.number(),
});

nestedWorkflow.then(doubleStep);
nestedWorkflow.commit();

const mainWorkflow = createWorkflow({
  id: 'main',
  inputSchema: z.object({ a: z.number(), b: z.number() }),
  outputSchema: z.number(),
});

mainWorkflow.then(addStep).then(nestedWorkflow);
mainWorkflow.commit();
```

### Parallel Execution with Concurrency Control

```typescript
const workflow = createWorkflow({
  id: 'parallel-test',
  inputSchema: z.array(z.number()),
  outputSchema: z.array(z.number()),
});

workflow.foreach(processStep, { concurrency: 5 });
workflow.commit();
```

## API Reference

### createStep

Creates a new workflow step.

```typescript
createStep<TInput, TOutput>(config: {
  id: string;
  description?: string;
  inputSchema: z.ZodType<TInput>;
  outputSchema: z.ZodType<TOutput>;
  resumeSchema?: z.ZodType;
  suspendSchema?: z.ZodType;
  execute: (context: StepContext<TInput>) => Promise<TOutput>;
}): Step<TInput, TOutput>
```

### createWorkflow

Creates a new workflow.

```typescript
createWorkflow<TInput, TOutput>(config: {
  id: string;
  description?: string;
  inputSchema: z.ZodType<TInput>;
  outputSchema: z.ZodType<TOutput>;
  retryConfig?: {
    attempts?: number;
    delay?: number;
  };
}): Workflow<TInput, TOutput>
```

### Workflow Methods

- `then(step)`: Add sequential step
- `parallel(steps[])`: Add parallel steps
- `branch(conditions[])`: Add conditional execution
- `dowhile(step, condition)`: Add do-while loop
- `dountil(step, condition)`: Add do-until loop
- `foreach(step, options)`: Add foreach loop
- `map(mapping)`: Transform data between steps
- `commit()`: Finalize workflow definition
- `createRun(options?)`: Create a new run instance

### Run Methods

- `start({ inputData, runtimeContext })`: Start execution
- `stream({ inputData, runtimeContext })`: Start streaming execution
- `resume({ step, resumeData, runtimeContext })`: Resume suspended execution
- `watch(callback)`: Subscribe to events
- `subscribe(callback)`: Subscribe to state changes
- `getState()`: Get current state

### StepContext

The context object passed to step execution functions:

```typescript
interface StepContext<TInput> {
  inputData: TInput;
  getStepResult: <T>(stepId: string) => T;
  getInitData: <T>() => T;
  runtimeContext?: RuntimeContext;
  isResuming?: boolean;
  resumeData?: any;
  suspend: (suspendPayload: any) => Promise<StepResult>;
}
```

## Error Handling

Workflows handle errors gracefully:

```typescript
const result = await workflow.start({ inputData: { ... } });

if (result.status === 'completed') {
  console.log('Success:', result.result);
} else if (result.status === 'failed') {
  console.error('Error:', result.error);
} else if (result.status === 'suspended') {
  console.log('Suspended:', result.suspended);
}
```

## State Management

The workflow engine uses Zustand for state management, providing:

- Real-time state updates
- Event streaming
- Step result tracking
- Execution path monitoring
- Suspended state management

## Browser Compatibility

This workflow engine is designed to work in both browser and Node.js environments, using:

- `zustand` for state management
- `p-queue` for execution queuing
- `zod` for schema validation

## Examples

See the test files in `src/run.test.ts` for comprehensive examples of:

- Basic workflow execution
- Parallel processing
- Conditional branching
- Loop execution (do-while, do-until, foreach)
- Data mapping and transformation
- Suspend and resume functionality
- Error handling
- State monitoring and observability
- Streaming execution
- Nested workflows
- Complex workflow patterns

## License

MIT
