import { z } from 'zod';
import { Step, StepFlowEntry, WorkflowResult, RuntimeContext } from './types';
import { RunExecutionEngineWithQueue as RunExecutionEngine } from './runExecutionEngineWithQueue';
import { createRunStore, RUN_STATUS } from './stores/runStore';
import type { RunStore } from './stores/runStore';
import type { StoreApi } from 'zustand';

// Custom event type for Run instances
export interface RunEvent {
  type: 'start' | 'finish' | 'step-update' | 'status-change';
  payload: Record<string, any>;
  eventTimestamp: Date;
}

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

  #closeStreamAction?: () => Promise<void>;
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
    this.store = createRunStore(this.runId, this.workflowId);

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
      this.store.getState().setStatus(RUN_STATUS.RUNNING);

      // Note: Input validation should be done at the workflow level
      // The Run class doesn't have access to the workflow's inputSchema
      // This will be handled by the workflow's start method
      // this.executionEngine.start();
      const result = await this.executionEngine.execute<TInput, TOutput>({
        workflowId: this.workflowId,
        runId: this.runId,
        graph: this.executionGraph,
        input: inputData,
        retryConfig: this.retryConfig,
        runtimeContext: runtimeContext ?? this.createRuntimeContext(),
      });

      // Update final status based on result
      if (result.status === 'failed') {
        this.store.getState().setStatus(RUN_STATUS.FAILED);
      } else if (result.status === 'suspended') {
        this.store.getState().setStatus(RUN_STATUS.SUSPENDED);
      } else {
        this.store.getState().setStatus(RUN_STATUS.COMPLETED);
      }

      // Update step results with the execution results
      Object.entries(result.steps).forEach(([stepId, stepResult]) => {
        this.store.getState().updateStepResult(stepId, stepResult);
      });

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
    stream: ReadableStream<RunEvent>;
    getWorkflowState: () => Promise<WorkflowResult<TOutput>>;
  } {
    const { readable, writable } = new TransformStream<RunEvent, RunEvent>();

    const writer = writable.getWriter();
    const unwatch = this.watch(async (event) => {
      try {
        await writer.write(event);
      } catch {
        unwatch();
      }
    }, 'watch-v2');

    this.#closeStreamAction = async () => {
      const finishEvent: RunEvent = {
        type: 'finish',
        payload: { runId: this.runId },
        eventTimestamp: new Date(),
      };

      this.store.getState().addWatchEvent({
        type: 'watch',
        payload: {
          currentStep: undefined,
          workflowState: {
            status: 'completed',
            steps: {},
          },
        },
        eventTimestamp: new Date(),
      });
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

    // const startEvent: RunEvent = {
    //   type: 'start',
    //   payload: { runId: this.runId },
    //   eventTimestamp: new Date(),
    // };

    this.store.getState().addWatchEvent({
      type: 'watch',
      payload: {
        currentStep: undefined,
        workflowState: {
          status: 'running',
          steps: {},
        },
      },
      eventTimestamp: new Date(),
    });
    this.#executionResults = this.start({ inputData, runtimeContext }).then(
      (result) => {
        if (result.status !== 'suspended') {
          this.#closeStreamAction?.().catch(() => {});
        }

        return result;
      }
    );

    return {
      stream: readable,
      getWorkflowState: () => this.#executionResults!,
    };
  }

  watch(
    cb: (event: RunEvent) => void,
    type: 'watch' | 'watch-v2' = 'watch'
  ): () => void {
    // Subscribe to the run store for changes
    const unsubscribe = this.store.subscribe((state: RunStore) => {
      const lastLog = state.logs[state.logs.length - 1];
      if (lastLog?.type === 'watch' && lastLog.watchEvent) {
        if (type === 'watch-v2') {
          // Transform WatchEvent to RunEvent
          const runEvent: RunEvent = {
            type: 'step-update',
            payload: {
              currentStep: state.currentStep
                ? {
                    id: state.currentStep.id,
                    status: lastLog.stepStatus || 'running',
                    output: lastLog.stepResult?.output,
                    payload: lastLog.stepResult,
                  }
                : undefined,
              workflowState: {
                status: state.status,
                steps: Object.fromEntries(state.stepResults),
              },
            },
            eventTimestamp: new Date(lastLog.timestamp),
          };
          cb(runEvent);
        } else {
          // For legacy watch type, transform the event
          const runEvent: RunEvent = {
            type: 'step-update',
            payload: {
              currentStep: state.currentStep
                ? {
                    id: state.currentStep.id,
                    status: lastLog.stepStatus || 'running',
                    output: lastLog.stepResult?.output,
                    payload: lastLog.stepResult,
                  }
                : undefined,
              workflowState: {
                status: state.status,
                steps: Object.fromEntries(state.stepResults),
              },
            },
            eventTimestamp: new Date(lastLog.timestamp),
          };
          cb(runEvent);
        }
      }
    });

    return unsubscribe;
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

    // Update status to resumed
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
        if (result.status !== 'suspended') {
          this.#closeStreamAction?.().catch(() => {});
        }

        // Update final status
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
  getState(): Record<string, any> {
    return this.store.getState().state;
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
