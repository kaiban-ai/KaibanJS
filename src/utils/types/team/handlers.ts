/**
 * @file handlers.ts
 * @path src/utils/types/team/handlers.ts
 * @description Team handler interfaces and types for managing store operations
 */

import { Tool } from 'langchain/tools';
import { BaseMessage } from "@langchain/core/messages";
import { WORKFLOW_STATUS_enum, TASK_STATUS_enum, AGENT_STATUS_enum } from '../common/enums';
import { ErrorType } from '../common/errors';
import { Output } from '../llm/responses';
import { LLMUsageStats } from '../llm/responses';
import { CostDetails } from '../workflow/stats';
import { AgentType } from '../agent/base';
import { TaskType } from '../task/base';
import { Log } from './logs';
import { WorkflowStats } from '../workflow/stats';
import { WorkflowResult } from '../workflow/base';

/**
 * Base handler parameters
 */
export interface HandlerBaseParams {
    /** Optional agent reference */
    agent?: AgentType;
    /** Optional task reference */
    task?: TaskType;
    /** Handler metadata */
    metadata?: Record<string, unknown>;
}

/**
 * Team message handler parameters
 */
export interface TeamMessageParams extends HandlerBaseParams {
    /** Message content */
    content: string | BaseMessage;
    /** Additional message context */
    context?: Record<string, unknown>;
    /** Message type */
    type: 'system' | 'user' | 'ai' | 'function';
    /** Optional function name */
    functionName?: string;
}

/**
 * Team task handler parameters
 */
export interface TeamTaskParams extends HandlerBaseParams {
    /** Agent that completed the task */
    agent: AgentType;
    /** Completed task */
    task: TaskType;
    /** Task result */
    result: unknown;
    /** Completion metadata */
    metadata?: {
        duration?: number;
        iterationCount?: number;
        llmUsageStats?: LLMUsageStats;
        costDetails?: CostDetails;
    };
}

/**
 * Team agent handler parameters
 */
export interface TeamAgentParams extends HandlerBaseParams {
    /** Agent instance */
    agent: AgentType;
    /** Current task */
    task: TaskType;
    /** Agent output */
    output?: Output;
    /** Execution error */
    error?: ErrorType;
    /** Execution context */
    context?: Record<string, unknown>;
}

/**
 * Team tool handler parameters
 */
export interface TeamToolParams extends HandlerBaseParams {
    /** Agent using the tool */
    agent: AgentType;
    /** Current task */
    task: TaskType;
    /** Tool being used */
    tool: Tool;
    /** Tool input */
    input: string;
    /** Tool result */
    result?: string;
    /** Tool error */
    error?: Error;
}

/**
 * Team workflow handler parameters
 */
export interface TeamWorkflowParams extends HandlerBaseParams {
    /** Task that triggered the workflow event */
    task?: TaskType;
    /** Error that occurred */
    error?: ErrorType;
    /** Workflow context */
    context?: {
        phase?: string;
        attemptNumber?: number;
        lastSuccessfulOperation?: string;
        recoveryPossible?: boolean;
    };
}

/**
 * Workflow start result
 */
export interface WorkflowStartResult {
    /** Final status */
    status: keyof typeof WORKFLOW_STATUS_enum;
    /** Result data */
    result: WorkflowResult;
    /** Execution statistics */
    stats: WorkflowStats;
}

/**
 * Team feedback handler parameters
 */
export interface TeamFeedbackParams extends HandlerBaseParams {
    /** Task receiving feedback */
    taskId: string;
    /** Feedback content */
    feedback: string;
    /** Feedback metadata */
    metadata?: {
        source?: string;
        priority?: 'low' | 'medium' | 'high';
        category?: string;
    };
}

/**
 * Handler result interface
 */
export interface HandlerResult<T = unknown> {
    /** Success indicator */
    success: boolean;
    /** Result data */
    data?: T;
    /** Error if handler failed */
    error?: Error;
    /** Handler metadata */
    metadata?: Record<string, unknown>;
}

/**
 * Team message methods interface
 */
export interface TeamMessageMethods {
    addSystemMessage(message: string): Promise<void>;
    addUserMessage(message: string): Promise<void>;
    addAIMessage(message: string): Promise<void>;
    getMessageHistory(): Promise<BaseMessage[]>;
    clearMessageHistory(): Promise<void>;
}

/**
 * Team task methods interface
 */
export interface TeamTaskMethods {
    handleTaskCompletion(params: TeamTaskParams): Promise<HandlerResult>;
    handleTaskError(params: { task: TaskType; error: ErrorType }): Promise<HandlerResult>;
    handleTaskStatusChange(
        taskId: string,
        status: keyof typeof TASK_STATUS_enum,
        metadata?: Record<string, unknown>
    ): Promise<HandlerResult>;
}

/**
 * Team tool methods interface
 */
export interface TeamToolMethods {
    handleToolExecution(params: TeamToolParams): Promise<HandlerResult>;
    handleToolError(params: TeamToolParams & { toolName: string }): Promise<HandlerResult>;
    handleToolDoesNotExist(params: { agent: AgentType; task: TaskType; toolName: string }): Promise<HandlerResult>;
}

/**
 * Team agent methods interface
 */
export interface TeamAgentMethods {
    handleAgentStatusChange(agent: AgentType, status: keyof typeof AGENT_STATUS_enum): Promise<HandlerResult>;
    handleAgentError(params: TeamAgentParams): Promise<HandlerResult>;
    handleAgentThinking(params: TeamAgentParams & { messages: BaseMessage[] }): Promise<HandlerResult>;
}

/**
 * Team workflow methods interface
 */
export interface TeamWorkflowMethods {
    handleWorkflowError(params: TeamWorkflowParams): Promise<HandlerResult>;
    handleWorkflowStatusChange(status: keyof typeof WORKFLOW_STATUS_enum): Promise<HandlerResult>;
    startWorkflow(inputs?: Record<string, unknown>): Promise<WorkflowStartResult>;
}

/**
 * Team feedback methods interface
 */
export interface TeamFeedbackMethods {
    provideFeedback(taskId: string, feedback: string): Promise<HandlerResult>;
    processFeedback(taskId: string, feedbackId: string): Promise<HandlerResult>;
}

/**
 * Team streaming methods interface
 */
export interface TeamStreamingMethods {
    handleStreamingOutput(params: {
        agent: AgentType;
        task: TaskType;
        chunk: string;
        isDone: boolean;
    }): void;
}

/**
 * Team validation methods interface
 */
export interface TeamValidationMethods {
    validateTask(taskId: string): Promise<HandlerResult>;
    validateWorkflowState(): Promise<HandlerResult>;
}

/**
 * Team state action methods
 */
export interface TeamStateActions {
    resetWorkflowState(): void;
    clearWorkflowLogs(): void;
    cleanup(): Promise<void>;
}

/**
 * Type guard utilities for handlers
 */
export const HandlerTypeGuards = {
    isHandlerResult: <T>(value: unknown): value is HandlerResult<T> => {
        return (
            typeof value === 'object' &&
            value !== null &&
            'success' in value &&
            typeof (value as HandlerResult<T>).success === 'boolean'
        );
    },

    isTeamMessageParams: (value: unknown): value is TeamMessageParams => {
        return (
            typeof value === 'object' &&
            value !== null &&
            'content' in value &&
            'type' in value
        );
    },

    isTeamTaskParams: (value: unknown): value is TeamTaskParams => {
        return (
            typeof value === 'object' &&
            value !== null &&
            'agent' in value &&
            'task' in value &&
            'result' in value
        );
    }
};