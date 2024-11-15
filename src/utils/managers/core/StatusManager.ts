/**
 * @file StatusManager.ts
 * @path src/managers/core/status/StatusManager.ts
 * @description Core status management implementation centralizing status transitions and validation
 */

import { ErrorManager } from './ErrorManager';
import { LogManager } from './LogManager';
import { transitionRules } from './TransitionRules';
import { StatusValidator } from './StatusValidator';
import { EnumTypeGuards } from '../../types/common/enums';
import { toErrorType } from '../../types/common/errors';

// Import types from canonical locations
import type { 
    StatusTransitionContext,
    StatusChangeEvent,
    StatusChangeCallback,
    StatusManagerConfig,
    StatusValidationResult,
    StatusEntity,
    StatusType,
    StatusError,
    StatusErrorType
} from '../../types/common/status';

import type { 
    ErrorType,
    ErrorKind
} from '../../types/common/errors';

import { 
    AGENT_STATUS_enum,
    MESSAGE_STATUS_enum,
    TASK_STATUS_enum,
    WORKFLOW_STATUS_enum
} from '../../types/common/enums';

// Mapping of StatusErrorType to ErrorKind
const STATUS_ERROR_KIND_MAP: Record<StatusErrorType, ErrorKind> = {
    'INVALID_TRANSITION': 'ValidationError',
    'VALIDATION_FAILED': 'ValidationError',
    'TIMEOUT': 'SystemError',
    'CONCURRENT_TRANSITION': 'SystemError',
    'INVALID_STATE': 'ValidationError'
};

/**
 * Core status management class
 */
export class StatusManager {
    private static instance: StatusManager;
    private readonly validator: StatusValidator;
    private readonly subscribers: Map<string, Set<StatusChangeCallback>>;
    private readonly history: StatusChangeEvent[];
    private readonly config: Required<StatusManagerConfig>;
    private readonly errorManager: ErrorManager;
    private readonly logManager: LogManager;

    private constructor(config: StatusManagerConfig) {
        if (!config.entity) {
            throw new Error('StatusManager requires an entity type');
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
        this.errorManager = ErrorManager.getInstance();
        this.logManager = LogManager.getInstance();
    }

    /**
     * Get singleton instance
     */
    public static getInstance(config?: StatusManagerConfig): StatusManager {
        if (!StatusManager.instance) {
            if (!config) {
                throw new Error('Initial configuration is required for StatusManager');
            }
            StatusManager.instance = new StatusManager(config);
        }
        return StatusManager.instance;
    }

    /**
     * Get default initial status for an entity
     */
    private getDefaultInitialStatus(entity: StatusEntity): StatusType {
        const defaultStatuses: Record<StatusEntity, StatusType> = {
            'agent': 'INITIAL',
            'message': 'INITIAL',
            'task': 'PENDING',
            'workflow': 'INITIAL'
        };
        return defaultStatuses[entity];
    }

    /**
     * Handle status transition with validation
     */
    public async transition(context: StatusTransitionContext): Promise<boolean> {
        try {
            const validationResult = await this.validateTransition(context);
            if (!validationResult.isValid) {
                // Create a status error with precise typing
                const statusError: StatusError = {
                    type: 'VALIDATION_FAILED',
                    message: validationResult.errors?.join(', ') || 'Invalid status transition',
                    context: context,
                    metadata: {
                        from: context.currentStatus,
                        to: context.targetStatus
                    }
                };

                // Convert StatusError to ErrorType
                const errorType: ErrorType = {
                    name: 'StatusTransitionError',
                    message: statusError.message,
                    type: STATUS_ERROR_KIND_MAP[statusError.type],
                    context: {
                        entity: context.entity,
                        entityId: context.entityId,
                        transition: `${context.currentStatus} -> ${context.targetStatus}`
                    },
                    metadata: statusError.metadata
                };

                await this.errorManager.handleError({
                    error: errorType,
                    context: errorType.context || {}
                });

                this.logManager.error(
                    `Status transition failed: ${context.currentStatus} -> ${context.targetStatus}`, 
                    null, 
                    context.entityId || 'unknown'
                );

                return false;
            }

            const event: StatusChangeEvent = {
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

            this.logManager.debug(
                `Status transition successful: ${context.currentStatus} -> ${context.targetStatus}`,
                null,
                context.entityId || 'unknown'
            );
            return true;

        } catch (error) {
            await this.handleTransitionError(error, context);
            return false;
        }
    }

    /**
     * Public method to validate status transition
     * Wraps the private validateTransition method to provide a public interface
     */
    public async publicValidateTransition(context: StatusTransitionContext): Promise<StatusValidationResult> {
        try {
            return await this.validateTransition(context);
        } catch (error) {
            return {
                isValid: false,
                errors: [(error as Error).message]
            };
        }
    }

    /**
     * Subscribe to status changes for an entity
     */
    public subscribe(entity: StatusEntity, callback: StatusChangeCallback): () => void {
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

    /**
     * Get status history
     */
    public getHistory(): StatusChangeEvent[] {
        return [...this.history];
    }

    /**
     * Clear status history
     */
    public clearHistory(): void {
        this.history.length = 0;
    }

    /**
     * Validate status transition
     */
    private async validateTransition(context: StatusTransitionContext): Promise<StatusValidationResult> {
        try {
            const timeoutPromise = new Promise<StatusValidationResult>((_, reject) => {
                setTimeout(() => reject(new Error('Validation timeout')), this.config.validationTimeout);
            });

            const validationPromise = this.validator.validateTransition(context);
            return await Promise.race([validationPromise, timeoutPromise]);

        } catch (error) {
            return {
                isValid: false,
                errors: [(error as Error).message]
            };
        }
    }

    /**
     * Notify subscribers of status change
     */
    private async notifySubscribers(entity: StatusEntity, event: StatusChangeEvent): Promise<void> {
        const subscribers = this.subscribers.get(entity);
        if (!subscribers) return;

        const notifications = Array.from(subscribers).map(async callback => {
            try {
                await callback(event);
            } catch (error) {
                // Handle callback errors using ErrorManager
                await this.errorManager.handleError({
                    error: toErrorType(error),
                    context: { message: 'Error in status change callback' }
                });
            }
        });

        await Promise.all(notifications);
    }

    /**
     * Record status change in history
     */
    private recordHistoryEntry(event: StatusChangeEvent): void {
        this.history.push(event);
        if (this.history.length > this.config.maxHistoryLength) {
            this.history.shift();
        }
    }

    /**
     * Handle transition error
     */
    private async handleTransitionError(error: unknown, context: StatusTransitionContext): Promise<void> {
        const statusError: StatusError = {
            type: 'INVALID_TRANSITION',
            message: error instanceof Error ? error.message : String(error),
            context: context,
            metadata: {
                from: context.currentStatus,
                to: context.targetStatus
            }
        };

        // Convert StatusError to ErrorType
        const errorType: ErrorType = {
            name: 'StatusTransitionError',
            message: statusError.message,
            type: STATUS_ERROR_KIND_MAP[statusError.type],
            context: {
                entity: context.entity,
                entityId: context.entityId,
                transition: `${context.currentStatus} -> ${context.targetStatus}`
            },
            metadata: statusError.metadata
        };

        await this.errorManager.handleError({
            error: errorType,
            context: errorType.context || {}
        });
    }

    /**
     * Check if status is valid for entity
     */
    public isValidStatus(status: string, entity: StatusEntity): boolean {
        return EnumTypeGuards.isValidStatusForEntity(status, entity);
    }

    /**
     * Get available transitions for status
     */
    public getAvailableTransitions(status: StatusType, entity: StatusEntity): StatusType[] {
        const rules = transitionRules.get(entity);
        if (!rules) return [];

        return rules
            .filter(rule => 
                (Array.isArray(rule.from) ? rule.from.includes(status) : rule.from === status))
            .flatMap(rule => 
                Array.isArray(rule.to) ? rule.to : [rule.to]
            );
    }
}

export default StatusManager.getInstance();
