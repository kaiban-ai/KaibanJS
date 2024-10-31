/**
 * @file logs.ts
 * @path src/types/team/logs.ts
 * @description Team logging interfaces and types
 *
 * @packageDocumentation
 * @module @types/team
 */

import { 
    TASK_STATUS_enum, 
    AGENT_STATUS_enum, 
    WORKFLOW_STATUS_enum 
} from "@/utils/core/enums";
import { AgentType } from "../agent";
import { TaskType } from "../task";
import { LLMUsageStats } from "../llm";
import { CostDetails } from "../workflow/stats";

/**
 * Log type enums
 */
export type StatusLogType = 'AgentStatusUpdate' | 'TaskStatusUpdate' | 'WorkflowStatusUpdate';
export type MessageLogType = 'SystemMessage' | 'UserMessage' | 'AIMessage' | 'FunctionMessage';
export type LogType = StatusLogType | MessageLogType;

/**
 * Base log metadata
 */
export interface LogMetadata {
    llmUsageStats?: LLMUsageStats;
    iterationCount?: number;
    duration?: number;
    costDetails?: CostDetails;
    result?: unknown;
    error?: Error | {
        name: string;
        message: string;
        stack?: string;
        context?: Record<string, unknown>;
        timestamp?: number;
    };
    [key: string]: unknown;
}

/**
 * Agent log metadata
 */
export interface AgentLogMetadata extends LogMetadata {
    output?: {
        llmUsageStats: LLMUsageStats;
        thought?: string;
        action?: string;
        observation?: string | Record<string, unknown>;
        finalAnswer?: string | Record<string, unknown>;
        toolResult?: string | Record<string, unknown>;
        [key: string]: unknown;
    };
    iterations?: number;
    maxAgentIterations?: number;
    messages?: unknown[];
    error?: Error;
    action?: unknown;
    runId?: string;
    tool?: unknown;
    input?: unknown;
    toolName?: string;
    stats?: Record<string, unknown>;
}

/**
 * Task log metadata
 */
export interface TaskLogMetadata extends LogMetadata {
    llmUsageStats?: LLMUsageStats;
    iterationCount?: number;
    duration?: number;
    costDetails?: CostDetails;
    result?: unknown;
}

/**
 * Workflow log metadata
 */
export interface WorkflowLogMetadata extends LogMetadata {
    result: string;
    duration: number;
    llmUsageStats: LLMUsageStats;
    iterationCount: number;
    costDetails: CostDetails;
    teamName: string;
    taskCount: number;
    agentCount: number;
}

/**
 * Message log metadata
 */
export interface MessageLogMetadata extends LogMetadata {
    role: string;
    content: string;
    name?: string;
    timestamp: number;
    llmUsageStats: LLMUsageStats;
    costDetails: CostDetails;
}

/**
 * Log preparation parameters
 */
export interface PrepareNewLogParams {
    agent: AgentType;
    task: TaskType | null;
    logDescription: string;
    metadata: LogMetadata;
    logType: LogType;
    agentStatus?: keyof typeof AGENT_STATUS_enum;
    taskStatus?: keyof typeof TASK_STATUS_enum;
    workflowStatus?: keyof typeof WORKFLOW_STATUS_enum;
}

/**
 * Core log interface
 */
export interface Log {
    timestamp: number;
    task: TaskType | null;
    agent: AgentType | null;
    agentName: string;
    taskTitle: string;
    logDescription: string;
    taskStatus: keyof typeof TASK_STATUS_enum;
    agentStatus: keyof typeof AGENT_STATUS_enum;
    workflowStatus?: keyof typeof WORKFLOW_STATUS_enum;
    metadata: LogMetadata;
    logType: LogType;
}

/**
 * Type guards for log types
 */
export const LogTypeGuards = {
    isStatusLog: (logType: LogType): logType is StatusLogType => {
        return ['AgentStatusUpdate', 'TaskStatusUpdate', 'WorkflowStatusUpdate'].includes(logType);
    },

    isMessageLog: (logType: LogType): logType is MessageLogType => {
        return ['SystemMessage', 'UserMessage', 'AIMessage', 'FunctionMessage'].includes(logType);
    },

    isAgentLogMetadata: (metadata: LogMetadata): metadata is AgentLogMetadata => {
        return (
            'output' in metadata &&
            typeof metadata.output === 'object' &&
            metadata.output !== null &&
            'llmUsageStats' in metadata.output
        );
    },

    isTaskLogMetadata: (metadata: LogMetadata): metadata is TaskLogMetadata => {
        return (
            'llmUsageStats' in metadata &&
            'costDetails' in metadata
        );
    },

    isWorkflowLogMetadata: (metadata: LogMetadata): metadata is WorkflowLogMetadata => {
        return (
            'result' in metadata &&
            'duration' in metadata &&
            'teamName' in metadata &&
            'taskCount' in metadata &&
            'agentCount' in metadata
        );
    }
};