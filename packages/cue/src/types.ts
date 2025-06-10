import { z } from 'zod';

// Core types for cue workflow system
export type BlockId = string;

export type BlockStatus = 'running' | 'completed' | 'failed' | 'suspended';

export type BlockResult<
  TInput = unknown,
  TResume = unknown,
  TSuspend = unknown,
  TOutput = unknown,
> = {
  status: BlockStatus;
  output?: TOutput | TSuspend;
  error?: Error;
  suspendedPath?: number[];
};

export type Block<
  TInput = unknown,
  TOutput = unknown,
  TResume = unknown,
  TSuspend = unknown,
> = {
  id: string;
  description?: string;
  inputSchema: z.ZodType<TInput>;
  outputSchema: z.ZodType<TOutput>;
  resumeSchema?: z.ZodType<TResume>;
  suspendSchema?: z.ZodType<TSuspend>;
  execute: (
    context: BlockContext<TInput, TOutput>
  ) => Promise<TOutput | TSuspend>;
};

export type RuntimeContext = {
  get: (path: string) => any;
  set: (path: string, value: any) => void;
  has: (path: string) => boolean;
  delete: (path: string) => void;
  clear: () => void;
};

export type BlockContext<TInput = any, TOutput = any> = {
  inputData: TInput;
  getBlockResult: <T>(block: Block<T, any>) => T;
  getInitData: <T>() => T;
  runtimeContext?: RuntimeContext;
  isResuming?: boolean;
  resumeData?: any;
  suspend: (suspendPayload: any) => Promise<BlockResult>;
};

export type CueConfig<
  TInput,
  TOutput,
  TSteps extends Record<string, Block<any, any>>,
> = {
  id: string;
  description?: string;
  inputSchema: z.ZodType<TInput>;
  outputSchema: z.ZodType<TOutput>;
  blocks?: TSteps;
  retryConfig?: {
    attempts?: number;
    delay?: number;
  };
};

// Flow control types
export type BlockFlowEntry =
  | {
      type: 'block';
      block: Block<any, any>;
    }
  | {
      type: 'parallel';
      blocks: BlockFlowEntry[];
    }
  | {
      type: 'conditional';
      blocks: BlockFlowEntry[];
      conditions: ((context: BlockContext) => Promise<boolean>)[];
    }
  | {
      type: 'loop';
      block: Block<any, any>;
      condition: (context: BlockContext) => Promise<boolean>;
      loopType: 'dowhile' | 'dountil';
    }
  | {
      type: 'foreach';
      block: Block<any, any>;
      opts: {
        concurrency: number;
      };
    };

export type SerializedBlock = Pick<Block, 'id' | 'description'> & {
  component?: string;
  serializedBlockFlow?: SerializedBlockFlowEntry[];
  mapConfig?: string;
};

export type SerializedBlockFlowEntry =
  | {
      type: 'block';
      block: {
        id: string;
        description?: string;
      };
    }
  | {
      type: 'parallel';
      blocks: SerializedBlockFlowEntry[];
    }
  | {
      type: 'conditional';
      blocks: SerializedBlockFlowEntry[];
      conditions: { id: string; fn: string }[];
    }
  | {
      type: 'loop';
      block: {
        id: string;
        description?: string;
      };
      condition: { id: string; fn: string };
      loopType: 'dowhile' | 'dountil';
    }
  | {
      type: 'foreach';
      block: {
        id: string;
        description?: string;
      };
      opts: {
        concurrency: number;
      };
    };

// Event types for cue execution
export type WatchEvent = {
  type: 'watch';
  payload: {
    currentBlock?: {
      id: string;
      status: BlockStatus;
      output?: any;
      payload?: any;
    };
    cueState: {
      status: BlockStatus;
      blocks: Record<
        string,
        {
          status: BlockStatus;
          output?: any;
          payload?: any;
        }
      >;
    };
  };
  eventTimestamp: Date;
};

// Utility types
export type ExtractSchemaType<T extends z.ZodType> = z.infer<T>;
export type ExtractSchemaFromBlock<
  T extends Block,
  K extends keyof T,
> = T[K] extends z.ZodType ? T[K] : never;
export type PathsToStringProps<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? `${K}.${PathsToStringProps<T[K]>}`
          : K
        : never;
    }[keyof T]
  : never;

export type ZodPathType<
  T extends z.ZodType,
  P extends string,
> = P extends keyof z.infer<T>
  ? z.ZodType<z.infer<T>[P]>
  : P extends `${infer K}.${infer R}`
    ? K extends keyof z.infer<T>
      ? ZodPathType<z.ZodType<z.infer<T>[K]>, R>
      : never
    : never;

export type DynamicMapping<
  TInput extends z.ZodType<any>,
  TOutput extends z.ZodType<any>,
> = {
  fn: (
    context: BlockContext<z.infer<TInput>, any>
  ) => Promise<z.infer<TOutput>>;
  schema: TOutput;
};

export type MappingConfig<
  TInput extends z.ZodType<any>,
  TOutput extends z.ZodType<any>,
> = {
  [key: string]:
    | {
        block: Block<any, any>;
        path: string;
      }
    | {
        value: any;
        schema: z.ZodType<any>;
      }
    | {
        initData: Block<any, any>;
        path: string;
      }
    | {
        runtimeContextPath: string;
        schema: z.ZodType<any>;
      }
    | ((
        context: BlockContext<z.infer<TInput>, z.infer<TOutput>>
      ) => Promise<any>);
};

export type CueResult<TInput, TOutput, TSteps> =
  | {
      status: 'completed';
      result: TOutput;
      steps: Record<string, BlockResult>;
    }
  | {
      status: 'failed';
      error: Error;
      steps: Record<string, BlockResult>;
    }
  | {
      status: 'suspended';
      suspended: [string[], ...string[][]];
      steps: Record<string, BlockResult>;
    };
