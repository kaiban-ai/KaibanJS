/**
 * @file agentEventTypes.ts
 * @path src/types/agent/agentEventTypes.ts
 * @description Agent event type definitions
 */

import type { IBaseEvent, IBaseHandlerMetadata } from '../common/baseTypes';
import type { IBaseMetrics } from '../metrics/base/baseMetrics';
import type { AGENT_STATUS_enum } from '../common/enumTypes';
import type { IAgentType, IAgentExecutionState } from './agentBaseTypes';
import type { IErrorMetrics } from '../metrics/base/errorMetrics';
import type { 
    IAgentResourceMetrics, 
    IAgentPerformanceMetrics, 
    IAgentUsageMetrics 
} from './agentMetricTypes';

// ─── Enums ───────────────────────────────────────────────────────────────────────
export enum AGENT_EVENT_TYPE {
    AGENT_CREATED = 'agent_created',
    AGENT_UPDATED = 'agent_updated',
    AGENT_DELETED = 'agent_deleted',
    AGENT_STATUS_CHANGED = 'agent_status_changed',
    AGENT_ERROR = 'agent_error',
    AGENT_EXECUTION = 'agent_execution',
    AGENT_VALIDATION = 'agent_validation',
    AGENT_VALIDATION_COMPLETED = 'agent_validation_completed',
    AGENT_ERROR_OCCURRED = 'agent_error_occurred',
    AGENT_ERROR_HANDLED = 'agent_error_handled',
    AGENT_ITERATION_STARTED = 'agent_iteration_started',
    AGENT_ITERATION_COMPLETED = 'agent_iteration_completed',
    AGENT_ITERATION_FAILED = 'agent_iteration_failed',
    AGENT_METRICS_UPDATED = 'agent_metrics_updated',
    AGENT_CONFIG_UPDATED = 'agent_config_updated',
    GET_AGENT_METADATA = 'get_agent_metadata'
}

// ─── Base Types ─────────────────────────────────────────────────────────────────
export interface IAgentEventMetrics extends Omit<IBaseMetrics, 'performance'> {
    readonly resources: IAgentResourceMetrics;
    readonly performance: IAgentPerformanceMetrics;
    readonly usage: IAgentUsageMetrics;
    readonly errors: IErrorMetrics;
    readonly warnings: string[];
    readonly info: string[];
    readonly iterations: number;
    readonly executionTime: number;
    readonly llmMetrics: unknown;
    readonly thinkingMetrics?: {
        reasoningTime: number;
        planningTime: number;
        learningTime: number;
        decisionConfidence: number;
        learningEfficiency: number;
        startTime: number;
    };
}

export interface IAgentEventMetadata extends IBaseHandlerMetadata {
    readonly category: string;
    readonly source: string;
    readonly correlationId: string;
    readonly agent: {
        readonly id: string;
        readonly name: string;
        readonly role: string;
        readonly status: string;
        readonly metrics: {
            readonly performance: IAgentPerformanceMetrics;
            readonly resources: IAgentResourceMetrics;
            readonly usage: IAgentUsageMetrics;
            readonly iterations: number;
            readonly executionTime: number;
            readonly llmMetrics: unknown;
            readonly thinkingMetrics?: {
                reasoningTime: number;
                planningTime: number;
                learningTime: number;
                decisionConfidence: number;
                learningEfficiency: number;
                startTime: number;
            };
        };
    };
}

export interface IAgentEventBase extends IBaseEvent {
    readonly agentId: string;
    readonly metrics: IAgentEventMetrics;
    readonly metadata: IAgentEventMetadata;
}

// ─── Event Types ────────────────────────────────────────────────────────────────
export interface IAgentCreatedEvent extends IAgentEventBase {
    readonly type: AGENT_EVENT_TYPE.AGENT_CREATED;
    readonly config: Record<string, unknown>;
    readonly agentType: IAgentType;
}

export interface IAgentUpdatedEvent extends IAgentEventBase {
    readonly type: AGENT_EVENT_TYPE.AGENT_UPDATED;
    readonly changes: Record<string, unknown>;
    readonly newState: IAgentExecutionState;
}

export interface IAgentDeletedEvent extends IAgentEventBase {
    readonly type: AGENT_EVENT_TYPE.AGENT_DELETED;
    readonly reason?: string;
}

export interface IAgentStatusChangeEvent extends IAgentEventBase {
    readonly type: AGENT_EVENT_TYPE.AGENT_STATUS_CHANGED;
    readonly previousStatus: AGENT_STATUS_enum;
    readonly newStatus: AGENT_STATUS_enum;
    readonly reason?: string;
}

export interface IAgentValidationCompletedEvent extends IAgentEventBase {
    readonly type: AGENT_EVENT_TYPE.AGENT_VALIDATION_COMPLETED;
    readonly isValid: boolean;
    readonly errors: string[];
    readonly warnings: string[];
}

export interface IAgentErrorOccurredEvent extends IAgentEventBase {
    readonly type: AGENT_EVENT_TYPE.AGENT_ERROR_OCCURRED;
    readonly error: Error;
    readonly operation: string;
}

export interface IAgentErrorHandledEvent extends IAgentEventBase {
    readonly type: AGENT_EVENT_TYPE.AGENT_ERROR_HANDLED;
    readonly error: Error;
    readonly operation: string;
    readonly resolution: string;
}

export interface IAgentErrorEvent extends IAgentEventBase {
    readonly type: AGENT_EVENT_TYPE.AGENT_ERROR;
    readonly error: Error;
    readonly operation: string;
}

export interface IAgentExecutionEvent extends IAgentEventBase {
    readonly type: AGENT_EVENT_TYPE.AGENT_EXECUTION;
    readonly operation: string;
    readonly duration: number;
    readonly success: boolean;
    readonly error?: Error;
}

export interface IAgentValidationEvent extends IAgentEventBase {
    readonly type: AGENT_EVENT_TYPE.AGENT_VALIDATION;
    readonly operation: string;
    readonly isValid: boolean;
    readonly errors: string[];
    readonly warnings: string[];
    readonly validationResult?: {
        isValid: boolean;
        errors: string[];
        warnings: string[];
    };
}

export interface IAgentIterationStartedEvent extends IAgentEventBase {
    readonly type: AGENT_EVENT_TYPE.AGENT_ITERATION_STARTED;
    readonly iterationId: string;
}

export interface IAgentIterationCompletedEvent extends IAgentEventBase {
    readonly type: AGENT_EVENT_TYPE.AGENT_ITERATION_COMPLETED;
    readonly iterationId: string;
    readonly results: Record<string, unknown>;
}

export interface IAgentIterationFailedEvent extends IAgentEventBase {
    readonly type: AGENT_EVENT_TYPE.AGENT_ITERATION_FAILED;
    readonly iterationId: string;
    readonly error: Error;
}

export interface IAgentMetricsUpdatedEvent extends IAgentEventBase {
    readonly type: AGENT_EVENT_TYPE.AGENT_METRICS_UPDATED;
    readonly metrics: IAgentEventMetrics;
    readonly newMetrics: IAgentEventMetrics;
}

export interface IAgentConfigUpdatedEvent extends IAgentEventBase {
    readonly type: AGENT_EVENT_TYPE.AGENT_CONFIG_UPDATED;
    readonly changes: Record<string, unknown>;
    readonly previousConfig: Record<string, unknown>;
    readonly newConfig: Record<string, unknown>;
}

// ─── Union Types ────────────────────────────────────────────────────────────────
export type AgentEvent =
    | IAgentCreatedEvent
    | IAgentUpdatedEvent
    | IAgentDeletedEvent
    | IAgentStatusChangeEvent
    | IAgentErrorEvent
    | IAgentExecutionEvent
    | IAgentValidationEvent
    | IAgentValidationCompletedEvent
    | IAgentErrorOccurredEvent
    | IAgentErrorHandledEvent
    | IAgentIterationStartedEvent
    | IAgentIterationCompletedEvent
    | IAgentIterationFailedEvent
    | IAgentMetricsUpdatedEvent
    | IAgentConfigUpdatedEvent;

// ─── Handler Types ──────────────────────────────────────────────────────────────
export interface IAgentEventHandler {
    handleEvent(event: AgentEvent): Promise<void>;
    validateEvent(event: AgentEvent): Promise<boolean>;
}

export interface IAgentEventFactory {
    createEvent(
        type: AgentEvent['type'],
        params: Record<string, unknown>,
        metadata: IBaseHandlerMetadata
    ): AgentEvent;
}
