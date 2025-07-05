import { z } from 'zod';
import { RUN_STATUS, WorkflowEventType } from './stores/runStore';
import type { RunStore, WorkflowEvent, RunLog } from './stores/runStore';
import type { StepResult, RuntimeContext, StepFlowEntry } from './types';

/**
 * Snapshot schema for validation
 */
export const SnapshotSchema = z.object({
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

export type Snapshot = z.infer<typeof SnapshotSchema>;

/**
 * Snapshot manager for workflow runs
 */
export class SnapshotManager {
  private static readonly VERSION = '1.0.0';
  private snapshots: Map<string, Snapshot> = new Map();
  private maxSnapshots: number = 10; // Keep last 10 snapshots by default

  constructor(maxSnapshots: number = 10) {
    this.maxSnapshots = maxSnapshots;
  }

  /**
   * Creates a snapshot from the current run state
   */
  createSnapshot(runId: string, store: RunStore): Snapshot {
    const state = store;

    const snapshot: Snapshot = {
      version: SnapshotManager.VERSION,
      timestamp: Date.now(),
      runId: state.runId,
      workflowId: state.workflowId,
      status: state.status,
      stepResults: this.serializeStepResults(state.stepResults),
      executionPath: [...state.executionPath],
      suspendedPaths: { ...state.suspendedPaths },
      events: this.serializeEvents(state.events),
      executionGraph: [...state.executionGraph],
      result: state.result,
      error: state.error,
      logs: this.serializeLogs(state.logs),
      executionContext: this.serializeExecutionContext(state.executionContext),
    };

    // Validate snapshot
    const validatedSnapshot = SnapshotSchema.parse(snapshot);

    // Store snapshot
    this.storeSnapshot(runId, validatedSnapshot);

    return validatedSnapshot;
  }

  /**
   * Restores a run state from a snapshot
   */
  restoreFromSnapshot(
    runId: string,
    store: RunStore,
    snapshot: Snapshot
  ): void {
    // Validate snapshot
    const validatedSnapshot = SnapshotSchema.parse(snapshot);

    // Reset store first
    store.reset();

    // Restore state
    store.setStatus(validatedSnapshot.status);

    // Restore step results
    Object.entries(validatedSnapshot.stepResults).forEach(
      ([stepId, result]) => {
        store.updateStepResult(stepId, result as StepResult);
      }
    );

    // Restore execution path and suspended paths
    store.updateExecutionPath(validatedSnapshot.executionPath);
    store.updateSuspendedPaths(validatedSnapshot.suspendedPaths);

    // Restore execution graph
    store.updateExecutionGraph(
      validatedSnapshot.executionGraph as StepFlowEntry[]
    );

    // Restore execution context
    store.updateExecutionContext(
      this.deserializeExecutionContext(validatedSnapshot.executionContext)
    );

    // Restore result and error
    if (validatedSnapshot.result !== undefined) {
      store.updateState({ result: validatedSnapshot.result });
    }
    if (validatedSnapshot.error !== undefined) {
      store.updateState({ error: validatedSnapshot.error });
    }

    // Restore logs (replay them to maintain order)
    validatedSnapshot.logs.forEach((log) => {
      store.addLog({
        type: log.type,
        description: log.description,
        metadata: log.metadata,
        status: log.status,
        stepStatus: log.stepStatus,
        stepId: log.stepId,
        stepResult: log.stepResult as StepResult,
      });
    });

    // Restore events (replay them to maintain order)
    validatedSnapshot.events.forEach((event) => {
      if (event.type === WorkflowEventType.WorkflowStatusUpdate) {
        store.emitWorkflowStatusUpdate({
          type: event.type,
          description: event.description,
          payload: event.payload,
          metadata: event.metadata,
        });
      } else if (event.type === WorkflowEventType.StepStatusUpdate) {
        store.emitStepStatusUpdate({
          type: event.type,
          description: event.description,
          payload: event.payload,
          metadata: event.metadata,
        });
      }
    });
  }

  /**
   * Gets the latest snapshot for a run
   */
  getLatestSnapshot(runId: string): Snapshot | undefined {
    return this.snapshots.get(runId);
  }

  /**
   * Gets all snapshots for a run
   */
  getAllSnapshots(runId: string): Snapshot[] {
    return Array.from(this.snapshots.values()).filter((s) => s.runId === runId);
  }

  /**
   * Clears snapshots for a specific run
   */
  clearSnapshots(runId: string): void {
    this.snapshots.delete(runId);
  }

  /**
   * Clears all snapshots
   */
  clearAllSnapshots(): void {
    this.snapshots.clear();
  }

  /**
   * Exports snapshot to JSON string
   */
  exportSnapshot(snapshot: Snapshot): string {
    return JSON.stringify(snapshot, null, 2);
  }

  /**
   * Imports snapshot from JSON string
   */
  importSnapshot(jsonString: string): Snapshot {
    const parsed = JSON.parse(jsonString);
    return SnapshotSchema.parse(parsed);
  }

  /**
   * Serializes step results Map to plain object
   */
  private serializeStepResults(
    stepResults: Map<string, StepResult>
  ): Record<string, StepResult> {
    const serialized: Record<string, StepResult> = {};
    stepResults.forEach((result, stepId) => {
      serialized[stepId] = {
        status: result.status,
        output: result.output,
        error: result.error,
        suspendedPath: result.suspendedPath,
      };
    });
    return serialized;
  }

  /**
   * Serializes events array
   */
  private serializeEvents(events: WorkflowEvent[]): any[] {
    return events.map((event) => ({
      type: event.type,
      timestamp: event.timestamp,
      runId: event.runId,
      workflowId: event.workflowId,
      description: event.description,
      payload: event.payload,
      metadata: event.metadata,
    }));
  }

  /**
   * Serializes logs array
   */
  private serializeLogs(logs: RunLog[]): any[] {
    return logs.map((log) => ({
      timestamp: log.timestamp,
      type: log.type,
      description: log.description,
      metadata: log.metadata,
      status: log.status,
      stepStatus: log.stepStatus,
      stepId: log.stepId,
      stepResult: log.stepResult,
    }));
  }

  /**
   * Serializes execution context
   */
  private serializeExecutionContext(
    _context: RuntimeContext
  ): Record<string, unknown> {
    // Since RuntimeContext is a Map-like interface, we need to extract its data
    // This is a simplified approach - in practice, you might want to store
    // the actual context data in a more structured way
    return {
      // Store context data as a serializable object
      // This is a placeholder - actual implementation depends on how context is used
    };
  }

  /**
   * Deserializes execution context
   */
  private deserializeExecutionContext(
    _serialized: Record<string, unknown>
  ): RuntimeContext {
    // Create a new context and restore data
    const context = new Map<string, any>();
    return {
      get: (path: string) => context.get(path),
      set: (path: string, value: any) => context.set(path, value),
      has: (path: string) => context.has(path),
      delete: (path: string) => context.delete(path),
      clear: () => context.clear(),
    };
  }

  /**
   * Stores a snapshot with automatic cleanup
   */
  private storeSnapshot(runId: string, snapshot: Snapshot): void {
    this.snapshots.set(runId, snapshot);

    // Cleanup old snapshots if we exceed the limit
    const runSnapshots = this.getAllSnapshots(runId);
    if (runSnapshots.length > this.maxSnapshots) {
      // Keep only the most recent snapshots
      const sortedSnapshots = runSnapshots.sort(
        (a, b) => b.timestamp - a.timestamp
      );
      const snapshotsToKeep = sortedSnapshots.slice(0, this.maxSnapshots);

      // Clear and restore only the snapshots we want to keep
      this.clearSnapshots(runId);
      snapshotsToKeep.forEach((s) => this.snapshots.set(runId, s));
    }
  }
}

/**
 * Snapshot decorator for automatic snapshot creation
 */
export function withSnapshots<T extends { new (...args: any[]): any }>(
  constructor: T,
  snapshotManager: SnapshotManager,
  snapshotInterval: number = 5000 // Create snapshot every 5 seconds
) {
  return class extends constructor {
    public snapshotTimer?: NodeJS.Timeout;
    public lastSnapshotTime: number = 0;

    constructor(...args: any[]) {
      super(...args);
      this.setupSnapshotTimer();
    }

    public setupSnapshotTimer(): void {
      if (snapshotInterval > 0) {
        this.snapshotTimer = setInterval(() => {
          const now = Date.now();
          if (now - this.lastSnapshotTime >= snapshotInterval) {
            this.createSnapshot();
            this.lastSnapshotTime = now;
          }
        }, snapshotInterval);
      }
    }

    public createSnapshot(): void {
      try {
        if (this.store) {
          snapshotManager.createSnapshot(this.runId, this.store);
        }
      } catch (error) {
        console.warn('Failed to create snapshot:', error);
      }
    }

    public destroy(): void {
      if (this.snapshotTimer) {
        clearInterval(this.snapshotTimer);
      }
      super.destroy?.();
    }
  };
}

/**
 * Utility functions for snapshot operations
 */
export const SnapshotUtils = {
  /**
   * Creates a snapshot at a specific point in time
   */
  createSnapshot: (
    runId: string,
    store: RunStore,
    manager: SnapshotManager
  ): Snapshot => {
    return manager.createSnapshot(runId, store);
  },

  /**
   * Restores a run from a snapshot
   */
  restoreFromSnapshot: (
    runId: string,
    store: RunStore,
    snapshot: Snapshot,
    manager: SnapshotManager
  ): void => {
    manager.restoreFromSnapshot(runId, store, snapshot);
  },

  /**
   * Compares two snapshots and returns differences
   */
  compareSnapshots: (
    snapshot1: Snapshot,
    snapshot2: Snapshot
  ): Record<string, any> => {
    const differences: Record<string, any> = {};

    // Compare basic properties
    if (snapshot1.status !== snapshot2.status) {
      differences.status = { from: snapshot1.status, to: snapshot2.status };
    }

    if (snapshot1.result !== snapshot2.result) {
      differences.result = { from: snapshot1.result, to: snapshot2.result };
    }

    // Compare step results
    const stepDifferences: Record<string, any> = {};
    const allStepIds = new Set([
      ...Object.keys(snapshot1.stepResults),
      ...Object.keys(snapshot2.stepResults),
    ]);

    allStepIds.forEach((stepId) => {
      const result1 = snapshot1.stepResults[stepId];
      const result2 = snapshot2.stepResults[stepId];

      if (JSON.stringify(result1) !== JSON.stringify(result2)) {
        stepDifferences[stepId] = { from: result1, to: result2 };
      }
    });

    if (Object.keys(stepDifferences).length > 0) {
      differences.stepResults = stepDifferences;
    }

    return differences;
  },

  /**
   * Validates a snapshot
   */
  validateSnapshot: (snapshot: unknown): snapshot is Snapshot => {
    try {
      SnapshotSchema.parse(snapshot);
      return true;
    } catch {
      return false;
    }
  },
};
