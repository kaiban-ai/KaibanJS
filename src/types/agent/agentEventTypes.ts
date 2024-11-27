/**
* @file agentEventTypes.ts
* @path src/types/agent/agentEventTypes.ts
* @description Agent domain event type definitions
*
* @module @types/agent
*/

import type { IBaseEvent, IBaseHandlerMetadata } from '../common/commonEventTypes';
import type { 
    IAgentType,
    IAgentMetadata
} from './agentBaseTypes';
import type { 
    IAgentResourceMetrics,
    IAgentPerformanceMetrics,
    IAgentUsageMetrics
} from './agentMetricTypes';
import type { IIterationResult } from './agentIterationTypes';
import type { IAgentValidationResult } from './agentValidationTypes';
import type { AGENT_STATUS_enum } from '../common/commonEnums';
import type { ITaskType } from '../task/taskBaseTypes';
import type { IBaseError } from '../common/commonErrorTypes';

// ─── Agent Event Metadata ────────────────────────────────────────────────────

/**
 * Composite metadata type for agent events
 */
export interface IAgentEventMetadata extends IBaseHandlerMetadata {
    agent: {
        id: string;
        name: string;
        role: string;
        status: string;
        metrics: {
            performance: IAgentPerformanceMetrics;
            resources: IAgentResourceMetrics;
            usage: IAgentUsageMetrics;
        };
    };
}

// ─── Agent Event Types ────────────────────────────────────────────────────────

export enum AGENT_EVENT_TYPE {
    AGENT_CREATED = 'agent.created',
    AGENT_UPDATED = 'agent.updated',
    AGENT_DELETED = 'agent.deleted',
    AGENT_STATUS_CHANGED = 'agent.status.changed',
    AGENT_ITERATION_STARTED = 'agent.iteration.started',
    AGENT_ITERATION_COMPLETED = 'agent.iteration.completed',
    AGENT_ITERATION_FAILED = 'agent.iteration.failed',
    AGENT_METRICS_UPDATED = 'agent.metrics.updated',
    AGENT_CONFIG_UPDATED = 'agent.config.updated',
    AGENT_VALIDATION_COMPLETED = 'agent.validation.completed',
    AGENT_ERROR_OCCURRED = 'agent.error.occurred',
    AGENT_ERROR_HANDLED = 'agent.error.handled',
    AGENT_ERROR_RECOVERY_STARTED = 'agent.error.recovery.started',
    AGENT_ERROR_RECOVERY_COMPLETED = 'agent.error.recovery.completed',
    AGENT_ERROR_RECOVERY_FAILED = 'agent.error.recovery.failed'
}

// ─── Agent Event Interfaces ────────────────────────────────────────────────────

export interface IAgentCreatedEvent extends IBaseEvent {
    type: AGENT_EVENT_TYPE.AGENT_CREATED;
    agentId: string;
    agentType: IAgentType;
    metadata: IAgentEventMetadata;
}

export interface IAgentUpdatedEvent extends IBaseEvent {
    type: AGENT_EVENT_TYPE.AGENT_UPDATED;
    agentId: string;
    previousState: IAgentType;
    newState: IAgentType;
    metadata: IAgentEventMetadata;
}

export interface IAgentDeletedEvent extends IBaseEvent {
    type: AGENT_EVENT_TYPE.AGENT_DELETED;
    agentId: string;
    finalState: IAgentType;
    metadata: IAgentEventMetadata;
}

export interface IAgentStatusChangedEvent extends IBaseEvent {
    type: AGENT_EVENT_TYPE.AGENT_STATUS_CHANGED;
    agentId: string;
    previousStatus: AGENT_STATUS_enum;
    newStatus: AGENT_STATUS_enum;
    reason: string;
    metadata: IAgentEventMetadata;
}

export interface IAgentIterationStartedEvent extends IBaseEvent {
    type: AGENT_EVENT_TYPE.AGENT_ITERATION_STARTED;
    agentId: string;
    iterationId: string;
    metadata: IAgentEventMetadata;
}

export interface IAgentIterationCompletedEvent extends IBaseEvent {
    type: AGENT_EVENT_TYPE.AGENT_ITERATION_COMPLETED;
    agentId: string;
    iterationId: string;
    result: IIterationResult;
    metadata: IAgentEventMetadata;
}

export interface IAgentIterationFailedEvent extends IBaseEvent {
    type: AGENT_EVENT_TYPE.AGENT_ITERATION_FAILED;
    agentId: string;
    iterationId: string;
    error: Error;
    metadata: IAgentEventMetadata;
}

export interface IAgentMetricsUpdatedEvent extends IBaseEvent {
    type: AGENT_EVENT_TYPE.AGENT_METRICS_UPDATED;
    agentId: string;
    previousMetrics: {
        performance: IAgentPerformanceMetrics;
        resources: IAgentResourceMetrics;
        usage: IAgentUsageMetrics;
    };
    newMetrics: {
        performance: IAgentPerformanceMetrics;
        resources: IAgentResourceMetrics;
        usage: IAgentUsageMetrics;
    };
    metadata: IAgentEventMetadata;
}

export interface IAgentConfigUpdatedEvent extends IBaseEvent {
    type: AGENT_EVENT_TYPE.AGENT_CONFIG_UPDATED;
    agentId: string;
    previousConfig: Record<string, unknown>;
    newConfig: Record<string, unknown>;
    metadata: IAgentEventMetadata;
}

export interface IAgentValidationCompletedEvent extends IBaseEvent {
    type: AGENT_EVENT_TYPE.AGENT_VALIDATION_COMPLETED;
    agentId: string;
    validationResult: IAgentValidationResult;
    metadata: IAgentEventMetadata;
}

export interface IAgentErrorOccurredEvent extends IBaseEvent {
    type: AGENT_EVENT_TYPE.AGENT_ERROR_OCCURRED;
    agentId: string;
    error: Error;
    context: {
        operation: string;
        state: IAgentType;
    };
    metadata: IAgentEventMetadata;
}

export interface IAgentErrorHandledEvent extends IBaseEvent {
    type: AGENT_EVENT_TYPE.AGENT_ERROR_HANDLED;
    agentId: string;
    error: IBaseError;
    task: ITaskType;
    context: {
        operation: string;
        recoveryAttempted: boolean;
        recoverySuccessful?: boolean;
    };
    metadata: IAgentEventMetadata;
}

export interface IAgentErrorRecoveryStartedEvent extends IBaseEvent {
    type: AGENT_EVENT_TYPE.AGENT_ERROR_RECOVERY_STARTED;
    agentId: string;
    error: IBaseError;
    context: {
        operation: string;
        recoveryStrategy: string;
    };
    metadata: IAgentEventMetadata;
}

export interface IAgentErrorRecoveryCompletedEvent extends IBaseEvent {
    type: AGENT_EVENT_TYPE.AGENT_ERROR_RECOVERY_COMPLETED;
    agentId: string;
    error: IBaseError;
    context: {
        operation: string;
        recoveryStrategy: string;
        recoveryDuration: number;
    };
    metadata: IAgentEventMetadata;
}

export interface IAgentErrorRecoveryFailedEvent extends IBaseEvent {
    type: AGENT_EVENT_TYPE.AGENT_ERROR_RECOVERY_FAILED;
    agentId: string;
    error: IBaseError;
    context: {
        operation: string;
        recoveryStrategy: string;
        recoveryAttempts: number;
        failureReason: string;
    };
    metadata: IAgentEventMetadata;
}

// ─── Agent Event Union Type ─────────────────────────────────────────────────────

export type AgentEvent =
    | IAgentCreatedEvent
    | IAgentUpdatedEvent
    | IAgentDeletedEvent
    | IAgentStatusChangedEvent
    | IAgentIterationStartedEvent
    | IAgentIterationCompletedEvent
    | IAgentIterationFailedEvent
    | IAgentMetricsUpdatedEvent
    | IAgentConfigUpdatedEvent
    | IAgentValidationCompletedEvent
    | IAgentErrorOccurredEvent
    | IAgentErrorHandledEvent
    | IAgentErrorRecoveryStartedEvent
    | IAgentErrorRecoveryCompletedEvent
    | IAgentErrorRecoveryFailedEvent;

// ─── Agent Event Handler Types ───────────────────────────────────────────────────

export interface IAgentEventHandler {
    onAgentCreated(event: IAgentCreatedEvent): Promise<void>;
    onAgentUpdated(event: IAgentUpdatedEvent): Promise<void>;
    onAgentDeleted(event: IAgentDeletedEvent): Promise<void>;
    onAgentStatusChanged(event: IAgentStatusChangedEvent): Promise<void>;
    onAgentIterationStarted(event: IAgentIterationStartedEvent): Promise<void>;
    onAgentIterationCompleted(event: IAgentIterationCompletedEvent): Promise<void>;
    onAgentIterationFailed(event: IAgentIterationFailedEvent): Promise<void>;
    onAgentMetricsUpdated(event: IAgentMetricsUpdatedEvent): Promise<void>;
    onAgentConfigUpdated(event: IAgentConfigUpdatedEvent): Promise<void>;
    onAgentValidationCompleted(event: IAgentValidationCompletedEvent): Promise<void>;
    onAgentErrorOccurred(event: IAgentErrorOccurredEvent): Promise<void>;
    onAgentErrorHandled(event: IAgentErrorHandledEvent): Promise<void>;
    onAgentErrorRecoveryStarted(event: IAgentErrorRecoveryStartedEvent): Promise<void>;
    onAgentErrorRecoveryCompleted(event: IAgentErrorRecoveryCompletedEvent): Promise<void>;
    onAgentErrorRecoveryFailed(event: IAgentErrorRecoveryFailedEvent): Promise<void>;
}
