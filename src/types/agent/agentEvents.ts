/**
 * @file events.ts
 * @path src/types/agent/events.ts
 * @description Consolidated agent event types, validation, and type guards
 * 
 * @module @types/agent
 */

import { 
    IBaseEvent, 
    IBaseHandlerMetadata, 
    IStateChangeEvent,
    TypeGuardCheck,
    createTypeGuard,
    commonChecks
} from '../common/baseTypes';
import { 
    IValidationResult, 
    IValidationSchema,
    createValidationResult
} from '../common/validationTypes';
import type { IAgentType, IAgentMetadata } from './agentBaseTypes';
import type { 
    IAgentResourceMetrics,
    IAgentPerformanceMetrics,
    IAgentUsageMetrics
} from './agentMetricTypes';
import type { IIterationResult } from './agentIterationTypes';
import type { IAgentValidationResult } from './agentValidationTypes';
import { AGENT_STATUS_enum } from '../common/enumTypes';
import type { ITaskType } from '../task/taskBaseTypes';
import type { IBaseError } from '../common/errorTypes';
import type { IStatusTransitionContext } from '../common/statusTypes';

// ─── Event Categories and Types ──────────────────────────────────────────────────

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

// ─── Base Event Types ─────────────────────────────────────────────────────────

/**
 * Base agent event metadata extending common handler metadata
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
    category: AGENT_EVENT_CATEGORY;  // Event category for filtering
    source: string;                  // Event source component
    correlationId?: string;          // For tracking related events
}

/**
 * Base agent event interface that all agent events must extend
 */
export interface IBaseAgentEvent extends IBaseEvent {
    agentId: string;
    metadata: IAgentEventMetadata;
}

// ─── Specific Event Interfaces ────────────────────────────────────────────────

// Lifecycle Events
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

// State Events
export interface IAgentStatusChangedEvent extends IBaseAgentEvent {
    type: AGENT_EVENT_TYPE.AGENT_STATUS_CHANGED;
    previousStatus: AGENT_STATUS_enum;
    newStatus: AGENT_STATUS_enum;
    reason: string;
    metadata: IAgentEventMetadata & {
        category: AGENT_EVENT_CATEGORY.STATE;
    };
}

// Iteration Events
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

// Metrics Events
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

// Config Events
export interface IAgentConfigUpdatedEvent extends IBaseAgentEvent {
    type: AGENT_EVENT_TYPE.AGENT_CONFIG_UPDATED;
    previousConfig: Record<string, unknown>;
    newConfig: Record<string, unknown>;
    metadata: IAgentEventMetadata & {
        category: AGENT_EVENT_CATEGORY.CONFIG;
    };
}

// Validation Events
export interface IAgentValidationCompletedEvent extends IBaseAgentEvent {
    type: AGENT_EVENT_TYPE.AGENT_VALIDATION_COMPLETED;
    validationResult: IAgentValidationResult;
    metadata: IAgentEventMetadata & {
        category: AGENT_EVENT_CATEGORY.VALIDATION;
    };
}

// Error Events
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

// ─── Validation Types and Schemas ────────────────────────────────────────────

/** Agent event validation result */
export interface IAgentEventValidationResult extends IValidationResult {
    eventType: AGENT_EVENT_TYPE;
    metadata: IAgentEventMetadata & {
        timestamp: number;
        duration: number;
        validatorName: string;
    };
}

/** Agent event validation schema */
export interface IAgentEventValidationSchema extends IValidationSchema<AgentEvent> {
    eventType: AGENT_EVENT_TYPE;
    transitionContext?: IStatusTransitionContext;
}

// ─── Type Guards ────────────────────────────────────────────────────────────

/** Type guard for agent event metadata */
export const isAgentEventMetadata: TypeGuardCheck<IAgentEventMetadata> = createTypeGuard<IAgentEventMetadata>([
    commonChecks.isObject,
    commonChecks.hasProperty('agent'),
    (value: unknown): boolean => {
        const metadata = value as IAgentEventMetadata;
        return (
            commonChecks.isObject(metadata.agent) &&
            commonChecks.isType('id', 'string')(metadata.agent) &&
            commonChecks.isType('name', 'string')(metadata.agent) &&
            commonChecks.isType('role', 'string')(metadata.agent) &&
            commonChecks.isType('status', 'string')(metadata.agent) &&
            commonChecks.hasMetrics(metadata.agent)
        );
    }
]);

/** Type guard for base agent event properties */
const hasBaseAgentEventProperties: TypeGuardCheck<AgentEvent> = createTypeGuard<AgentEvent>([
    commonChecks.isObject,
    commonChecks.isType('type', 'string'),
    commonChecks.isType('agentId', 'string'),
    commonChecks.hasProperty('metadata'),
    (value: unknown): boolean => isAgentEventMetadata((value as AgentEvent).metadata)
]);

/** Type guards for specific agent events */
export const AgentEventTypeGuards = {
    isAgentCreatedEvent: createTypeGuard<IAgentCreatedEvent>([
        hasBaseAgentEventProperties,
        commonChecks.isType('type', 'string'),
        (value: unknown): boolean => (value as IAgentCreatedEvent).type === AGENT_EVENT_TYPE.AGENT_CREATED,
        commonChecks.hasProperty('agentType'),
        (value: unknown): boolean => commonChecks.isObject((value as IAgentCreatedEvent).agentType)
    ]),

    isAgentUpdatedEvent: createTypeGuard<IAgentUpdatedEvent>([
        hasBaseAgentEventProperties,
        commonChecks.isType('type', 'string'),
        (value: unknown): boolean => (value as IAgentUpdatedEvent).type === AGENT_EVENT_TYPE.AGENT_UPDATED,
        commonChecks.hasProperty('previousState'),
        commonChecks.hasProperty('newState'),
        (value: unknown): boolean => {
            const event = value as IAgentUpdatedEvent;
            return commonChecks.isObject(event.previousState) && commonChecks.isObject(event.newState);
        }
    ]),

    isAgentDeletedEvent: createTypeGuard<IAgentDeletedEvent>([
        hasBaseAgentEventProperties,
        commonChecks.isType('type', 'string'),
        (value: unknown): boolean => (value as IAgentDeletedEvent).type === AGENT_EVENT_TYPE.AGENT_DELETED,
        commonChecks.hasProperty('finalState'),
        (value: unknown): boolean => commonChecks.isObject((value as IAgentDeletedEvent).finalState)
    ]),

    isAgentStatusChangedEvent: createTypeGuard<IAgentStatusChangedEvent>([
        hasBaseAgentEventProperties,
        commonChecks.isType('type', 'string'),
        (value: unknown): boolean => (value as IAgentStatusChangedEvent).type === AGENT_EVENT_TYPE.AGENT_STATUS_CHANGED,
        commonChecks.isType('previousStatus', 'string'),
        commonChecks.isType('newStatus', 'string'),
        commonChecks.isType('reason', 'string')
    ]),

    isAgentIterationStartedEvent: createTypeGuard<IAgentIterationStartedEvent>([
        hasBaseAgentEventProperties,
        commonChecks.isType('type', 'string'),
        (value: unknown): boolean => (value as IAgentIterationStartedEvent).type === AGENT_EVENT_TYPE.AGENT_ITERATION_STARTED,
        commonChecks.isType('iterationId', 'string')
    ]),

    isAgentIterationCompletedEvent: createTypeGuard<IAgentIterationCompletedEvent>([
        hasBaseAgentEventProperties,
        commonChecks.isType('type', 'string'),
        (value: unknown): boolean => (value as IAgentIterationCompletedEvent).type === AGENT_EVENT_TYPE.AGENT_ITERATION_COMPLETED,
        commonChecks.isType('iterationId', 'string'),
        commonChecks.hasProperty('result'),
        (value: unknown): boolean => commonChecks.isObject((value as IAgentIterationCompletedEvent).result)
    ]),

    isAgentIterationFailedEvent: createTypeGuard<IAgentIterationFailedEvent>([
        hasBaseAgentEventProperties,
        commonChecks.isType('type', 'string'),
        (value: unknown): boolean => (value as IAgentIterationFailedEvent).type === AGENT_EVENT_TYPE.AGENT_ITERATION_FAILED,
        commonChecks.isType('iterationId', 'string'),
        commonChecks.hasProperty('error'),
        (value: unknown): boolean => (value as IAgentIterationFailedEvent).error instanceof Error
    ]),

    isAgentMetricsUpdatedEvent: createTypeGuard<IAgentMetricsUpdatedEvent>([
        hasBaseAgentEventProperties,
        commonChecks.isType('type', 'string'),
        (value: unknown): boolean => (value as IAgentMetricsUpdatedEvent).type === AGENT_EVENT_TYPE.AGENT_METRICS_UPDATED,
        commonChecks.hasProperty('previousMetrics'),
        commonChecks.hasProperty('newMetrics'),
        (value: unknown): boolean => {
            const event = value as IAgentMetricsUpdatedEvent;
            return commonChecks.isObject(event.previousMetrics) && commonChecks.isObject(event.newMetrics);
        }
    ]),

    isAgentConfigUpdatedEvent: createTypeGuard<IAgentConfigUpdatedEvent>([
        hasBaseAgentEventProperties,
        commonChecks.isType('type', 'string'),
        (value: unknown): boolean => (value as IAgentConfigUpdatedEvent).type === AGENT_EVENT_TYPE.AGENT_CONFIG_UPDATED,
        commonChecks.hasProperty('previousConfig'),
        commonChecks.hasProperty('newConfig'),
        (value: unknown): boolean => {
            const event = value as IAgentConfigUpdatedEvent;
            return commonChecks.isObject(event.previousConfig) && commonChecks.isObject(event.newConfig);
        }
    ]),

    isAgentValidationCompletedEvent: createTypeGuard<IAgentValidationCompletedEvent>([
        hasBaseAgentEventProperties,
        commonChecks.isType('type', 'string'),
        (value: unknown): boolean => (value as IAgentValidationCompletedEvent).type === AGENT_EVENT_TYPE.AGENT_VALIDATION_COMPLETED,
        commonChecks.hasProperty('validationResult'),
        (value: unknown): boolean => commonChecks.isObject((value as IAgentValidationCompletedEvent).validationResult)
    ]),

    isAgentErrorOccurredEvent: createTypeGuard<IAgentErrorOccurredEvent>([
        hasBaseAgentEventProperties,
        commonChecks.isType('type', 'string'),
        (value: unknown): boolean => (value as IAgentErrorOccurredEvent).type === AGENT_EVENT_TYPE.AGENT_ERROR_OCCURRED,
        commonChecks.hasProperty('error'),
        commonChecks.hasProperty('context'),
        (value: unknown): boolean => {
            const event = value as IAgentErrorOccurredEvent;
            return event.error instanceof Error && commonChecks.isObject(event.context);
        }
    ]),

    isAgentErrorHandledEvent: createTypeGuard<IAgentErrorHandledEvent>([
        hasBaseAgentEventProperties,
        commonChecks.isType('type', 'string'),
        (value: unknown): boolean => (value as IAgentErrorHandledEvent).type === AGENT_EVENT_TYPE.AGENT_ERROR_HANDLED,
        commonChecks.hasProperty('error'),
        commonChecks.hasProperty('task'),
        commonChecks.hasProperty('context'),
        (value: unknown): boolean => {
            const event = value as IAgentErrorHandledEvent;
            return commonChecks.isObject(event.error) && 
                   commonChecks.isObject(event.task) && 
                   commonChecks.isObject(event.context);
        }
    ]),

    isAgentErrorRecoveryStartedEvent: createTypeGuard<IAgentErrorRecoveryStartedEvent>([
        hasBaseAgentEventProperties,
        commonChecks.isType('type', 'string'),
        (value: unknown): boolean => (value as IAgentErrorRecoveryStartedEvent).type === AGENT_EVENT_TYPE.AGENT_ERROR_RECOVERY_STARTED,
        commonChecks.hasProperty('error'),
        commonChecks.hasProperty('context'),
        (value: unknown): boolean => {
            const event = value as IAgentErrorRecoveryStartedEvent;
            return commonChecks.isObject(event.error) && commonChecks.isObject(event.context);
        }
    ]),

    isAgentErrorRecoveryCompletedEvent: createTypeGuard<IAgentErrorRecoveryCompletedEvent>([
        hasBaseAgentEventProperties,
        commonChecks.isType('type', 'string'),
        (value: unknown): boolean => (value as IAgentErrorRecoveryCompletedEvent).type === AGENT_EVENT_TYPE.AGENT_ERROR_RECOVERY_COMPLETED,
        commonChecks.hasProperty('error'),
        commonChecks.hasProperty('context'),
        (value: unknown): boolean => {
            const event = value as IAgentErrorRecoveryCompletedEvent;
            return commonChecks.isObject(event.error) && commonChecks.isObject(event.context);
        }
    ]),

    isAgentErrorRecoveryFailedEvent: createTypeGuard<IAgentErrorRecoveryFailedEvent>([
        hasBaseAgentEventProperties,
        commonChecks.isType('type', 'string'),
        (value: unknown): boolean => (value as IAgentErrorRecoveryFailedEvent).type === AGENT_EVENT_TYPE.AGENT_ERROR_RECOVERY_FAILED,
        commonChecks.hasProperty('error'),
        commonChecks.hasProperty('context'),
        (value: unknown): boolean => {
            const event = value as IAgentErrorRecoveryFailedEvent;
            return commonChecks.isObject(event.error) && commonChecks.isObject(event.context);
        }
    ])
};

// ─── Validation Result Factory ───────────────────────────────────────────────────

/**
 * Create a default agent event validation result
 */
export const createAgentEventValidationResult = (
    isValid: boolean = true,
    validatorName: string = 'AgentEventValidator',
    eventType: AGENT_EVENT_TYPE,
    metadata: IAgentEventMetadata
): IAgentEventValidationResult => ({
    ...createValidationResult({
        isValid,
        errors: [],
        warnings: [],
        metadata: {
            validatorName,
            timestamp: Date.now(),
            duration: 0
        }
    }),
    eventType,
    metadata: {
        ...metadata,
        timestamp: Date.now(),
        duration: 0,
        validatorName
    }
});

// ─── Event Handler Interface ───────────────────────────────────────────────────

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

/**
 * Agent Event Flow
 * 
 * Note: All event validation and transitions are handled through CoreManager services
 * 
 * 1. Agent Creation
 *    - AGENT_CREATED event is emitted when a new agent is created
 *    - Validation and state management handled by StatusManager
 * 
 * 2. Agent Lifecycle Events
 *    - AGENT_UPDATED: Agent properties modified
 *    - AGENT_STATUS_CHANGED: Status transitions (managed by StatusManager)
 *    - AGENT_ITERATION_STARTED: New iteration begins
 *    - AGENT_ITERATION_COMPLETED: Iteration completes successfully
 *    - AGENT_ITERATION_FAILED: Iteration encounters error
 *    - AGENT_METRICS_UPDATED: Performance metrics updated (via MetricsManager)
 *    - AGENT_CONFIG_UPDATED: Configuration changes
 *    - AGENT_VALIDATION_COMPLETED: Validation checks complete
 * 
 * 3. Error Handling Flow (managed by ErrorManager)
 *    a. Error Detection
 *       - AGENT_ERROR_OCCURRED: Initial error detection
 * 
 *    b. Error Processing
 *       - AGENT_ERROR_HANDLED: Error processed
 * 
 *    c. Recovery Attempt
 *       - AGENT_ERROR_RECOVERY_STARTED: Recovery begins
 *       - AGENT_ERROR_RECOVERY_COMPLETED: Recovery succeeds
 *       - AGENT_ERROR_RECOVERY_FAILED: Recovery fails
 * 
 * 4. Agent Deletion
 *    - AGENT_DELETED: Agent removed from system
 * 
 * All events are logged through LogManager and include:
 * - Comprehensive error handling via ErrorManager
 * - Status transitions via StatusManager
 * - Performance tracking via MetricsManager
 * - Safe execution through CoreManager.safeExecute
 */
