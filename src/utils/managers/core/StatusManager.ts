/**
 * @file StatusManager.ts
 * @path KaibanJS/src/managers/core/status/StatusManager.ts
 * @description Core status management implementation centralizing status transitions and validation
 */

import { CoreManager } from './CoreManager';
import { LogManager } from './LogManager';
import { ErrorManager } from './ErrorManager';
import { transitionRules } from './TransitionRules';
import { StatusValidator } from './StatusValidator';

// Import types from canonical locations
import type { 
    StatusTransitionContext,
    StatusChangeEvent,
    StatusChangeCallback,
    StatusManagerConfig,
    StatusValidationResult,
    StatusEntity,
    StatusType
} from '../../types/common/status';

import { ErrorType, toErrorType } from '../../types/common/errors';
import type { TaskType, AgentType } from '../../types';

/**
 * Core status management class
 */
export class StatusManager extends CoreManager {
    private static instance: StatusManager;
    private readonly validator: StatusValidator;
    private readonly subscribers: Map<string, Set<StatusChangeCallback>>;
    private readonly history: StatusChangeEvent[];
    private readonly config: Required<StatusManagerConfig>;
    protected readonly logManagerInstance: LogManager;
    protected readonly errorManagerInstance: ErrorManager;

    private constructor(config: StatusManagerConfig = { entity: 'task', transitions: [] }) {
        super();
        this.validator = new StatusValidator();
        this.subscribers = new Map();
        this.history = [];
        this.config = {
            entity: config.entity,
            initialStatus: config.initialStatus || 'PENDING',
            transitions: config.transitions,
            onChange: config.onChange || (() => {}),
            enableHistory: config.enableHistory ?? true,
            maxHistoryLength: config.maxHistoryLength ?? 1000,
            validationTimeout: config.validationTimeout ?? 5000,
            allowConcurrentTransitions: config.allowConcurrentTransitions ?? false
        };
        this.logManagerInstance = LogManager.getInstance();
        this.errorManagerInstance = ErrorManager.getInstance();
    }

    /**
     * Get singleton instance
     */
    public static getInstance(config?: StatusManagerConfig): StatusManager {
        if (!StatusManager.instance) {
            StatusManager.instance = new StatusManager(config);
        }
        return StatusManager.instance;
    }

    /**
     * Handle status transition with validation
     */
    public async transition(context: StatusTransitionContext): Promise<boolean> {
        try {
            const validationResult = await this.validateTransition(context);
            if (!validationResult.isValid) {
                const error = toErrorType(new Error(`Invalid status transition: ${validationResult.errors?.join(', ')}`));
                error.type = 'ValidationError';

                await this.errorManagerInstance.handleAgentError({
                    error,
                    context: {
                        from: context.currentStatus,
                        to: context.targetStatus,
                        entity: context.entity
                    },
                    task: context.task,
                    agent: context.agent,
                    store: {
                        getState: () => ({}),
                        prepareNewLog: this.logManagerInstance.prepareNewLog.bind(this.logManagerInstance),
                        setState: (stateUpdate) => this.logManagerInstance.setState(stateUpdate)
                    }
                });
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
            this.logManagerInstance.debug(
                `Status transition successful: ${context.currentStatus} -> ${context.targetStatus}`,
                null,
                context.entityId
            );
            return true;

        } catch (error) {
            this.handleTransitionError(error, context);
            return false;
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

        const notifications = Array.from(subscribers).map(callback => {
            try {
                return Promise.resolve(callback(event));
            } catch (error) {
                this.logManagerInstance.error(
                    'Error in status change callback:',
                    null,
                    event.entityId,
                    error instanceof Error ? error : new Error(String(error))
                );
                return Promise.resolve();
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
    private handleTransitionError(error: unknown, context: StatusTransitionContext): void {
        const errorContext = {
            from: context.currentStatus,
            to: context.targetStatus,
            entity: context.entity,
            entityId: context.entityId
        };

        const errorType = toErrorType(error);

        this.errorManagerInstance.handleAgentError({
            error: errorType,
            context: errorContext,
            task: context.task,
            agent: context.agent,
            store: {
                getState: () => ({}),
                prepareNewLog: this.logManagerInstance.prepareNewLog.bind(this.logManagerInstance),
                setState: (stateUpdate) => this.logManagerInstance.setState(stateUpdate)
            }
        });
    }

    /**
     * Check if status is valid for entity
     */
    public isValidStatus(status: string, entity: StatusEntity): boolean {
        return this.validator.isValidStatus(status, entity);
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
