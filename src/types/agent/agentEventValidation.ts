/**
 * @file agentEventValidation.ts
 * @path src/types/agent/agentEventValidation.ts
 * @description Agent event validation types, schemas, and type guards
 *
 * @module @types/agent
 */

import { 
    IValidationResult, 
    IValidationSchema,
    createValidationResult,
    ValidationErrorType,
    ValidationWarningType
} from '../common/validationTypes';
import { 
    TypeGuardCheck, 
    createTypeGuard, 
    commonChecks 
} from '../common/baseTypes';
import type {
    AgentEvent,
    IAgentEventMetadata,
    IAgentCreatedEvent,
    IAgentUpdatedEvent,
    IAgentDeletedEvent,
    IAgentStatusChangeEvent,
    IAgentIterationStartedEvent,
    IAgentIterationCompletedEvent,
    IAgentIterationFailedEvent,
    IAgentMetricsUpdatedEvent,
    IAgentConfigUpdatedEvent,
    IAgentValidationCompletedEvent,
    IAgentErrorOccurredEvent,
    IAgentErrorHandledEvent
} from './agentEventTypes';
import { AGENT_EVENT_TYPE } from './agentEventTypes';
import type { IStatusTransitionContext } from '../common/statusTypes';

// ─── Agent Event Validation Types ────────────────────────────────────────────────

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
    allowedTransitions?: {
        [key in AGENT_EVENT_TYPE]?: AGENT_EVENT_TYPE[];
    };
}

// ─── Base Type Guards ───────────────────────────────────────────────────────────

/** Type guard for agent event metadata */
export const isAgentEventMetadata: TypeGuardCheck<IAgentEventMetadata> = createTypeGuard<IAgentEventMetadata>([
    commonChecks.isObject,
    (value: unknown): boolean => {
        const metadata = value as IAgentEventMetadata;
        return (
            typeof metadata.agent === 'object' &&
            metadata.agent !== null &&
            typeof metadata.agent.name === 'string' &&
            typeof metadata.agent.role === 'string' &&
            typeof metadata.agent.status === 'string' &&
            typeof metadata.agent.metrics === 'object' &&
            metadata.agent.metrics !== null &&
            typeof metadata.agent.metrics.performance === 'object' &&
            typeof metadata.agent.metrics.resources === 'object' &&
            typeof metadata.agent.metrics.usage === 'object'
        );
    }
]);

/** Type guard for base agent event properties */
const hasBaseAgentEventProperties: TypeGuardCheck<AgentEvent> = createTypeGuard<AgentEvent>([
    commonChecks.isObject,
    (value: unknown): boolean => {
        const event = value as AgentEvent;
        return (
            typeof event.type === 'string' &&
            typeof event.agentId === 'string' &&
            isAgentEventMetadata(event.metadata)
        );
    }
]);

// ─── Event Type Guards ───────────────────────────────────────────────────────

/** Type guards for specific agent events */
export const AgentEventTypeGuards = {
    isAgentCreatedEvent: createTypeGuard<IAgentCreatedEvent>([
        hasBaseAgentEventProperties,
        (value: unknown): boolean => (value as IAgentCreatedEvent).type === AGENT_EVENT_TYPE.AGENT_CREATED,
        (value: unknown): boolean => typeof (value as IAgentCreatedEvent).agentType === 'object'
    ]),

    isAgentUpdatedEvent: createTypeGuard<IAgentUpdatedEvent>([
        hasBaseAgentEventProperties,
        (value: unknown): boolean => (value as IAgentUpdatedEvent).type === AGENT_EVENT_TYPE.AGENT_UPDATED,
        (value: unknown): boolean => typeof (value as IAgentUpdatedEvent).changes === 'object',
        (value: unknown): boolean => typeof (value as IAgentUpdatedEvent).newState === 'object'
    ]),

    isAgentDeletedEvent: createTypeGuard<IAgentDeletedEvent>([
        hasBaseAgentEventProperties,
        (value: unknown): boolean => (value as IAgentDeletedEvent).type === AGENT_EVENT_TYPE.AGENT_DELETED,
        (value: unknown): boolean => {
            const event = value as IAgentDeletedEvent;
            return event.reason === undefined || typeof event.reason === 'string';
        }
    ]),

    isAgentStatusChangedEvent: createTypeGuard<IAgentStatusChangeEvent>([
        hasBaseAgentEventProperties,
        (value: unknown): boolean => (value as IAgentStatusChangeEvent).type === AGENT_EVENT_TYPE.AGENT_STATUS_CHANGED,
        (value: unknown): boolean => typeof (value as IAgentStatusChangeEvent).previousStatus === 'string',
        (value: unknown): boolean => typeof (value as IAgentStatusChangeEvent).newStatus === 'string'
    ]),

    isAgentIterationStartedEvent: createTypeGuard<IAgentIterationStartedEvent>([
        hasBaseAgentEventProperties,
        (value: unknown): boolean => (value as IAgentIterationStartedEvent).type === AGENT_EVENT_TYPE.AGENT_ITERATION_STARTED,
        (value: unknown): boolean => typeof (value as IAgentIterationStartedEvent).iterationId === 'string'
    ]),

    isAgentIterationCompletedEvent: createTypeGuard<IAgentIterationCompletedEvent>([
        hasBaseAgentEventProperties,
        (value: unknown): boolean => (value as IAgentIterationCompletedEvent).type === AGENT_EVENT_TYPE.AGENT_ITERATION_COMPLETED,
        (value: unknown): boolean => typeof (value as IAgentIterationCompletedEvent).iterationId === 'string',
        (value: unknown): boolean => typeof (value as IAgentIterationCompletedEvent).results === 'object'
    ]),

    isAgentIterationFailedEvent: createTypeGuard<IAgentIterationFailedEvent>([
        hasBaseAgentEventProperties,
        (value: unknown): boolean => (value as IAgentIterationFailedEvent).type === AGENT_EVENT_TYPE.AGENT_ITERATION_FAILED,
        (value: unknown): boolean => typeof (value as IAgentIterationFailedEvent).iterationId === 'string',
        (value: unknown): boolean => value instanceof Error
    ]),

    isAgentMetricsUpdatedEvent: createTypeGuard<IAgentMetricsUpdatedEvent>([
        hasBaseAgentEventProperties,
        (value: unknown): boolean => (value as IAgentMetricsUpdatedEvent).type === AGENT_EVENT_TYPE.AGENT_METRICS_UPDATED,
        (value: unknown): boolean => typeof (value as IAgentMetricsUpdatedEvent).metrics === 'object',
        (value: unknown): boolean => typeof (value as IAgentMetricsUpdatedEvent).newMetrics === 'object'
    ]),

    isAgentConfigUpdatedEvent: createTypeGuard<IAgentConfigUpdatedEvent>([
        hasBaseAgentEventProperties,
        (value: unknown): boolean => (value as IAgentConfigUpdatedEvent).type === AGENT_EVENT_TYPE.AGENT_CONFIG_UPDATED,
        (value: unknown): boolean => typeof (value as IAgentConfigUpdatedEvent).changes === 'object',
        (value: unknown): boolean => typeof (value as IAgentConfigUpdatedEvent).previousConfig === 'object',
        (value: unknown): boolean => typeof (value as IAgentConfigUpdatedEvent).newConfig === 'object'
    ]),

    isAgentValidationCompletedEvent: createTypeGuard<IAgentValidationCompletedEvent>([
        hasBaseAgentEventProperties,
        (value: unknown): boolean => (value as IAgentValidationCompletedEvent).type === AGENT_EVENT_TYPE.AGENT_VALIDATION_COMPLETED,
        (value: unknown): boolean => typeof (value as IAgentValidationCompletedEvent).isValid === 'boolean',
        (value: unknown): boolean => Array.isArray((value as IAgentValidationCompletedEvent).errors),
        (value: unknown): boolean => Array.isArray((value as IAgentValidationCompletedEvent).warnings)
    ]),

    isAgentErrorOccurredEvent: createTypeGuard<IAgentErrorOccurredEvent>([
        hasBaseAgentEventProperties,
        (value: unknown): boolean => (value as IAgentErrorOccurredEvent).type === AGENT_EVENT_TYPE.AGENT_ERROR_OCCURRED,
        (value: unknown): boolean => (value as IAgentErrorOccurredEvent).error instanceof Error,
        (value: unknown): boolean => typeof (value as IAgentErrorOccurredEvent).operation === 'string'
    ]),

    isAgentErrorHandledEvent: createTypeGuard<IAgentErrorHandledEvent>([
        hasBaseAgentEventProperties,
        (value: unknown): boolean => (value as IAgentErrorHandledEvent).type === AGENT_EVENT_TYPE.AGENT_ERROR_HANDLED,
        (value: unknown): boolean => (value as IAgentErrorHandledEvent).error instanceof Error,
        (value: unknown): boolean => typeof (value as IAgentErrorHandledEvent).operation === 'string',
        (value: unknown): boolean => typeof (value as IAgentErrorHandledEvent).resolution === 'string'
    ])
};

// ─── Agent Event Flow Documentation ───────────────────────────────────────────────

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

// ─── Validation Result Factory ───────────────────────────────────────────────────

/**
 * Create a default agent event validation result
 */
export const createAgentEventValidationResult = (
    params: {
        isValid?: boolean;
        eventType: AGENT_EVENT_TYPE;
        metadata: IAgentEventMetadata;
        validatorName?: string;
        errors?: ValidationErrorType[];
        warnings?: ValidationWarningType[];
    }
): IAgentEventValidationResult => {
    const validatorName = params.validatorName ?? 'AgentEventValidator';
    const timestamp = Date.now();
    const duration = 0;
    
    const baseResult = createValidationResult(
        params.isValid ?? true,
        params.errors ?? [],
        params.warnings ?? [],
        {
            validatorName,
            timestamp,
            duration
        }
    );

    return {
        ...baseResult,
        eventType: params.eventType,
        metadata: {
            ...params.metadata,
            timestamp,
            duration,
            validatorName
        }
    };
};

// ─── Event Flow Validation ────────────────────────────────────────────────────

/**
 * Allowed event transitions following the Agent Event Flow
 */
export const ALLOWED_EVENT_TRANSITIONS: { [key in AGENT_EVENT_TYPE]?: AGENT_EVENT_TYPE[] } = {
    // 1. Agent Creation
    [AGENT_EVENT_TYPE.AGENT_CREATED]: [
        AGENT_EVENT_TYPE.AGENT_STATUS_CHANGED,
        AGENT_EVENT_TYPE.AGENT_CONFIG_UPDATED,
        AGENT_EVENT_TYPE.AGENT_VALIDATION_COMPLETED
    ],

    // 2. Agent Lifecycle Events
    [AGENT_EVENT_TYPE.AGENT_STATUS_CHANGED]: [
        AGENT_EVENT_TYPE.AGENT_ITERATION_STARTED,
        AGENT_EVENT_TYPE.AGENT_METRICS_UPDATED,
        AGENT_EVENT_TYPE.AGENT_CONFIG_UPDATED,
        AGENT_EVENT_TYPE.AGENT_ERROR_OCCURRED
    ],

    [AGENT_EVENT_TYPE.AGENT_ITERATION_STARTED]: [
        AGENT_EVENT_TYPE.AGENT_ITERATION_COMPLETED,
        AGENT_EVENT_TYPE.AGENT_ITERATION_FAILED,
        AGENT_EVENT_TYPE.AGENT_ERROR_OCCURRED
    ],

    [AGENT_EVENT_TYPE.AGENT_ITERATION_COMPLETED]: [
        AGENT_EVENT_TYPE.AGENT_METRICS_UPDATED,
        AGENT_EVENT_TYPE.AGENT_STATUS_CHANGED,
        AGENT_EVENT_TYPE.AGENT_ITERATION_STARTED
    ],

    [AGENT_EVENT_TYPE.AGENT_ITERATION_FAILED]: [
        AGENT_EVENT_TYPE.AGENT_ERROR_OCCURRED,
        AGENT_EVENT_TYPE.AGENT_STATUS_CHANGED
    ],

    // 3. Error Handling Flow
    [AGENT_EVENT_TYPE.AGENT_ERROR_OCCURRED]: [
        AGENT_EVENT_TYPE.AGENT_ERROR_HANDLED
    ],

    [AGENT_EVENT_TYPE.AGENT_ERROR_HANDLED]: [
        AGENT_EVENT_TYPE.AGENT_STATUS_CHANGED
    ],

    // 4. Agent Deletion (terminal state)
    [AGENT_EVENT_TYPE.AGENT_DELETED]: []
};

/**
 * Validate event transition according to the Agent Event Flow
 */
export const validateEventTransition = (
    fromEvent: AGENT_EVENT_TYPE,
    toEvent: AGENT_EVENT_TYPE
): boolean => {
    const allowedTransitions = ALLOWED_EVENT_TRANSITIONS[fromEvent];
    return allowedTransitions?.includes(toEvent) ?? false;
};

