import { z } from 'zod';
import type {
  Block,
  BlockContext,
  BlockFlowEntry,
  BlockResult,
  BlockStatus,
  RuntimeContext,
} from './types';
import { useCueStore } from './stores/cueStore';

export type ExecutionContext = {
  cueId: string;
  runId: string;
  executionPath: number[];
  suspendedPaths: Record<string, number[]>;
  retryConfig: {
    attempts: number;
    delay: number;
  };
};

export class CueExecutionEngine {
  private store = useCueStore;

  async execute<TInput, TOutput>(params: {
    cueId: string;
    runId: string;
    graph: BlockFlowEntry[];
    input?: TInput;
    resume?: {
      steps: string[];
      blockResults: Record<string, BlockResult>;
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
      cueId,
      runId,
      graph,
      input,
      resume,
      emitter,
      retryConfig,
      runtimeContext,
    } = params;

    const executionContext: ExecutionContext = {
      cueId,
      runId,
      executionPath: resume?.resumePath || [],
      suspendedPaths: {},
      retryConfig: {
        attempts: retryConfig?.attempts || 3,
        delay: retryConfig?.delay || 1000,
      },
    };

    const blockResults: Record<string, BlockResult> =
      resume?.blockResults || {};

    try {
      let lastOutput: BlockResult | undefined;
      let prevStep: BlockFlowEntry | undefined;

      // If resuming, find the last executed block
      if (resume) {
        const lastBlockId = resume.steps[resume.steps.length - 1];
        const lastBlockResult = blockResults[lastBlockId];
        if (lastBlockResult) {
          lastOutput = lastBlockResult;
        }
      }

      // Execute each entry in the graph
      for (const entry of graph) {
        const result = await this.executeEntry({
          cueId,
          runId,
          entry,
          prevStep,
          blockResults,
          resume,
          executionContext,
          emitter,
          runtimeContext,
          inputData: input,
        });

        // Update store with block result
        if (entry.type === 'block') {
          this.store.getState().updateBlockResult(entry.block.id, result);
        }

        // If we're resuming and this is the block we're resuming, update its state
        if (
          resume &&
          entry.type === 'block' &&
          resume.steps.includes(entry.block.id)
        ) {
          const suspendedResult = blockResults[entry.block.id];
          if (
            suspendedResult?.status === 'suspended' &&
            result.status !== 'suspended'
          ) {
            // Clear the suspended state from executionContext
            delete executionContext.suspendedPaths[entry.block.id];
          }
        }

        if (result.status === 'suspended') {
          // Find all suspended blocks and their information
          const suspendedBlocks = Object.entries(blockResults)
            .filter(([_, result]) => result.status === 'suspended')
            .map(([blockId, result]) => ({
              blockId,
              path: result.suspendedPath || [],
              output: result.output,
            }));

          return {
            status: 'suspended',
            steps: blockResults,
            suspended: suspendedBlocks,
          } as any;
        }

        if (result.status === 'failed') {
          return {
            status: 'failed',
            error: result.error,
            steps: blockResults,
          } as any;
        }

        lastOutput = result;
        prevStep = entry;
      }

      // Format and return the final result
      return this.formatReturnValue(
        emitter,
        blockResults,
        lastOutput!
      ) as TOutput;
    } catch (error) {
      return {
        status: 'failed',
        error: error as Error,
        steps: blockResults,
      } as any;
    }
  }

  private async executeEntry(params: {
    cueId: string;
    runId: string;
    entry: BlockFlowEntry;
    prevStep?: BlockFlowEntry;
    blockResults: Record<string, BlockResult>;
    resume?: {
      steps: string[];
      blockResults: Record<string, BlockResult>;
      resumePayload: any;
      resumePath: number[];
    };
    executionContext: ExecutionContext;
    emitter: { emit: (event: string, data: any) => Promise<void> };
    runtimeContext?: RuntimeContext;
    inputData?: any;
  }): Promise<BlockResult> {
    const {
      cueId,
      runId,
      entry,
      prevStep,
      blockResults,
      resume,
      executionContext,
      emitter,
      runtimeContext,
      inputData,
    } = params;

    // If resuming, check if this is the block to resume
    if (
      resume &&
      resume.steps.includes(entry.type === 'block' ? entry.block.id : '')
    ) {
      if (entry.type === 'block' && entry.block.resumeSchema) {
        // Validate resume data against the block's resume schema
        try {
          entry.block.resumeSchema.parse(resume.resumePayload);
        } catch (error) {
          return {
            status: 'failed',
            error: error as Error,
          };
        }

        // Get the previous block's output as input data for the resumed block
        const blockInput = this.getBlockOutput(blockResults, prevStep);

        // If the block was suspended, we need to re-execute it with the same input
        const suspendedResult = blockResults[entry.block.id];
        if (suspendedResult?.status === 'suspended') {
          const result = await this.executeBlock({
            cueId,
            runId,
            block: entry.block,
            prevStep,
            blockResults,
            executionContext,
            emitter,
            inputData: blockInput,
            runtimeContext,
            isResuming: true,
            resumeData: resume.resumePayload,
          });

          // Update the block's result in blockResults
          blockResults[entry.block.id] = result;
          // console.log({ result });

          // If the block completed successfully, clear its suspended state
          if (result.status === 'completed') {
            delete executionContext.suspendedPaths[entry.block.id];
          }

          return result;
        }
      }
    }

    switch (entry.type) {
      case 'block':
        return this.executeBlock({
          cueId,
          runId,
          block: entry.block,
          prevStep,
          blockResults,
          executionContext,
          emitter,
          inputData,
          runtimeContext,
        });
      case 'parallel':
        return this.executeParallel({
          cueId,
          runId,
          entry,
          blockResults,
          resume,
          executionContext,
          emitter,
          inputData,
        });
      case 'conditional':
        return this.executeConditional({
          cueId,
          runId,
          entry,
          blockResults,
          executionContext,
          emitter,
          inputData,
          prevStep,
        });
      case 'loop':
        return this.executeLoop({
          cueId,
          runId,
          entry,
          prevStep: prevStep || {
            type: 'block',
            block: {
              id: 'loop',
              execute: async () => {},
              inputSchema: z.any(),
              outputSchema: z.any(),
            } as Block<any, any>,
          },
          blockResults,
          resume,
          executionContext,
          emitter,
          inputData,
        });
      case 'foreach':
        return this.executeForeach({
          cueId,
          runId,
          entry,
          blockResults,
          resume,
          executionContext,
          emitter,
          inputData,
        });
    }
  }

  private getBlockOutput(
    blockResults: Record<string, BlockResult>,
    prevStep?: BlockFlowEntry
  ): any {
    if (!prevStep) {
      return blockResults.input;
    } else if (prevStep.type === 'block') {
      return blockResults[prevStep.block.id]?.output;
    } else if (
      prevStep.type === 'parallel' ||
      prevStep.type === 'conditional'
    ) {
      return prevStep.blocks.reduce(
        (acc: Record<string, any>, block, index) => {
          if (block.type === 'block') {
            acc[block.block.id] = blockResults[block.block.id]?.output;
          }
          return acc;
        },
        {}
      );
    } else if (prevStep.type === 'loop') {
      return blockResults[prevStep.block.id]?.output;
    } else if (prevStep.type === 'foreach') {
      return blockResults[prevStep.block.id]?.output;
    }
    return blockResults.input;
  }

  private async executeBlock(params: {
    cueId: string;
    runId: string;
    block: Block<any, any>;
    prevStep?: BlockFlowEntry;
    blockResults: Record<string, BlockResult>;
    executionContext: ExecutionContext;
    emitter: { emit: (event: string, data: any) => Promise<void> };
    inputData: any;
    runtimeContext?: RuntimeContext;
    isResuming?: boolean;
    resumeData?: any;
  }): Promise<BlockResult> {
    const {
      cueId,
      runId,
      block,
      prevStep,
      blockResults,
      executionContext,
      emitter,
      inputData,
      runtimeContext,
      isResuming,
      resumeData,
    } = params;

    try {
      // Get input data for the block
      const blockInput = this.getBlockOutput(blockResults, prevStep);

      // Store the initial input data if it's not already stored
      if (!blockResults.input) {
        blockResults.input = inputData;
      }

      // Si estamos resumiendo, limpiamos el estado suspendido anterior
      if (isResuming) {
        delete blockResults[block.id];
        delete executionContext.suspendedPaths[block.id];
      }

      // Create block context
      const context: BlockContext = {
        inputData: blockInput || inputData,
        getBlockResult: <T>(block: Block<T, any>) => {
          const result = blockResults[block.id];
          if (!result) {
            throw new Error(`Block result not found for block: ${block.id}`);
          }
          if (result.status !== 'completed') {
            throw new Error(`Block ${block.id} has not completed successfully`);
          }
          return result.output as T;
        },
        getInitData: <T>() => {
          const initData = blockResults.input;
          if (!initData) {
            throw new Error('Initial input data not found');
          }
          return initData as T;
        },
        runtimeContext,
        isResuming,
        resumeData,
        suspend: async (suspendPayload: any) => {
          // Update execution path with current block index
          const currentPath = [...executionContext.executionPath];
          const blockIndex = Object.keys(blockResults).length;
          currentPath.push(blockIndex);

          const result: BlockResult = {
            status: 'suspended',
            output: suspendPayload,
            suspendedPath: currentPath,
          };
          // Store the suspended state in both blockResults and executionContext
          blockResults[block.id] = result;
          executionContext.suspendedPaths[block.id] = currentPath;

          return result;
        },
      };

      // Execute the block
      const output = await block.execute(context);

      // Check if the block was suspended during this execution
      const currentResult = blockResults[block.id];
      if (currentResult?.status === 'suspended') {
        return currentResult;
      }

      // Si estamos resumiendo y el bloque se completó exitosamente
      if (isResuming) {
        const result: BlockResult = {
          status: 'completed',
          output,
        };
        blockResults[block.id] = result;
        return result;
      }

      // If the block didn't suspend, return the result
      const result: BlockResult = {
        status: 'completed',
        output,
      };
      blockResults[block.id] = result;
      return result;
    } catch (error) {
      const result: BlockResult = {
        status: 'failed',
        error: error as Error,
      };
      blockResults[block.id] = result;
      return result;
    }
  }

  private async executeParallel(params: {
    cueId: string;
    runId: string;
    entry: { type: 'parallel'; blocks: BlockFlowEntry[] };
    blockResults: Record<string, BlockResult>;
    executionContext: ExecutionContext;
    emitter: { emit: (event: string, data: any) => Promise<void> };
    inputData: any;
    resume?: {
      steps: string[];
      blockResults: Record<string, BlockResult>;
      resumePayload: any;
      resumePath: number[];
    };
  }): Promise<BlockResult> {
    const { entry, blockResults, executionContext, emitter, inputData } =
      params;

    const results = await Promise.all(
      entry.blocks.map((block) =>
        this.executeEntry({
          ...params,
          entry: block,
          prevStep: {
            type: 'block',
            block: {
              id: 'parallel',
              execute: async () => {},
              inputSchema: z.any(),
              outputSchema: z.any(),
            } as Block<any, any>,
          },
          inputData,
        })
      )
    );

    // Log block status updates for each parallel block
    results.forEach((result, index) => {
      const blockEntry = entry.blocks[index];
      if (blockEntry.type === 'block') {
        this.store.getState().updateBlockResult(blockEntry.block.id, result);
      }
    });

    const hasFailed = results.some((result) => result.status === 'failed');
    if (hasFailed) {
      return {
        status: 'failed',
        error: new Error('One or more parallel blocks failed'),
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
      output: results.reduce(
        (acc, result, index) => {
          if (result.status === 'completed') {
            const currentEntry = entry.blocks[index]!;
            if (currentEntry.type === 'block') {
              acc[currentEntry.block.id] = result.output;
            }
          }
          return acc;
        },
        {} as Record<string, any>
      ),
    };
  }

  private async executeConditional(params: {
    cueId: string;
    runId: string;
    entry: {
      type: 'conditional';
      blocks: BlockFlowEntry[];
      conditions: ((context: BlockContext) => Promise<boolean>)[];
    };
    blockResults: Record<string, BlockResult>;
    executionContext: ExecutionContext;
    emitter: { emit: (event: string, data: any) => Promise<void> };
    inputData: any;
    prevStep?: BlockFlowEntry;
  }): Promise<BlockResult> {
    const {
      entry,
      blockResults,
      executionContext,
      emitter,
      inputData,
      prevStep,
    } = params;

    // Store the initial input data if it's not already stored
    if (!blockResults.input) {
      blockResults.input = inputData;
    }

    const context: BlockContext = {
      inputData,
      getBlockResult: <T>(block: Block<T, any>) => {
        const result = blockResults[block.id];
        if (!result) {
          throw new Error(`Block result not found for block: ${block.id}`);
        }
        if (result.status !== 'completed') {
          throw new Error(`Block ${block.id} has not completed successfully`);
        }
        return result.output as T;
      },
      getInitData: <T>() => {
        const initData = blockResults.input;
        if (!initData) {
          throw new Error('Initial input data not found');
        }
        return initData as T;
      },
      suspend: async (suspendPayload: any) => {
        // Update execution path with current block index
        const currentPath = [...executionContext.executionPath];
        const blockIndex = Object.keys(blockResults).length;
        currentPath.push(blockIndex);

        const result: BlockResult = {
          status: 'suspended',
          output: suspendPayload,
          suspendedPath: currentPath,
        };
        // Store the suspended state in the execution context
        executionContext.suspendedPaths[`block_${blockIndex}`] = currentPath;
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

    return this.executeEntry({
      ...params,
      entry: entry.blocks[matchingIndex]!,
      prevStep: prevStep || {
        type: 'block',
        block: {
          id: 'conditional',
          execute: async () => {},
          inputSchema: z.any(),
          outputSchema: z.any(),
        } as Block<any, any>,
      },
    });
  }

  private async executeLoop(params: {
    cueId: string;
    runId: string;
    entry: {
      type: 'loop';
      block: Block<any, any>;
      condition: (context: BlockContext) => Promise<boolean>;
      loopType: 'dowhile' | 'dountil';
    };
    prevStep: BlockFlowEntry;
    blockResults: Record<string, BlockResult>;
    executionContext: ExecutionContext;
    emitter: { emit: (event: string, data: any) => Promise<void> };
    inputData: any;
    resume?: {
      steps: string[];
      blockResults: Record<string, BlockResult>;
      resumePayload: any;
      resumePath: number[];
    };
  }): Promise<BlockResult> {
    const {
      entry,
      blockResults,
      executionContext,
      emitter,
      prevStep,
      inputData,
    } = params;

    // Store the initial input data if it's not already stored
    if (!blockResults.input) {
      blockResults.input = inputData;
    }

    let result: BlockResult = {
      status: 'completed',
      output: inputData,
    };
    let shouldContinue: boolean = false;

    console.log('Starting loop with initial output:', result.output);
    let prevOutput = inputData;

    do {
      result = await this.executeBlock({
        ...params,
        block: entry.block,
        prevStep: {
          type: 'block',
          block: entry.block,
        },
        inputData: prevOutput,
      });
      prevOutput = result.output;

      if (result.status !== 'completed') {
        return result;
      }

      // Create a new context with updated block results
      const context: BlockContext = {
        inputData: result.output,
        getBlockResult: <T>(block: Block<T, any>) => {
          const result = blockResults[block.id];
          if (!result) {
            throw new Error(`Block result not found for block: ${block.id}`);
          }
          if (result.status !== 'completed') {
            throw new Error(
              `Block ${block.id} did not complete successfully. Status: ${result.status}`
            );
          }
          return result.output as T;
        },
        getInitData: <T>() => {
          const initData = blockResults.input;
          if (!initData) {
            throw new Error('Initial input data not found');
          }
          return initData as T;
        },
        suspend: async (suspendPayload: any) => {
          // Update execution path with current block index
          const currentPath = [...executionContext.executionPath];
          const blockIndex = Object.keys(blockResults).length;
          currentPath.push(blockIndex);

          const result: BlockResult = {
            status: 'suspended',
            output: suspendPayload,
            suspendedPath: currentPath,
          };
          // Store the suspended state in the execution context
          executionContext.suspendedPaths[`block_${blockIndex}`] = currentPath;
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
    cueId: string;
    runId: string;
    entry: {
      type: 'foreach';
      block: Block<any, any>;
      opts: {
        concurrency: number;
      };
    };
    blockResults: Record<string, BlockResult>;
    executionContext: ExecutionContext;
    emitter: { emit: (event: string, data: any) => Promise<void> };
    inputData: any;
    resume?: {
      steps: string[];
      blockResults: Record<string, BlockResult>;
      resumePayload: any;
      resumePath: number[];
    };
  }): Promise<BlockResult> {
    const { entry, blockResults, executionContext, emitter, inputData } =
      params;
    if (!Array.isArray(inputData)) {
      return {
        status: 'failed',
        error: new Error('Foreach block requires an array input'),
      };
    }

    const results: any[] = [];
    const chunks = this.chunkArray(inputData, entry.opts.concurrency);

    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map((item) =>
          this.executeBlock({
            ...params,
            block: entry.block,
            blockResults: { ...blockResults, input: item },
            inputData: item,
          })
        )
      );

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
    blockResults: Record<string, BlockResult>,
    lastOutput: BlockResult,
    error?: Error
  ) {
    const base: any = {
      status: lastOutput.status,
      steps: blockResults,
    };

    if (lastOutput.status === 'completed') {
      base.result = lastOutput.output;
    } else if (lastOutput.status === 'failed') {
      base.error = error?.stack ?? error ?? lastOutput.error;
    } else if (lastOutput.status === 'suspended') {
      // Find all suspended blocks and their information
      const suspendedBlocks = Object.entries(blockResults)
        .filter(([_, result]) => result.status === 'suspended')
        .map(([blockId, result]) => ({
          blockId,
          path: result.suspendedPath || [],
          output: result.output,
        }));

      base.suspended = suspendedBlocks;
    }

    return base;
  }
}
