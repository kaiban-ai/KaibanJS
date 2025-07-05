# Workflow Snapshot System

The snapshot system provides efficient state capture and restoration for workflow runs without modifying the existing API. This allows you to create checkpoints, recover from failures, and analyze workflow execution states.

## Features

- **Non-intrusive**: Works with existing `Run` and `RunStore` classes without API changes
- **Efficient**: Lightweight snapshot creation with automatic cleanup
- **Validated**: All snapshots are validated using Zod schemas
- **Serializable**: Snapshots can be exported/imported as JSON
- **Comparable**: Built-in snapshot comparison utilities
- **Automatic**: Optional automatic snapshot creation with decorators

## Quick Start

```typescript
import { SnapshotManager } from './snapshot';
import { Run } from './run';

// Create a snapshot manager
const snapshotManager = new SnapshotManager(10); // Keep last 10 snapshots

// Create a snapshot from a run
const run = new Run({
  /* ... */
});
const snapshot = snapshotManager.createSnapshot(
  run.runId,
  run.store.getState()
);

// Export snapshot for storage
const snapshotJson = snapshotManager.exportSnapshot(snapshot);

// Later, restore from snapshot
const importedSnapshot = snapshotManager.importSnapshot(snapshotJson);
snapshotManager.restoreFromSnapshot(
  run.runId,
  run.store.getState(),
  importedSnapshot
);
```

## Core Components

### SnapshotManager

The main class for managing snapshots:

```typescript
class SnapshotManager {
  constructor(maxSnapshots: number = 10);

  // Create and restore snapshots
  createSnapshot(runId: string, store: RunStore): Snapshot;
  restoreFromSnapshot(runId: string, store: RunStore, snapshot: Snapshot): void;

  // Snapshot management
  getLatestSnapshot(runId: string): Snapshot | undefined;
  getAllSnapshots(runId: string): Snapshot[];
  clearSnapshots(runId: string): void;
  clearAllSnapshots(): void;

  // Import/export
  exportSnapshot(snapshot: Snapshot): string;
  importSnapshot(jsonString: string): Snapshot;
}
```

### Snapshot Schema

Snapshots are validated using this Zod schema:

```typescript
const SnapshotSchema = z.object({
  version: z.string(),
  timestamp: z.number(),
  runId: z.string(),
  workflowId: z.string(),
  status: z.nativeEnum(RUN_STATUS),
  stepResults: z.record(
    z.object({
      status: z.enum(['running', 'completed', 'failed', 'suspended']),
      output: z.unknown().optional(),
      error: z.instanceof(Error).optional(),
      suspendedPath: z.array(z.number()).optional(),
    })
  ),
  executionPath: z.array(z.number()),
  suspendedPaths: z.record(z.array(z.number())),
  events: z.array(
    z.object({
      type: z.nativeEnum(WorkflowEventType),
      timestamp: z.number(),
      runId: z.string(),
      workflowId: z.string(),
      description: z.string(),
      payload: z.record(z.unknown()),
      metadata: z.record(z.unknown()).optional(),
    })
  ),
  executionGraph: z.array(z.record(z.unknown())),
  result: z.unknown().optional(),
  error: z.unknown().optional(),
  logs: z.array(
    z.object({
      timestamp: z.number(),
      type: z.enum(['status', 'step']),
      description: z.string(),
      metadata: z.record(z.unknown()).optional(),
      status: z.nativeEnum(RUN_STATUS).optional(),
      stepStatus: z
        .enum(['running', 'completed', 'failed', 'suspended'])
        .optional(),
      stepId: z.string().optional(),
      stepResult: z.record(z.unknown()).optional(),
    })
  ),
  executionContext: z.record(z.unknown()),
});
```

## Usage Patterns

### 1. Manual Snapshot Creation

```typescript
import { SnapshotManager } from './snapshot';

const snapshotManager = new SnapshotManager();

// Create snapshot at specific points
const snapshot1 = snapshotManager.createSnapshot(
  run.runId,
  run.store.getState()
);

// Do some work
await run.start({ inputData: { test: 'data' } });

const snapshot2 = snapshotManager.createSnapshot(
  run.runId,
  run.store.getState()
);

// Compare snapshots
const differences = SnapshotUtils.compareSnapshots(snapshot1, snapshot2);
```

### 2. Automatic Snapshot Creation

```typescript
import { withSnapshots } from './snapshot';

// Create a Run class with automatic snapshots
const RunWithSnapshots = withSnapshots(Run, snapshotManager, 5000); // Every 5 seconds

const run = new RunWithSnapshots({
  workflowId: 'auto-snapshot-workflow',
  runId: 'run-123',
  executionGraph: [],
  serializedStepGraph: [],
});

// Snapshots are created automatically every 5 seconds
// Don't forget to clean up
run.destroy?.();
```

### 3. Error Recovery

```typescript
try {
  // Create snapshot before risky operation
  const preOperationSnapshot = snapshotManager.createSnapshot(
    run.runId,
    run.store.getState()
  );

  // Perform risky operation
  await riskyOperation();
} catch (error) {
  // Restore from last known good state
  const lastSnapshot = snapshotManager.getLatestSnapshot(run.runId);
  if (lastSnapshot) {
    snapshotManager.restoreFromSnapshot(
      run.runId,
      run.store.getState(),
      lastSnapshot
    );
  }
}
```

### 4. Persistence and Recovery

```typescript
// Save snapshot to database/file
const snapshot = snapshotManager.createSnapshot(
  run.runId,
  run.store.getState()
);
const snapshotData = {
  runId: run.runId,
  workflowId: run.workflowId,
  snapshot: snapshotManager.exportSnapshot(snapshot),
  createdAt: new Date().toISOString(),
};

// Later, restore from storage
const loadedSnapshot = snapshotManager.importSnapshot(snapshotData.snapshot);
const newRun = new Run({
  workflowId: snapshotData.workflowId,
  runId: snapshotData.runId,
  executionGraph: [],
  serializedStepGraph: [],
});

snapshotManager.restoreFromSnapshot(
  newRun.runId,
  newRun.store.getState(),
  loadedSnapshot
);
```

### 5. Batch Operations

```typescript
// Create snapshots for multiple runs
const runs = [run1, run2, run3];
const snapshots = runs.map((run) =>
  snapshotManager.createSnapshot(run.runId, run.store.getState())
);

// Export all snapshots
const exportedSnapshots = snapshots.map((snapshot) => ({
  runId: snapshot.runId,
  data: snapshotManager.exportSnapshot(snapshot),
}));

// Clear and restore
snapshotManager.clearAllSnapshots();
exportedSnapshots.forEach(({ runId, data }) => {
  const snapshot = snapshotManager.importSnapshot(data);
  // Restore to appropriate run...
});
```

## Utility Functions

### SnapshotUtils

```typescript
const SnapshotUtils = {
  // Create snapshot at specific point
  createSnapshot: (runId: string, store: RunStore, manager: SnapshotManager): Snapshot,

  // Restore from snapshot
  restoreFromSnapshot: (runId: string, store: RunStore, snapshot: Snapshot, manager: SnapshotManager): void,

  // Compare two snapshots
  compareSnapshots: (snapshot1: Snapshot, snapshot2: Snapshot): Record<string, any>,

  // Validate snapshot
  validateSnapshot: (snapshot: unknown): snapshot is Snapshot,
};
```

### Snapshot Comparison

```typescript
const differences = SnapshotUtils.compareSnapshots(snapshot1, snapshot2);

// Returns structure like:
{
  status: { from: 'RUNNING', to: 'COMPLETED' },
  stepResults: {
    'step1': { from: { status: 'running' }, to: { status: 'completed', output: 'result' } }
  },
  result: { from: undefined, to: 'final result' }
}
```

## Best Practices

### 1. Snapshot Frequency

- **Manual snapshots**: Create at critical points (before risky operations, after major steps)
- **Automatic snapshots**: Use 5-30 second intervals depending on workflow complexity
- **Memory management**: Limit snapshots per run (default: 10)

### 2. Storage Strategy

```typescript
// For in-memory storage (development)
const snapshotManager = new SnapshotManager(5);

// For persistent storage (production)
const snapshotManager = new SnapshotManager(1); // Keep only latest
// Save snapshots to database/file system
```

### 3. Error Handling

```typescript
try {
  const snapshot = snapshotManager.createSnapshot(
    run.runId,
    run.store.getState()
  );
} catch (error) {
  console.warn('Failed to create snapshot:', error);
  // Continue without snapshot rather than failing the workflow
}
```

### 4. Performance Considerations

- Snapshots are lightweight but can accumulate memory
- Use automatic cleanup with `maxSnapshots` limit
- Consider snapshot compression for large workflows
- Export snapshots to external storage for long-term retention

### 5. Validation

```typescript
// Always validate snapshots before use
if (SnapshotUtils.validateSnapshot(snapshot)) {
  snapshotManager.restoreFromSnapshot(
    run.runId,
    run.store.getState(),
    snapshot
  );
} else {
  console.error('Invalid snapshot format');
}
```

## Integration with Existing Code

The snapshot system is designed to work seamlessly with existing `Run` and `RunStore` classes:

```typescript
// Your existing code remains unchanged
const run = new Run({
  workflowId: 'my-workflow',
  runId: 'run-123',
  executionGraph: steps,
  serializedStepGraph: serializedSteps,
});

// Add snapshot functionality without changing the API
const snapshotManager = new SnapshotManager();
const snapshot = snapshotManager.createSnapshot(
  run.runId,
  run.store.getState()
);

// Continue using run normally
await run.start({ inputData: { test: 'data' } });
```

## Migration Guide

### From Manual State Management

If you were manually tracking workflow state:

```typescript
// Before: Manual state tracking
const workflowState = {
  status: 'running',
  stepResults: {},
  // ... more state
};

// After: Use snapshots
const snapshot = snapshotManager.createSnapshot(
  run.runId,
  run.store.getState()
);
const workflowState = snapshot; // Use snapshot as state
```

### From Custom Recovery Systems

If you had custom recovery logic:

```typescript
// Before: Custom recovery
const savedState = loadStateFromDatabase(runId);
run.store.getState().setStatus(savedState.status);
// ... manual restoration

// After: Snapshot-based recovery
const snapshot = snapshotManager.importSnapshot(savedSnapshotJson);
snapshotManager.restoreFromSnapshot(run.runId, run.store.getState(), snapshot);
```

## Troubleshooting

### Common Issues

1. **Snapshot validation fails**: Check that the snapshot format matches the schema
2. **Memory leaks**: Ensure `maxSnapshots` is set appropriately and snapshots are cleaned up
3. **Restoration fails**: Verify that the run and snapshot have matching `runId` and `workflowId`
4. **Performance issues**: Reduce snapshot frequency or use external storage

### Debug Mode

```typescript
// Enable debug logging
const snapshotManager = new SnapshotManager(10);
snapshotManager.debug = true; // If debug mode is available

// Check snapshot contents
console.log('Snapshot size:', JSON.stringify(snapshot).length);
console.log('Snapshot steps:', Object.keys(snapshot.stepResults));
```

## API Reference

See the TypeScript definitions in `snapshot.ts` for complete API documentation.

## Examples

See `examples/snapshot-example.ts` for comprehensive usage examples covering all major use cases.
