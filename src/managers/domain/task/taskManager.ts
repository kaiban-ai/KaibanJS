/**
 * @file taskManager.ts
 * @path src/utils/managers/domain/task/taskManager.ts
 * @description Core task management implementation using service registry pattern
 *
 * @module @managers/domain/task
 */

import BaseTaskManager from './baseTaskManager';
import { PrettyError } from '@/utils/core/errors';

// Import types from canonical locations
import type { 
    TaskType,
    TaskStats, 
    TaskValidationResult,
    TaskValidationParams,
    HandlerResult
} from '@/types/task';

import type { AgentType } from '@/utils/types/agent';
import type { LLMUsageStats } from '@/utils/types/llm';
import type { ResourceManager } from './resourceManager';
import type { ValidationManager } from './validationManager';
import { TASK_STATUS_enum } from '@/utils/types/common/enums';

/**
 * Core task management implementation
 */
export class TaskManager extends BaseTaskManager {
    private static instance: TaskManager;

    private constructor() {
        super();
        this.registerDomainManager('TaskManager', this);
    }

    public static getInstance(): TaskManager {
        if (!TaskManager.instance) {
            TaskManager.instance = new TaskManager();
        }
        return TaskManager.instance;
    }

    /**
     * Execute task with comprehensive lifecycle management
     */
    public async executeTask(params: {
        task: TaskType;
        agent: AgentType;
        data?: unknown;
        metadata?: Record<string, unknown>;
    }): Promise<TaskStats> {
        const { task, agent, data, metadata = {} } = params;

        return await this.safeExecute(async () => {
            await this.validateTask(task);
            await this.registerTask(task);

            const validationManager = this.getDomainManager<ValidationManager>('ValidationManager');
            await validationManager.validateTask({
                task,
                context: metadata
            });

            await this.handleStatusTransition({
                currentStatus: task.status,
                targetStatus: TASK_STATUS_enum.DOING,
                entity: 'task',
                entityId: task.id,
                metadata: {
                    agentId: agent.id,
                    startTime: Date.now(),
                    ...metadata
                }
            });

            const resourceManager = this.getDomainManager<ResourceManager>('ResourceManager');
            const timeoutTimer = this.setupTaskTimeout(task.id);

            try {
                task.startTime = Date.now();
                const result = await task.execute(data);
                task.endTime = Date.now();
                task.duration = task.endTime - task.startTime;

                await resourceManager.trackResourceUsage({
                    task,
                    resourceStats: {
                        memory: 0,
                        tokens: (task.llmUsageStats?.inputTokens || 0) + (task.llmUsageStats?.outputTokens || 0)
                    }
                });

                task.result = result;
                task.status = task.externalValidationRequired ? 
                    TASK_STATUS_enum.AWAITING_VALIDATION : 
                    TASK_STATUS_enum.DONE;

                const stats = await this.calculateTaskStats(task, agent);
                task.llmUsageStats = stats.llmUsageStats;

                await this.handleTaskCompletion(task, stats);
                return stats;

            } catch (error) {
                await this.handleTaskError(task, error as Error);
                throw error;
            } finally {
                clearTimeout(timeoutTimer);
                await this.unregisterTask(task.id);
            }
        }, 'Task execution failed');
    }

    /**
     * Handle task completion
     */
    protected async handleTaskCompletion(task: TaskType, stats: TaskStats): Promise<void> {
        const taskLog = task.store?.prepareNewLog({
            task,
            logDescription: `Task completed: ${task.title}`,
            metadata: {
                ...stats,
                timestamp: Date.now()
            },
            logType: 'TaskStatusUpdate',
            taskStatus: task.status
        });

        if (taskLog && task.store) {
            task.store.setState(state => ({
                workflowLogs: [...state.workflowLogs, taskLog]
            }));
        }
    }

    /**
     * Calculate task statistics
     */
    protected async calculateTaskStats(task: TaskType, agent: AgentType): Promise<TaskStats> {
        const resourceManager = this.getDomainManager<ResourceManager>('ResourceManager');
        const stats = await resourceManager.getTaskStats(task);

        if (!stats) {
            throw new PrettyError('Failed to calculate task stats');
        }

        return stats;
    }

    /**
     * Handle task error
     */
    protected async handleTaskError(task: TaskType, error: Error): Promise<void> {
        task.error = error.message;
        task.status = TASK_STATUS_enum.ERROR;
        task.endTime = Date.now();
        task.duration = task.endTime - (task.startTime || task.endTime);

        const errorLog = task.store?.prepareNewLog({
            task,
            logDescription: `Task error: ${error.message}`,
            metadata: {
                error,
                duration: task.duration,
                timestamp: Date.now()
            },
            logType: 'TaskStatusUpdate',
            taskStatus: TASK_STATUS_enum.ERROR
        });

        if (errorLog && task.store) {
            task.store.setState(state => ({
                workflowLogs: [...state.workflowLogs, errorLog]
            }));
        }
    }

    /**
     * Validate task implementation
     */
    protected async validateTask(task: TaskType): Promise<TaskValidationResult> {
        const errors: string[] = [];

        if (!task.title) errors.push('Task title is required');
        if (!task.description) errors.push('Task description is required');
        if (!task.agent) errors.push('Task must have an assigned agent');

        return {
            isValid: errors.length === 0,
            errors,
            context: {
                taskId: task.id,
                taskStatus: task.status,
                validationTime: Date.now()
            }
        };
    }

    /**
     * Initialize task resources
     */
    protected async initializeTask(task: TaskType): Promise<void> {
        await this.handleStatusTransition({
            currentStatus: task.status,
            targetStatus: TASK_STATUS_enum.TODO,
            entity: 'task',
            entityId: task.id,
            metadata: this.prepareMetadata({ task })
        });
    }

    /**
     * Clean up task resources
     */
    protected async cleanupTask(taskId: string): Promise<void> {
        const task = this.getTask(taskId);
        if (!task) return;

        const resourceManager = this.getDomainManager<ResourceManager>('ResourceManager');
        await resourceManager.cleanup(taskId);

        const log = task.store?.prepareNewLog({
            task,
            logDescription: 'Task resources cleaned up',
            metadata: {
                timestamp: Date.now()
            },
            logType: 'TaskStatusUpdate',
            taskStatus: task.status
        });

        if (log && task.store) {
            task.store.setState(state => ({
                workflowLogs: [...state.workflowLogs, log]
            }));
        }
    }
}

export default TaskManager.getInstance();