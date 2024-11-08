/**
 * @file Task.ts
 * @description Core Task implementation with updated type system
 */

import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/utils/core/logger';
import { PrettyError } from '@/utils/core/errors';
import { DefaultFactory } from '@/utils/factories';
import { LogCreator } from '@/utils/factories/logCreator';
import { MetadataFactory } from '@/utils/factories/metadataFactory';
import { calculateTaskCost } from '@/utils/helpers/costs/llmCostCalculator';
import { calculateTaskStats } from '@/utils/helpers/stats';

// Import types from their canonical locations
import type { 
    TaskType,
    TaskStats,
    TaskMetadata,
    ITaskParams,
    TaskValidationResult,
    TaskResult
} from '@/utils/types/task/base';

import type {
    TaskStoreState,
    TaskRuntimeState,
    TaskExecutionStats
} from '@/utils/types/task/store';

import type { IReactChampionAgent } from '@/utils/types/agent/base';
import type { TeamStore } from '@/utils/types/team/store';
import type { ModelStats } from '@/utils/types/workflow/stats';
import type { LLMUsageStats } from '@/utils/types/llm/responses';
import type { CostDetails } from '@/utils/types/workflow/costs';

import { TASK_STATUS_enum } from '@/utils/types/common/enums';

/**
 * Core Task implementation
 */
export class Task implements TaskType {
    public readonly id: string;
    public title: string;
    public description: string;
    public expectedOutput: string;
    public agent: IReactChampionAgent;
    public isDeliverable: boolean;
    public externalValidationRequired: boolean;
    public inputs: Record<string, unknown>;
    public feedbackHistory: FeedbackObject[];
    public status: keyof typeof TASK_STATUS_enum;
    public result: TaskResult;
    public interpolatedTaskDescription?: string;
    public duration?: number;
    public startTime?: number;
    public endTime?: number;
    public llmUsageStats?: LLMUsageStats;
    public iterationCount?: number;
    public error?: string;
    private store!: TeamStore;

    constructor(params: ITaskParams) {
        this.validateParams(params);

        this.id = uuidv4();
        this.title = params.title || params.description.substring(0, 50);
        this.description = params.description;
        this.expectedOutput = params.expectedOutput;
        this.agent = params.agent;
        this.isDeliverable = params.isDeliverable ?? false;
        this.externalValidationRequired = params.externalValidationRequired ?? false;
        this.inputs = {};
        this.feedbackHistory = [];
        this.status = TASK_STATUS_enum.TODO;
        this.result = null;

        this.validateAgent();
        logger.debug(`Created new task: ${this.title} (${this.id})`);
    }

    /**
     * Validate constructor parameters
     */
    private validateParams(params: ITaskParams): void {
        const errors: string[] = [];
        
        if (!params.description) errors.push('Task description is required');
        if (!params.expectedOutput) errors.push('Expected output is required');
        if (!params.agent) errors.push('Agent is required');

        if (errors.length > 0) {
            throw new PrettyError({
                message: 'Invalid task parameters',
                context: { params, errors },
                type: 'TaskValidationError'
            });
        }
    }

    /**
     * Validate assigned agent
     */
    private validateAgent(): void {
        if (!this.agent.store) {
            throw new PrettyError({
                message: 'Agent must have a store initialized',
                context: { agentId: this.agent.id },
                type: 'TaskValidationError'
            });
        }
    }

    /**
     * Set store reference
     */
    public setStore(store: TeamStore): void {
        if (!store) {
            throw new PrettyError({
                message: 'Cannot set null store',
                context: { taskId: this.id },
                type: 'TaskValidationError'
            });
        }
        this.store = store;
        logger.debug(`Store set for task: ${this.id}`);
    }

    /**
     * Execute task
     */
    public async execute(data: unknown): Promise<unknown> {
        this.validateStoreAndAgent();
        
        try {
            logger.info(`Executing task: ${this.title}`);
            this.status = TASK_STATUS_enum.DOING;
            this.startTime = Date.now();
            this.inputs = { ...this.inputs, ...data };

            const agentResult = await this.agent.workOnTask(this);

            this.endTime = Date.now();
            this.duration = this.endTime - this.startTime;

            const taskResult: TaskResult = agentResult.result?.finalAnswer || null;

            if (this.externalValidationRequired) {
                this.status = TASK_STATUS_enum.AWAITING_VALIDATION;
                logger.info(`Task ${this.id} awaiting validation`);
            } else {
                this.status = TASK_STATUS_enum.DONE;
                this.result = taskResult;
                logger.info(`Task ${this.id} completed successfully`);
            }

            if (agentResult.metadata) {
                this.iterationCount = agentResult.metadata.iterations;
            }

            // Calculate statistics using factory defaults where needed
            const stats = calculateTaskStats(this, this.store.getState().workflowLogs);
            const modelCode = this.agent.llmConfig.model;
            const costDetails = calculateTaskCost(modelCode, stats.llmUsageStats);

            this.llmUsageStats = stats.llmUsageStats;

            // Create task log using LogCreator
            const taskLog = LogCreator.createTaskLog({
                task: this,
                description: `Task ${this.status === TASK_STATUS_enum.DONE ? 'completed' : 'awaiting validation'}: ${this.title}`,
                status: this.status,
                metadata: {
                    ...stats,
                    costDetails,
                    result: taskResult
                }
            });

            this.store.setState(state => ({
                workflowLogs: [...state.workflowLogs, taskLog]
            }));

            return taskResult;

        } catch (error) {
            await this.handleExecutionError(error);
            throw error;
        }
    }

    /**
     * Handle execution error
     */
    private async handleExecutionError(error: unknown): Promise<void> {
        this.error = error instanceof Error ? error.message : String(error);
        this.status = TASK_STATUS_enum.ERROR;
        this.endTime = Date.now();
        this.duration = this.endTime - (this.startTime || this.endTime);

        const prettyError = new PrettyError({
            message: this.error,
            context: { taskId: this.id, taskTitle: this.title },
            rootError: error instanceof Error ? error : undefined,
            type: 'TaskExecutionError'
        });

        // Create error log using LogCreator
        const errorLog = LogCreator.createTaskLog({
            task: this,
            description: `Task error: ${prettyError.message}`,
            status: this.status,
            metadata: {
                error: prettyError,
                duration: this.duration,
                llmUsageStats: DefaultFactory.createLLMUsageStats(),
                costDetails: DefaultFactory.createCostDetails()
            }
        });

        this.store.setState(state => ({
            workflowLogs: [...state.workflowLogs, errorLog]
        }));

        logger.error(`Error executing task ${this.id}:`, prettyError);
    }

    /**
     * Validate store and agent setup
     */
    private validateStoreAndAgent(): void {
        if (!this.store) {
            throw new PrettyError({
                message: 'Task store must be set before execution',
                context: { taskId: this.id },
                type: 'TaskValidationError'
            });
        }

        if (!this.agent) {
            throw new PrettyError({
                message: 'Task must have an assigned agent',
                context: { taskId: this.id },
                type: 'TaskValidationError'
            });
        }
    }

    /**
     * Get task statistics
     */
    public getStats(): TaskStats {
        if (!this.store) {
            throw new PrettyError({
                message: 'Task store must be set to get statistics',
                context: { taskId: this.id },
                type: 'TaskValidationError'
            });
        }

        return calculateTaskStats(this, this.store.getState().workflowLogs);
    }

    /**
     * Get cost details
     */
    public getCostDetails(): CostDetails {
        if (!this.agent?.llmConfig?.model) {
            throw new PrettyError({
                message: 'Task agent must have LLM configuration to calculate costs',
                context: { taskId: this.id },
                type: 'TaskValidationError'
            });
        }

        const stats = this.getStats();
        return calculateTaskCost(this.agent.llmConfig.model, stats.llmUsageStats);
    }

    /**
     * Get model-specific statistics
     */
    public getModelStats(): Record<string, ModelStats> {
        const stats = this.getStats();
        return Object.entries(stats.modelUsage || {}).reduce((acc, [model, usage]) => {
            acc[model] = {
                tokens: {
                    input: usage.inputTokens,
                    output: usage.outputTokens
                },
                requests: {
                    successful: usage.callsCount - usage.callsErrorCount,
                    failed: usage.callsErrorCount
                },
                latency: {
                    average: usage.averageLatency,
                    p95: usage.averageLatency * 1.5,
                    max: usage.totalLatency
                },
                cost: usage.costBreakdown.total
            };
            return acc;
        }, {} as Record<string, ModelStats>);
    }
}

export default Task;