/**
 * @file commonEnums.ts
 * @path KaibanJS\src\types\common\commonEnums.ts
 * @description Core enumeration types used throughout the application
 * 
 * @module @types/common
 */

// ─── Status Enums ────────────────────────────────────────────────────────────

export enum AGENT_STATUS_enum {
    IDLE = "IDLE",
    INITIAL = "INITIAL",
    THINKING = "THINKING",
    THINKING_END = "THINKING_END",
    THINKING_ERROR = "THINKING_ERROR",
    THOUGHT = "THOUGHT",
    EXECUTING_ACTION = "EXECUTING_ACTION",
    USING_TOOL = "USING_TOOL",
    USING_TOOL_END = "USING_TOOL_END",
    USING_TOOL_ERROR = "USING_TOOL_ERROR",
    TOOL_DOES_NOT_EXIST = "TOOL_DOES_NOT_EXIST",
    OBSERVATION = "OBSERVATION",
    FINAL_ANSWER = "FINAL_ANSWER",
    TASK_COMPLETED = "TASK_COMPLETED",
    MAX_ITERATIONS_ERROR = "MAX_ITERATIONS_ERROR",
    ISSUES_PARSING_LLM_OUTPUT = "ISSUES_PARSING_LLM_OUTPUT",
    SELF_QUESTION = "SELF_QUESTION",
    ITERATING = "ITERATING",
    ITERATION_START = "ITERATION_START",
    ITERATION_END = "ITERATION_END",
    ITERATION_COMPLETE = "ITERATION_COMPLETE",
    MAX_ITERATIONS_EXCEEDED = "MAX_ITERATIONS_EXCEEDED",
    AGENTIC_LOOP_ERROR = "AGENTIC_LOOP_ERROR",
    WEIRD_LLM_OUTPUT = "WEIRD_LLM_OUTPUT"
}

export enum MESSAGE_STATUS_enum {
    INITIAL = "INITIAL",
    QUEUED = "QUEUED",
    PROCESSING = "PROCESSING",
    PROCESSED = "PROCESSED",
    RETRIEVING = "RETRIEVING",
    RETRIEVED = "RETRIEVED",
    CLEARING = "CLEARING",
    CLEARED = "CLEARED",
    ERROR = "ERROR"
}

export enum TASK_STATUS_enum {
    PENDING = 'PENDING',
    TODO = 'TODO',
    DOING = 'DOING',
    BLOCKED = 'BLOCKED',
    REVISE = 'REVISE',
    DONE = 'DONE',
    ERROR = 'ERROR',
    AWAITING_VALIDATION = 'AWAITING_VALIDATION',
    VALIDATED = 'VALIDATED'
}

export enum WORKFLOW_STATUS_enum {
    INITIAL = 'INITIAL',
    CREATED = 'CREATED',
    INITIALIZED = 'INITIALIZED',
    RUNNING = 'RUNNING',
    PAUSED = 'PAUSED',
    STOPPING = 'STOPPING',
    STOPPED = 'STOPPED',
    BLOCKED = 'BLOCKED',
    COMPLETED = 'COMPLETED',
    FINISHED = 'FINISHED',
    FAILED = 'FAILED',
    ERRORED = 'ERRORED',
    CANCELLED = 'CANCELLED'
}

export enum FEEDBACK_STATUS_enum {
    PENDING = 'PENDING',
    PROCESSED = 'PROCESSED'
}

// ─── Event Type Enums ─────────────────────────────────────────────────────────

export enum TASK_EVENT_TYPE_enum {
    TASK_CREATED = 'task.created',
    TASK_UPDATED = 'task.updated',
    TASK_DELETED = 'task.deleted',
    TASK_STATUS_CHANGED = 'task.status.changed',
    TASK_PROGRESS_UPDATED = 'task.progress.updated',
    TASK_COMPLETED = 'task.completed',
    TASK_FAILED = 'task.failed',
    TASK_VALIDATION_COMPLETED = 'task.validation.completed',
    TASK_FEEDBACK_ADDED = 'task.feedback.added',
    TASK_METRICS_UPDATED = 'task.metrics.updated',
    TASK_ERROR_OCCURRED = 'task.error.occurred',
    TASK_ERROR_HANDLED = 'task.error.handled',
    TASK_ERROR_RECOVERY_STARTED = 'task.error.recovery.started',
    TASK_ERROR_RECOVERY_COMPLETED = 'task.error.recovery.completed',
    TASK_ERROR_RECOVERY_FAILED = 'task.error.recovery.failed'
}

export enum WORKFLOW_EVENT_TYPE_enum {
    WORKFLOW_CREATED = 'workflow.created',
    WORKFLOW_UPDATED = 'workflow.updated',
    WORKFLOW_DELETED = 'workflow.deleted',
    WORKFLOW_STARTED = 'workflow.started',
    WORKFLOW_PAUSED = 'workflow.paused',
    WORKFLOW_RESUMED = 'workflow.resumed',
    WORKFLOW_CANCELLED = 'workflow.cancelled',
    WORKFLOW_COMPLETED = 'workflow.completed',
    WORKFLOW_FAILED = 'workflow.failed',
    WORKFLOW_STEP_STARTED = 'workflow.step.started',
    WORKFLOW_STEP_COMPLETED = 'workflow.step.completed',
    WORKFLOW_STEP_FAILED = 'workflow.step.failed',
    WORKFLOW_AGENT_ASSIGNED = 'workflow.agent.assigned',
    WORKFLOW_AGENT_RELEASED = 'workflow.agent.released',
    WORKFLOW_TASK_CREATED = 'workflow.task.created',
    WORKFLOW_TASK_COMPLETED = 'workflow.task.completed',
    WORKFLOW_TASK_FAILED = 'workflow.task.failed',
    WORKFLOW_ERROR_OCCURRED = 'workflow.error.occurred',
    WORKFLOW_ERROR_HANDLED = 'workflow.error.handled',
    WORKFLOW_ERROR_RECOVERY_STARTED = 'workflow.error.recovery.started',
    WORKFLOW_ERROR_RECOVERY_COMPLETED = 'workflow.error.recovery.completed',
    WORKFLOW_ERROR_RECOVERY_FAILED = 'workflow.error.recovery.failed'
}

export enum STATUS_LOG_TYPE_enum {
    AGENT_STATUS = 'AgentStatusUpdate',
    TASK_STATUS = 'TaskStatusUpdate',
    WORKFLOW_STATUS = 'WorkflowStatusUpdate'
}

export enum MESSAGE_LOG_TYPE_enum {
    SYSTEM = 'SystemMessage',
    USER = 'UserMessage',
    AI = 'AIMessage',
    FUNCTION = 'FunctionMessage'
}

export enum METRIC_TYPE_enum {
    RESOURCE = 'RESOURCE',
    PERFORMANCE = 'PERFORMANCE',
    USAGE = 'USAGE',
    COST = 'COST'
}

export enum EVENT_TYPE_enum {
    STATE_CHANGE = 'STATE_CHANGE',
    RESOURCE_UPDATE = 'RESOURCE_UPDATE',
    METRIC_UPDATE = 'METRIC_UPDATE',
    ERROR = 'ERROR'
}

export enum RESOURCE_STATUS_enum {
    AVAILABLE = 'AVAILABLE',
    IN_USE = 'IN_USE',
    RESERVED = 'RESERVED',
    UNAVAILABLE = 'UNAVAILABLE',
    FAILED = 'FAILED'
}

export enum ERROR_TYPE_enum {
    VALIDATION = 'VALIDATION',
    EXECUTION = 'EXECUTION',
    RESOURCE = 'RESOURCE',
    TIMEOUT = 'TIMEOUT',
    SYSTEM = 'SYSTEM'
}

export enum MESSAGE_ERROR_TYPE_enum {
    QUEUE_OVERFLOW = 'QUEUE_OVERFLOW',
    BUFFER_OVERFLOW = 'BUFFER_OVERFLOW',
    CHANNEL_FAILURE = 'CHANNEL_FAILURE',
    DELIVERY_FAILURE = 'DELIVERY_FAILURE',
    PROCESSING_FAILURE = 'PROCESSING_FAILURE',
    VALIDATION_FAILURE = 'VALIDATION_FAILURE',
    RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
    RESOURCE_EXHAUSTED = 'RESOURCE_EXHAUSTED',
    NETWORK_ERROR = 'NETWORK_ERROR',
    TIMEOUT = 'TIMEOUT'
}

export enum LLM_ERROR_KIND_enum {
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    EXECUTION_ERROR = 'EXECUTION_ERROR',
    GENERATION_ERROR = 'GENERATION_ERROR',
    STREAMING_ERROR = 'STREAMING_ERROR',
    INITIALIZATION_ERROR = 'INITIALIZATION_ERROR',
    COGNITIVE_ERROR = 'COGNITIVE_ERROR',
    STATE_ERROR = 'STATE_ERROR'
}

// ─── LLM Provider Enums ───────────────────────────────────────────────────────

export enum LLM_PROVIDER_enum {
    GROQ = 'GROQ',
    OPENAI = 'OPENAI',
    ANTHROPIC = 'ANTHROPIC',
    GOOGLE = 'GOOGLE',
    MISTRAL = 'MISTRAL'
}

export enum GROQ_MODEL_enum {
    MIXTRAL = 'mixtral-8x7b-32768',
    LLAMA2 = 'llama2-70b-4096'
}

export enum OPENAI_MODEL_enum {
    GPT4 = 'gpt-4',
    GPT4_TURBO = 'gpt-4-turbo',
    GPT35_TURBO = 'gpt-3.5-turbo'
}

export enum ANTHROPIC_MODEL_enum {
    CLAUDE3_OPUS = 'claude-3-opus',
    CLAUDE3_SONNET = 'claude-3-sonnet',
    CLAUDE21 = 'claude-2.1'
}

export enum GOOGLE_MODEL_enum {
    GEMINI_PRO = 'gemini-pro',
    GEMINI_PRO_VISION = 'gemini-pro-vision'
}

export enum MISTRAL_MODEL_enum {
    TINY = 'mistral-tiny',
    SMALL = 'mistral-small',
    MEDIUM = 'mistral-medium'
}

// ─── Log Level Type ──────────────────────────────────────────────────────────

export type ILogLevel = 'debug' | 'info' | 'warn' | 'error';

// ─── Enum Utility Functions ──────────────────────────────────────────────────

export interface IEnumUtils {
    getValues: <T>(enumObj: { [key: string]: T }) => T[];
    isValidEnumValue: <T>(enumObj: { [key: string]: T }, value: unknown) => value is T;
    getKeyFromValue: <T>(enumObj: { [key: string]: T }, value: T) => string | undefined;
    toRecord: <T extends string | number>(enumObj: { [key: string]: T }) => Record<string, T>;
}

export const EnumUtils: IEnumUtils = {
    getValues: <T>(enumObj: { [key: string]: T }): T[] => {
        return Object.values(enumObj).filter(value => typeof value === 'string') as T[];
    },
    
    isValidEnumValue: <T>(enumObj: { [key: string]: T }, value: unknown): value is T => {
        return Object.values(enumObj).includes(value as T);
    },
    
    getKeyFromValue: <T>(enumObj: { [key: string]: T }, value: T): string | undefined => {
        return Object.keys(enumObj).find(key => enumObj[key] === value);
    },
    
    toRecord: <T extends string | number>(enumObj: { [key: string]: T }): Record<string, T> => {
        return Object.entries(enumObj).reduce((acc, [key, value]) => {
            if (typeof value === 'string' || typeof value === 'number') {
                acc[key] = value;
            }
            return acc;
        }, {} as Record<string, T>);
    }
};

// ─── Type Guards ────────────────────────────────────────────────────────────

export interface IEnumTypeGuards {
    isAgentStatus: (status: unknown) => status is keyof typeof AGENT_STATUS_enum;
    isMessageStatus: (status: unknown) => status is keyof typeof MESSAGE_STATUS_enum;
    isTaskStatus: (status: unknown) => status is keyof typeof TASK_STATUS_enum;
    isWorkflowStatus: (status: unknown) => status is keyof typeof WORKFLOW_STATUS_enum;
    isFeedbackStatus: (status: unknown) => status is keyof typeof FEEDBACK_STATUS_enum;
    isValidStatusForEntity: (status: unknown, entity: string) => boolean;
    isLLMProvider: (provider: unknown) => provider is keyof typeof LLM_PROVIDER_enum;
    isGroqModel: (model: unknown) => model is keyof typeof GROQ_MODEL_enum;
    isOpenAIModel: (model: unknown) => model is keyof typeof OPENAI_MODEL_enum;
    isAnthropicModel: (model: unknown) => model is keyof typeof ANTHROPIC_MODEL_enum;
    isGoogleModel: (model: unknown) => model is keyof typeof GOOGLE_MODEL_enum;
    isMistralModel: (model: unknown) => model is keyof typeof MISTRAL_MODEL_enum;
    isValidModelForProvider: (model: unknown, provider: keyof typeof LLM_PROVIDER_enum) => boolean;
}

export const EnumTypeGuards: IEnumTypeGuards = {
    isAgentStatus: (status: unknown): status is keyof typeof AGENT_STATUS_enum => {
        return typeof status === 'string' && status in AGENT_STATUS_enum;
    },

    isMessageStatus: (status: unknown): status is keyof typeof MESSAGE_STATUS_enum => {
        return typeof status === 'string' && status in MESSAGE_STATUS_enum;
    },

    isTaskStatus: (status: unknown): status is keyof typeof TASK_STATUS_enum => {
        return typeof status === 'string' && status in TASK_STATUS_enum;
    },

    isWorkflowStatus: (status: unknown): status is keyof typeof WORKFLOW_STATUS_enum => {
        return typeof status === 'string' && status in WORKFLOW_STATUS_enum;
    },

    isFeedbackStatus: (status: unknown): status is keyof typeof FEEDBACK_STATUS_enum => {
        return typeof status === 'string' && status in FEEDBACK_STATUS_enum;
    },

    isValidStatusForEntity: (status: unknown, entity: string): boolean => {
        switch (entity) {
            case 'agent':
                return EnumTypeGuards.isAgentStatus(status);
            case 'message':
                return EnumTypeGuards.isMessageStatus(status);
            case 'task':
                return EnumTypeGuards.isTaskStatus(status);
            case 'workflow':
                return EnumTypeGuards.isWorkflowStatus(status);
            case 'feedback':
                return EnumTypeGuards.isFeedbackStatus(status);
            default:
                return false;
        }
    },

    isLLMProvider: (provider: unknown): provider is keyof typeof LLM_PROVIDER_enum => {
        return typeof provider === 'string' && provider in LLM_PROVIDER_enum;
    },

    isGroqModel: (model: unknown): model is keyof typeof GROQ_MODEL_enum => {
        return typeof model === 'string' && model in GROQ_MODEL_enum;
    },

    isOpenAIModel: (model: unknown): model is keyof typeof OPENAI_MODEL_enum => {
        return typeof model === 'string' && model in OPENAI_MODEL_enum;
    },

    isAnthropicModel: (model: unknown): model is keyof typeof ANTHROPIC_MODEL_enum => {
        return typeof model === 'string' && model in ANTHROPIC_MODEL_enum;
    },

    isGoogleModel: (model: unknown): model is keyof typeof GOOGLE_MODEL_enum => {
        return typeof model === 'string' && model in GOOGLE_MODEL_enum;
    },

    isMistralModel: (model: unknown): model is keyof typeof MISTRAL_MODEL_enum => {
        return typeof model === 'string' && model in MISTRAL_MODEL_enum;
    },

    isValidModelForProvider: (model: unknown, provider: keyof typeof LLM_PROVIDER_enum): boolean => {
        switch (provider) {
            case LLM_PROVIDER_enum.GROQ:
                return EnumTypeGuards.isGroqModel(model);
            case LLM_PROVIDER_enum.OPENAI:
                return EnumTypeGuards.isOpenAIModel(model);
            case LLM_PROVIDER_enum.ANTHROPIC:
                return EnumTypeGuards.isAnthropicModel(model);
            case LLM_PROVIDER_enum.GOOGLE:
                return EnumTypeGuards.isGoogleModel(model);
            case LLM_PROVIDER_enum.MISTRAL:
                return EnumTypeGuards.isMistralModel(model);
            default:
                return false;
        }
    }
};
