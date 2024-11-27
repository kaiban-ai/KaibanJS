/**
 * @file Task.ts
 * @path C:\Users\pwalc\Documents\GroqEmailAssistant\KaibanJS\src\tasks\Tasks.ts
 * @description Core Task entity implementation with pure entity focus
 *
 * @module @entities
 */

import { v4 as uuidv4 } from 'uuid';
import { BaseError } from '../types/common/commonErrorTypes';

// Import types from canonical locations
import type { 
    ITaskType,
    ITaskParams,
    ITaskMetrics,
    ITaskProgress,
    ITaskHistoryEntry,
    ITaskFeedback
} from '../types/task/taskBaseTypes';

import type { IAgentType } from '../types/agent/agentBaseTypes';
import type { ILLMUsageStats } from '../types/llm/llmResponseTypes';
import type { ILoopResult } from '../types/agent/agentLoopTypes';
import { TASK_STATUS_enum } from '../types/common/commonEnums';
import type { ITeamStoreMethods } from '../types/team/teamBaseTypes';

/**
 * Core Task entity implementation
 */
export class Task implements ITaskType {
    // Core properties
    public readonly id: string;
    public title: string;
    public description: string;
    public expectedOutput: string;
    public agent: IAgentType;
    public status: keyof typeof TASK_STATUS_enum;
    public stepId: string;

    // Configuration
    public isDeliverable: boolean;
    public externalValidationRequired: boolean;
    public inputs: Record<string, unknown>;

    // Results and state
    public result?: string | Record<string, unknown> | null;
    public error?: string;
    public interpolatedTaskDescription?: string;

    // Tracking and metrics
    public metrics: ITaskMetrics;
    public progress: ITaskProgress;
    public history: ITaskHistoryEntry[];
    public feedback: ITaskFeedback[];

    // Store reference
    private store?: ITeamStoreMethods;

    constructor(params: ITaskParams) {
        this.validateParams(params);

        // Initialize core properties
        this.id = uuidv4();
        this.title = params.title || params.description.substring(0, 50);
        this.description = params.description;
        this.expectedOutput = params.expectedOutput;
        this.agent = params.agent;
        this.status = 'TODO';
        this.stepId = uuidv4();

        // Initialize configuration
        this.isDeliverable = params.isDeliverable ?? false;
        this.externalValidationRequired = params.externalValidationRequired ?? false;
        this.inputs = {};

        // Initialize tracking and metrics
        this.metrics = {
            startTime: 0,
            endTime: 0,
            duration: 0,
            iterationCount: 0,
            resources: {
                cpuUsage: 0,
                memoryUsage: 0,
                diskIO: { read: 0, write: 0 },
                networkUsage: { upload: 0, download: 0 },
                timestamp: Date.now()
            },
            performance: {
                executionTime: {
                    total: 0,
                    average: 0,
                    min: 0,
                    max: 0
                },
                latency: {
                    total: 0,
                    average: 0,
                    min: 0,
                    max: 0
                },
                throughput: {
                    operationsPerSecond: 0,
                    dataProcessedPerSecond: 0
                },
                responseTime: {
                    total: 0,
                    average: 0,
                    min: 0,
                    max: 0
                },
                queueLength: 0,
                errorRate: 0,
                successRate: 1,
                errorMetrics: {
                    totalErrors: 0,
                    errorRate: 0
                },
                resourceUtilization: {
                    cpuUsage: 0,
                    memoryUsage: 0,
                    diskIO: { read: 0, write: 0 },
                    networkUsage: { upload: 0, download: 0 },
                    timestamp: Date.now()
                },
                timestamp: Date.now()
            },
            costs: {
                inputCost: 0,
                outputCost: 0,
                totalCost: 0,
                currency: 'USD',
                breakdown: {
                    promptTokens: { count: 0, cost: 0 },
                    completionTokens: { count: 0, cost: 0 }
                }
            },
            llmUsage: {
                inputTokens: 0,
                outputTokens: 0,
                callsCount: 0,
                callsErrorCount: 0,
                parsingErrors: 0,
                totalLatency: 0,
                averageLatency: 0,
                lastUsed: 0,
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
            }
        };

        this.progress = {
            status: 'TODO',
            progress: 0,
            timeElapsed: 0
        };

        this.history = [];
        this.feedback = [];

        // Validate agent
        this.validateAgent();
    }

    /**
     * Set team store reference
     */
    public setStore(store: ITeamStoreMethods): void {
        this.store = store;
    }

    /**
     * Execute task with provided data
     */
    public async execute(data: unknown): Promise<unknown> {
        try {
            this.metrics.startTime = Date.now();
            this.status = 'DOING';
            this.progress.status = 'DOING';

            // Add history entry
            this.history.push({
                timestamp: Date.now(),
                eventType: 'EXECUTION_STARTED',
                statusChange: {
                    from: 'TODO',
                    to: 'DOING'
                },
                agent: this.agent.id
            });

            // Execute task using agent's workOnTask method
            const loopResult = await this.agent.workOnTask(this) as ILoopResult;
            
            this.metrics.endTime = Date.now();
            this.metrics.duration = this.metrics.endTime - this.metrics.startTime;
            
            // Extract finalAnswer from the result if available
            this.result = loopResult.result?.finalAnswer ?? null;
            
            this.status = 'DONE';
            this.progress.status = 'DONE';
            this.progress.progress = 100;

            // Add history entry
            this.history.push({
                timestamp: Date.now(),
                eventType: 'EXECUTION_COMPLETED',
                statusChange: {
                    from: 'DOING',
                    to: 'DONE'
                },
                agent: this.agent.id,
                details: { result: loopResult }
            });

            return loopResult;
        } catch (error) {
            this.setError(error as Error);
            throw error;
        }
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
            throw new BaseError({
                message: 'Invalid task parameters',
                type: 'ValidationError',
                context: { params, errors },
                recommendedAction: 'Provide all required task parameters'
            });
        }
    }

    /**
     * Validate assigned agent
     */
    private validateAgent(): void {
        if (!this.agent) {
            throw new BaseError({
                message: 'Task must have an assigned agent',
                type: 'ValidationError',
                context: { taskId: this.id },
                recommendedAction: 'Assign an agent to the task'
            });
        }
    }

    /**
     * Set error state
     */
    private setError(error: Error | string): void {
        this.error = error instanceof Error ? error.message : error;
        this.status = 'ERROR';
        this.progress.status = 'ERROR';
        
        // Add history entry
        this.history.push({
            timestamp: Date.now(),
            eventType: 'ERROR',
            statusChange: {
                from: this.status,
                to: 'ERROR'
            },
            agent: this.agent.id,
            details: { error: this.error }
        });
    }
}

export default Task;
