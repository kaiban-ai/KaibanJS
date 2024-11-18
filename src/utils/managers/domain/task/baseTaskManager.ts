/**
 * @file baseTaskManager.ts
 * @path src/utils/managers/domain/task/baseTaskManager.ts
 * @description Base task management implementation providing core task functionality and manager orchestration
 *
 * @module @managers/domain/task
 */

import CoreManager from '../../core/coreManager';
import type { 
    TaskType,
    TaskValidationResult,
    TaskValidationParams,
    HandlerResult,
    TaskStats
} from '@/utils/types/task';

import type { 
    ValidationConfig,
    ValidationRule 
} from '@/utils/types/common/validation';

import type { StatusTransitionContext } from '@/utils/types/common/status';
import { TASK_STATUS_enum } from '@/utils/types/common/enums';

/**
 * Base task management implementation
 */
export abstract class BaseTaskManager extends CoreManager {
    protected readonly activeTasks: Map<string, TaskType>;
    protected readonly validationRules: Map<string, ValidationRule[]>;
    protected readonly taskTimeouts: Map<string, NodeJS.Timeout>;

    protected constructor() {
        super();
        this.activeTasks = new Map();
        this.validationRules = new Map();
        this.taskTimeouts = new Map();
        this.registerDomainManager('BaseTaskManager', this);
    }

    // ─── Required Abstract Methods ──────────────────────────────────────────────────

    /**
     * Validate task configuration and properties
     */
    protected abstract validateTask(task: TaskType): Promise<TaskValidationResult>;

    /**
     * Initialize task resources and dependencies
     */
    protected abstract initializeTask(task: TaskType): Promise<void>;

    /**
     * Clean up task resources
     */
    protected abstract cleanupTask(taskId: string): Promise<void>;

    // ─── Protected Registry Methods ─────────────────────────────────────────────────

    /**
     * Register task with the manager registry
     */
    protected async registerTask(task: TaskType): Promise<HandlerResult> {
        return await this.safeExecute(async () => {
            const validation = await this.validateTask(task);
            if (!validation.isValid) {
                throw new Error(validation.errors.join(', '));
            }

            await this.initializeTask(task);
            this.activeTasks.set(task.id, task);

            await this.handleStatusTransition({
                currentStatus: task.status,
                targetStatus: TASK_STATUS_enum.TODO,
                entity: 'task',
                entityId: task.id,
                metadata: this.prepareMetadata({ task })
            });

            this.logManager.info(`Task registered: ${task.id}`);

            return {
                success: true,
                data: {
                    taskId: task.id,
                    timestamp: Date.now()
                }
            };

        }, `Failed to register task ${task.id}`);
    }

    /**
     * Unregister task from the registry
     */
    protected async unregisterTask(taskId: string): Promise<HandlerResult> {
        return await this.safeExecute(async () => {
            const task = this.activeTasks.get(taskId);
            if (!task) {
                throw new Error(`Task not found: ${taskId}`);
            }

            await this.cleanupTask(taskId);
            
            await this.handleStatusTransition({
                currentStatus: task.status,
                targetStatus: TASK_STATUS_enum.PENDING,
                entity: 'task',
                entityId: taskId,
                metadata: {
                    reason: 'unregistered',
                    timestamp: Date.now()
                }
            });

            this.activeTasks.delete(taskId);

            return {
                success: true,
                data: {
                    taskId,
                    timestamp: Date.now()
                }
            };

        }, `Failed to unregister task ${taskId}`);
    }

    // ─── Resource Management Methods ──────────────────────────────────────────────

    /**
     * Add validation rule for task type
     */
    protected addValidationRule(taskType: string, rule: ValidationRule): void {
        const rules = this.validationRules.get(taskType) || [];
        rules.push(rule);
        this.validationRules.set(taskType, rules);
    }

    /**
     * Remove validation rule
     */
    protected removeValidationRule(taskType: string, ruleId: string): void {
        const rules = this.validationRules.get(taskType);
        if (rules) {
            const filtered = rules.filter(rule => rule.id !== ruleId);
            this.validationRules.set(taskType, filtered);
        }
    }

    /**
     * Set up task timeout
     */
    protected setupTaskTimeout(taskId: string, timeout: number = 300000): NodeJS.Timeout {
        const timeoutTimer = setTimeout(() => {
            this.handleTaskTimeout(taskId);
        }, timeout);

        this.taskTimeouts.set(taskId, timeoutTimer);
        return timeoutTimer;
    }

    /**
     * Clear task timeout
     */
    protected clearTaskTimeout(taskId: string): void {
        const timeout = this.taskTimeouts.get(taskId);
        if (timeout) {
            clearTimeout(timeout);
            this.taskTimeouts.delete(taskId);
        }
    }

    // ─── Protected Helper Methods ───────────────────────────────────────────────

    /**
     * Handle task timeout
     */
    protected async handleTaskTimeout(taskId: string): Promise<void> {
        const task = this.activeTasks.get(taskId);
        if (!task) return;

        await this.handleStatusTransition({
            currentStatus: task.status,
            targetStatus: TASK_STATUS_enum.ERROR,
            entity: 'task',
            entityId: taskId,
            metadata: {
                error: 'Task execution timeout',
                timeout: 300000
            }
        });

        this.cleanupTask(taskId);
    }

    /**
     * Update task status
     */
    protected async updateTaskStatus(context: StatusTransitionContext): Promise<void> {
        await this.statusManager.transition(context);
    }

    // ─── Public API Methods ──────────────────────────────────────────────────────

    /**
     * Get active task count
     */
    public getActiveTaskCount(): number {
        return this.activeTasks.size;
    }

    /**
     * Get task by id
     */
    public getTask(taskId: string): TaskType | undefined {
        return this.activeTasks.get(taskId);
    }

    /**
     * Get all active tasks
     */
    public getActiveTasks(): TaskType[] {
        return Array.from(this.activeTasks.values());
    }

    /**
     * Get task stats
     */
    public async getTaskStats(taskId: string): Promise<HandlerResult<TaskStats>> {
        return await this.safeExecute(async () => {
            const task = this.activeTasks.get(taskId);
            if (!task) {
                throw new Error(`Task not found: ${taskId}`);
            }

            const resourceManager = this.getDomainManager('ResourceManager');
            const stats = await resourceManager.getTaskStats(task);

            return {
                success: true,
                data: stats
            };
        }, `Failed to get task stats for ${taskId}`);
    }
}

export default BaseTaskManager;