/**
 * @file teamLogsTypes.ts
 * @path src/types/team/teamLogsTypes.ts
 * @description Team logging type definitions
 *
 * @module @team
 */

import { 
    MESSAGE_STATUS_enum,
    STATUS_LOG_TYPE_enum
} from '../common/enumTypes';

import type {
    ITaskMetadata,
    IWorkflowMetadata,
    IAgentMetadata,
    IMessageMetadata
} from '../common/metadataTypes';

import type { IBaseHandlerMetadata } from '../common/baseTypes';
import type { IPerformanceMetrics } from '../metrics/base/performanceMetrics';
import type { ILLMUsageMetrics } from '../llm/llmMetricTypes';
import type { ICostDetails } from '../workflow/workflowCostsTypes';

// ─── Base Log Types ─────────────────────────────────────────────────────────────

export interface IBaseLogMetadata extends IBaseHandlerMetadata {
    readonly timestamp: number;
    readonly component: string;
    readonly operation: string;
    readonly performance: IPerformanceMetrics;
}

// ─── Task Log Types ──────────────────────────────────────────────────────────

export interface ITaskLogMetadata extends IBaseLogMetadata {
    readonly task: ITaskMetadata['task'] & {
        readonly iterationCount: number;
        readonly duration: number;
        readonly llmUsageMetrics: ILLMUsageMetrics;
        readonly costDetails: ICostDetails;
    };
}

export interface ITaskLogEntry {
    readonly id: string;
    readonly type: STATUS_LOG_TYPE_enum.TASK_STATUS;
    readonly message: string;
    readonly metadata: ITaskLogMetadata;
}

// ─── Workflow Log Types ──────────────────────────────────────────────────────

export interface IWorkflowLogMetadata extends IBaseLogMetadata {
    readonly workflow: IWorkflowMetadata['workflow'] & {
        readonly duration: number;
        readonly llmUsageMetrics: ILLMUsageMetrics;
        readonly costDetails: ICostDetails;
        readonly iterationCount: number;
    };
}

export interface IWorkflowLogEntry {
    readonly id: string;
    readonly type: STATUS_LOG_TYPE_enum.WORKFLOW_STATUS;
    readonly message: string;
    readonly metadata: IWorkflowLogMetadata;
}

// ─── Agent Log Types ───────────────────────────────────────────────────────────

export interface IAgentLogMetadata extends IBaseLogMetadata {
    readonly agent: IAgentMetadata['agent'];
}

export interface IAgentLogEntry {
    readonly id: string;
    readonly type: STATUS_LOG_TYPE_enum.AGENT_STATUS;
    readonly message: string;
    readonly metadata: IAgentLogMetadata;
}

// ─── Message Log Types ──────────────────────────────────────────────────────

export interface IMessageLogMetadata extends Omit<IBaseLogMetadata, 'message'> {
    readonly message: Omit<IMessageMetadata['message'], 'type'> & {
        readonly content: string;
        readonly type: MESSAGE_STATUS_enum;
    };
}

export interface IMessageLogEntry {
    readonly id: string;
    readonly type: MESSAGE_STATUS_enum;
    readonly message: string;
    readonly metadata: IMessageLogMetadata;
}

// ─── Team Log Types ───────────────────────────────────────────────────────────

export type TeamLogEntry = 
    | ITaskLogEntry
    | IWorkflowLogEntry
    | IAgentLogEntry
    | IMessageLogEntry;

export interface ITeamLogHistory {
    readonly entries: ReadonlyArray<TeamLogEntry>;
    readonly lastUpdated: number;
    readonly totalEntries: number;
}

// ─── Base Log Interface ────────────────────────────────────────────────────────

export interface ILog {
    readonly id: string;
    readonly timestamp: number;
    readonly level: string;
    readonly message: string;
    readonly metadata: IBaseLogMetadata;
    readonly context?: Record<string, unknown>;
    readonly correlationId?: string;
    readonly traceId?: string;
    readonly spanId?: string;
    readonly parentSpanId?: string;
    readonly tags?: ReadonlyArray<string>;
}
