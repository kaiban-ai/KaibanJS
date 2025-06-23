# @kaibanjs/workflow

A browser-compatible workflow engine for kaibanjs, inspired by the original workflow implementation but redesigned for better type safety and browser compatibility.

## Features

- Type-safe workflow definitions using Zod schemas
- Browser-compatible event handling using eventemitter3
- Sequential and parallel step execution
- Input/output validation
- Error handling
- Execution monitoring through watch events

## Installation

```bash
npm install @kaibanjs/workflow
```

## Usage

### Basic Example

```typescript
import { Workflow } from '@kaibanjs/workflow';
import { z } from 'zod';

// Create steps
const addStep = Workflow.createStep({
  id: 'add',
  inputSchema: z.object({ a: z.number(), b: z.number() }),
  outputSchema: z.object({ sum: z.number() }),
  execute: async ({ inputData }) => ({
    sum: inputData.a + inputData.b,
  }),
});

const multiplyStep = Workflow.createStep({
  id: 'multiply',
  inputSchema: z.object({ sum: z.number() }),
  outputSchema: z.object({ result: z.number() }),
  execute: async ({ inputData }) => ({
    result: inputData.sum * 2,
  }),
});

// Create workflow
const mathWorkflow = Workflow.createWorkflow({
  id: 'math-workflow',
  inputSchema: z.object({ a: z.number(), b: z.number() }),
  outputSchema: z.object({ result: z.number() }),
  steps: {
    add: addStep,
    multiply: multiplyStep,
  },
});

// Execute workflow
const result = await mathWorkflow.start({ a: 2, b: 3 });
console.log(result); // { status: 'success', result: { result: 10 } }
```

### Watching Execution

```typescript
const unsubscribe = mathWorkflow.watch((event) => {
  console.log('Current step:', event.payload.currentStep);
  console.log('Workflow state:', event.payload.workflowState);
});

// Execute workflow
await mathWorkflow.start({ a: 2, b: 3 });

// Clean up
unsubscribe();
```

### Error Handling

```typescript
const result = await mathWorkflow.start({ a: 2, b: 3 });

if (result.status === 'success') {
  console.log('Success:', result.result);
} else if (result.status === 'failed') {
  console.error('Error:', result.error);
}
```

## API Reference

### Workflow

The main class for creating and executing workflows.

#### Static Methods

- `createStep<TInput, TOutput>(config)`: Creates a new step
- `createWorkflow<TInput, TOutput, TSteps>(config)`: Creates a new workflow

#### Instance Methods

- `start(inputData)`: Starts the workflow execution
- `watch(callback)`: Subscribes to execution events

### Step

A unit of work in a workflow.

#### Properties

- `id`: Unique identifier
- `description`: Optional description
- `inputSchema`: Zod schema for input validation
- `outputSchema`: Zod schema for output validation
- `resumeSchema`: Optional Zod schema for resume data
- `suspendSchema`: Optional Zod schema for suspend data
- `execute`: Async function that performs the step's work

### StepContext

The context object passed to step execution functions.

#### Properties

- `inputData`: The input data matching the inputSchema
- `resumeData`: Optional resume data when resuming from suspension
- `getStepResult`: Function to access results from other steps
- `getInitData`: Function to access the initial input data
- `suspend`: Function to pause execution (for user interaction)

## Differences from Original Workflow API

1. **Browser Compatibility**: Uses eventemitter3 instead of Node's EventEmitter
2. **Type Safety**: Enhanced type safety with Zod schemas
3. **Simplified API**: Removed dependencies on external services
4. **Independent**: No dependency on kaibanjs core services

## TODO

- [ ] Implement agent integration
- [ ] Implement tool integration
- [ ] Add parallel execution support
- [ ] Add conditional branching
- [ ] Add loop support
- [ ] Add suspend/resume functionality

## License

MIT
