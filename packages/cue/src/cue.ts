import { z } from 'zod';
import type {
  Block,
  BlockContext,
  BlockFlowEntry,
  BlockResult,
  CueConfig,
  CueResult,
  SerializedBlockFlowEntry,
  MappingConfig,
  RuntimeContext,
} from './types';
import { CueExecutionEngine } from './execution-engine';
import { useCueStore, CUE_STATUS, CueStore, CueLog } from './stores/cueStore';
import { StoreApi } from 'zustand';

// Extend WatchEvent type to include data property
interface ExtendedWatchEvent {
  type: 'CueStatusUpdate' | 'BlockStatusUpdate';
  data: CueLog & {
    blockResults: Record<string, BlockResult>;
  };
}

export class Cue<
  TInput,
  TOutput,
  TSteps extends Record<string, Block<any, any>>
> implements Block<TInput, TOutput>
{
  public id: string;
  public inputSchema: z.ZodType<TInput>;
  public outputSchema: z.ZodType<TOutput>;
  private blocks: TSteps;
  private executionGraph: Map<string, Set<string>> = new Map();
  private currentBlock?: Block<any, any>;
  private blockResults: Map<string, BlockResult> = new Map();
  private _blockFlow: BlockFlowEntry[] = [];
  private _serializedBlockFlow: SerializedBlockFlowEntry[] = [];
  private retryConfig?: {
    attempts?: number;
    delay?: number;
  };
  private executionEngine: CueExecutionEngine;
  public store: StoreApi<CueStore>;

  constructor(config: CueConfig<TInput, TOutput, TSteps>) {
    this.id = config.id;
    this.inputSchema = config.inputSchema;
    this.outputSchema = config.outputSchema;
    this.blocks = config.blocks || ({} as TSteps);
    this.retryConfig = config.retryConfig;
    this.executionEngine = new CueExecutionEngine();
    this.store = useCueStore;
  }

  // Create a new block
  static createBlock<TInput, TOutput>(config: {
    id: string;
    description?: string;
    inputSchema: z.ZodType<TInput>;
    outputSchema: z.ZodType<TOutput>;
    resumeSchema?: z.ZodType;
    suspendSchema?: z.ZodType;
    execute: (context: BlockContext<TInput, TOutput>) => Promise<TOutput>;
  }): Block<TInput, TOutput> {
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

  // Create a new cue
  static createCue<
    TInput,
    TOutput,
    TSteps extends Record<string, Block<any, any>>
  >(config: CueConfig<TInput, TOutput, TSteps>): Cue<TInput, TOutput, TSteps> {
    return new Cue(config);
  }

  // Add a block to the execution graph
  private addToGraph(blockId: string, dependencies: string[] = []) {
    if (!this.executionGraph.has(blockId)) {
      this.executionGraph.set(blockId, new Set(dependencies));
    }
  }

  // Set block flow
  setBlockFlow(blockFlow: BlockFlowEntry[]) {
    this._blockFlow = blockFlow;
    this._serializedBlockFlow = this.serializeBlockFlow(blockFlow);
  }

  // Serialize block flow
  private serializeBlockFlow(
    blockFlow: BlockFlowEntry[]
  ): SerializedBlockFlowEntry[] {
    return blockFlow.map((entry) => {
      switch (entry.type) {
        case 'block':
          return {
            type: 'block',
            block: {
              id: entry.block.id,
              description: entry.block.description,
            },
          };
        case 'parallel':
          return {
            type: 'parallel',
            blocks: this.serializeBlockFlow(entry.blocks),
          };
        case 'conditional':
          return {
            type: 'conditional',
            blocks: this.serializeBlockFlow(entry.blocks),
            conditions: entry.conditions.map((_, index) => ({
              id: `condition_${index}`,
              fn: 'serialized_condition',
            })),
          };
        case 'loop':
          return {
            type: 'loop',
            block: {
              id: entry.block.id,
              description: entry.block.description,
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
            block: {
              id: entry.block.id,
              description: entry.block.description,
            },
            opts: entry.opts,
          };
      }
    });
  }

  // Add a block to the flow
  then(block: Block<any, any>) {
    (this.blocks as any)[block.id] = block;
    this._blockFlow.push({ type: 'block', block });
    return this;
  }

  // Map data between blocks
  map<TMapping extends MappingConfig<z.ZodType<any>, z.ZodType<any>>>(
    mappingConfig:
      | TMapping
      | ((context: BlockContext<any, any>) => Promise<any>)
  ) {
    if (typeof mappingConfig === 'function') {
      const mappingBlock = Cue.createBlock({
        id: `mapping_${Date.now()}`,
        inputSchema: this.inputSchema,
        outputSchema: this.outputSchema,
        execute: mappingConfig,
      });

      this._blockFlow.push({ type: 'block', block: mappingBlock });
      return this;
    }

    const mappingBlock = Cue.createBlock({
      id: `mapping_${Date.now()}`,
      inputSchema: this.inputSchema,
      outputSchema: this.outputSchema,
      execute: async (context: BlockContext<any, any>) => {
        const { inputData, getBlockResult, runtimeContext } = context;
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

          const blockResult = m.initData ? inputData : getBlockResult(m.block);

          if (m.path === '.') {
            result[key] = blockResult;
            continue;
          }

          const pathParts = m.path.split('.');
          let value: any = blockResult;
          for (const part of pathParts) {
            if (typeof value === 'object' && value !== null) {
              value = value[part];
            } else {
              throw new Error(`Invalid path ${m.path} in block ${m.block.id}`);
            }
          }

          result[key] = value;
        }

        return result as any;
      },
    });

    this._blockFlow.push({ type: 'block', block: mappingBlock });
    return this;
  }

  // Add parallel blocks
  parallel(blocks: Block<any, any>[]) {
    blocks.forEach((block) => {
      (this.blocks as any)[block.id] = block;
    });
    this._blockFlow.push({
      type: 'parallel',
      blocks: blocks.map((block) => ({ type: 'block', block })),
    });
    return this;
  }

  // Add conditional blocks
  branch(
    blocks: Array<
      [(context: BlockContext) => Promise<boolean>, Block<any, any>]
    >
  ) {
    blocks.forEach(([_, block]) => {
      (this.blocks as any)[block.id] = block;
    });
    this._blockFlow.push({
      type: 'conditional',
      blocks: blocks.map(([_, block]) => ({ type: 'block', block })),
      conditions: blocks.map(([condition]) => condition),
    });
    return this;
  }

  // Add do-while loop
  dowhile(
    block: Block<any, any>,
    condition: (context: BlockContext) => Promise<boolean>
  ) {
    (this.blocks as any)[block.id] = block;
    this._blockFlow.push({
      type: 'loop',
      block,
      condition,
      loopType: 'dowhile',
    });
    return this;
  }

  // Add do-until loop
  dountil(
    block: Block<any, any>,
    condition: (context: BlockContext) => Promise<boolean>
  ) {
    (this.blocks as any)[block.id] = block;
    this._blockFlow.push({
      type: 'loop',
      block,
      condition,
      loopType: 'dountil',
    });
    return this;
  }

  // Add foreach loop
  foreach(
    block: Block<any, any>,
    opts?: {
      concurrency: number;
    }
  ) {
    (this.blocks as any)[block.id] = block;
    this._blockFlow.push({
      type: 'foreach',
      block,
      opts: opts || { concurrency: 1 },
    });
    return this;
  }

  // Build execution graph
  private buildExecutionGraph(): Map<string, Set<string>> {
    const graph = new Map<string, Set<string>>();
    this._blockFlow.forEach((entry) => {
      switch (entry.type) {
        case 'block':
          graph.set(entry.block.id, new Set());
          break;
        case 'parallel':
          entry.blocks.forEach((blockEntry) => {
            if (blockEntry.type === 'block') {
              graph.set(blockEntry.block.id, new Set());
            }
          });
          break;
        case 'conditional':
          entry.blocks.forEach((blockEntry) => {
            if (blockEntry.type === 'block') {
              graph.set(blockEntry.block.id, new Set());
            }
          });
          break;
        case 'loop':
          graph.set(entry.block.id, new Set());
          break;
        case 'foreach':
          graph.set(entry.block.id, new Set());
          break;
      }
    });
    return graph;
  }

  // Start the cue execution
  async start(inputData: TInput): Promise<CueResult<TInput, TOutput, TSteps>> {
    try {
      // Reset store state
      this.store.getState().reset();
      this.store.getState().setStatus(CUE_STATUS.RUNNING);

      // Validate input data
      const validatedInput = this.inputSchema.parse(inputData);

      // Build execution graph
      this.executionGraph = this.buildExecutionGraph();

      // Execute blocks using the execution engine
      const result = await this.executionEngine.execute<
        TInput,
        CueResult<TInput, TOutput, TSteps>
      >({
        cueId: this.id,
        runId: Date.now().toString(),
        graph: this._blockFlow,
        input: validatedInput,
        emitter: {
          emit: async (event: string, data: any) => {
            this.store.getState().addLog({
              timestamp: Date.now(),
              logType: 'CueStatusUpdate',
              logDescription: event,
              metadata: data,
            });
          },
        },
        retryConfig: this.retryConfig,
      });

      // Update block results with the execution results
      this.blockResults = new Map(Object.entries(result.steps));

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
      Array.from(this.blockResults.entries()).map(([id, result]) => [
        id,
        result,
      ])
    ) as CueResult<TInput, TOutput, TSteps>['steps'];
  }

  // Watch cue execution
  watch(callback: (event: ExtendedWatchEvent) => void) {
    return this.store.subscribe((state) => {
      const lastLog = state.logs[state.logs.length - 1];
      if (lastLog) {
        callback({
          type: lastLog.logType,
          data: {
            ...lastLog,
            blockResults: Object.fromEntries(state.blockResults),
          },
        });
      }
    });
  }

  // Get block flow
  get blockFlow() {
    return this._blockFlow;
  }

  // Get serialized block flow
  get serializedBlockFlow() {
    return this._serializedBlockFlow;
  }

  async execute(context: BlockContext<TInput, TOutput>): Promise<TOutput> {
    const { inputData } = context;

    // Execute the cue using the execution engine
    const result = (await this.executionEngine.execute({
      cueId: this.id,
      runId: `${this.id}-${Date.now()}`,
      graph: this._blockFlow,
      input: inputData,
      emitter: {
        emit: async () => {},
      },
      retryConfig: this.retryConfig,
    })) as { status: string; result: TOutput; error?: Error };

    // When used as a block, return just the result value
    if (result.status === 'failed') {
      throw result.error;
    }

    return result.result;
  }

  // Add resume functionality
  async resume<TResumeSchema extends z.ZodType<any>>(params: {
    resumeData?: z.infer<TResumeSchema>;
    block:
      | Block<string, any, TResumeSchema, any>
      | [
          ...Block<string, any, any, any>[],
          Block<string, any, TResumeSchema, any>
        ]
      | string
      | string[];
    runtimeContext?: RuntimeContext;
  }): Promise<CueResult<TInput, TOutput, TSteps>> {
    const { resumeData, block, runtimeContext } = params;

    // Determine which blocks to resume
    const blocksToResume = Array.isArray(block)
      ? block.map((b) => (typeof b === 'string' ? b : b.id))
      : [typeof block === 'string' ? block : block.id];

    // Check if any of the blocks to resume are actually suspended
    const hasSuspendedBlocks = blocksToResume.some(
      (blockId) => this.blockResults.get(blockId)?.status === 'suspended'
    );

    if (!hasSuspendedBlocks) {
      throw new Error('No suspended blocks to resume');
    }

    // Create a new run ID for the resume operation
    const runId = crypto.randomUUID();

    // Execute the cue with resume parameters
    const executionResult = await this.executionEngine.execute<
      TInput,
      CueResult<TInput, TOutput, TSteps>
    >({
      cueId: this.id,
      runId,
      graph: this._blockFlow,
      resume: {
        steps: blocksToResume,
        blockResults: Object.fromEntries(this.blockResults),
        resumePayload: resumeData,
        resumePath: blocksToResume
          .map((blockId) => {
            const result = this.blockResults.get(blockId);
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

    // Update block results with the new execution results
    this.blockResults = new Map(Object.entries(executionResult.steps));

    return executionResult;
  }
}
