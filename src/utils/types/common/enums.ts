/**
 * @file enums.ts
 * @path src/types/common/enums.ts
 * @description Core enumeration types used throughout the application
 */

/**
 * Agent status enumeration
 * Defines the various states an agent can be in during operation
 */
export enum AGENT_STATUS_enum {
    /** Agent is available but not active */
    IDLE = "IDLE",

    /** Agent is initialized but hasn't started processing */
    INITIAL = "INITIAL",

    /** Agent is actively thinking/processing */
    THINKING = "THINKING",

    /** Agent has completed thinking phase */
    THINKING_END = "THINKING_END",

    /** Agent encountered error during thinking */
    THINKING_ERROR = "THINKING_ERROR",

    /** Agent has formed a thought/plan */
    THOUGHT = "THOUGHT",

    /** Agent is executing an action */
    EXECUTING_ACTION = "EXECUTING_ACTION",

    /** Agent is using a tool */
    USING_TOOL = "USING_TOOL",

    /** Agent has completed tool usage */
    USING_TOOL_END = "USING_TOOL_END",

    /** Agent encountered error using tool */
    USING_TOOL_ERROR = "USING_TOOL_ERROR",

    /** Requested tool doesn't exist */
    TOOL_DOES_NOT_EXIST = "TOOL_DOES_NOT_EXIST",

    /** Agent is making an observation */
    OBSERVATION = "OBSERVATION",

    /** Agent has reached a final answer */
    FINAL_ANSWER = "FINAL_ANSWER",

    /** Task has been completed */
    TASK_COMPLETED = "TASK_COMPLETED",

    /** Maximum iterations error occurred */
    MAX_ITERATIONS_ERROR = "MAX_ITERATIONS_ERROR",

    /** Issues parsing LLM output */
    ISSUES_PARSING_LLM_OUTPUT = "ISSUES_PARSING_LLM_OUTPUT",

    /** Agent is asking itself a question */
    SELF_QUESTION = "SELF_QUESTION",

    /** Agent is in iteration process */
    ITERATING = "ITERATING",

    /** Starting a new iteration */
    ITERATION_START = "ITERATION_START",

    /** Completed current iteration */
    ITERATION_END = "ITERATION_END",

    /** All iterations completed successfully */
    ITERATION_COMPLETE = "ITERATION_COMPLETE",

    /** Exceeded maximum iterations */
    MAX_ITERATIONS_EXCEEDED = "MAX_ITERATIONS_EXCEEDED",

    /** Error in main processing loop */
    AGENTIC_LOOP_ERROR = "AGENTIC_LOOP_ERROR",

    /** Received unexpected LLM output */
    WEIRD_LLM_OUTPUT = "WEIRD_LLM_OUTPUT"
}

/**
 * Task status enumeration
 * Defines the various states a task can be in
 */
export enum TASK_STATUS_enum {
    /** Task is waiting to be initialized */
    PENDING = 'PENDING',

    /** Task is ready to be started */
    TODO = 'TODO',

    /** Task is currently being processed */
    DOING = 'DOING',

    /** Task is blocked by an obstacle */
    BLOCKED = 'BLOCKED',

    /** Task needs revision */
    REVISE = 'REVISE',

    /** Task has been completed */
    DONE = 'DONE',

    /** Task encountered an error */
    ERROR = 'ERROR',

    /** Task is waiting for validation */
    AWAITING_VALIDATION = 'AWAITING_VALIDATION',

    /** Task has been validated */
    VALIDATED = 'VALIDATED'
}

/**
 * Workflow status enumeration
 * Defines the various states a workflow can be in
 */
export enum WORKFLOW_STATUS_enum {
    /** Workflow is being initialized */
    INITIAL = 'INITIAL',

    /** Workflow is actively processing */
    RUNNING = 'RUNNING',

    /** Workflow is in the process of stopping */
    STOPPING = 'STOPPING',

    /** Workflow has been stopped */
    STOPPED = 'STOPPED',

    /** Workflow encountered an error */
    ERRORED = 'ERRORED',

    /** Workflow completed successfully */
    FINISHED = 'FINISHED',

    /** Workflow is blocked */
    BLOCKED = 'BLOCKED'
}

/**
 * Feedback status enumeration
 * Defines the various states feedback can be in
 */
export enum FEEDBACK_STATUS_enum {
    /** Feedback has been received but not processed */
    PENDING = 'PENDING',

    /** Feedback has been processed */
    PROCESSED = 'PROCESSED'
}

/**
 * Log type enumeration for status updates
 */
export enum STATUS_LOG_TYPE_enum {
    /** Agent status update */
    AGENT_STATUS = 'AgentStatusUpdate',

    /** Task status update */
    TASK_STATUS = 'TaskStatusUpdate',

    /** Workflow status update */
    WORKFLOW_STATUS = 'WorkflowStatusUpdate'
}

/**
 * Log type enumeration for message types
 */
export enum MESSAGE_LOG_TYPE_enum {
    /** System message */
    SYSTEM = 'SystemMessage',

    /** User message */
    USER = 'UserMessage',

    /** AI message */
    AI = 'AIMessage',

    /** Function message */
    FUNCTION = 'FunctionMessage'
}

/**
 * Type utilities for enums
 */
export const EnumUtils = {
    /**
     * Get all values from an enum
     */
    getValues: <T>(enumObj: { [key: string]: T }): T[] => {
        return Object.values(enumObj).filter(value => typeof value === 'string') as T[];
    },

    /**
     * Check if a value exists in an enum
     */
    isValidEnumValue: <T>(enumObj: { [key: string]: T }, value: any): value is T => {
        return Object.values(enumObj).includes(value);
    },

    /**
     * Get enum key from value
     */
    getKeyFromValue: <T>(enumObj: { [key: string]: T }, value: T): string | undefined => {
        return Object.keys(enumObj).find(key => enumObj[key] === value);
    },

    /**
     * Convert enum to record type
     */
    toRecord: <T extends string | number>(enumObj: { [key: string]: T }): Record<string, T> => {
        return Object.entries(enumObj).reduce((acc, [key, value]) => {
            if (typeof value === 'string' || typeof value === 'number') {
                acc[key] = value;
            }
            return acc;
        }, {} as Record<string, T>);
    }
};

/**
 * Type guard utilities
 */
export const EnumTypeGuards = {
    /**
     * Check if a status is a valid agent status
     */
    isAgentStatus: (status: unknown): status is keyof typeof AGENT_STATUS_enum => {
        return typeof status === 'string' && status in AGENT_STATUS_enum;
    },

    /**
     * Check if a status is a valid task status
     */
    isTaskStatus: (status: unknown): status is keyof typeof TASK_STATUS_enum => {
        return typeof status === 'string' && status in TASK_STATUS_enum;
    },

    /**
     * Check if a status is a valid workflow status
     */
    isWorkflowStatus: (status: unknown): status is keyof typeof WORKFLOW_STATUS_enum => {
        return typeof status === 'string' && status in WORKFLOW_STATUS_enum;
    },

    /**
     * Check if a status is a valid feedback status
     */
    isFeedbackStatus: (status: unknown): status is keyof typeof FEEDBACK_STATUS_enum => {
        return typeof status === 'string' && status in FEEDBACK_STATUS_enum;
    }
};