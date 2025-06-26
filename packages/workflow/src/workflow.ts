import { z } from 'zod';
import type {
  Step,
  StepContext,
  StepFlowEntry,
  WorkflowConfig,
  WorkflowResult,
  SerializedStepFlowEntry,
  MappingConfig,
  RuntimeContext,
} from './types';

import { randomUUID } from 'crypto';
import { Run } from './run';
import { RunStore } from './stores/runStore';

/**
 * Represents a workflow that can be executed
 */
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
  private _stepFlow: StepFlowEntry[] = [];
  private _serializedStepFlow: SerializedStepFlowEntry[] = [];
  private retryConfig?: {
    attempts?: number;
    delay?: number;
  };
  private _committed: boolean = false;
  private _runs: Map<string, Run<TInput, TOutput>> = new Map();

  constructor(config: WorkflowConfig<TInput, TOutput>) {
    this.id = config.id;
    this.inputSchema = config.inputSchema;
    this.outputSchema = config.outputSchema;
    this.steps = {} as TSteps;
    this.retryConfig = config.retryConfig;
  }

  // Create a new step
  static createStep<TInput, TOutput>(config: {
    id: string;
    description?: string;
    inputSchema: z.ZodType<TInput>;
    outputSchema: z.ZodType<TOutput>;
    resumeSchema?: z.ZodType;
    suspendSchema?: z.ZodType;
    execute: (context: StepContext<TInput>) => Promise<TOutput>;
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
    config: WorkflowConfig<TInput, TOutput>
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
  map<TMapping extends MappingConfig<z.ZodType<any>>>(
    mappingConfig: TMapping | ((context: StepContext<any>) => Promise<any>)
  ) {
    if (typeof mappingConfig === 'function') {
      const mappingStep = Workflow.createStep({
        id: `mapping_${Date.now()}`,
        inputSchema: z.any(),
        outputSchema: z.any(),
        execute: mappingConfig,
      });

      this._stepFlow.push({ type: 'step', step: mappingStep });
      return this;
    }

    const mappingStep = Workflow.createStep({
      id: `mapping_${Date.now()}`,
      inputSchema: z.any(),
      outputSchema: z.any(),
      execute: async (context: StepContext<any>) => {
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

  /**
   * Finalizes the workflow definition and prepares it for execution
   * This method should be called after all steps have been added to the workflow
   * @returns A built workflow instance ready for execution
   */
  commit() {
    if (this._stepFlow.length === 0) {
      throw new Error(
        'Execution flow of workflow is not defined. Add steps to the workflow via .then(), .branch(), etc.'
      );
    }

    this.executionGraph = this.buildExecutionGraph();
    this._committed = true;
    return this;
  }

  /**
   * Creates a new workflow run instance
   * @param options Optional configuration for the run
   * @returns A Run instance that can be used to execute the workflow
   */
  createRun(options?: { runId?: string }): Run<TInput, TOutput> {
    if (this._stepFlow.length === 0) {
      throw new Error(
        'Execution flow of workflow is not defined. Add steps to the workflow via .then(), .branch(), etc.'
      );
    }
    if (!this._committed) {
      throw new Error(
        'Uncommitted step flow changes detected. Call .commit() to register the steps.'
      );
    }

    const runIdToUse = options?.runId || randomUUID();

    // Return a new Run instance with object parameters
    const run =
      this._runs.get(runIdToUse) ??
      new Run({
        workflowId: this.id,
        runId: runIdToUse,
        executionGraph: this._stepFlow,
        retryConfig: this.retryConfig,
        serializedStepGraph: this._serializedStepFlow,
        cleanup: () => this._runs.delete(runIdToUse),
      });

    this._runs.set(runIdToUse, run);

    return run;
  }

  get runs() {
    return this._runs;
  }

  get committed() {
    return this._committed;
  }

  // Start the workflow execution
  async start(
    inputData: TInput,
    subscribe?: (state: RunStore, prevState: RunStore) => void
  ): Promise<WorkflowResult<TOutput>> {
    this.commit();

    // Validate input against workflow's input schema
    try {
      this.inputSchema.parse(inputData);
    } catch (error) {
      return {
        status: 'failed',
        error: error as Error,
        steps: {},
      };
    }

    const run = this.createRun();
    if (subscribe) {
      run.store.subscribe(subscribe);
    }
    return run.start({ inputData });
  }

  // Get step flow
  get stepFlow() {
    return this._stepFlow;
  }

  // Get serialized step flow
  get serializedStepFlow() {
    return this._serializedStepFlow;
  }

  async execute(context: StepContext<TInput>): Promise<TOutput> {
    const { inputData } = context;

    // Execute the workflow using a run
    const run = this.createRun();
    const result = await run.start({ inputData });

    // When used as a step, return just the result value
    if (result.status === 'failed') {
      throw result.error;
    }

    if (result.status === 'suspended') {
      throw new Error('Workflow suspended when used as a step');
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
  }): Promise<WorkflowResult<TOutput>> {
    const run = this.createRun();
    return run.resume(params);
  }
}
