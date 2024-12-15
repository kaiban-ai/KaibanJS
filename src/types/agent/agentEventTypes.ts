/**
 * @file agentEventTypes.ts
 * @path src/types/agent/agentEventTypes.ts
 * @description Agent domain event type definitions with categorization and enhanced type safety
 */

import type { IBaseEvent, IBaseHandlerMetadata, IStateChangeEvent } from '../common/baseTypes';
import type { AGENT_STATUS_enum } from '../common/enumTypes';
import type { IBaseError } from '../common/errorTypes';
import type { IAgentType } from './agentBaseTypes';
import type { IAgentValidationResult } from './agentValidationTypes';
import type { IIterationResult } from './agentIterationTypes';
import type { ITaskType } from '../task/taskBaseTypes';
import type { 
    IAgentResourceMetrics,
    IAgentPerformanceMetrics,
    IAgentUsageMetrics
} from './agentMetricTypes';

// ─── Event Categories ──────────────────────────────────────────────────────────

/**
 * Agent event categories for better organization and filtering
 */
export enum AGENT_EVENT_CATEGORY {
    LIFECYCLE = 'lifecycle',    // Agent creation, updates, deletion
    STATE = 'state',           // Status changes and state transitions
    ITERATION = 'iteration',    // Iteration-related events
    METRICS = 'metrics',       // Metrics and performance updates
    CONFIG = 'config',         // Configuration changes
    VALIDATION = 'validation', // Validation events
    ERROR = 'error'           // Error-related events
}

// ─── Base Agent Event ─────────────────────────────────────────────────────────

/**
 * Agent-specific event metadata extending base handler metadata
 */
export interface IAgentEventMetadata extends IBaseHandlerMetadata {
    category: AGENT_EVENT_CATEGORY;  // Event category for filtering
    source: string;                  // Event source component
    correlationId?: string;          // For tracking related events
    agent: {
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

/**
 * Base agent event interface that all agent events must extend.
 * The agentId is a primary property that identifies which agent the event relates to.
 */
export interface IBaseAgentEvent extends IBaseEvent {
    agentId: string;                  // Primary agent identifier
    metadata: IAgentEventMetadata;
}

// ─── Event Types ────────────────────────────────────────────────────────────

/**
 * Agent event types enum with categorization
 */
export enum AGENT_EVENT_TYPE {
    // Lifecycle Events
    AGENT_CREATED = 'agent.lifecycle.created',
    AGENT_UPDATED = 'agent.lifecycle.updated',
    AGENT_DELETED = 'agent.lifecycle.deleted',

    // State Events
    AGENT_STATUS_CHANGED = 'agent.state.status_changed',
    AGENT_STATE_UPDATED = 'agent.state.updated',

    // Iteration Events
    AGENT_ITERATION_STARTED = 'agent.iteration.started',
    AGENT_ITERATION_COMPLETED = 'agent.iteration.completed',
    AGENT_ITERATION_FAILED = 'agent.iteration.failed',

    // Metrics Events
    AGENT_METRICS_UPDATED = 'agent.metrics.updated',
    AGENT_PERFORMANCE_UPDATED = 'agent.metrics.performance_updated',
    AGENT_RESOURCES_UPDATED = 'agent.metrics.resources_updated',

    // Config Events
    AGENT_CONFIG_UPDATED = 'agent.config.updated',
    AGENT_CONFIG_VALIDATED = 'agent.config.validated',

    // Validation Events
    AGENT_VALIDATION_STARTED = 'agent.validation.started',
    AGENT_VALIDATION_COMPLETED = 'agent.validation.completed',

    // Error Events
    AGENT_ERROR_OCCURRED = 'agent.error.occurred',
    AGENT_ERROR_HANDLED = 'agent.error.handled',
    AGENT_ERROR_RECOVERY_STARTED = 'agent.error.recovery.started',
    AGENT_ERROR_RECOVERY_COMPLETED = 'agent.error.recovery.completed',
    AGENT_ERROR_RECOVERY_FAILED = 'agent.error.recovery.failed'
}

// ─── Lifecycle Events ─────────────────────────────────────────────────────────

export interface IAgentCreatedEvent extends IBaseAgentEvent {
    type: AGENT_EVENT_TYPE.AGENT_CREATED;
    agentType: IAgentType;
    metadata: IAgentEventMetadata & {
        category: AGENT_EVENT_CATEGORY.LIFECYCLE;
    };
}

export interface IAgentUpdatedEvent extends IBaseAgentEvent, IStateChangeEvent<IAgentType> {
    type: AGENT_EVENT_TYPE.AGENT_UPDATED;
    metadata: IAgentEventMetadata & {
        category: AGENT_EVENT_CATEGORY.LIFECYCLE;
    };
}

export interface IAgentDeletedEvent extends IBaseAgentEvent {
    type: AGENT_EVENT_TYPE.AGENT_DELETED;
    finalState: IAgentType;
    metadata: IAgentEventMetadata & {
        category: AGENT_EVENT_CATEGORY.LIFECYCLE;
    };
}

// ─── State Events ───────────────────────────────────────────────────────────

export interface IAgentStatusChangedEvent extends IBaseAgentEvent {
    type: AGENT_EVENT_TYPE.AGENT_STATUS_CHANGED;
    previousStatus: AGENT_STATUS_enum;
    newStatus: AGENT_STATUS_enum;
    reason: string;
    metadata: IAgentEventMetadata & {
        category: AGENT_EVENT_CATEGORY.STATE;
    };
}

// ─── Iteration Events ────────────────────────────────────────────────────────

export interface IAgentIterationStartedEvent extends IBaseAgentEvent {
    type: AGENT_EVENT_TYPE.AGENT_ITERATION_STARTED;
    iterationId: string;
    metadata: IAgentEventMetadata & {
        category: AGENT_EVENT_CATEGORY.ITERATION;
    };
}

export interface IAgentIterationCompletedEvent extends IBaseAgentEvent {
    type: AGENT_EVENT_TYPE.AGENT_ITERATION_COMPLETED;
    iterationId: string;
    result: IIterationResult;
    metadata: IAgentEventMetadata & {
        category: AGENT_EVENT_CATEGORY.ITERATION;
    };
}

export interface IAgentIterationFailedEvent extends IBaseAgentEvent {
    type: AGENT_EVENT_TYPE.AGENT_ITERATION_FAILED;
    iterationId: string;
    error: Error;
    metadata: IAgentEventMetadata & {
        category: AGENT_EVENT_CATEGORY.ITERATION;
    };
}

// ─── Metrics Events ─────────────────────────────────────────────────────────

export interface IAgentMetricsUpdatedEvent extends IBaseAgentEvent {
    type: AGENT_EVENT_TYPE.AGENT_METRICS_UPDATED;
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
    metadata: IAgentEventMetadata & {
        category: AGENT_EVENT_CATEGORY.METRICS;
    };
}

// ─── Config Events ──────────────────────────────────────────────────────────

export interface IAgentConfigUpdatedEvent extends IBaseAgentEvent {
    type: AGENT_EVENT_TYPE.AGENT_CONFIG_UPDATED;
    previousConfig: Record<string, unknown>;
    newConfig: Record<string, unknown>;
    metadata: IAgentEventMetadata & {
        category: AGENT_EVENT_CATEGORY.CONFIG;
    };
}

// ─── Validation Events ───────────────────────────────────────────────────────

export interface IAgentValidationCompletedEvent extends IBaseAgentEvent {
    type: AGENT_EVENT_TYPE.AGENT_VALIDATION_COMPLETED;
    validationResult: IAgentValidationResult;
    metadata: IAgentEventMetadata & {
        category: AGENT_EVENT_CATEGORY.VALIDATION;
    };
}

// ─── Error Events ───────────────────────────────────────────────────────────

export interface IAgentErrorOccurredEvent extends IBaseAgentEvent {
    type: AGENT_EVENT_TYPE.AGENT_ERROR_OCCURRED;
    error: Error;
    context: {
        operation: string;
        state: IAgentType;
    };
    metadata: IAgentEventMetadata & {
        category: AGENT_EVENT_CATEGORY.ERROR;
    };
}

export interface IAgentErrorHandledEvent extends IBaseAgentEvent {
    type: AGENT_EVENT_TYPE.AGENT_ERROR_HANDLED;
    error: IBaseError;
    task: ITaskType;
    context: {
        operation: string;
        recoveryAttempted: boolean;
        recoverySuccessful?: boolean;
    };
    metadata: IAgentEventMetadata & {
        category: AGENT_EVENT_CATEGORY.ERROR;
    };
}

export interface IAgentErrorRecoveryStartedEvent extends IBaseAgentEvent {
    type: AGENT_EVENT_TYPE.AGENT_ERROR_RECOVERY_STARTED;
    error: IBaseError;
    context: {
        operation: string;
        recoveryStrategy: string;
    };
    metadata: IAgentEventMetadata & {
        category: AGENT_EVENT_CATEGORY.ERROR;
    };
}

export interface IAgentErrorRecoveryCompletedEvent extends IBaseAgentEvent {
    type: AGENT_EVENT_TYPE.AGENT_ERROR_RECOVERY_COMPLETED;
    error: IBaseError;
    context: {
        operation: string;
        recoveryStrategy: string;
        recoveryDuration: number;
    };
    metadata: IAgentEventMetadata & {
        category: AGENT_EVENT_CATEGORY.ERROR;
    };
}

export interface IAgentErrorRecoveryFailedEvent extends IBaseAgentEvent {
    type: AGENT_EVENT_TYPE.AGENT_ERROR_RECOVERY_FAILED;
    error: IBaseError;
    context: {
        operation: string;
        recoveryStrategy: string;
        recoveryAttempts: number;
        failureReason: string;
    };
    metadata: IAgentEventMetadata & {
        category: AGENT_EVENT_CATEGORY.ERROR;
    };
}

// ─── Event Union Types ────────────────────────────────────────────────────────

/**
 * Lifecycle event union type
 */
export type AgentLifecycleEvent =
    | IAgentCreatedEvent
    | IAgentUpdatedEvent
    | IAgentDeletedEvent;

/**
 * State event union type
 */
export type AgentStateEvent =
    | IAgentStatusChangedEvent;

/**
 * Iteration event union type
 */
export type AgentIterationEvent =
    | IAgentIterationStartedEvent
    | IAgentIterationCompletedEvent
    | IAgentIterationFailedEvent;

/**
 * Metrics event union type
 */
export type AgentMetricsEvent =
    | IAgentMetricsUpdatedEvent;

/**
 * Config event union type
 */
export type AgentConfigEvent =
    | IAgentConfigUpdatedEvent;

/**
 * Validation event union type
 */
export type AgentValidationEvent =
    | IAgentValidationCompletedEvent;

/**
 * Error event union type
 */
export type AgentErrorEvent =
    | IAgentErrorOccurredEvent
    | IAgentErrorHandledEvent
    | IAgentErrorRecoveryStartedEvent
    | IAgentErrorRecoveryCompletedEvent
    | IAgentErrorRecoveryFailedEvent;

/**
 * Complete agent event union type
 */
export type AgentEvent =
    | AgentLifecycleEvent
    | AgentStateEvent
    | AgentIterationEvent
    | AgentMetricsEvent
    | AgentConfigEvent
    | AgentValidationEvent
    | AgentErrorEvent;

// ─── Event Handler Types ───────────────────────────────────────────────────────

/**
 * Agent event handler interface with categorized methods
 */
export interface IAgentEventHandler {
    // Lifecycle Events
    onAgentCreated(event: IAgentCreatedEvent): Promise<void>;
    onAgentUpdated(event: IAgentUpdatedEvent): Promise<void>;
    onAgentDeleted(event: IAgentDeletedEvent): Promise<void>;

    // State Events
    onAgentStatusChanged(event: IAgentStatusChangedEvent): Promise<void>;

    // Iteration Events
    onAgentIterationStarted(event: IAgentIterationStartedEvent): Promise<void>;
    onAgentIterationCompleted(event: IAgentIterationCompletedEvent): Promise<void>;
    onAgentIterationFailed(event: IAgentIterationFailedEvent): Promise<void>;

    // Metrics Events
    onAgentMetricsUpdated(event: IAgentMetricsUpdatedEvent): Promise<void>;

    // Config Events
    onAgentConfigUpdated(event: IAgentConfigUpdatedEvent): Promise<void>;

    // Validation Events
    onAgentValidationCompleted(event: IAgentValidationCompletedEvent): Promise<void>;

    // Error Events
    onAgentErrorOccurred(event: IAgentErrorOccurredEvent): Promise<void>;
    onAgentErrorHandled(event: IAgentErrorHandledEvent): Promise<void>;
    onAgentErrorRecoveryStarted(event: IAgentErrorRecoveryStartedEvent): Promise<void>;
    onAgentErrorRecoveryCompleted(event: IAgentErrorRecoveryCompletedEvent): Promise<void>;
    onAgentErrorRecoveryFailed(event: IAgentErrorRecoveryFailedEvent): Promise<void>;
}
