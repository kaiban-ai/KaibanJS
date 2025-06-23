import { z } from 'zod';

// Core types for workflow workflow system
export type StepId = string;

export type StepStatus = 'running' | 'completed' | 'failed' | 'suspended';

export type StepResult<TSuspend = unknown, TOutput = unknown> = {
  status: StepStatus;
  output?: TOutput | TSuspend;
  error?: Error;
  suspendedPath?: number[];
};

export type Step<
  TInput = unknown,
  TOutput = unknown,
  TResume = unknown,
  TSuspend = unknown
> = {
  id: string;
  description?: string;
  inputSchema: z.ZodType<TInput>;
  outputSchema: z.ZodType<TOutput>;
  resumeSchema?: z.ZodType<TResume>;
  suspendSchema?: z.ZodType<TSuspend>;
  execute: (context: StepContext<TInput>) => Promise<TOutput | TSuspend>;
};

export type RuntimeContext = {
  get: (path: string) => any;
  set: (path: string, value: any) => void;
  has: (path: string) => boolean;
  delete: (path: string) => void;
  clear: () => void;
};

export type StepContext<TInput = any> = {
  inputData: TInput;
  getStepResult: <T>(stepId: string) => T;
  getInitData: <T>() => T;
  runtimeContext?: RuntimeContext;
  isResuming?: boolean;
  resumeData?: any;
  suspend: (suspendPayload: any) => Promise<StepResult>;
};

export type WorkflowConfig<
  TInput,
  TOutput,
  TSteps extends Record<string, Step<any, any>>
> = {
  id: string;
  description?: string;
  inputSchema: z.ZodType<TInput>;
  outputSchema: z.ZodType<TOutput>;
  steps?: TSteps;
  retryConfig?: {
    attempts?: number;
    delay?: number;
  };
};

// Flow control types
export type StepFlowEntry =
  | {
      type: 'step';
      step: Step<any, any>;
    }
  | {
      type: 'parallel';
      steps: StepFlowEntry[];
    }
  | {
      type: 'conditional';
      steps: StepFlowEntry[];
      conditions: ((context: StepContext) => Promise<boolean>)[];
    }
  | {
      type: 'loop';
      step: Step<any, any>;
      condition: (context: StepContext) => Promise<boolean>;
      loopType: 'dowhile' | 'dountil';
    }
  | {
      type: 'foreach';
      step: Step<any, any>;
      opts: {
        concurrency: number;
      };
    };

export type SerializedStep = Pick<Step, 'id' | 'description'> & {
  component?: string;
  serializedStepFlow?: SerializedStepFlowEntry[];
  mapConfig?: string;
};

export type SerializedStepFlowEntry =
  | {
      type: 'step';
      step: {
        id: string;
        description?: string;
      };
    }
  | {
      type: 'parallel';
      steps: SerializedStepFlowEntry[];
    }
  | {
      type: 'conditional';
      steps: SerializedStepFlowEntry[];
      conditions: { id: string; fn: string }[];
    }
  | {
      type: 'loop';
      step: {
        id: string;
        description?: string;
      };
      condition: { id: string; fn: string };
      loopType: 'dowhile' | 'dountil';
    }
  | {
      type: 'foreach';
      step: {
        id: string;
        description?: string;
      };
      opts: {
        concurrency: number;
      };
    };

// Event types for workflow execution
export type WatchEvent = {
  type: 'watch';
  payload: {
    currentStep?: {
      id: string;
      status: StepStatus;
      output?: any;
      payload?: any;
    };
    workflowState: {
      status: StepStatus;
      steps: Record<
        string,
        {
          status: StepStatus;
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
export type ExtractSchemaFromStep<
  T extends Step,
  K extends keyof T
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
  P extends string
> = P extends keyof z.infer<T>
  ? z.ZodType<z.infer<T>[P]>
  : P extends `${infer K}.${infer R}`
  ? K extends keyof z.infer<T>
    ? ZodPathType<z.ZodType<z.infer<T>[K]>, R>
    : never
  : never;

export type DynamicMapping<
  TInput extends z.ZodType<any>,
  TOutput extends z.ZodType<any>
> = {
  fn: (context: StepContext<z.infer<TInput>>) => Promise<z.infer<TOutput>>;
  schema: TOutput;
};

export type MappingConfig<TInput extends z.ZodType<any>> = {
  [key: string]:
    | {
        step: Step<any, any>;
        path: string;
      }
    | {
        value: any;
        schema: z.ZodType<any>;
      }
    | {
        initData: Step<any, any>;
        path: string;
      }
    | {
        runtimeContextPath: string;
        schema: z.ZodType<any>;
      }
    | ((context: StepContext<z.infer<TInput>>) => Promise<any>);
};

export type WorkflowResult<TOutput> =
  | {
      status: 'completed';
      result: TOutput;
      steps: Record<string, StepResult>;
    }
  | {
      status: 'failed';
      error: Error;
      steps: Record<string, StepResult>;
    }
  | {
      status: 'suspended';
      suspended: [string[], ...string[][]];
      steps: Record<string, StepResult>;
    };
