/**
 * @file statusEventEmitter.ts
 * @description Event-driven status management implementation
 */

import { BaseEventEmitterManager } from '../baseEventEmitterManager';
import { MANAGER_CATEGORY_enum } from '../../../types/common/enumTypes';
import { createError, ERROR_KINDS } from '../../../types/common/errorTypes';
import { MetricsManager } from '../metricsManager';
import { StatusValidator } from '../statusValidator';
import { MetricDomain, MetricType } from '../../../types/metrics';
import { createBaseMetadata } from '../../../types/common/baseTypes';
import { TransitionUtils } from '../transitionRules';
import { createValidationResult } from '../../../types/common/validationTypes';

import type {
    IStatusChangeEvent,
    IStatusTransitionContext
} from '../../../types/common/statusTypes';
import type { IEventHandler, IBaseEvent } from '../../../types/common/baseTypes';
import type { IMetricEvent } from '../../../types/metrics';
import type { IValidationResult } from '../../../types/common/validationTypes';

interface IStatusTransitionEvent extends IBaseEvent {
    context: IStatusTransitionContext;
}

interface IStatusErrorEvent extends IBaseEvent {
    error: Error;
}

export class StatusEventEmitter extends BaseEventEmitterManager {
    private static instance: StatusEventEmitter;
    protected readonly metricsManager: MetricsManager;
    private readonly validator: StatusValidator;

    public readonly category: MANAGER_CATEGORY_enum = MANAGER_CATEGORY_enum.CORE;

    private constructor() {
        super();
        this.metricsManager = MetricsManager.getInstance();
        this.validator = StatusValidator.getInstance();
        this.registerDomainManager('StatusEventEmitter', this);
        this.setupEventHandlers();
    }

    public static getInstance(): StatusEventEmitter {
        if (!StatusEventEmitter.instance) {
            StatusEventEmitter.instance = new StatusEventEmitter();
        }
        return StatusEventEmitter.instance;
    }

    private setupEventHandlers(): void {
        // Pre-transition validation
        const preTransitionHandler: IEventHandler<IStatusTransitionEvent> = {
            handle: async (event: IStatusTransitionEvent) => {
                // First check if transition is allowed
                if (!TransitionUtils.isTransitionAllowed(
                    event.context.entity,
                    event.context.currentStatus,
                    event.context.targetStatus
                )) {
                    const availableTransitions = TransitionUtils.getAvailableTransitions(
                        event.context.entity,
                        event.context.currentStatus
                    );
                    throw createError({
                        message: `Invalid status transition: ${event.context.currentStatus} -> ${event.context.targetStatus}`,
                        type: ERROR_KINDS.ValidationError,
                        context: {
                            entity: event.context.entity,
                            transition: `${event.context.currentStatus} -> ${event.context.targetStatus}`,
                            availableTransitions
                        }
                    });
                }

                // Then validate transition context
                const validationResult = await this.validator.validateTransition(
                    event.context,
                    {
                        ...event.metadata,
                        component: 'StatusEventEmitter',
                        operation: 'validateTransition',
                        validatedFields: ['status', 'transition'],
                        status: 'validating'
                    }
                );
                if (!validationResult.isValid) {
                    throw createError({
                        message: validationResult.errors.join(', '),
                        type: ERROR_KINDS.ValidationError,
                        context: {
                            entity: event.context.entity,
                            transition: `${event.context.currentStatus} -> ${event.context.targetStatus}`
                        }
                    });
                }

                // Track validation metrics
                await this.metricsManager.trackMetric({
                    domain: MetricDomain.WORKFLOW,
                    type: MetricType.PERFORMANCE,
                    value: 1,
                    timestamp: Date.now(),
                    metadata: {
                        component: 'StatusEventEmitter',
                        operation: 'validate',
                        entity: event.context.entity,
                        transition: `${event.context.currentStatus} -> ${event.context.targetStatus}`,
                        result: validationResult
                    }
                });
            },
            validate: async (): Promise<IValidationResult> => {
                const now = Date.now();
                return createValidationResult({
                    isValid: true,
                    metadata: {
                        ...createBaseMetadata('StatusEventEmitter', 'validate'),
                        timestamp: now,
                        duration: 0,
                        validatorName: 'StatusEventEmitter',
                        status: 'success'
                    }
                });
            }
        };
        this.on('status:pre-transition', preTransitionHandler);

        // Track metrics on transition
        const transitionHandler: IEventHandler<IStatusChangeEvent> = {
            handle: async (event: IStatusChangeEvent) => {
                const metricEvent: IMetricEvent = {
                    domain: MetricDomain.WORKFLOW,
                    type: MetricType.PERFORMANCE,
                    value: Date.now() - event.timestamp,
                    timestamp: event.timestamp,
                    metadata: {
                        component: 'StatusEventEmitter',
                        operation: 'transition',
                        entity: event.entity,
                        from: event.from,
                        to: event.to
                    }
                };

                await this.metricsManager.trackMetric(metricEvent);

                // Log transition
                await this.logInfo(`Status transition: ${event.from} -> ${event.to}`, {
                    entity: event.entity,
                    entityId: event.entityId,
                    metadata: event.metadata
                });
            },
            validate: async (): Promise<IValidationResult> => {
                const now = Date.now();
                return createValidationResult({
                    isValid: true,
                    metadata: {
                        ...createBaseMetadata('StatusEventEmitter', 'validate'),
                        timestamp: now,
                        duration: 0,
                        validatorName: 'StatusEventEmitter',
                        status: 'success'
                    }
                });
            }
        };
        this.on('status:transition', transitionHandler);

        // Handle errors
        const errorHandler: IEventHandler<IStatusErrorEvent> = {
            handle: async (event: IStatusErrorEvent) => {
                // Track error metrics
                await this.metricsManager.trackMetric({
                    domain: MetricDomain.WORKFLOW,
                    type: MetricType.ERROR,
                    value: 1,
                    timestamp: Date.now(),
                    metadata: {
                        component: 'StatusEventEmitter',
                        operation: 'error',
                        error: {
                            name: event.error.name,
                            message: event.error.message,
                            stack: event.error.stack
                        }
                    }
                });

                // Log error
                await this.logError('Status transition error', event.error);
            },
            validate: async (): Promise<IValidationResult> => {
                const now = Date.now();
                return createValidationResult({
                    isValid: true,
                    metadata: {
                        ...createBaseMetadata('StatusEventEmitter', 'validate'),
                        timestamp: now,
                        duration: 0,
                        validatorName: 'StatusEventEmitter',
                        status: 'success'
                    }
                });
            }
        };
        this.on('status:error', errorHandler);
    }

    public async emitTransition(context: IStatusTransitionContext): Promise<void> {
        try {
            // Pre-transition phase
            const preTransitionEvent: IStatusTransitionEvent = {
                id: `pre-transition-${Date.now()}`,
                timestamp: Date.now(),
                type: 'status:pre-transition',
                metadata: createBaseMetadata('StatusEventEmitter', 'pre-transition'),
                context
            };
            await this.emit(preTransitionEvent);

            const now = Date.now();
            // Create transition event
            const event: IStatusChangeEvent = {
                id: `${context.entity}-${context.entityId}-${now}`,
                type: 'status-change',
                timestamp: now,
                entity: context.entity,
                entityId: context.entityId,
                from: context.currentStatus,
                to: context.targetStatus,
                metadata: context.metadata,
                validationResult: createValidationResult({
                    isValid: true,
                    metadata: {
                        ...createBaseMetadata('StatusEventEmitter', 'validate'),
                        timestamp: now,
                        duration: 0,
                        validatorName: 'StatusEventEmitter',
                        status: 'success'
                    }
                })
            };

            // Emit transition event
            await this.emit(event);

            // Post-transition phase
            const postTransitionEvent: IStatusChangeEvent = {
                ...event,
                id: `post-transition-${Date.now()}`,
                type: 'status:post-transition'
            };
            await this.emit(postTransitionEvent);
        } catch (error) {
            const errorEvent: IStatusErrorEvent = {
                id: `error-${Date.now()}`,
                timestamp: Date.now(),
                type: 'status:error',
                metadata: createBaseMetadata('StatusEventEmitter', 'error'),
                error: error instanceof Error ? error : new Error(String(error))
            };
            await this.emit(errorEvent);
            throw error;
        }
    }
}

export default StatusEventEmitter.getInstance();
