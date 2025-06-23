import { z } from 'zod';
import type {
  Step,
  StepContext,
  StepFlowEntry,
  StepResult,
  WorkflowConfig,
  WorkflowResult,
  SerializedStepFlowEntry,
  MappingConfig,
  RuntimeContext,
} from './types';
import { WorkflowExecutionEngine } from './execution-engine';
import {
  useWorkflowStore,
  CUE_STATUS,
  WorkflowStore,
  WorkflowLog,
} from './stores/workflowStore';
import { StoreApi } from 'zustand';

// Extend WatchEvent type to include data property
interface ExtendedWatchEvent {
  type: 'WorkflowStatusUpdate' | 'StepStatusUpdate';
  data: WorkflowLog & {
    stepResults: Record<string, StepResult>;
  };
}

export class Workflow<
  TInput,
  TOutput,
  TSteps extends Record<string, Step<any, any>>
> implements Step<TInput, TOutput>
{
  public id: string;
  public inputSchema: z.ZodType<TInput>;
  public outputSchema: z.ZodType<TOutput>;
  private steps: TSteps;
  private executionGraph: Map<string, Set<string>> = new Map();
  private currentStep?: Step<any, any>;
  private stepResults: Map<string, StepResult> = new Map();
  private _stepFlow: StepFlowEntry[] = [];
  private _serializedStepFlow: SerializedStepFlowEntry[] = [];
  private retryConfig?: {
    attempts?: number;
    delay?: number;
  };
  private executionEngine: WorkflowExecutionEngine;
  public store: StoreApi<WorkflowStore>;

  constructor(config: WorkflowConfig<TInput, TOutput, TSteps>) {
    this.id = config.id;
    this.inputSchema = config.inputSchema;
    this.outputSchema = config.outputSchema;
    this.steps = config.steps || ({} as TSteps);
    this.retryConfig = config.retryConfig;
    this.executionEngine = new WorkflowExecutionEngine();
    this.store = useWorkflowStore;
  }

  // Create a new step
  static createStep<TInput, TOutput>(config: {
    id: string;
    description?: string;
    inputSchema: z.ZodType<TInput>;
    outputSchema: z.ZodType<TOutput>;
    resumeSchema?: z.ZodType;
    suspendSchema?: z.ZodType;
    execute: (context: StepContext<TInput, TOutput>) => Promise<TOutput>;
  }): Step<TInput, TOutput> {
    return {
      id: config.id,
      description: config.description,
      inputSchema: config.inputSchema,
      outputSchema: config.outputSchema,
      resumeSchema: config.resumeSchema,
      suspendSchema: config.suspendSchema,
      execute: config.execute,
    };
  }

  // Create a new workflow
  static createWorkflow<
    TInput,
    TOutput,
    TSteps extends Record<string, Step<any, any>>
  >(
    config: WorkflowConfig<TInput, TOutput, TSteps>
  ): Workflow<TInput, TOutput, TSteps> {
    return new Workflow(config);
  }

  // Add a step to the execution graph
  private addToGraph(stepId: string, dependencies: string[] = []) {
    if (!this.executionGraph.has(stepId)) {
      this.executionGraph.set(stepId, new Set(dependencies));
    }
  }

  // Set step flow
  setStepFlow(stepFlow: StepFlowEntry[]) {
    this._stepFlow = stepFlow;
    this._serializedStepFlow = this.serializeStepFlow(stepFlow);
  }

  // Serialize step flow
  private serializeStepFlow(
    stepFlow: StepFlowEntry[]
  ): SerializedStepFlowEntry[] {
    return stepFlow.map((entry) => {
      switch (entry.type) {
        case 'step':
          return {
            type: 'step',
            step: {
              id: entry.step.id,
              description: entry.step.description,
            },
          };
        case 'parallel':
          return {
            type: 'parallel',
            steps: this.serializeStepFlow(entry.steps),
          };
        case 'conditional':
          return {
            type: 'conditional',
            steps: this.serializeStepFlow(entry.steps),
            conditions: entry.conditions.map((_, index) => ({
              id: `condition_${index}`,
              fn: 'serialized_condition',
            })),
          };
        case 'loop':
          return {
            type: 'loop',
            step: {
              id: entry.step.id,
              description: entry.step.description,
            },
            condition: {
              id: 'loop_condition',
              fn: 'serialized_condition',
            },
            loopType: entry.loopType,
          };
        case 'foreach':
          return {
            type: 'foreach',
            step: {
              id: entry.step.id,
              description: entry.step.description,
            },
            opts: entry.opts,
          };
      }
    });
  }

  // Add a step to the flow
  then(step: Step<any, any>) {
    (this.steps as any)[step.id] = step;
    this._stepFlow.push({ type: 'step', step });
    return this;
  }

  // Map data between steps
  map<TMapping extends MappingConfig<z.ZodType<any>, z.ZodType<any>>>(
    mappingConfig: TMapping | ((context: StepContext<any, any>) => Promise<any>)
  ) {
    if (typeof mappingConfig === 'function') {
      const mappingStep = Workflow.createStep({
        id: `mapping_${Date.now()}`,
        inputSchema: this.inputSchema,
        outputSchema: this.outputSchema,
        execute: mappingConfig,
      });

      this._stepFlow.push({ type: 'step', step: mappingStep });
      return this;
    }

    const mappingStep = Workflow.createStep({
      id: `mapping_${Date.now()}`,
      inputSchema: this.inputSchema,
      outputSchema: this.outputSchema,
      execute: async (context: StepContext<any, any>) => {
        const { inputData, getStepResult, runtimeContext } = context;
        const result: Record<string, any> = {};

        for (const [key, mapping] of Object.entries(mappingConfig)) {
          const m: any = mapping;

          if (m.value !== undefined) {
            result[key] = m.value;
            continue;
          }

          if (m.fn !== undefined) {
            result[key] = await m.fn(context);
            continue;
          }

          if (m.runtimeContextPath) {
            result[key] = runtimeContext?.get(m.runtimeContextPath);
            continue;
          }

          const stepResult = m.initData ? inputData : getStepResult(m.step.id);

          if (m.path === '.') {
            result[key] = stepResult;
            continue;
          }

          const pathParts = m.path.split('.');
          let value: any = stepResult;
          for (const part of pathParts) {
            if (typeof value === 'object' && value !== null) {
              value = value[part];
            } else {
              throw new Error(`Invalid path ${m.path} in step ${m.step.id}`);
            }
          }

          result[key] = value;
        }

        return result as any;
      },
    });

    this._stepFlow.push({ type: 'step', step: mappingStep });
    return this;
  }

  // Add parallel steps
  parallel(steps: Step<any, any>[]) {
    steps.forEach((step) => {
      (this.steps as any)[step.id] = step;
    });
    this._stepFlow.push({
      type: 'parallel',
      steps: steps.map((step) => ({ type: 'step', step })),
    });
    return this;
  }

  // Add conditional steps
  branch(
    steps: Array<[(context: StepContext) => Promise<boolean>, Step<any, any>]>
  ) {
    steps.forEach(([_, step]) => {
      (this.steps as any)[step.id] = step;
    });
    this._stepFlow.push({
      type: 'conditional',
      steps: steps.map(([_, step]) => ({ type: 'step', step })),
      conditions: steps.map(([condition]) => condition),
    });
    return this;
  }

  // Add do-while loop
  dowhile(
    step: Step<any, any>,
    condition: (context: StepContext) => Promise<boolean>
  ) {
    (this.steps as any)[step.id] = step;
    this._stepFlow.push({
      type: 'loop',
      step,
      condition,
      loopType: 'dowhile',
    });
    return this;
  }

  // Add do-until loop
  dountil(
    step: Step<any, any>,
    condition: (context: StepContext) => Promise<boolean>
  ) {
    (this.steps as any)[step.id] = step;
    this._stepFlow.push({
      type: 'loop',
      step,
      condition,
      loopType: 'dountil',
    });
    return this;
  }

  // Add foreach loop
  foreach(
    step: Step<any, any>,
    opts?: {
      concurrency: number;
    }
  ) {
    (this.steps as any)[step.id] = step;
    this._stepFlow.push({
      type: 'foreach',
      step,
      opts: opts || { concurrency: 1 },
    });
    return this;
  }

  // Build execution graph
  private buildExecutionGraph(): Map<string, Set<string>> {
    const graph = new Map<string, Set<string>>();
    this._stepFlow.forEach((entry) => {
      switch (entry.type) {
        case 'step':
          graph.set(entry.step.id, new Set());
          break;
        case 'parallel':
          entry.steps.forEach((stepEntry) => {
            if (stepEntry.type === 'step') {
              graph.set(stepEntry.step.id, new Set());
            }
          });
          break;
        case 'conditional':
          entry.steps.forEach((stepEntry) => {
            if (stepEntry.type === 'step') {
              graph.set(stepEntry.step.id, new Set());
            }
          });
          break;
        case 'loop':
          graph.set(entry.step.id, new Set());
          break;
        case 'foreach':
          graph.set(entry.step.id, new Set());
          break;
      }
    });
    return graph;
  }

  // Start the workflow execution
  async start(
    inputData: TInput
  ): Promise<WorkflowResult<TInput, TOutput, TSteps>> {
    try {
      // Reset store state
      this.store.getState().reset();
      this.store.getState().setStatus(CUE_STATUS.RUNNING);

      // Validate input data
      const validatedInput = this.inputSchema.parse(inputData);

      // Build execution graph
      this.executionGraph = this.buildExecutionGraph();

      // Execute steps using the execution engine
      const result = await this.executionEngine.execute<
        TInput,
        WorkflowResult<TInput, TOutput, TSteps>
      >({
        workflowId: this.id,
        runId: Date.now().toString(),
        graph: this._stepFlow,
        input: validatedInput,
        emitter: {
          emit: async (event: string, data: any) => {
            this.store.getState().addLog({
              timestamp: Date.now(),
              logType: 'WorkflowStatusUpdate',
              logDescription: event,
              metadata: data,
            });
          },
        },
        retryConfig: this.retryConfig,
      });

      // Update step results with the execution results
      this.stepResults = new Map(Object.entries(result.steps));

      // Update store with final status
      if (result.status === 'failed') {
        this.store.getState().setStatus(CUE_STATUS.FAILED);
      } else if (result.status === 'suspended') {
        this.store.getState().setStatus(CUE_STATUS.SUSPENDED);
      } else {
        this.store.getState().setStatus(CUE_STATUS.COMPLETED);
      }

      return result;
    } catch (error) {
      this.store.getState().setStatus(CUE_STATUS.FAILED);
      return {
        status: 'failed',
        error: error as Error,
        steps: this.getStepsResults(),
      };
    }
  }

  // Get all step results
  private getStepsResults() {
    return Object.fromEntries(
      Array.from(this.stepResults.entries()).map(([id, result]) => [id, result])
    ) as WorkflowResult<TInput, TOutput, TSteps>['steps'];
  }

  // Watch workflow execution
  watch(callback: (event: ExtendedWatchEvent) => void) {
    return this.store.subscribe((state) => {
      const lastLog = state.logs[state.logs.length - 1];
      if (lastLog) {
        callback({
          type: lastLog.logType,
          data: {
            ...lastLog,
            stepResults: Object.fromEntries(state.stepResults),
          },
        });
      }
    });
  }

  // Get step flow
  get stepFlow() {
    return this._stepFlow;
  }

  // Get serialized step flow
  get serializedStepFlow() {
    return this._serializedStepFlow;
  }

  async execute(context: StepContext<TInput, TOutput>): Promise<TOutput> {
    const { inputData } = context;

    // Execute the workflow using the execution engine
    const result = (await this.executionEngine.execute({
      workflowId: this.id,
      runId: `${this.id}-${Date.now()}`,
      graph: this._stepFlow,
      input: inputData,
      emitter: {
        emit: async () => {},
      },
      retryConfig: this.retryConfig,
    })) as { status: string; result: TOutput; error?: Error };

    // When used as a step, return just the result value
    if (result.status === 'failed') {
      throw result.error;
    }

    return result.result;
  }

  // Add resume functionality
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
  }): Promise<WorkflowResult<TInput, TOutput, TSteps>> {
    const { resumeData, step, runtimeContext } = params;

    // Determine which steps to resume
    const stepsToResume = Array.isArray(step)
      ? step.map((b) => (typeof b === 'string' ? b : b.id))
      : [typeof step === 'string' ? step : step.id];

    // Check if any of the steps to resume are actually suspended
    const hasSuspendedSteps = stepsToResume.some(
      (stepId) => this.stepResults.get(stepId)?.status === 'suspended'
    );

    if (!hasSuspendedSteps) {
      throw new Error('No suspended steps to resume');
    }

    // Create a new run ID for the resume operation
    const runId = crypto.randomUUID();

    // Execute the workflow with resume parameters
    const executionResult = await this.executionEngine.execute<
      TInput,
      WorkflowResult<TInput, TOutput, TSteps>
    >({
      workflowId: this.id,
      runId,
      graph: this._stepFlow,
      resume: {
        steps: stepsToResume,
        stepResults: Object.fromEntries(this.stepResults),
        resumePayload: resumeData,
        resumePath: stepsToResume
          .map((stepId) => {
            const result = this.stepResults.get(stepId);
            return result?.suspendedPath || [];
          })
          .flat(),
      },
      emitter: {
        emit: async () => {},
      },
      retryConfig: this.retryConfig,
      runtimeContext,
    });

    // Update step results with the new execution results
    this.stepResults = new Map(Object.entries(executionResult.steps));

    return executionResult;
  }
}
