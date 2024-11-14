/**
 * @file TaskManager.ts
 * @path KaibanJS/src/managers/domain/task/TaskManager.ts
 * @description Domain-level task management and orchestration
 */

import CoreManager from '../../core/CoreManager';
import { StatusManager } from '../../core/StatusManager';
import { IterationManager } from '../agent/IterationManager';
import { OutputManager } from './OutputManager';

// Core utilities
import { logger } from '@/utils/core/logger';
import { PrettyError } from '@/utils/core/errors';

// Import types from canonical locations
import type { 
    TaskType,
    TaskStats,
    TaskValidationResult,
    TaskExecutionParams,
    TaskExecutionResult,
    TaskStoreState
} from '@/utils/types/task';

import type { 
    AgentType,
    AgentExecutionResult 
} from '@/utils/types/agent';

import { TASK_STATUS_enum } from '@/utils/types/common/enums';
import { ErrorType } from '@/utils/types/common/errors';
import { LLMUsageStats } from '@/utils/types/llm/responses';
import { CostDetails } from '@/utils/types/workflow/costs';

// ─── Task Manager Implementation ───────────────────────────────────────────────

export class TaskManager extends CoreManager {
    private static instance: TaskManager;
    private readonly statusManager: StatusManager;
    private readonly iterationManager: IterationManager;
    private readonly outputManager: OutputManager;
    private readonly activeTasks: Map<string, TaskType>;

    private constructor() {
        super();
        this.statusManager = StatusManager.getInstance();
        this.iterationManager = new IterationManager();
        this.outputManager = new OutputManager();
        this.activeTasks = new Map();
    }

    // ─── Singleton Access ───────────────────────────────────────────────────

    public static getInstance(): TaskManager {
        if (!TaskManager.instance) {
            TaskManager.instance = new TaskManager();
        }
        return TaskManager.instance;
    }

    // ─── Task Lifecycle Management ──────────────────────────────────────────

    public async executeTask(params: TaskExecutionParams): Promise<TaskExecutionResult> {
        const { task, agent, options = {} } = params;

        try {
            // Update task status
            await this.updateTaskStatus(task.id, TASK_STATUS_enum.DOING);
            this.activeTasks.set(task.id, task);

            // Initialize execution context
            const executionContext = {
                startTime: Date.now(),
                task,
                agent,
                iterations: 0,
                maxIterations: agent.maxIterations
            };

            // Execute task with agent
            const agentResult = await agent.workOnTask(task);

            // Process results
            if (agentResult.error) {
                throw new Error(agentResult.error);
            }

            const result = agentResult.result;
            if (!result) {
                throw new Error('No result returned from agent execution');
            }

            // Update task status and stats
            await this.updateTaskStatus(task.id, TASK_STATUS_enum.DONE);
            const stats = await this.calculateTaskStats(task);

            return {
                success: true,
                result,
                stats,
                context: executionContext
            };

        } catch (error) {
            return this.handleExecutionError(error, task);
        }
    }

    public async validateTask(task: TaskType): Promise<TaskValidationResult> {
        try {
            const errors: string[] = [];

            // Validate required fields
            if (!task.id) errors.push('Task ID is required');
            if (!task.title) errors.push('Task title is required');
            if (!task.description) errors.push('Task description is required');
            if (!task.agent) errors.push('Task must have an assigned agent');
            if (!task.expectedOutput) errors.push('Expected output is required');

            // Validate agent configuration if present
            if (task.agent) {
                if (!task.agent.tools) errors.push('Agent tools not configured');
                if (!task.agent.llmConfig) errors.push('Agent LLM not configured');
            }

            return {
                isValid: errors.length === 0,
                errors,
                context: {
                    taskId: task.id,
                    agentId: task.agent?.id
                }
            };

        } catch (error) {
            logger.error('Task validation error:', error);
            return {
                isValid: false,
                errors: [error instanceof Error ? error.message : String(error)]
            };
        }
    }

    // ─── Task Status Management ───────────────────────────────────────────────

    public async updateTaskStatus(
        taskId: string,
        status: keyof typeof TASK_STATUS_enum
    ): Promise<boolean> {
        const task = this.activeTasks.get(taskId);
        if (!task) return false;

        try {
            await this.statusManager.transition({
                currentStatus: task.status,
                targetStatus: status,
                entity: 'task',
                entityId: taskId
            });

            task.status = status;
            this.activeTasks.set(taskId, task);
            
            return true;
        } catch (error) {
            logger.error(`Failed to update task status: ${error}`);
            return false;
        }
    }

    // ─── Task Reporting & Stats ──────────────────────────────────────────────

    public async getTaskStats(taskId: string): Promise<TaskStats | null> {
        const task = this.activeTasks.get(taskId);
        if (!task) return null;

        return this.calculateTaskStats(task);
    }

    // ─── Resource Management ────────────────────────────────────────────────

    public async cleanup(): Promise<void> {
        for (const task of this.activeTasks.values()) {
            try {
                await this.updateTaskStatus(task.id, TASK_STATUS_enum.DONE);
            } catch (error) {
                logger.error(`Error cleaning up task ${task.id}:`, error);
            }
        }
        this.activeTasks.clear();
    }

    // ─── Private Helper Methods ───────────────────────────────────────────────

    private async calculateTaskStats(task: TaskType): Promise<TaskStats> {
        return {
            startTime: task.startTime || Date.now(),
            endTime: task.endTime || Date.now(),
            duration: task.duration || 0,
            llmUsageStats: task.llmUsageStats || this.createDefaultLLMStats(),
            iterationCount: task.iterationCount || 0,
            modelUsage: {}
        };
    }

    private createDefaultLLMStats(): LLMUsageStats {
        return {
            inputTokens: 0,
            outputTokens: 0,
            callsCount: 0,
            callsErrorCount: 0,
            parsingErrors: 0,
            totalLatency: 0,
            averageLatency: 0,
            lastUsed: Date.now(),
            memoryUtilization: {
                peakMemoryUsage: 0,
                averageMemoryUsage: 0,
                cleanupEvents: 0
            },
            costBreakdown: {
                input: 0,
                output: 0,
                total: 0,
                currency: 'USD'
            }
        };
    }

    private handleExecutionError(error: unknown, task: TaskType): TaskExecutionResult {
        const execError = new PrettyError({
            message: 'Task execution failed',
            context: { taskId: task.id, taskTitle: task.title },
            rootError: error instanceof Error ? error : undefined
        });

        logger.error(`Task execution error:`, execError);

        return {
            success: false,
            error: execError
        };
    }
}

export default TaskManager;