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
    RUNNING = 'RUNNING',
    STOPPING = 'STOPPING',
    STOPPED = 'STOPPED',
    ERRORED = 'ERRORED',
    FINISHED = 'FINISHED',
    BLOCKED = 'BLOCKED'
}

export enum FEEDBACK_STATUS_enum {
    PENDING = 'PENDING',
    PROCESSED = 'PROCESSED'
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

// ─── Log Level Enum ──────────────────────────────────────────────────────────

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
    }
};
