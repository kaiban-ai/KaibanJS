import { z } from 'zod';
import { Step, StepFlowEntry, WorkflowResult, RuntimeContext } from './types';
import { RunExecutionEngineWithQueue as RunExecutionEngine } from './executionEngineWithQueue';
import {
  createRunStore,
  RUN_STATUS,
  WorkflowEvent,
  RunLog,
} from './stores/runStore';
import { WorkflowEventType } from './stores/runStore';
import type { RunStore } from './stores/runStore';
import type { StoreApi } from 'zustand';

// Custom event type for Run instances
// export interface RunEvent {
//   type: 'start' | 'finish' | 'step-update' | 'status-change';
//   payload: Record<string, any>;
//   eventTimestamp: Date;
// }

/**
 * Represents a workflow run that can be executed
 */
export class Run<TInput, TOutput> {
  /**
   * Unique identifier for this workflow
   */
  readonly workflowId: string;

  /**
   * Unique identifier for this run
   */
  readonly runId: string;

  /**
   * The execution engine for this run
   */
  public executionEngine: RunExecutionEngine;

  /**
   * The execution graph for this run
   */
  public executionGraph: StepFlowEntry[];

  /**
   * The serialized step graph for this run
   */
  public serializedStepGraph: any[];

  /**
   * The retry configuration for this run
   */
  protected retryConfig?: {
    attempts?: number;
    delay?: number;
  };

  /**
   * The run-specific store
   */
  public store: StoreApi<RunStore>;

  #closeStreamAction?: (status?: RUN_STATUS) => Promise<void>;
  #executionResults?: Promise<WorkflowResult<TOutput>>;
  protected cleanup?: () => void;

  constructor(params: {
    workflowId: string;
    runId: string;
    executionGraph: StepFlowEntry[];
    retryConfig?: {
      attempts?: number;
      delay?: number;
    };
    cleanup?: () => void;
    serializedStepGraph: any[];
  }) {
    this.workflowId = params.workflowId;
    this.runId = params.runId;
    this.serializedStepGraph = params.serializedStepGraph;
    this.executionGraph = params.executionGraph;
    this.retryConfig = params.retryConfig;
    this.cleanup = params.cleanup;

    // Create run-specific store
    this.store = createRunStore(
      this.runId,
      this.workflowId,
      this.executionGraph
    );

    // Create execution engine with the store
    this.executionEngine = new RunExecutionEngine(this.store);
  }

  /**
   * Starts the workflow execution with the provided input
   * @param input The input data for the workflow
   * @returns A promise that resolves to the workflow output
   */
  async start({
    inputData,
    runtimeContext,
  }: {
    inputData?: TInput;
    runtimeContext?: RuntimeContext;
  }): Promise<WorkflowResult<TOutput>> {
    try {
      // Reset run state in the store
      this.store.getState().reset();

      // Set initial status and emit workflow state
      this.store.getState().setStatus(RUN_STATUS.RUNNING);

      // Note: Input validation should be done at the workflow level
      // The Run class doesn't have access to the workflow's inputSchema
      // This will be handled by the workflow's start method
      const result = await this.executionEngine.execute<TInput, TOutput>({
        workflowId: this.workflowId,
        runId: this.runId,
        graph: this.executionGraph,
        input: inputData,
        retryConfig: this.retryConfig,
        runtimeContext: runtimeContext ?? this.createRuntimeContext(),
      });

      // Update final status based on result (the execution engine already emits the final state)
      if (result.status === 'failed') {
        this.store.getState().setStatus(RUN_STATUS.FAILED);
      } else if (result.status === 'suspended') {
        this.store.getState().setStatus(RUN_STATUS.SUSPENDED);
      } else {
        this.store.getState().setStatus(RUN_STATUS.COMPLETED);
      }

      this.cleanup?.();

      return result;
    } catch (error) {
      this.store.getState().setStatus(RUN_STATUS.FAILED);

      throw error;
    }
  }

  /**
   * Starts the workflow execution with the provided input as a stream
   * @param input The input data for the workflow
   * @returns A promise that resolves to the workflow output
   */
  stream({
    inputData,
    runtimeContext,
  }: { inputData?: TInput; runtimeContext?: RuntimeContext } = {}): {
    stream: ReadableStream<WorkflowEvent>;
    getWorkflowState: () => Promise<WorkflowResult<TOutput>>;
  } {
    const { readable, writable } = new TransformStream<
      WorkflowEvent,
      WorkflowEvent
    >();

    const writer = writable.getWriter();
    const unwatch = this.watch(async (event) => {
      try {
        await writer.write(event);
      } catch {
        unwatch();
      }
    }, undefined);

    this.#closeStreamAction = async (
      status: RUN_STATUS = RUN_STATUS.COMPLETED
    ) => {
      const finishEvent: WorkflowEvent = {
        type: WorkflowEventType.WorkflowStatusUpdate,
        payload: {
          workflowState: {
            status,
            result: undefined,
            error: undefined,
          },
        },
        timestamp: Date.now(),
        runId: this.runId,
        workflowId: this.workflowId,
        description: 'Workflow Stream completed',
      };

      unwatch();

      try {
        await writer.write(finishEvent);
        await writer.close();
      } catch (err) {
        console.error('Error closing stream:', err);
      } finally {
        writer.releaseLock();
      }
    };

    this.#executionResults = this.start({ inputData, runtimeContext }).then(
      (result) => {
        if (result.status !== 'suspended') {
          this.#closeStreamAction?.().catch(() => {});
        } else {
          this.#closeStreamAction?.(RUN_STATUS.SUSPENDED)?.catch(() => {});
        }

        return result;
      }
    );

    return {
      stream: readable,
      getWorkflowState: () => this.#executionResults!,
    };
  }

  /**
   * Subscribe to workflow events using the new simplified API
   * @param callback Function to call when events occur
   * @returns Unsubscribe function
   */
  subscribe(callback: (event: RunStore) => void): () => void {
    return this.store.subscribe(callback);
  }

  /**
   * Subscribe to specific state property changes
   * @param selector Function to select specific state property
   * @param callback Function to call when the selected property changes
   * @returns Unsubscribe function
   */
  subscribeToState<T>(
    selector: (state: RunStore) => T,
    callback: (value: T, previousValue: T | undefined) => void
  ): () => void {
    let previousValue: T | undefined;

    return this.store.subscribe((state) => {
      const currentValue = selector(state);
      if (currentValue !== previousValue) {
        callback(currentValue, previousValue);
        previousValue = currentValue;
      }
    });
  }

  /**
   * Subscribe to logs changes
   * @param callback Function to call when logs change
   * @returns Unsubscribe function
   */
  subscribeToLogs(callback: (logs: RunLog[]) => void): () => void {
    return this.subscribeToState((state) => state.logs, callback);
  }

  /**
   * Legacy watch method for backward compatibility
   * @param cb Callback function
   * @param type Event type ('WorkflowStatusUpdate' or 'StepStatusUpdate')
   * @returns Unsubscribe function
   */

  watch(callback: (event: WorkflowEvent) => void, type?: WorkflowEventType) {
    return this.subscribeToState(
      (state) => state.events,
      (events) => {
        const lastEvent = events[events.length - 1];

        if (lastEvent && (type === undefined || lastEvent?.type === type)) {
          callback(lastEvent);
        }
      }
    );
  }

  async resume<TResumeSchema extends z.ZodType<any>>(params: {
    resumeData?: z.infer<TResumeSchema>;
    step:
      | Step<string, any, TResumeSchema, any>
      | [
          ...Step<string, any, any, any>[],
          Step<string, any, TResumeSchema, any>
        ]
      | string
      | string[];
    runtimeContext?: RuntimeContext;
  }): Promise<WorkflowResult<TOutput>> {
    const steps: string[] = (
      Array.isArray(params.step) ? params.step : [params.step]
    ).map((step) => (typeof step === 'string' ? step : step?.id));

    // Update status to resumed and emit workflow state
    this.store.getState().setStatus(RUN_STATUS.RESUMED);

    const executionResultPromise = this.executionEngine
      .execute<TInput, TOutput>({
        workflowId: this.workflowId,
        runId: this.runId,
        graph: this.executionGraph,
        input: params.resumeData,
        resume: {
          steps,
          stepResults: Object.fromEntries(
            Array.from(this.store.getState().stepResults.entries())
          ),
          resumePayload: params.resumeData,
          resumePath: [],
        },
        retryConfig: this.retryConfig,
        runtimeContext: params.runtimeContext ?? this.createRuntimeContext(),
      })
      .then((result) => {
        // Update final status (the execution engine already emits the final state)
        if (result.status === 'failed') {
          this.store.getState().setStatus(RUN_STATUS.FAILED);
        } else if (result.status === 'suspended') {
          this.store.getState().setStatus(RUN_STATUS.SUSPENDED);
        } else {
          this.store.getState().setStatus(RUN_STATUS.COMPLETED);
        }

        return result;
      });

    this.#executionResults = executionResultPromise;

    return executionResultPromise;
  }

  /**
   * Returns the current state of the workflow run
   * @returns The current state of the workflow run
   */
  getState(): RunStore {
    return this.store.getState();
  }

  updateState(state: Record<string, any>) {
    this.store.getState().updateState(state);
  }

  /**
   * Gets the run state from the store
   * @returns The run state
   */
  getRunState() {
    return this.store.getState();
  }

  private createRuntimeContext(): RuntimeContext {
    const context = new Map<string, any>();
    return {
      get: (path: string) => context.get(path),
      set: (path: string, value: any) => context.set(path, value),
      has: (path: string) => context.has(path),
      delete: (path: string) => context.delete(path),
      clear: () => context.clear(),
    };
  }
}
