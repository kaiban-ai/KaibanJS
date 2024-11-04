/**
 * @file statusManager.ts
 * @path src/utils/managers/statusManager.ts
 * @description Centralized status management implementation
 */

import { logger } from '../core/logger';
import { AGENT_STATUS_enum, TASK_STATUS_enum, WORKFLOW_STATUS_enum } from '@/utils/types/common/enums';
import { PrettyError } from '../core/errors';

/**
 * Status entity types
 */
type StatusEntity = 'agent' | 'task' | 'workflow';

/**
 * Combined status types
 */
type StatusType = 
    | keyof typeof AGENT_STATUS_enum 
    | keyof typeof TASK_STATUS_enum 
    | keyof typeof WORKFLOW_STATUS_enum;

/**
 * Status history entry
 */
interface StatusHistoryEntry {
    timestamp: number;
    from: StatusType;
    to: StatusType;
    entity: StatusEntity;
    entityId: string;
    metadata?: Record<string, unknown>;
}

/**
 * Status change event
 */
interface StatusChangeEvent {
    timestamp: number;
    entity: StatusEntity;
    entityId: string;
    previousStatus: StatusType;
    newStatus: StatusType;
    metadata?: Record<string, unknown>;
}

/**
 * Status transition validation context
 */
interface StatusTransitionContext {
    currentStatus: StatusType;
    targetStatus: StatusType;
    entity: StatusEntity;
    entityId: string;
    metadata?: Record<string, unknown>;
}

/**
 * Status transition rule
 */
interface StatusTransitionRule {
    from: StatusType | StatusType[];
    to: StatusType | StatusType[];
    validation?: (context: StatusTransitionContext) => boolean | Promise<boolean>;
    sideEffects?: (context: StatusTransitionContext) => Promise<void>;
}

/**
 * Status change callback type
 */
type StatusChangeCallback = (event: StatusChangeEvent) => void | Promise<void>;

/**
 * Status manager configuration
 */
interface StatusManagerConfig {
    enableHistory?: boolean;
    maxHistoryLength?: number;
    validationTimeout?: number;
    allowConcurrentTransitions?: boolean;
}

/**
 * Status Manager Implementation
 */
export class StatusManager {
    private static instance: StatusManager;
    private transitionRules: Map<StatusEntity, StatusTransitionRule[]> = new Map();
    private statusHistory: Map<string, StatusHistoryEntry[]> = new Map();
    private statusSubscribers: Set<StatusChangeCallback> = new Set();
    private activeTransitions: Set<string> = new Set();
    private config: Required<StatusManagerConfig>;

    private static readonly DEFAULT_CONFIG: Required<StatusManagerConfig> = {
        enableHistory: true,
        maxHistoryLength: 1000,
        validationTimeout: 5000,
        allowConcurrentTransitions: false
    };

    /**
     * Private constructor for singleton pattern
     */
    private constructor(config: StatusManagerConfig = {}) {
        this.config = { ...StatusManager.DEFAULT_CONFIG, ...config };
        this.initializeTransitionRules();
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
     * Initialize status transition rules
     */
    private initializeTransitionRules(): void {
        // Agent status transitions
        this.transitionRules.set('agent', [
            {
                from: 'INITIAL',
                to: ['THINKING', 'IDLE'],
                validation: this.validateAgentTransition.bind(this)
            },
            {
                from: 'THINKING',
                to: ['THINKING_END', 'THINKING_ERROR'],
                validation: this.validateAgentTransition.bind(this)
            },
            // Add more agent transitions as needed
        ]);

        // Task status transitions
        this.transitionRules.set('task', [
            {
                from: 'TODO',
                to: 'DOING',
                validation: this.validateTaskTransition.bind(this)
            },
            {
                from: 'DOING',
                to: ['DONE', 'ERROR', 'BLOCKED'],
                validation: this.validateTaskTransition.bind(this)
            },
            // Add more task transitions as needed
        ]);

        // Workflow status transitions
        this.transitionRules.set('workflow', [
            {
                from: 'INITIAL',
                to: 'RUNNING',
                validation: this.validateWorkflowTransition.bind(this)
            },
            {
                from: 'RUNNING',
                to: ['FINISHED', 'ERRORED', 'BLOCKED'],
                validation: this.validateWorkflowTransition.bind(this)
            },
            // Add more workflow transitions as needed
        ]);
    }

    /**
     * Check if a status transition is valid
     */
    public async canTransition(context: StatusTransitionContext): Promise<boolean> {
        const rules = this.transitionRules.get(context.entity);
        if (!rules) {
            return false;
        }

        const applicableRules = rules.filter(rule => {
            const validFromStatus = Array.isArray(rule.from) 
                ? rule.from.includes(context.currentStatus)
                : rule.from === context.currentStatus;
            
            const validToStatus = Array.isArray(rule.to)
                ? rule.to.includes(context.targetStatus)
                : rule.to === context.targetStatus;

            return validFromStatus && validToStatus;
        });

        if (applicableRules.length === 0) {
            return false;
        }

        // Check all validation rules
        try {
            const validationResults = await Promise.all(
                applicableRules.map(async rule => {
                    if (!rule.validation) return true;
                    
                    const validationPromise = Promise.resolve(rule.validation(context));
                    const timeoutPromise = new Promise<boolean>((_, reject) => {
                        setTimeout(() => reject(new Error('Validation timeout')), this.config.validationTimeout);
                    });

                    return Promise.race([validationPromise, timeoutPromise]);
                })
            );

            return validationResults.every(result => result === true);
        } catch (error) {
            logger.error('Error validating status transition:', error);
            return false;
        }
    }

    /**
     * Execute a status transition
     */
    public async transition(context: StatusTransitionContext): Promise<void> {
        const transitionKey = `${context.entity}:${context.entityId}`;

        if (!this.config.allowConcurrentTransitions && this.activeTransitions.has(transitionKey)) {
            throw new PrettyError({
                message: 'Concurrent status transition attempted',
                context: {
                    entity: context.entity,
                    entityId: context.entityId,
                    currentStatus: context.currentStatus,
                    targetStatus: context.targetStatus
                }
            });
        }

        try {
            this.activeTransitions.add(transitionKey);

            // Validate transition
            const isValid = await this.canTransition(context);
            if (!isValid) {
                throw new PrettyError({
                    message: 'Invalid status transition',
                    context: {
                        entity: context.entity,
                        entityId: context.entityId,
                        from: context.currentStatus,
                        to: context.targetStatus
                    }
                });
            }

            // Execute transition side effects
            const rules = this.transitionRules.get(context.entity);
            if (rules) {
                const applicableRules = rules.filter(rule => {
                    const validFromStatus = Array.isArray(rule.from)
                        ? rule.from.includes(context.currentStatus)
                        : rule.from === context.currentStatus;
                    
                    const validToStatus = Array.isArray(rule.to)
                        ? rule.to.includes(context.targetStatus)
                        : rule.to === context.targetStatus;

                    return validFromStatus && validToStatus;
                });

                for (const rule of applicableRules) {
                    if (rule.sideEffects) {
                        await rule.sideEffects(context);
                    }
                }
            }

            // Record history
            if (this.config.enableHistory) {
                this.recordStatusChange({
                    timestamp: Date.now(),
                    from: context.currentStatus,
                    to: context.targetStatus,
                    entity: context.entity,
                    entityId: context.entityId,
                    metadata: context.metadata
                });
            }

            // Notify subscribers
            await this.notifyStatusChange({
                timestamp: Date.now(),
                entity: context.entity,
                entityId: context.entityId,
                previousStatus: context.currentStatus,
                newStatus: context.targetStatus,
                metadata: context.metadata
            });

            logger.info(`Status transition successful: ${context.entity} ${context.entityId} ${context.currentStatus} -> ${context.targetStatus}`);

        } finally {
            this.activeTransitions.delete(transitionKey);
        }
    }

    /**
     * Subscribe to status changes
     */
    public subscribeToStatusChanges(callback: StatusChangeCallback): () => void {
        this.statusSubscribers.add(callback);
        return () => {
            this.statusSubscribers.delete(callback);
        };
    }

    /**
     * Get status history for an entity
     */
    public getStatusHistory(entityId: string): StatusHistoryEntry[] {
        return this.statusHistory.get(entityId) || [];
    }

    /**
     * Clear status history
     */
    public clearStatusHistory(entityId?: string): void {
        if (entityId) {
            this.statusHistory.delete(entityId);
        } else {
            this.statusHistory.clear();
        }
    }

    /**
     * Record a status change in history
     */
    private recordStatusChange(entry: StatusHistoryEntry): void {
        const history = this.statusHistory.get(entry.entityId) || [];
        history.push(entry);

        if (history.length > this.config.maxHistoryLength) {
            history.splice(0, history.length - this.config.maxHistoryLength);
        }

        this.statusHistory.set(entry.entityId, history);
    }

    /**
     * Notify subscribers of status change
     */
    private async notifyStatusChange(event: StatusChangeEvent): Promise<void> {
        const notifications = Array.from(this.statusSubscribers).map(callback => {
            try {
                return Promise.resolve(callback(event));
            } catch (error) {
                logger.error('Error in status change callback:', error);
                return Promise.resolve();
            }
        });

        await Promise.all(notifications);
    }

    /**
     * Validate agent transition
     */
    private async validateAgentTransition(context: StatusTransitionContext): Promise<boolean> {
        // Add agent-specific validation logic
        return true;
    }

    /**
     * Validate task transition
     */
    private async validateTaskTransition(context: StatusTransitionContext): Promise<boolean> {
        // Add task-specific validation logic
        return true;
    }

    /**
     * Validate workflow transition
     */
    private async validateWorkflowTransition(context: StatusTransitionContext): Promise<boolean> {
        // Add workflow-specific validation logic
        return true;
    }

    /**
     * Get current status counts
     */
    public getStatusCounts(entity: StatusEntity): Record<string, number> {
        const counts: Record<string, number> = {};
        
        for (const [, history] of this.statusHistory.entries()) {
            if (history.length > 0) {
                const lastEntry = history[history.length - 1];
                if (lastEntry.entity === entity) {
                    counts[lastEntry.to] = (counts[lastEntry.to] || 0) + 1;
                }
            }
        }

        return counts;
    }

    /**
     * Export status metrics
     */
    public getStatusMetrics(): Record<string, unknown> {
        return {
            activeTransitions: Array.from(this.activeTransitions),
            historySizes: Array.from(this.statusHistory.entries()).map(([entityId, history]) => ({
                entityId,
                size: history.length
            })),
            subscriberCount: this.statusSubscribers.size,
            agentStatusCounts: this.getStatusCounts('agent'),
            taskStatusCounts: this.getStatusCounts('task'),
            workflowStatusCounts: this.getStatusCounts('workflow')
        };
    }
}

export default StatusManager;