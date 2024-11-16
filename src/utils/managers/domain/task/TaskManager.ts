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
import { StatusManager } from '../../domain/status/StatusManager';
import { DefaultFactory } from '../../../factories/defaultFactory';
import { calculateTaskStats } from '../../../helpers/stats/taskStatsCalculator';
import { calculateTaskCost, createDefaultCostDetails } from '../../../helpers/costs/llmCostCalculator';

// Types from canonical locations
import type {
    TaskType,
    TaskStats,
    TaskValidationResult,
    TaskMetadata
} from '../../../types/task/base';

import type {
    AgentType,
    ParsedOutput,
    TeamStore,
    CostDetails,
    LLMUsageStats
} from '../../../types';

import { TASK_STATUS_enum } from '../../../types/common/enums';

/**
 * Task management implementation with error handling and validation
 */
export class TaskManager extends CoreManager {
    private static instance: TaskManager;
    protected readonly errorManager: ErrorManager;
    protected readonly logManager: LogManager;
    protected readonly statusManager: StatusManager;
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
    public async executeTask(params: {
        task: TaskType;
        agent: AgentType;
        metadata?: Record<string, unknown>;
    }): Promise<TaskMetadata> {
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

            const result = await task.execute(task.inputs);
            const stats = await this.calculateTaskStats(task);
            const costDetails = await this.calculateTaskCosts(task, agent);

            this.cleanup(task.id);
            return {
                llmUsageStats: stats.llmUsageStats || {},
                iterationCount: stats.iterationCount || 0,
                duration: stats.duration || 0,
                costDetails: costDetails || createDefaultCostDetails('USD'),
                result,
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
    public async validateConfig(): Promise<TaskValidationResult> {
        try {
            // Validate manager state
            if (!this.errorManager || !this.logManager || !this.statusManager) {
                return {
                    isValid: false,
                    errors: ['Required managers not initialized'],
                    context: {}
                };
            }

            // Validate active tasks state
            if (!this.activeTasks || !this.taskTimeouts) {
                return {
                    isValid: false,
                    errors: ['Task tracking maps not initialized'],
                    context: {}
                };
            }

            this.logManager.debug('TaskManager configuration validated');

            return {
                isValid: true,
                errors: [],
                context: {}
            };

        } catch (error) {
            const errorResult = this.errorManager.handleError({
                error: error as Error,
                context: {
                    component: 'TaskManager',
                    method: 'validateConfig',
                    additionalContext: {}
                }
            });

            return {
                isValid: false,
                errors: [errorResult.error || 'Unknown error'],
                context: errorResult.context || {}
            };
        }
    }

    /**
     * Calculate task statistics
     */
    private async calculateTaskStats(task: TaskType): Promise<TaskStats> {
        try {
            return calculateTaskStats(task) || DefaultFactory.createLLMUsageStats();
        } catch (error) {
            this.logManager.error('Error calculating task stats:', error);
            return DefaultFactory.createLLMUsageStats();
        }
    }

    /**
     * Calculate task costs
     */
    private async calculateTaskCosts(task: TaskType, agent: AgentType): Promise<CostDetails> {
        try {
            const stats = await this.calculateTaskStats(task);
            return calculateTaskCost(agent.llmConfig.model || 'unknown', stats.llmUsageStats);
        } catch (error) {
            this.logManager.error('Error calculating task costs:', error);
            return createDefaultCostDetails('USD');
        }
    }

    /**
     * Handle task execution errors
     */
    private async handleTaskError(params: {
        task: TaskType;
        error: Error;
        context?: Record<string, unknown>;
    }): Promise<TaskMetadata> {
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
            llmUsageStats: {} as LLMUsageStats,
            iterationCount: 0,
            duration: 0,
            costDetails: createDefaultCostDetails('USD'),
            result: null,
            error: errorResult.error
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
}

export default TaskManager.getInstance();
