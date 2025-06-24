import { z } from 'zod';
import type {
  Step,
  StepContext,
  StepFlowEntry,
  StepResult,
  RuntimeContext,
} from '../types';
import { useWorkflowStore } from './stores/workflowStore';

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

export class WorkflowExecutionEngine {
  private store = useWorkflowStore;

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
    emitter: { emit: (event: string, data: any) => Promise<void> };
    retryConfig?: {
      attempts?: number;
      delay?: number;
    };
    runtimeContext?: RuntimeContext;
  }): Promise<TOutput> {
    const {
      workflowId,
      runId,
      graph,
      input,
      resume,
      emitter,
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

      // Execute each entry in the graph
      for (const entry of graph) {
        const result = await this.executeEntry({
          workflowId,
          runId,
          entry,
          prevStep,
          stepResults,
          resume,
          executionContext,
          emitter,
          runtimeContext,
          inputData: input,
        });

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
        emitter,
        stepResults,
        lastOutput!
      ) as TOutput;
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
    emitter: { emit: (event: string, data: any) => Promise<void> };
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
      emitter,
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

        // Get the previous step's output as input data for the resumed step
        const stepInput = this.getStepOutput(stepResults, prevStep);

        // If the step was suspended, we need to re-execute it with the same input
        const suspendedResult = stepResults[entry.step.id];
        if (suspendedResult?.status === 'suspended') {
          const result = await this.executeStep({
            workflowId,
            runId,
            step: entry.step,
            prevStep,
            stepResults,
            executionContext,
            emitter,
            inputData: stepInput,
            runtimeContext,
            isResuming: true,
            resumeData: resume.resumePayload,
          });

          // Update the step's result in stepResults
          stepResults[entry.step.id] = result;
          // console.log({ result });

          // If the step completed successfully, clear its suspended state
          if (result.status === 'completed') {
            delete executionContext.suspendedPaths[entry.step.id];
          }

          return result;
        }
      }
    }

    switch (entry.type) {
      case 'step':
        return this.executeStep({
          workflowId,
          runId,
          step: entry.step,
          prevStep,
          stepResults,
          executionContext,
          emitter,
          inputData,
          runtimeContext,
        });
      case 'parallel':
        return this.executeParallel({
          workflowId,
          runId,
          entry,
          stepResults,
          resume,
          executionContext,
          emitter,
          inputData,
        });
      case 'conditional':
        return this.executeConditional({
          workflowId,
          runId,
          entry,
          stepResults,
          executionContext,
          emitter,
          inputData,
          prevStep,
        });
      case 'loop':
        return this.executeLoop({
          workflowId,
          runId,
          entry,
          prevStep: prevStep || {
            type: 'step',
            step: {
              id: 'loop',
              execute: async () => {},
              inputSchema: z.any(),
              outputSchema: z.any(),
            } as Step<any, any>,
          },
          stepResults,
          resume,
          executionContext,
          emitter,
          inputData,
        });
      case 'foreach':
        return this.executeForeach({
          workflowId,
          runId,
          entry,
          stepResults,
          resume,
          executionContext,
          emitter,
          inputData,
        });
    }
  }

  private getStepOutput(
    stepResults: Record<string, StepResult>,
    prevStep?: StepFlowEntry
  ): any {
    if (!prevStep) {
      return stepResults.input;
    } else if (prevStep.type === 'step') {
      return stepResults[prevStep.step.id]?.output;
    } else if (
      prevStep.type === 'parallel' ||
      prevStep.type === 'conditional'
    ) {
      return prevStep.steps.reduce((acc: Record<string, any>, step, _index) => {
        if (step.type === 'step') {
          acc[step.step.id] = stepResults[step.step.id]?.output;
        }
        return acc;
      }, {});
    } else if (prevStep.type === 'loop') {
      return stepResults[prevStep.step.id]?.output;
    } else if (prevStep.type === 'foreach') {
      return stepResults[prevStep.step.id]?.output;
    }
    return stepResults.input;
  }

  private async executeStep(params: {
    workflowId: string;
    runId: string;
    step: Step<any, any>;
    prevStep?: StepFlowEntry;
    stepResults: Record<string, StepResult>;
    executionContext: ExecutionContext;
    emitter: { emit: (event: string, data: any) => Promise<void> };
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
      // Get input data for the step
      const stepInput = this.getStepOutput(stepResults, prevStep);

      // Store the initial input data if it's not already stored
      if (!stepResults.input) {
        stepResults.input = inputData;
      }

      // Si estamos resumiendo, limpiamos el estado suspendido anterior
      if (isResuming) {
        delete stepResults[step.id];
        delete executionContext.suspendedPaths[step.id];
      }

      // Create step context
      const context: StepContext = {
        inputData: stepInput || inputData,
        getStepResult: <T>(stepId: string) => {
          const result = stepResults[stepId];
          if (!result) {
            throw new Error(`Step result not found for step: ${stepId}`);
          }
          if (result.status !== 'completed') {
            throw new Error(`Step ${stepId} has not completed successfully`);
          }
          return result.output as T;
        },
        getInitData: <T>() => {
          const initData = stepResults.input;
          if (!initData) {
            throw new Error('Initial input data not found');
          }
          return initData as T;
        },
        runtimeContext,
        isResuming,
        resumeData,
        suspend: async (suspendPayload: any) => {
          // Update execution path with current step index
          const currentPath = [...executionContext.executionPath];
          const stepIndex = Object.keys(stepResults).length;
          currentPath.push(stepIndex);

          const result: StepResult = {
            status: 'suspended',
            output: suspendPayload,
            suspendedPath: currentPath,
          };
          // Store the suspended state in both stepResults and executionContext
          stepResults[step.id] = result;
          executionContext.suspendedPaths[step.id] = currentPath;

          return result;
        },
      };

      // Log running state before executing the step
      const runningResult: StepResult = {
        status: 'running',
        output: undefined,
      };
      stepResults[step.id] = runningResult;
      this.store.getState().updateStepResult(step.id, runningResult);

      // Execute the step
      const output = await step.execute(context);

      // Check if the step was suspended during this execution
      const currentResult = stepResults[step.id];
      if (currentResult?.status === 'suspended') {
        return currentResult;
      }

      // Si estamos resumiendo y el bloque se completó exitosamente
      if (isResuming) {
        const result: StepResult = {
          status: 'completed',
          output,
        };
        stepResults[step.id] = result;
        return result;
      }

      // If the step didn't suspend, return the result
      const result: StepResult = {
        status: 'completed',
        output,
      };
      stepResults[step.id] = result;
      return result;
    } catch (error) {
      const result: StepResult = {
        status: 'failed',
        error: error as Error,
      };
      stepResults[step.id] = result;
      return result;
    }
  }

  private async executeParallel(params: {
    workflowId: string;
    runId: string;
    entry: { type: 'parallel'; steps: StepFlowEntry[] };
    stepResults: Record<string, StepResult>;
    executionContext: ExecutionContext;
    emitter: { emit: (event: string, data: any) => Promise<void> };
    inputData: any;
    resume?: {
      steps: string[];
      stepResults: Record<string, StepResult>;
      resumePayload: any;
      resumePath: number[];
    };
  }): Promise<StepResult> {
    const { entry, inputData } = params;

    const results = await Promise.all(
      entry.steps.map((step) =>
        this.executeEntry({
          ...params,
          entry: step,
          prevStep: {
            type: 'step',
            step: {
              id: 'parallel',
              execute: async () => {},
              inputSchema: z.any(),
              outputSchema: z.any(),
            } as Step<any, any>,
          },
          inputData,
        })
      )
    );

    // Log step status updates for each parallel step
    results.forEach((result, index) => {
      const stepEntry = entry.steps[index];
      if (stepEntry.type === 'step') {
        this.store.getState().updateStepResult(stepEntry.step.id, result);
      }
    });

    const hasFailed = results.some((result) => result.status === 'failed');
    if (hasFailed) {
      return {
        status: 'failed',
        error: new Error('One or more parallel steps failed'),
      };
    }

    const hasSuspended = results.find(
      (result) => result.status === 'suspended'
    );
    if (hasSuspended) {
      return hasSuspended;
    }

    return {
      status: 'completed',
      output: results.reduce((acc, result, index) => {
        if (result.status === 'completed') {
          const currentEntry = entry.steps[index]!;
          if (currentEntry.type === 'step') {
            acc[currentEntry.step.id] = result.output;
          }
        }
        return acc;
      }, {} as Record<string, any>),
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
    emitter: { emit: (event: string, data: any) => Promise<void> };
    inputData: any;
    prevStep?: StepFlowEntry;
  }): Promise<StepResult> {
    const { entry, stepResults, executionContext, inputData, prevStep } =
      params;

    // Store the initial input data if it's not already stored
    if (!stepResults.input) {
      stepResults.input = inputData;
    }

    const context: StepContext = {
      inputData,
      getStepResult: <T>(stepId: string) => {
        const result = stepResults[stepId];
        if (!result) {
          throw new Error(`Step result not found for step: ${stepId}`);
        }
        if (result.status !== 'completed') {
          throw new Error(`Step ${stepId} has not completed successfully`);
        }
        return result.output as T;
      },
      getInitData: <T>() => {
        const initData = stepResults.input;
        if (!initData) {
          throw new Error('Initial input data not found');
        }
        return initData as T;
      },
      suspend: async (suspendPayload: any) => {
        // Update execution path with current step index
        const currentPath = [...executionContext.executionPath];
        const stepIndex = Object.keys(stepResults).length;
        currentPath.push(stepIndex);

        const result: StepResult = {
          status: 'suspended',
          output: suspendPayload,
          suspendedPath: currentPath,
        };
        // Store the suspended state in the execution context
        executionContext.suspendedPaths[`step_${stepIndex}`] = currentPath;
        return result;
      },
    };

    const conditionResults = await Promise.all(
      entry.conditions.map((condition) => condition(context))
    );

    const matchingIndex = conditionResults.findIndex((result) => result);
    if (matchingIndex === -1) {
      return {
        status: 'failed',
        error: new Error('No matching condition found'),
      };
    }

    const result = await this.executeEntry({
      ...params,
      entry: entry.steps[matchingIndex]!,
      prevStep: prevStep || {
        type: 'step',
        step: {
          id: 'conditional',
          execute: async () => {},
          inputSchema: z.any(),
          outputSchema: z.any(),
        } as Step<any, any>,
      },
    });

    // Update the step result in the store
    if (entry.steps[matchingIndex]?.type === 'step') {
      this.store
        .getState()
        .updateStepResult(entry.steps[matchingIndex].step.id, result);
    }

    return result;
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
    prevStep: StepFlowEntry;
    stepResults: Record<string, StepResult>;
    executionContext: ExecutionContext;
    emitter: { emit: (event: string, data: any) => Promise<void> };
    inputData: any;
    resume?: {
      steps: string[];
      stepResults: Record<string, StepResult>;
      resumePayload: any;
      resumePath: number[];
    };
  }): Promise<StepResult> {
    const { entry, stepResults, executionContext, inputData } = params;

    // Store the initial input data if it's not already stored
    if (!stepResults.input) {
      stepResults.input = inputData;
    }

    let result: StepResult = {
      status: 'completed',
      output: inputData,
    };
    let shouldContinue: boolean = false;

    console.log('Starting loop with initial output:', result.output);
    let prevOutput = inputData;

    do {
      result = await this.executeStep({
        ...params,
        step: entry.step,
        prevStep: {
          type: 'step',
          step: entry.step,
        },
        inputData: prevOutput,
      });
      prevOutput = result.output;

      if (result.status !== 'completed') {
        return result;
      }

      // Create a new context with updated step results
      const context: StepContext = {
        inputData: result.output,
        getStepResult: <T>(stepId: string) => {
          const result = stepResults[stepId];
          if (!result) {
            throw new Error(`Step result not found for step: ${stepId}`);
          }
          if (result.status !== 'completed') {
            throw new Error(
              `Step ${stepId} did not complete successfully. Status: ${result.status}`
            );
          }
          return result.output as T;
        },
        getInitData: <T>() => {
          const initData = stepResults.input;
          if (!initData) {
            throw new Error('Initial input data not found');
          }
          return initData as T;
        },
        suspend: async (suspendPayload: any) => {
          // Update execution path with current step index
          const currentPath = [...executionContext.executionPath];
          const stepIndex = Object.keys(stepResults).length;
          currentPath.push(stepIndex);

          const result: StepResult = {
            status: 'suspended',
            output: suspendPayload,
            suspendedPath: currentPath,
          };
          // Store the suspended state in the execution context
          executionContext.suspendedPaths[`step_${stepIndex}`] = currentPath;
          return result;
        },
      };

      shouldContinue = await entry.condition(context);

      if (entry.loopType === 'dountil') {
        shouldContinue = !shouldContinue;
      }
    } while (shouldContinue);

    return result;
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
    emitter: { emit: (event: string, data: any) => Promise<void> };
    inputData: any;
    resume?: {
      steps: string[];
      stepResults: Record<string, StepResult>;
      resumePayload: any;
      resumePath: number[];
    };
  }): Promise<StepResult> {
    const { entry, stepResults, inputData } = params;
    if (!Array.isArray(inputData)) {
      return {
        status: 'failed',
        error: new Error('Foreach step requires an array input'),
      };
    }

    const results: any[] = [];
    const chunks = this.chunkArray(inputData, entry.opts.concurrency);

    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map((item) =>
          this.executeStep({
            ...params,
            step: entry.step,
            stepResults: { ...stepResults, input: item },
            inputData: item,
          })
        )
      );

      // Log step status updates for each parallel step
      chunkResults.forEach((result) => {
        this.store.getState().updateStepResult(entry.step.id, result);
      });

      const hasFailed = chunkResults.some(
        (result) => result.status === 'failed'
      );
      if (hasFailed) {
        return {
          status: 'failed',
          error: new Error('One or more foreach iterations failed'),
        };
      }

      const hasSuspended = chunkResults.find(
        (result) => result.status === 'suspended'
      );
      if (hasSuspended) {
        return hasSuspended;
      }

      results.push(...chunkResults.map((result) => result.output));
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
    emitter: { emit: (event: string, data: any) => Promise<void> },
    stepResults: Record<string, StepResult>,
    lastOutput: StepResult,
    error?: Error
  ) {
    const base: any = {
      status: lastOutput.status,
      steps: stepResults,
    };

    if (lastOutput.status === 'completed') {
      base.result = lastOutput.output;
    } else if (lastOutput.status === 'failed') {
      base.error = error?.stack ?? error ?? lastOutput.error;
    } else if (lastOutput.status === 'suspended') {
      // Find all suspended steps and their information
      const suspendedSteps = Object.entries(stepResults)
        .filter(([_, result]) => result.status === 'suspended')
        .map(([stepId, result]) => ({
          stepId,
          path: result.suspendedPath || [],
          output: result.output,
        }));

      base.suspended = suspendedSteps;
    }

    return base;
  }
}
