/**
 * @file TaskManager.ts
 * @path src/managers/domain/task/TaskManager.ts
 * @description Domain manager for task operations and lifecycle management
 * 
 * @module @managers/domain
 */

import { CoreManager } from '../../core/CoreManager';
import { ErrorManager } from '../../core/ErrorManager';
import { LogManager } from '../../core/LogManager';
import { StatusManager } from '../status/StatusManager';
import { DefaultFactory } from '@/utils/factories/defaultFactory';
import { calculateTaskStats } from '@/utils/helpers/stats';
import { calculateTaskCost } from '@/utils/helpers/costs/llmCostCalculator';

// Types from canonical locations
import type {
    TaskType,
    TaskStats,
    TaskValidationResult,
    TaskExecutionParams,
    HandlerResult
} from '@/utils/types/task/base';

import type {
    AgentType,
    ParsedOutput,
    TeamStore,
    ErrorType,
    CostDetails,
    LLMUsageStats,
    Log
} from '@/utils/types';

import { TASK_STATUS_enum } from '@/utils/types/common/enums';

/**
 * Task management implementation with error handling and validation
 */
export class TaskManager extends CoreManager {
    private static instance: TaskManager;
    private readonly errorManager: ErrorManager;
    private readonly logManager: LogManager;
    private readonly statusManager: StatusManager;
    private readonly activeTasks: Map<string, TaskType>;
    private readonly taskTimeouts: Map<string, NodeJS.Timeout>;

    private constructor() {
        super();
        this.errorManager = ErrorManager.getInstance();
        this.logManager = LogManager.getInstance();
        this.statusManager = StatusManager.getInstance();
        this.activeTasks = new Map();
        this.taskTimeouts = new Map();
    }

    public static getInstance(): TaskManager {
        if (!TaskManager.instance) {
            TaskManager.instance = new TaskManager();
        }
        return TaskManager.instance;
    }

    /**
     * Execute a task with proper error handling and timeouts
     */
    public async executeTask(params: TaskExecutionParams): Promise<HandlerResult> {
        const { task, agent, metadata = {} } = params;

        try {
            this.logManager.info(`Starting task execution: ${task.title}`);
            await this.validateConfig();

            this.activeTasks.set(task.id, task);
            const timeoutTimer = this.setupTaskTimeout(task);
            this.taskTimeouts.set(task.id, timeoutTimer);

            await this.statusManager.transition({
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

            const result = await agent.workOnTask(task);
            if (result.error) {
                throw new Error(result.error);
            }

            const stats = await this.calculateTaskStats(task);
            const costDetails = await this.calculateTaskCosts(task, agent);

            this.cleanup(task.id);
            return {
                success: true,
                data: result.result || null,
                metadata: {
                    ...stats,
                    costDetails
                }
            };

        } catch (error) {
            return this.handleTaskError({
                task,
                error: error as Error,
                context: {
                    phase: 'execution',
                    metadata
                }
            });
        }
    }

    /**
     * Validate task configuration and requirements
     */
    public async validateConfig(): Promise<void> {
        try {
            // Validate manager state
            if (!this.errorManager || !this.logManager || !this.statusManager) {
                throw new Error('Required managers not initialized');
            }

            // Validate active tasks state
            if (!this.activeTasks || !this.taskTimeouts) {
                throw new Error('Task tracking maps not initialized');
            }

            this.logManager.debug('TaskManager configuration validated');

        } catch (error) {
            this.errorManager.handleError({
                error: error as Error,
                context: {
                    component: 'TaskManager',
                    method: 'validateConfig'
                }
            });
            throw error;
        }
    }

    /**
     * Initialize task manager resources
     */
    public async initialize(): Promise<void> {
        try {
            await this.validateConfig();
            await this.cleanupAllTasks();
            this.logManager.info('TaskManager initialized successfully');

        } catch (error) {
            this.errorManager.handleError({
                error: error as Error,
                context: {
                    component: 'TaskManager',
                    method: 'initialize'
                }
            });
            throw error;
        }
    }

    /**
     * Clean up task manager resources
     */
    public async cleanup(): Promise<void> {
        try {
            await this.cleanupAllTasks();
            this.activeTasks.clear();
            this.taskTimeouts.clear();
            this.logManager.info('TaskManager cleanup completed');

        } catch (error) {
            this.errorManager.handleError({
                error: error as Error,
                context: {
                    component: 'TaskManager',
                    method: 'cleanup'
                }
            });
            throw error;
        }
    }

    /**
     * Handle task completion with result processing
     */
    public async handleTaskCompletion(params: {
        task: TaskType;
        agent: AgentType;
        result: ParsedOutput | null;
        store: TeamStore;
    }): Promise<HandlerResult> {
        const { task, agent, result, store } = params;

        try {
            const stats = await this.calculateTaskStats(task);
            const costDetails = await this.calculateTaskCosts(task, agent);

            await this.statusManager.transition({
                currentStatus: task.status,
                targetStatus: TASK_STATUS_enum.DONE,
                entity: 'task',
                entityId: task.id,
                metadata: {
                    result,
                    stats,
                    costDetails
                }
            });

            this.cleanup(task.id);
            return {
                success: true,
                data: result,
                metadata: {
                    stats,
                    costDetails
                }
            };

        } catch (error) {
            return this.handleTaskError({
                task,
                error: error as Error,
                context: {
                    phase: 'completion',
                    result
                }
            });
        }
    }

    /**
     * Calculate task statistics
     */
    private async calculateTaskStats(task: TaskType): Promise<TaskStats> {
        try {
            return calculateTaskStats(task, task.store.getState().workflowLogs);
        } catch (error) {
            this.logManager.error('Error calculating task stats:', error);
            return DefaultFactory.createTaskStats();
        }
    }

    /**
     * Calculate task costs
     */
    private async calculateTaskCosts(task: TaskType, agent: AgentType): Promise<CostDetails> {
        try {
            const stats = await this.calculateTaskStats(task);
            return calculateTaskCost(agent.llmConfig.model, stats.llmUsageStats);
        } catch (error) {
            this.logManager.error('Error calculating task costs:', error);
            return DefaultFactory.createCostDetails();
        }
    }

    /**
     * Handle task execution errors
     */
    private async handleTaskError(params: {
        task: TaskType;
        error: Error;
        context?: Record<string, unknown>;
    }): Promise<HandlerResult> {
        const { task, error, context } = params;

        const errorResult = await this.errorManager.handleError({
            error,
            context: {
                taskId: task.id,
                taskTitle: task.title,
                ...context
            }
        });

        this.cleanup(task.id);
        return {
            success: false,
            error: errorResult.error,
            metadata: errorResult.context
        };
    }

    /**
     * Set up task timeout
     */
    private setupTaskTimeout(task: TaskType): NodeJS.Timeout {
        return setTimeout(() => {
            this.handleTaskTimeout(task);
        }, 300000); // 5 minute default timeout
    }

    /**
     * Handle task timeout
     */
    private async handleTaskTimeout(task: TaskType): Promise<void> {
        this.logManager.warn(`Task timeout: ${task.title}`);
        
        await this.statusManager.transition({
            currentStatus: task.status,
            targetStatus: TASK_STATUS_enum.ERROR,
            entity: 'task',
            entityId: task.id,
            metadata: {
                error: 'Task execution timeout',
                timeout: 300000
            }
        });

        this.cleanup(task.id);
    }

    /**
     * Clean up task resources
     */
    private cleanup(taskId: string): void {
        const timeoutTimer = this.taskTimeouts.get(taskId);
        if (timeoutTimer) {
            clearTimeout(timeoutTimer);
            this.taskTimeouts.delete(taskId);
        }
        this.activeTasks.delete(taskId);
    }

    /**
     * Clean up all tasks
     */
    private async cleanupAllTasks(): Promise<void> {
        for (const [taskId, task] of this.activeTasks.entries()) {
            this.cleanup(taskId);
            this.logManager.debug(`Cleaned up task: ${task.title}`);
        }
    }
}

export default TaskManager.getInstance();