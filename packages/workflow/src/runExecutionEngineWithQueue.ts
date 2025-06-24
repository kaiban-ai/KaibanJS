import type {
  Step,
  StepContext,
  StepFlowEntry,
  StepResult,
  RuntimeContext,
  WorkflowResult,
} from './types';
import type { RunStore } from './stores/runStore';
import type { StoreApi } from 'zustand';
import PQueue from 'p-queue';

export type ExecutionContext = {
  workflowId: string;
  runId: string;
  executionPath: number[];
  suspendedPaths: Record<string, number[]>;
  retryConfig: {
    attempts: number;
    delay: number;
  };
};

export class RunExecutionEngineWithQueue {
  private executionQueue: PQueue;

  constructor(private store: StoreApi<RunStore>, concurrency: number = 1) {
    // Create a queue with concurrency of 1 to ensure sequential execution
    this.executionQueue = new PQueue({ concurrency, autoStart: true });
  }

  async execute<TInput, TOutput>(params: {
    workflowId: string;
    runId: string;
    graph: StepFlowEntry[];
    input?: TInput;
    resume?: {
      steps: string[];
      stepResults: Record<string, StepResult>;
      resumePayload: any;
      resumePath: number[];
    };
    retryConfig?: {
      attempts?: number;
      delay?: number;
    };
    runtimeContext?: RuntimeContext;
  }): Promise<WorkflowResult<TOutput>> {
    const {
      workflowId,
      runId,
      graph,
      input,
      resume,
      retryConfig,
      runtimeContext,
    } = params;

    const executionContext: ExecutionContext = {
      workflowId,
      runId,
      executionPath: resume?.resumePath || [],
      suspendedPaths: {},
      retryConfig: {
        attempts: retryConfig?.attempts || 3,
        delay: retryConfig?.delay || 1000,
      },
    };

    const stepResults: Record<string, StepResult> = resume?.stepResults || {};

    try {
      let lastOutput: StepResult | undefined;
      let prevStep: StepFlowEntry | undefined;

      // If resuming, find the last executed step
      if (resume) {
        const lastStepId = resume.steps[resume.steps.length - 1];
        const lastStepResult = stepResults[lastStepId];
        if (lastStepResult) {
          lastOutput = lastStepResult;
        }
      }

      // Execute each entry in the graph using the queue
      for (let i = 0; i < graph.length; i++) {
        const entry = graph[i];

        // If resuming, check if this step needs to be resumed
        if (resume) {
          if (entry.type === 'step') {
            const stepId = entry.step.id;
            const needsResume = resume.steps.includes(stepId);
            const existingResult = stepResults[stepId];

            // Skip steps that don't need to be resumed and have completed results
            if (
              !needsResume &&
              existingResult &&
              existingResult.status === 'completed'
            ) {
              lastOutput = existingResult;
              prevStep = entry;
              continue;
            }
          } else if (entry.type === 'parallel') {
            // For parallel steps, check if any child steps need to be resumed
            const childStepsNeedResume = entry.steps.some(
              (stepEntry) =>
                stepEntry.type === 'step' &&
                resume.steps.includes(stepEntry.step.id)
            );

            if (!childStepsNeedResume) {
              // Check if all child steps are completed
              const allChildStepsCompleted = entry.steps.every((stepEntry) => {
                if (stepEntry.type === 'step') {
                  const result = stepResults[stepEntry.step.id];
                  return result && result.status === 'completed';
                }
                return false;
              });

              if (allChildStepsCompleted) {
                // Reconstruct the parallel step result
                const combinedOutput = entry.steps.reduce((acc, stepEntry) => {
                  if (stepEntry.type === 'step') {
                    const result = stepResults[stepEntry.step.id];
                    if (result && result.status === 'completed') {
                      acc[stepEntry.step.id] = result.output;
                    }
                  }
                  return acc;
                }, {} as Record<string, any>);

                lastOutput = {
                  status: 'completed',
                  output: combinedOutput,
                };
                prevStep = entry;
                continue;
              }
            }
          }
        }

        // Add the execution to the queue
        const result = await this.executionQueue.add(
          () =>
            this.executeEntry({
              workflowId,
              runId,
              entry,
              prevStep,
              stepResults,
              resume,
              executionContext,
              runtimeContext,
              inputData: input,
            }),
          { priority: 0 }
        );

        // Update store with step result
        if (entry.type === 'step') {
          this.store.getState().updateStepResult(entry.step.id, result);
        }

        // If we're resuming and this is the step we're resuming, update its state
        if (
          resume &&
          entry.type === 'step' &&
          resume.steps.includes(entry.step.id)
        ) {
          const suspendedResult = stepResults[entry.step.id];
          if (
            suspendedResult?.status === 'suspended' &&
            result.status !== 'suspended'
          ) {
            // Clear the suspended state from executionContext
            delete executionContext.suspendedPaths[entry.step.id];
          }
        }

        if (result.status === 'suspended') {
          // Find all suspended steps and their information
          const suspendedSteps = Object.entries(stepResults)
            .filter(([_, result]) => result.status === 'suspended')
            .map(([stepId, result]) => ({
              stepId,
              path: result.suspendedPath || [],
              output: result.output,
            }));

          return {
            status: 'suspended',
            steps: stepResults,
            suspended: suspendedSteps,
          } as any;
        }

        if (result.status === 'failed') {
          return {
            status: 'failed',
            error: result.error,
            steps: stepResults,
          } as any;
        }

        lastOutput = result;
        prevStep = entry;
      }

      // Format and return the final result
      return this.formatReturnValue(
        stepResults,
        lastOutput!
      ) as WorkflowResult<TOutput>;
    } catch (error) {
      return {
        status: 'failed',
        error: error as Error,
        steps: stepResults,
      } as any;
    }
  }

  private async executeEntry(params: {
    workflowId: string;
    runId: string;
    entry: StepFlowEntry;
    prevStep?: StepFlowEntry;
    stepResults: Record<string, StepResult>;
    resume?: {
      steps: string[];
      stepResults: Record<string, StepResult>;
      resumePayload: any;
      resumePath: number[];
    };
    executionContext: ExecutionContext;
    runtimeContext?: RuntimeContext;
    inputData?: any;
  }): Promise<StepResult> {
    const {
      workflowId,
      runId,
      entry,
      prevStep,
      stepResults,
      resume,
      executionContext,
      runtimeContext,
      inputData,
    } = params;

    // If resuming, check if this is the step to resume
    if (
      resume &&
      resume.steps.includes(entry.type === 'step' ? entry.step.id : '')
    ) {
      if (entry.type === 'step' && entry.step.resumeSchema) {
        // Validate resume data against the step's resume schema
        try {
          entry.step.resumeSchema.parse(resume.resumePayload);
        } catch (error) {
          return {
            status: 'failed',
            error: error as Error,
          };
        }
      }
    }

    // Execute based on entry type
    switch (entry.type) {
      case 'step':
        return await this.executeStep({
          workflowId,
          runId,
          step: entry.step,
          prevStep,
          stepResults,
          executionContext,
          inputData,
          runtimeContext,
          isResuming: resume?.steps.includes(entry.step.id) || false,
          resumeData: resume?.resumePayload,
        });

      case 'parallel':
        return await this.executeParallel({
          workflowId,
          runId,
          entry,
          stepResults,
          executionContext,
          inputData,
          resume,
        });

      case 'conditional':
        return await this.executeConditional({
          workflowId,
          runId,
          entry,
          stepResults,
          executionContext,
          inputData,
          prevStep,
        });

      case 'loop':
        return await this.executeLoop({
          workflowId,
          runId,
          entry,
          prevStep,
          stepResults,
          executionContext,
          inputData,
          resume,
        });

      case 'foreach':
        return await this.executeForeach({
          workflowId,
          runId,
          entry,
          stepResults,
          executionContext,
          inputData,
          resume,
        });

      default:
        throw new Error(`Unknown entry type: ${(entry as any).type}`);
    }
  }

  private getStepOutput(
    stepResults: Record<string, StepResult>,
    prevStep?: StepFlowEntry
  ): any {
    if (!prevStep) {
      return undefined;
    }

    if (prevStep.type === 'step') {
      const result = stepResults[prevStep.step.id];
      return result?.output;
    }

    // For parallel steps, we need to look up the result by the parallel step's execution path
    // Since parallel steps don't have a single step ID, we need to find the result differently
    // For now, we'll return undefined and let the step use inputData
    // This is a limitation of the current design - parallel steps don't store their results with a specific ID
    return undefined;
  }

  private async executeStep(params: {
    workflowId: string;
    runId: string;
    step: Step<any, any>;
    prevStep?: StepFlowEntry;
    stepResults: Record<string, StepResult>;
    executionContext: ExecutionContext;
    inputData: any;
    runtimeContext?: RuntimeContext;
    isResuming?: boolean;
    resumeData?: any;
  }): Promise<StepResult> {
    const {
      step,
      prevStep,
      stepResults,
      executionContext,
      inputData,
      runtimeContext,
      isResuming,
      resumeData,
    } = params;

    try {
      // Set current step in store
      this.store.getState().setCurrentStep(step);
      // Log running state before executing the step
      const runningResult: StepResult = {
        status: 'running',
        output: undefined,
      };
      stepResults[step.id] = runningResult;
      this.store.getState().updateStepResult(step.id, runningResult);

      // Get input for this step
      const stepInput = isResuming
        ? resumeData
        : this.getStepOutput(stepResults, prevStep) || inputData;

      // Validate input against step's input schema
      if (!isResuming) {
        try {
          step.inputSchema.parse(stepInput);
        } catch (error) {
          return {
            status: 'failed',
            error: error as Error,
          };
        }
      }

      // Create step context
      const context: StepContext = {
        inputData: stepInput,
        getStepResult: <T>(stepId: string): T => {
          const result = stepResults[stepId];
          return result?.output as T;
        },
        getInitData: <T>(): T => inputData as T,
        runtimeContext,
        isResuming,
        resumeData,
        suspend: async (suspendPayload: any) => {
          const suspendedResult: StepResult = {
            status: 'suspended',
            output: suspendPayload,
            suspendedPath: executionContext.executionPath,
          };
          stepResults[step.id] = suspendedResult;
          executionContext.suspendedPaths[step.id] =
            executionContext.executionPath;

          // Throw a special exception to stop step execution
          const suspendError = new Error('SUSPEND_STEP');
          (suspendError as any).suspendedResult = suspendedResult;
          throw suspendError;
        },
      };

      // Execute the step
      const output = await step.execute(context);

      // Check if the step was suspended
      if (
        output &&
        typeof output === 'object' &&
        'status' in output &&
        output.status === 'suspended'
      ) {
        return output as StepResult;
      }

      // Validate output against schema
      let validatedOutput;
      try {
        validatedOutput = step.outputSchema.parse(output);
      } catch (error) {
        return {
          status: 'failed',
          error: error as Error,
        };
      }

      const result: StepResult = {
        status: 'completed',
        output: validatedOutput,
      };

      stepResults[step.id] = result;
      return result;
    } catch (error) {
      // Check if this is a suspend exception
      if (error instanceof Error && error.message === 'SUSPEND_STEP') {
        return (error as any).suspendedResult as StepResult;
      }

      const result: StepResult = {
        status: 'failed',
        error: error as Error,
      };
      stepResults[step.id] = result;
      return result;
    } finally {
      // Clear current step
      this.store.getState().setCurrentStep(undefined as any);
    }
  }

  private async executeParallel(params: {
    workflowId: string;
    runId: string;
    entry: { type: 'parallel'; steps: StepFlowEntry[] };
    stepResults: Record<string, StepResult>;
    executionContext: ExecutionContext;
    inputData: any;
    resume?: {
      steps: string[];
      stepResults: Record<string, StepResult>;
      resumePayload: any;
      resumePath: number[];
    };
  }): Promise<StepResult> {
    const { entry, stepResults, executionContext, inputData, resume } = params;

    // Check if we're resuming specific steps
    const isResuming = resume && resume.steps.length > 0;

    // Create a separate queue for parallel execution with higher concurrency
    const parallelQueue = new PQueue({ concurrency: entry.steps.length });

    const results = await Promise.all(
      entry.steps.map(async (stepEntry, index) => {
        const stepPath = [...executionContext.executionPath, index];
        const stepExecutionContext = {
          ...executionContext,
          executionPath: stepPath,
        };

        // If we're resuming, only execute steps that need to be resumed
        if (isResuming && stepEntry.type === 'step') {
          const stepId = stepEntry.step.id;
          const needsResume = resume.steps.includes(stepId);

          if (!needsResume) {
            // Return existing result if step doesn't need to be resumed
            const existingResult = stepResults[stepId];
            if (existingResult && existingResult.status === 'completed') {
              return existingResult;
            }
          }
        }

        const stepResume = isResuming
          ? {
              ...resume,
              steps:
                isResuming && stepEntry.type === 'step'
                  ? resume.steps.filter((s) => s === stepEntry.step.id)
                  : resume.steps,
            }
          : undefined;

        return parallelQueue.add(
          () =>
            this.executeEntry({
              workflowId: params.workflowId,
              runId: params.runId,
              entry: stepEntry,
              stepResults,
              resume: stepResume,
              executionContext: stepExecutionContext,
              inputData,
            }),
          { priority: 0 }
        );
      })
    );

    // Check if any step failed
    const failedResult = results.find((result) => result.status === 'failed');
    if (failedResult) {
      return failedResult;
    }

    // Check if any step is suspended
    const suspendedResult = results.find(
      (result) => result.status === 'suspended'
    );
    if (suspendedResult) {
      return suspendedResult;
    }

    // Combine all outputs
    const combinedOutput = results.reduce((acc, result, index) => {
      if (entry.steps[index].type === 'step') {
        const stepId = entry.steps[index].step.id;
        acc[stepId] = result.output;
      }
      return acc;
    }, {} as Record<string, any>);

    return {
      status: 'completed',
      output: combinedOutput,
    };
  }

  private async executeConditional(params: {
    workflowId: string;
    runId: string;
    entry: {
      type: 'conditional';
      steps: StepFlowEntry[];
      conditions: ((context: StepContext) => Promise<boolean>)[];
    };
    stepResults: Record<string, StepResult>;
    executionContext: ExecutionContext;
    inputData: any;
    prevStep?: StepFlowEntry;
  }): Promise<StepResult> {
    const { entry, stepResults, executionContext, inputData, prevStep } =
      params;

    // Evaluate conditions
    const context: StepContext = {
      inputData,
      getStepResult: <T>(stepId: string): T => {
        const result = stepResults[stepId];
        return result?.output as T;
      },
      getInitData: <T>(): T => inputData as T,
      suspend: async (suspendPayload: any) => {
        const suspendedResult: StepResult = {
          status: 'suspended',
          output: suspendPayload,
          suspendedPath: executionContext.executionPath,
        };
        return suspendedResult;
      },
    };

    for (let i = 0; i < entry.conditions.length; i++) {
      const condition = entry.conditions[i];
      const stepEntry = entry.steps[i];

      try {
        const shouldExecute = await condition(context);
        if (shouldExecute) {
          const stepPath = [...executionContext.executionPath, i];
          const stepExecutionContext = {
            ...executionContext,
            executionPath: stepPath,
          };

          return await this.executeEntry({
            workflowId: params.workflowId,
            runId: params.runId,
            entry: stepEntry,
            prevStep,
            stepResults,
            executionContext: stepExecutionContext,
            inputData,
          });
        }
      } catch (error) {
        return {
          status: 'failed',
          error: error as Error,
        };
      }
    }

    // No condition was met
    return {
      status: 'completed',
      output: undefined,
    };
  }

  private async executeLoop(params: {
    workflowId: string;
    runId: string;
    entry: {
      type: 'loop';
      step: Step<any, any>;
      condition: (context: StepContext) => Promise<boolean>;
      loopType: 'dowhile' | 'dountil';
    };
    prevStep?: StepFlowEntry;
    stepResults: Record<string, StepResult>;
    executionContext: ExecutionContext;
    inputData: any;
    resume?: {
      steps: string[];
      stepResults: Record<string, StepResult>;
      resumePayload: any;
      resumePath: number[];
    };
  }): Promise<StepResult> {
    const { entry, stepResults, executionContext, inputData } = params;

    const context: StepContext = {
      inputData,
      getStepResult: <T>(stepId: string): T => {
        const result = stepResults[stepId];
        return result?.output as T;
      },
      getInitData: <T>(): T => inputData as T,
      suspend: async (suspendPayload: any) => {
        const suspendedResult: StepResult = {
          status: 'suspended',
          output: suspendPayload,
          suspendedPath: executionContext.executionPath,
        };
        return suspendedResult;
      },
    };

    let iteration = 0;
    let lastOutput: any = inputData;
    let shouldContinueLoop = true;

    do {
      const stepPath = [...executionContext.executionPath, iteration];
      const stepExecutionContext = {
        ...executionContext,
        executionPath: stepPath,
      };

      const result = await this.executeEntry({
        workflowId: params.workflowId,
        runId: params.runId,
        entry: { type: 'step', step: entry.step },
        stepResults,
        executionContext: stepExecutionContext,
        inputData: lastOutput,
      });

      if (result.status === 'failed') {
        return result;
      }

      if (result.status === 'suspended') {
        return result;
      }

      lastOutput = result.output;
      iteration++;

      // Check condition
      try {
        const shouldContinue: boolean = await entry.condition({
          ...context,
          inputData: lastOutput,
        });

        if (entry.loopType === 'dowhile' && !shouldContinue) {
          shouldContinueLoop = false;
        }
        if (entry.loopType === 'dountil' && shouldContinue) {
          shouldContinueLoop = false;
        }
      } catch (error) {
        return {
          status: 'failed',
          error: error as Error,
        };
      }
    } while (shouldContinueLoop);

    return {
      status: 'completed',
      output: lastOutput,
    };
  }

  private async executeForeach(params: {
    workflowId: string;
    runId: string;
    entry: {
      type: 'foreach';
      step: Step<any, any>;
      opts: {
        concurrency: number;
      };
    };
    stepResults: Record<string, StepResult>;
    executionContext: ExecutionContext;
    inputData: any;
    resume?: {
      steps: string[];
      stepResults: Record<string, StepResult>;
      resumePayload: any;
      resumePath: number[];
    };
  }): Promise<StepResult> {
    const { entry, stepResults, executionContext, inputData } = params;

    if (!Array.isArray(inputData)) {
      return {
        status: 'failed',
        error: new Error('Foreach step requires an array input'),
      };
    }

    const results: any[] = [];
    const chunks = this.chunkArray(inputData, entry.opts.concurrency);

    // Create a queue for foreach execution with the specified concurrency
    const foreachQueue = new PQueue({ concurrency: entry.opts.concurrency });

    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];
      const chunkResults = await Promise.all(
        chunk.map(async (item, itemIndex) => {
          const globalIndex = chunkIndex * entry.opts.concurrency + itemIndex;
          const stepPath = [...executionContext.executionPath, globalIndex];
          const stepExecutionContext = {
            ...executionContext,
            executionPath: stepPath,
          };

          const result = await foreachQueue.add(
            () =>
              this.executeEntry({
                workflowId: params.workflowId,
                runId: params.runId,
                entry: { type: 'step', step: entry.step },
                stepResults,
                executionContext: stepExecutionContext,
                inputData: item,
              }),
            { priority: 0 }
          );

          if (result.status === 'failed') {
            throw result.error;
          }

          if (result.status === 'suspended') {
            return result;
          }

          return result.output;
        })
      );

      // Check for suspended results
      const suspendedResult = chunkResults.find(
        (result) =>
          result &&
          typeof result === 'object' &&
          'status' in result &&
          result.status === 'suspended'
      );
      if (suspendedResult) {
        return suspendedResult as StepResult;
      }

      results.push(...chunkResults);
    }

    return {
      status: 'completed',
      output: results,
    };
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private formatReturnValue(
    stepResults: Record<string, StepResult>,
    lastOutput: StepResult,
    error?: Error
  ): WorkflowResult<any> {
    if (error) {
      return {
        status: 'failed',
        error,
        steps: stepResults,
      };
    }

    return {
      status: 'completed',
      result: lastOutput.output,
      steps: stepResults,
    };
  }

  // Method to get queue statistics
  getQueueStats() {
    return {
      size: this.executionQueue.size,
      pending: this.executionQueue.pending,
      isPaused: this.executionQueue.isPaused,
    };
  }

  // Method to pause/resume the queue
  pause() {
    this.executionQueue.pause();
  }

  resume() {
    this.executionQueue.start();
  }
  start() {
    this.executionQueue.start();
  }

  // Method to clear the queue
  clear() {
    this.executionQueue.clear();
  }
}
