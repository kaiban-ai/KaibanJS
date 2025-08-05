# Workflow Migration Guide

## Overview

The workflow system has been migrated to a new architecture where each `Run` instance manages its own state and execution engine. This provides better isolation, simpler state management, and improved performance.

## Key Changes

### 1. Run-Specific Store

Each `Run` now has its own Zustand store (`RunStore`) instead of sharing a global workflow store. This provides:

- **Isolation**: Each run's state is completely independent
- **Simplified API**: No need to manage run IDs or complex state lookups
- **Better Performance**: Smaller, focused stores with less overhead

### 2. Run-Specific Execution Engine

Each `Run` has its own `RunExecutionEngine` instance that:

- Manages execution state specific to that run
- Updates the run's store directly
- Provides better error isolation

### 3. Simplified Workflow Class

The `Workflow` class is now focused on:

- Defining workflow structure and steps
- Creating `Run` instances
- Managing workflow configuration

## Migration Guide

### Before (Legacy API)

```typescript
import { Workflow, useWorkflowStore } from '@kaibanjs/workflow';

// Create workflow
const workflow = Workflow.createWorkflow({
  id: 'my-workflow',
  inputSchema: z.object({ message: z.string() }),
  outputSchema: z.object({ result: z.string() }),
});

// Build workflow
workflow.then(step1).then(step2).commit();

// Execute workflow
const result = await workflow.start({ message: 'Hello' });

// Subscribe to global store
const unsubscribe = useWorkflowStore.subscribe((state) => {
  console.log('Workflow state:', state);
});
```

### After (New API)

```typescript
import { Workflow } from '@kaibanjs/workflow';

// Create workflow
const workflow = Workflow.createWorkflow({
  id: 'my-workflow',
  inputSchema: z.object({ message: z.string() }),
  outputSchema: z.object({ result: z.string() }),
});

// Build workflow
workflow.then(step1).then(step2).commit();

// Create and execute run
const run = workflow.createRun();
const result = await run.start({ inputData: { message: 'Hello' } });

// Subscribe to run-specific store
const unsubscribe = run.store.subscribe((state) => {
  console.log('Run state:', state);
});
```

## New API Reference

### Workflow Class

```typescript
class Workflow<TInput, TOutput, TSteps> {
  // Create a new run instance
  createRun(options?: { runId?: string }): Run<TInput, TOutput, TSteps>;

  // Legacy methods (still supported)
  start(inputData: TInput): Promise<WorkflowResult<TOutput>>;
  execute(context: StepContext<TInput>): Promise<TOutput>;
  resume(params): Promise<WorkflowResult<TOutput>>;
}
```

### Run Class

```typescript
class Run<TInput, TOutput, TSteps> {
  readonly runId: string;
  readonly workflowId: string;
  public store: StoreApi<RunStore>;

  // Execute the workflow
  start(params: {
    inputData?: TInput;
    runtimeContext?: RuntimeContext;
  }): Promise<WorkflowResult<TOutput>>;

  // Stream execution
  stream(params): {
    stream: ReadableStream<RunEvent>;
    getWorkflowState: () => Promise<WorkflowResult<TOutput>>;
  };

  // Subscribe to events
  watch(
    callback: (event: RunEvent) => void,
    type?: 'watch' | 'watch-v2'
  ): () => void;

  // Resume suspended workflow
  resume(params): Promise<WorkflowResult<TOutput>>;

  // Get run state
  getState(): Record<string, any>;
  getRunState(): RunState;
  updateState(state: Record<string, any>): void;
}
```

### RunStore

```typescript
interface RunStore {
  // State
  runId: string;
  workflowId: string;
  status: RUN_STATUS;
  logs: RunLog[];
  stepResults: Map<string, StepResult>;
  currentStep?: Step<any, any>;
  executionPath: number[];
  suspendedPaths: Record<string, number[]>;
  watchEvents: WatchEvent[];
  state: Record<string, any>;

  // Actions
  setStatus(status: RUN_STATUS): void;
  addLog(log: Omit<RunLog, 'timestamp'>): void;
  updateStepResult(stepId: string, result: StepResult): void;
  setCurrentStep(step: Step<any, any>): void;
  updateExecutionPath(path: number[]): void;
  updateSuspendedPaths(paths: Record<string, number[]>): void;
  addWatchEvent(event: WatchEvent): void;
  updateState(newState: Record<string, any>): void;
  reset(): void;
}
```

## Benefits

### 1. Better Isolation

Each run is completely independent, preventing state pollution between concurrent executions.

### 2. Simplified State Management

No need to manage run IDs or complex state lookups. Each run's state is directly accessible.

### 3. Improved Performance

Smaller, focused stores with less overhead and better memory management.

### 4. Better Developer Experience

- Clearer API with run-specific methods
- Direct access to run state
- Simplified event subscription

### 5. Easier Testing

Each run can be tested in isolation without affecting other runs.

## Migration Checklist

- [ ] Update workflow creation to use `createRun()`
- [ ] Replace global store subscriptions with run-specific subscriptions
- [ ] Update event handling to use run events
- [ ] Test workflow execution with new API
- [ ] Update any custom execution logic
- [ ] Verify resume functionality works correctly

## Example Migration

See `examples/migration-example.ts` for a complete example of the new API usage.

## Breaking Changes

1. **Global Store**: The global `useWorkflowStore` is no longer used for run state
2. **Event Subscription**: Events are now subscribed through the run instance
3. **State Access**: Run state is accessed through `run.getRunState()` instead of global store
4. **Execution**: Workflow execution is now done through run instances

## Backward Compatibility

The legacy `workflow.start()` method is still supported but internally creates a run instance. For new code, it's recommended to use the new run-based API.
