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
    createValidationResult
} from '../common/commonValidationTypes';
import { 
    TypeGuardCheck, 
    createTypeGuard, 
    metadataChecks 
} from '../common/commonTypeGuards';
import type {
    AgentEvent,
    IAgentEventMetadata,
    IAgentCreatedEvent,
    IAgentUpdatedEvent,
    IAgentDeletedEvent,
    IAgentStatusChangedEvent,
    IAgentIterationStartedEvent,
    IAgentIterationCompletedEvent,
    IAgentIterationFailedEvent,
    IAgentMetricsUpdatedEvent,
    IAgentConfigUpdatedEvent,
    IAgentValidationCompletedEvent,
    IAgentErrorOccurredEvent,
    IAgentErrorHandledEvent,
    IAgentErrorRecoveryStartedEvent,
    IAgentErrorRecoveryCompletedEvent,
    IAgentErrorRecoveryFailedEvent
} from './agentEventTypes';
import { AGENT_EVENT_TYPE } from './agentEventTypes';
import { AGENT_STATUS_enum } from '../common/commonEnums';
import type { IStatusTransitionContext } from '../common/commonStatusTypes';

// ─── Agent Event Validation Types ────────────────────────────────────────────────

/** Agent event validation result */
export interface IAgentEventValidationResult extends IValidationResult<AgentEvent> {
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

// ─── Base Type Guards ───────────────────────────────────────────────────────────

/** Type guard for agent event metadata */
export const isAgentEventMetadata: TypeGuardCheck<IAgentEventMetadata> = createTypeGuard<IAgentEventMetadata>([
    metadataChecks.isObject,
    (value: unknown): boolean => {
        const metadata = value as IAgentEventMetadata;
        return (
            typeof metadata.agent === 'object' &&
            typeof metadata.agent.id === 'string' &&
            typeof metadata.agent.name === 'string' &&
            typeof metadata.agent.role === 'string' &&
            typeof metadata.agent.status === 'string' &&
            typeof metadata.agent.metrics === 'object' &&
            typeof metadata.agent.metrics.performance === 'object' &&
            typeof metadata.agent.metrics.resources === 'object' &&
            typeof metadata.agent.metrics.usage === 'object'
        );
    }
]);

/** Type guard for base agent event properties */
const hasBaseAgentEventProperties: TypeGuardCheck<AgentEvent> = createTypeGuard<AgentEvent>([
    metadataChecks.isObject,
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
        (value: unknown): boolean => typeof (value as IAgentUpdatedEvent).previousState === 'object',
        (value: unknown): boolean => typeof (value as IAgentUpdatedEvent).newState === 'object'
    ]),

    isAgentDeletedEvent: createTypeGuard<IAgentDeletedEvent>([
        hasBaseAgentEventProperties,
        (value: unknown): boolean => (value as IAgentDeletedEvent).type === AGENT_EVENT_TYPE.AGENT_DELETED,
        (value: unknown): boolean => typeof (value as IAgentDeletedEvent).finalState === 'object'
    ]),

    isAgentStatusChangedEvent: createTypeGuard<IAgentStatusChangedEvent>([
        hasBaseAgentEventProperties,
        (value: unknown): boolean => (value as IAgentStatusChangedEvent).type === AGENT_EVENT_TYPE.AGENT_STATUS_CHANGED,
        (value: unknown): boolean => typeof (value as IAgentStatusChangedEvent).previousStatus === 'string',
        (value: unknown): boolean => typeof (value as IAgentStatusChangedEvent).newStatus === 'string',
        (value: unknown): boolean => typeof (value as IAgentStatusChangedEvent).reason === 'string'
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
        (value: unknown): boolean => typeof (value as IAgentIterationCompletedEvent).result === 'object'
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
        (value: unknown): boolean => typeof (value as IAgentMetricsUpdatedEvent).previousMetrics === 'object',
        (value: unknown): boolean => typeof (value as IAgentMetricsUpdatedEvent).newMetrics === 'object'
    ]),

    isAgentConfigUpdatedEvent: createTypeGuard<IAgentConfigUpdatedEvent>([
        hasBaseAgentEventProperties,
        (value: unknown): boolean => (value as IAgentConfigUpdatedEvent).type === AGENT_EVENT_TYPE.AGENT_CONFIG_UPDATED,
        (value: unknown): boolean => typeof (value as IAgentConfigUpdatedEvent).previousConfig === 'object',
        (value: unknown): boolean => typeof (value as IAgentConfigUpdatedEvent).newConfig === 'object'
    ]),

    isAgentValidationCompletedEvent: createTypeGuard<IAgentValidationCompletedEvent>([
        hasBaseAgentEventProperties,
        (value: unknown): boolean => (value as IAgentValidationCompletedEvent).type === AGENT_EVENT_TYPE.AGENT_VALIDATION_COMPLETED,
        (value: unknown): boolean => typeof (value as IAgentValidationCompletedEvent).validationResult === 'object'
    ]),

    isAgentErrorOccurredEvent: createTypeGuard<IAgentErrorOccurredEvent>([
        hasBaseAgentEventProperties,
        (value: unknown): boolean => (value as IAgentErrorOccurredEvent).type === AGENT_EVENT_TYPE.AGENT_ERROR_OCCURRED,
        (value: unknown): boolean => value instanceof Error,
        (value: unknown): boolean => typeof (value as IAgentErrorOccurredEvent).context === 'object'
    ]),

    isAgentErrorHandledEvent: createTypeGuard<IAgentErrorHandledEvent>([
        hasBaseAgentEventProperties,
        (value: unknown): boolean => (value as IAgentErrorHandledEvent).type === AGENT_EVENT_TYPE.AGENT_ERROR_HANDLED,
        (value: unknown): boolean => typeof (value as IAgentErrorHandledEvent).error === 'object',
        (value: unknown): boolean => typeof (value as IAgentErrorHandledEvent).task === 'object',
        (value: unknown): boolean => typeof (value as IAgentErrorHandledEvent).context === 'object'
    ]),

    isAgentErrorRecoveryStartedEvent: createTypeGuard<IAgentErrorRecoveryStartedEvent>([
        hasBaseAgentEventProperties,
        (value: unknown): boolean => (value as IAgentErrorRecoveryStartedEvent).type === AGENT_EVENT_TYPE.AGENT_ERROR_RECOVERY_STARTED,
        (value: unknown): boolean => typeof (value as IAgentErrorRecoveryStartedEvent).error === 'object',
        (value: unknown): boolean => typeof (value as IAgentErrorRecoveryStartedEvent).context === 'object'
    ]),

    isAgentErrorRecoveryCompletedEvent: createTypeGuard<IAgentErrorRecoveryCompletedEvent>([
        hasBaseAgentEventProperties,
        (value: unknown): boolean => (value as IAgentErrorRecoveryCompletedEvent).type === AGENT_EVENT_TYPE.AGENT_ERROR_RECOVERY_COMPLETED,
        (value: unknown): boolean => typeof (value as IAgentErrorRecoveryCompletedEvent).error === 'object',
        (value: unknown): boolean => typeof (value as IAgentErrorRecoveryCompletedEvent).context === 'object'
    ]),

    isAgentErrorRecoveryFailedEvent: createTypeGuard<IAgentErrorRecoveryFailedEvent>([
        hasBaseAgentEventProperties,
        (value: unknown): boolean => (value as IAgentErrorRecoveryFailedEvent).type === AGENT_EVENT_TYPE.AGENT_ERROR_RECOVERY_FAILED,
        (value: unknown): boolean => typeof (value as IAgentErrorRecoveryFailedEvent).error === 'object',
        (value: unknown): boolean => typeof (value as IAgentErrorRecoveryFailedEvent).context === 'object'
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
    isValid: boolean = true,
    validatorName: string = 'AgentEventValidator',
    eventType: AGENT_EVENT_TYPE,
    metadata: IAgentEventMetadata
): IAgentEventValidationResult => ({
    ...createValidationResult(isValid, validatorName),
    eventType,
    metadata: {
        ...metadata,
        timestamp: Date.now(),
        duration: 0,
        validatorName
    }
});
