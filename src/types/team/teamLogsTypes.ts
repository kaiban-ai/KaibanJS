/**
 * @file teamLogsTypes.ts
 * @path KaibanJS/src/types/team/teamLogsTypes.ts
 * @description Log type definitions for team operations
 *
 * @module types/team
 */

import { ILogLevel } from '../common';
import { MESSAGE_LOG_TYPE_enum, STATUS_LOG_TYPE_enum } from '../common';
import type { ILLMUsageStats } from '../llm/llmResponseTypes';
import type { ICostDetails } from '../workflow/workflowCostsTypes';
import type { 
    IBaseHandlerMetadata,
    IWorkflowMetadata,
    IToolExecutionMetadata,
    IErrorMetadata 
} from '../common/commonMetadataTypes';

// ─── Base Log Types ─────────────────────────────────────────────────────────────

export interface ILog {
    id: string;
    level: ILogLevel;
    message: string;
    timestamp: number;
    agentName: string;
    taskId: string;
    meta?: Record<string, unknown>;
}

// ─── Log Type Interfaces ────────────────────────────────────────────────────────

export interface IStatusLog extends ILog {
    type: STATUS_LOG_TYPE_enum;
    status: string;
    entity: string;
}

export interface IMessageLog extends ILog {
    type: MESSAGE_LOG_TYPE_enum;
    role: string;
    content: string;
}

// ─── Metadata Types ───────────────────────────────────────────────────────────

export interface IToolExecutionMetadataPayload {
    tool: string;
    input: unknown;
    output?: unknown;
    error?: {
        message: string;
        name: string;
        stack?: string;
    };
    metadata?: IToolExecutionMetadata;
}

export interface IErrorMetadataPayload {
    error: {
        message: string;
        name: string;
        stack?: string;
    } | Record<string, unknown>;
    errorMetadata?: IErrorMetadata;
}

export type ILogMetadataPayload = {
    toolExecution?: IToolExecutionMetadataPayload;
    error?: IErrorMetadataPayload;
    workflow?: IWorkflowMetadata;
}

// ─── Metadata Interfaces ─────────────────────────────────────────────────────────

export interface IBaseLogMetadata extends IBaseHandlerMetadata {
    llmUsageStats?: ILLMUsageStats;
    meta?: ILogMetadataPayload;
}

export interface ITaskLogMetadata extends IBaseLogMetadata {
    task: {
        llmUsageStats: ILLMUsageStats;
        iterationCount: number;
        duration: number;
        costDetails: ICostDetails;
        result?: unknown;
    };
}

export interface IWorkflowLogMetadata extends IBaseLogMetadata {
    workflow: {
        result?: string;
        duration: number;
        llmUsageStats: ILLMUsageStats;
        iterationCount: number;
        costDetails: ICostDetails;
        teamName: string;
        taskCount: number;
        agentCount: number;
    };
}

export interface IAgentLogMetadata extends IBaseLogMetadata {
    agent: {
        output: {
            llmUsageStats: ILLMUsageStats;
            [key: string]: unknown;
        };
    };
}

// ─── Type Guards ─────────────────────────────────────────────────────────────────

export const LogTypeGuards = {
    isLog: (value: unknown): value is ILog => {
        if (!value || typeof value !== 'object') return false;
        const log = value as Partial<ILog>;
        return !!(
            typeof log.id === 'string' &&
            typeof log.level === 'string' &&
            typeof log.message === 'string' &&
            typeof log.timestamp === 'number' &&
            typeof log.taskId === 'string'
        );
    },

    isStatusLog: (value: unknown): value is IStatusLog => {
        if (!LogTypeGuards.isLog(value)) return false;
        const statusLog = value as Partial<IStatusLog>;
        return !!(
            statusLog.type && 
            Object.values(STATUS_LOG_TYPE_enum).includes(statusLog.type) &&
            typeof statusLog.status === 'string' &&
            typeof statusLog.entity === 'string'
        );
    },

    isMessageLog: (value: unknown): value is IMessageLog => {
        if (!LogTypeGuards.isLog(value)) return false;
        const messageLog = value as Partial<IMessageLog>;
        return !!(
            messageLog.type &&
            Object.values(MESSAGE_LOG_TYPE_enum).includes(messageLog.type) &&
            typeof messageLog.role === 'string' &&
            typeof messageLog.content === 'string'
        );
    },

    isTaskLogMetadata: (value: unknown): value is ITaskLogMetadata => {
        if (!value || typeof value !== 'object') return false;
        const metadata = value as Partial<ITaskLogMetadata>;
        return !!(
            typeof metadata.timestamp === 'number' &&
            metadata.component &&
            metadata.operation &&
            metadata.performance &&
            metadata.task &&
            metadata.task.llmUsageStats &&
            typeof metadata.task.iterationCount === 'number' &&
            typeof metadata.task.duration === 'number' &&
            metadata.task.costDetails
        );
    },

    isWorkflowLogMetadata: (value: unknown): value is IWorkflowLogMetadata => {
        if (!value || typeof value !== 'object') return false;
        const metadata = value as Partial<IWorkflowLogMetadata>;
        return !!(
            typeof metadata.timestamp === 'number' &&
            metadata.component &&
            metadata.operation &&
            metadata.performance &&
            metadata.workflow &&
            typeof metadata.workflow.duration === 'number' &&
            metadata.workflow.llmUsageStats &&
            typeof metadata.workflow.iterationCount === 'number' &&
            metadata.workflow.costDetails &&
            typeof metadata.workflow.teamName === 'string' &&
            typeof metadata.workflow.taskCount === 'number' &&
            typeof metadata.workflow.agentCount === 'number'
        );
    },

    isAgentLogMetadata: (value: unknown): value is IAgentLogMetadata => {
        if (!value || typeof value !== 'object') return false;
        const metadata = value as Partial<IAgentLogMetadata>;
        return !!(
            typeof metadata.timestamp === 'number' &&
            metadata.component &&
            metadata.operation &&
            metadata.performance &&
            metadata.agent &&
            metadata.agent.output &&
            typeof metadata.agent.output === 'object' &&
            'llmUsageStats' in metadata.agent.output
        );
    }
};
