# Streaming Workflows Example

This example demonstrates how to use the streaming capabilities of the @kaibanjs/workflow engine to monitor workflow execution in real-time using ReadableStream.

## Overview

The example showcases:

1. **Basic Streaming** - Simple workflow execution with real-time event streaming
2. **Parallel Streaming** - Monitoring parallel step execution
3. **Conditional Streaming** - Streaming with conditional branching
4. **Suspendable Streaming** - Handling suspended workflows in streams
5. **Custom Stream Processing** - Processing streams with custom logic

## Running the Example

```bash
npx tsx src/examples/streaming-workflows.ts
```

## Key Features Demonstrated

### 1. Basic Streaming

```typescript
const { stream, getWorkflowState } = run.stream({
  inputData: { data: 'hello world' },
});

// Read from the stream
const events = await readStream(stream);
const finalResult = await getWorkflowState();
```

### 2. Stream Reading Utilities

The example provides utility functions for processing streams:

```typescript
// Read all events from stream
const readStream = async (stream: ReadableStream<any>) => {
  const events: any[] = [];
  const reader = stream.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      if (value !== undefined) {
        events.push(value);
      }
    }
  } finally {
    reader.releaseLock();
  }

  return events;
};

// Process stream with custom callback
const processStreamWithCallback = async (
  stream: ReadableStream<any>,
  onEvent?: (event: any) => void
) => {
  // Process each event with custom logic
};
```

### 3. Suspendable Streaming

```typescript
// Start streaming workflow
const { stream, getWorkflowState } = run.stream({ inputData: { value: -1 } });

// Read stream until suspension
const reader = stream.getReader();
// ... read events until suspended

// Resume the workflow
const resumeResult = await run.resume({
  step: 'suspendable',
  resumeData: { continue: true, value: 5 },
});
```

## Workflow Types Demonstrated

### 1. Basic Streaming Workflow

```
data-processing → validation
```

- Processes input data
- Validates the processed result
- Streams all step events in real-time

### 2. Parallel Streaming Workflow

```
parallel1 ─┐
           ├─ combine
parallel2 ─┘
```

- Executes two steps in parallel
- Combines results
- Streams parallel execution events

### 3. Conditional Streaming Workflow

```
input → branch → even/odd → result
```

- Branches based on input value
- Streams events for the executed branch only
- Demonstrates conditional execution monitoring

### 4. Suspendable Streaming Workflow

```
input → suspendable → result
```

- Can suspend execution
- Streams events until suspension
- Supports resume functionality

## Expected Output

### Basic Streaming Example

```
[timestamp] === BASIC STREAMING WORKFLOW EXAMPLE ===
[timestamp] Starting streaming workflow...
[timestamp] Stream event received: { type: "WorkflowStatusUpdate", stepId: undefined, stepStatus: undefined, workflowStatus: "RUNNING" }
[timestamp] Stream event received: { type: "StepStatusUpdate", stepId: "data-processing", stepStatus: "running", workflowStatus: "RUNNING" }
[timestamp] Processing data: hello world
[timestamp] Stream event received: { type: "StepStatusUpdate", stepId: "data-processing", stepStatus: "completed", workflowStatus: "RUNNING" }
[timestamp] Stream event received: { type: "StepStatusUpdate", stepId: "validation", stepStatus: "running", workflowStatus: "RUNNING" }
[timestamp] Validating processed data: HELLO WORLD
[timestamp] Stream event received: { type: "StepStatusUpdate", stepId: "validation", stepStatus: "completed", workflowStatus: "RUNNING" }
[timestamp] Stream event received: { type: "WorkflowStatusUpdate", stepId: undefined, stepStatus: undefined, workflowStatus: "COMPLETED" }
[timestamp] Streaming completed
[timestamp] Total events received: 6
[timestamp] Final result: { status: "completed", result: { processed: "HELLO WORLD", isValid: true, score: 1.1 } }
```

### Parallel Streaming Example

```
[timestamp] === PARALLEL STREAMING WORKFLOW EXAMPLE ===
[timestamp] Starting parallel streaming workflow...
[timestamp] Stream event received: { type: "WorkflowStatusUpdate", stepId: undefined, stepStatus: undefined, workflowStatus: "RUNNING" }
[timestamp] Stream event received: { type: "StepStatusUpdate", stepId: "parallel1", stepStatus: "running", workflowStatus: "RUNNING" }
[timestamp] Stream event received: { type: "StepStatusUpdate", stepId: "parallel2", stepStatus: "running", workflowStatus: "RUNNING" }
[timestamp] Parallel step 1 processing: test
[timestamp] Parallel step 2 processing: test
[timestamp] Stream event received: { type: "StepStatusUpdate", stepId: "parallel1", stepStatus: "completed", workflowStatus: "RUNNING" }
[timestamp] Stream event received: { type: "StepStatusUpdate", stepId: "parallel2", stepStatus: "completed", workflowStatus: "RUNNING" }
[timestamp] Stream event received: { type: "StepStatusUpdate", stepId: "combine", stepStatus: "running", workflowStatus: "RUNNING" }
[timestamp] Combining results: processed_1_test + processed_2_test
[timestamp] Stream event received: { type: "StepStatusUpdate", stepId: "combine", stepStatus: "completed", workflowStatus: "RUNNING" }
[timestamp] Stream event received: { type: "WorkflowStatusUpdate", stepId: undefined, stepStatus: undefined, workflowStatus: "COMPLETED" }
[timestamp] Parallel streaming completed
[timestamp] Total events received: 8
[timestamp] Parallel step events: 4
```

### Suspendable Streaming Example

```
[timestamp] === SUSPENDABLE STREAMING WORKFLOW EXAMPLE ===
[timestamp] Starting suspendable streaming workflow...
[timestamp] Stream event: { type: "WorkflowStatusUpdate", stepId: undefined, stepStatus: "RUNNING" }
[timestamp] Stream event: { type: "StepStatusUpdate", stepId: "suspendable", stepStatus: "running" }
[timestamp] Suspending due to negative value
[timestamp] Stream event: { type: "StepStatusUpdate", stepId: "suspendable", stepStatus: "suspended" }
[timestamp] Workflow suspended, resuming...
[timestamp] Resuming with value: 5
[timestamp] Resume result: { status: "completed", result: { result: 10 } }
[timestamp] Total events before resume: 3
```

## Key Concepts Demonstrated

### Stream API

```typescript
interface StreamResult {
  stream: ReadableStream<WorkflowEvent>;
  getWorkflowState: () => Promise<WorkflowResult<TOutput>>;
}
```

### Event Structure

```typescript
interface WorkflowEvent {
  type: 'WorkflowStatusUpdate' | 'StepStatusUpdate';
  timestamp: number;
  runId: string;
  workflowId: string;
  payload: {
    workflowState?: {
      status: string;
      result?: any;
      error?: any;
    };
    stepId?: string;
    stepStatus?: string;
    stepResult?: {
      status: string;
      output?: any;
      error?: any;
    };
  };
}
```

### Stream Processing Patterns

1. **Collect All Events**: Read entire stream and collect all events
2. **Real-time Processing**: Process events as they arrive
3. **Conditional Processing**: Stop reading at certain conditions (e.g., suspension)
4. **Custom Logic**: Apply custom processing to each event

### Advantages of Streaming

- **Real-time Monitoring**: See workflow progress as it happens
- **Memory Efficiency**: Process events one at a time
- **Interactive Applications**: Build responsive UIs
- **Debugging**: Track execution flow in detail
- **Performance**: No need to wait for completion to see progress

## Use Cases

- **Real-time Dashboards**: Show workflow progress to users
- **Progress Indicators**: Display completion percentages
- **Debugging Tools**: Track execution step by step
- **Interactive Workflows**: Handle user input during execution
- **Monitoring Systems**: Track workflow performance and health
- **Audit Trails**: Log all activities for compliance

## Best Practices

1. **Always Release Readers**: Use try/finally to ensure reader.releaseLock()
2. **Handle Errors**: Implement error handling for stream processing
3. **Memory Management**: Process events as they arrive for large workflows
4. **Event Filtering**: Filter events based on your needs
5. **Cleanup**: Unsubscribe from streams when done

## Next Steps

After understanding streaming workflows, explore:

- [Advanced Patterns](./advanced-patterns.md)
- [Error Handling](./error-handling.md)
- [Performance Optimization](./performance-optimization.md)
