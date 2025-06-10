# @kaibanjs/cue

A browser-compatible workflow engine for kaibanjs, inspired by the original workflow implementation but redesigned for better type safety and browser compatibility.

## Features

- Type-safe workflow definitions using Zod schemas
- Browser-compatible event handling using eventemitter3
- Sequential and parallel block execution
- Input/output validation
- Error handling
- Execution monitoring through watch events

## Installation

```bash
npm install @kaibanjs/cue
```

## Usage

### Basic Example

```typescript
import { Cue } from '@kaibanjs/cue';
import { z } from 'zod';

// Create blocks
const addBlock = Cue.createBlock({
  id: 'add',
  inputSchema: z.object({ a: z.number(), b: z.number() }),
  outputSchema: z.object({ sum: z.number() }),
  execute: async ({ inputData }) => ({
    sum: inputData.a + inputData.b,
  }),
});

const multiplyBlock = Cue.createBlock({
  id: 'multiply',
  inputSchema: z.object({ sum: z.number() }),
  outputSchema: z.object({ result: z.number() }),
  execute: async ({ inputData }) => ({
    result: inputData.sum * 2,
  }),
});

// Create cue
const mathCue = Cue.createCue({
  id: 'math-cue',
  inputSchema: z.object({ a: z.number(), b: z.number() }),
  outputSchema: z.object({ result: z.number() }),
  blocks: {
    add: addBlock,
    multiply: multiplyBlock,
  },
});

// Execute cue
const result = await mathCue.start({ a: 2, b: 3 });
console.log(result); // { status: 'success', result: { result: 10 } }
```

### Watching Execution

```typescript
const unsubscribe = mathCue.watch((event) => {
  console.log('Current block:', event.payload.currentBlock);
  console.log('Cue state:', event.payload.cueState);
});

// Execute cue
await mathCue.start({ a: 2, b: 3 });

// Clean up
unsubscribe();
```

### Error Handling

```typescript
const result = await mathCue.start({ a: 2, b: 3 });

if (result.status === 'success') {
  console.log('Success:', result.result);
} else if (result.status === 'failed') {
  console.error('Error:', result.error);
}
```

## API Reference

### Cue

The main class for creating and executing workflows.

#### Static Methods

- `createBlock<TInput, TOutput>(config)`: Creates a new block
- `createCue<TInput, TOutput, TSteps>(config)`: Creates a new cue

#### Instance Methods

- `start(inputData)`: Starts the cue execution
- `watch(callback)`: Subscribes to execution events

### Block

A unit of work in a cue.

#### Properties

- `id`: Unique identifier
- `description`: Optional description
- `inputSchema`: Zod schema for input validation
- `outputSchema`: Zod schema for output validation
- `resumeSchema`: Optional Zod schema for resume data
- `suspendSchema`: Optional Zod schema for suspend data
- `execute`: Async function that performs the block's work

### BlockContext

The context object passed to block execution functions.

#### Properties

- `inputData`: The input data matching the inputSchema
- `resumeData`: Optional resume data when resuming from suspension
- `getBlockResult`: Function to access results from other blocks
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
