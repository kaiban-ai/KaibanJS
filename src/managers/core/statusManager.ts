/**
 * @file statusManager.ts
 * @path src/managers/core/statusManager.ts
 * @description Core status management implementation for centralized state transitions
 */

import CoreManager from './coreManager';
import { StatusValidator } from './statusValidator';
import { MetadataFactory } from '../../utils/factories/metadataFactory';
import { KaibanError, IErrorType, IErrorKind } from '../../types/common/commonErrorTypes';

import type { 
    IStatusTransitionContext,
    IStatusChangeEvent,
    IStatusChangeCallback,
    IStatusManagerConfig,
    IStatusEntity,
    IStatusType,
    IStatusError,
    IStatusErrorType
} from '../../types/common/commonStatusTypes';

import type { IStatusValidationResult } from '../../types/common/commonValidationTypes';
import type { IHandlerResult } from '../../types/common/commonHandlerTypes';

import { 
    AGENT_STATUS_enum,
    MESSAGE_STATUS_enum,
    TASK_STATUS_enum,
    WORKFLOW_STATUS_enum
} from '../../types/common/commonEnums';

// Mapping of StatusErrorType to ErrorKind
const STATUS_ERROR_KIND_MAP: Record<IStatusErrorType, IErrorKind> = {
    'INVALID_TRANSITION': 'ValidationError',
    'VALIDATION_FAILED': 'ValidationError',
    'TIMEOUT': 'SystemError',
    'CONCURRENT_TRANSITION': 'SystemError',
    'INVALID_STATE': 'ValidationError'
};

/**
 * Core status management implementation
 */
export class StatusManager extends CoreManager {
    private static instance: StatusManager;
    private readonly validator: StatusValidator;
    private readonly subscribers: Map<string, Set<IStatusChangeCallback>>;
    private readonly history: IStatusChangeEvent[];
    private readonly config: Required<IStatusManagerConfig>;

    private constructor(config: IStatusManagerConfig) {
        super();
        if (!config.entity) {
            throw new KaibanError({
                message: 'StatusManager requires an entity type',
                type: 'ValidationError',
                context: { config }
            });
        }

        this.validator = StatusValidator.getInstance();
        this.subscribers = new Map();
        this.history = [];
        this.config = {
            entity: config.entity,
            initialStatus: config.initialStatus || this.getDefaultInitialStatus(config.entity),
            transitions: config.transitions || [],
            onChange: config.onChange || (() => {}),
            enableHistory: config.enableHistory ?? true,
            maxHistoryLength: config.maxHistoryLength ?? 1000,
            validationTimeout: config.validationTimeout ?? 5000,
            allowConcurrentTransitions: config.allowConcurrentTransitions ?? false
        };

        // Register self as a domain manager
        this.registerDomainManager('StatusManager', this);
    }

    public static getInstance(config?: IStatusManagerConfig): StatusManager {
        if (!StatusManager.instance) {
            if (!config) {
                throw new KaibanError({
                    message: 'Initial configuration is required for StatusManager',
                    type: 'ConfigurationError'
                });
            }
            StatusManager.instance = new StatusManager(config);
        }
        return StatusManager.instance;
    }

    public async transition(context: IStatusTransitionContext): Promise<boolean> {
        const result = await this.safeExecute(async () => {
            this.validateTransitionContext(context);

            const validationResult = await this.validateTransition(context);
            if (!validationResult.isValid) {
                throw new KaibanError({
                    message: validationResult.errors?.join(', ') || 'Invalid status transition',
                    type: 'ValidationError',
                    context: {
                        entity: context.entity,
                        entityId: context.entityId,
                        transition: `${context.currentStatus} -> ${context.targetStatus}`
                    },
                    recommendedAction: 'Check transition rules and validation requirements'
                });
            }

            const event: IStatusChangeEvent = {
                timestamp: Date.now(),
                entity: context.entity,
                entityId: context.entityId,
                from: context.currentStatus,
                to: context.targetStatus,
                metadata: context.metadata
            };

            if (this.config.enableHistory) {
                this.recordHistoryEntry(event);
            }

            await this.notifySubscribers(context.entity, event);
            this.config.onChange(event);

            return true;
        }, 'Status transition');

        return result.success && result.data === true;
    }

    public async validateTransition(context: IStatusTransitionContext): Promise<IStatusValidationResult> {
        const result = await this.safeExecute(async () => {
            const timeoutPromise = new Promise<IStatusValidationResult>((_, reject) => {
                setTimeout(() => {
                    reject(new KaibanError({
                        message: 'Validation timeout',
                        type: 'SystemError',
                        context: {
                            entity: context.entity,
                            entityId: context.entityId,
                            transition: `${context.currentStatus} -> ${context.targetStatus}`,
                            timeout: this.config.validationTimeout
                        }
                    }));
                }, this.config.validationTimeout);
            });

            const validationPromise = this.validator.validateTransition(context);
            return await Promise.race([validationPromise, timeoutPromise]);
        }, 'Validate transition');

        if (!result.success) {
            return {
                isValid: false,
                errors: [result.error?.message || 'Validation failed']
            };
        }

        return result.data || {
            isValid: false,
            errors: ['Validation result was undefined']
        };
    }

    public subscribe(entity: IStatusEntity, callback: IStatusChangeCallback): () => void {
        const subscribers = this.subscribers.get(entity) || new Set();
        subscribers.add(callback);
        this.subscribers.set(entity, subscribers);

        return () => {
            const subs = this.subscribers.get(entity);
            if (subs) {
                subs.delete(callback);
                if (subs.size === 0) {
                    this.subscribers.delete(entity);
                }
            }
        };
    }

    public getHistory(): IStatusChangeEvent[] {
        return [...this.history];
    }

    public clearHistory(): void {
        this.history.length = 0;
    }

    private validateTransitionContext(context: IStatusTransitionContext): void {
        if (!context.entityId) {
            throw new KaibanError({
                message: `EntityId is required for ${context.entity} status transition`,
                type: 'ValidationError',
                context: {
                    entity: context.entity,
                    providedContext: context
                }
            });
        }
    }

    private getDefaultInitialStatus(entity: IStatusEntity): IStatusType {
        const defaultStatuses: Record<IStatusEntity, IStatusType> = {
            'agent': 'INITIAL',
            'message': 'INITIAL',
            'task': 'PENDING',
            'workflow': 'INITIAL'
        };
        return defaultStatuses[entity];
    }

    private async notifySubscribers(entity: IStatusEntity, event: IStatusChangeEvent): Promise<void> {
        const subscribers = this.subscribers.get(entity);
        if (!subscribers) return;

        const notifications = Array.from(subscribers).map(async callback => {
            try {
                await callback(event);
            } catch (error) {
                this.handleError(
                    error instanceof Error ? error : new Error(String(error)),
                    'Error in status change callback'
                );
            }
        });

        await Promise.all(notifications);
    }

    private recordHistoryEntry(event: IStatusChangeEvent): void {
        this.history.push(event);
        if (this.history.length > this.config.maxHistoryLength) {
            this.history.shift();
        }
    }
}

export default StatusManager.getInstance();
