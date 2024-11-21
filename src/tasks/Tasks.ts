/**
 * @file Task.ts
 * @path C:\Users\pwalc\Documents\GroqEmailAssistant\KaibanJS\src\tasks\Tasks.ts
 * @description Core Task entity implementation with pure entity focus
 *
 * @module @entities
 */

import { v4 as uuidv4 } from 'uuid';
import { PrettyError } from '../utils/core/errors';

// Import types from canonical locations
import type { 
    TaskType,
    ITaskParams,
    TaskResult,
    FeedbackObject 
} from '../types/task/taskBase';

import type { 
    AgentType 
} from '../types/agent/agentBaseTypes';

import type { 
    LLMUsageStats 
} from '../types/llm/llmResponseTypes';

import { TASK_STATUS_enum } from '../types/common/commonEnums';
import type { TeamStore } from '../types/team/teamBaseTypes';

/**
 * Core Task entity implementation
 */
export class Task implements TaskType {
    // Required properties
    public readonly id: string;
    public title: string;
    public description: string;
    public expectedOutput: string;
    public agent: AgentType;
    public isDeliverable: boolean;
    public externalValidationRequired: boolean;

    // State properties
    public status: keyof typeof TASK_STATUS_enum;
    public result: TaskResult;
    public inputs: Record<string, unknown>;
    public feedbackHistory: FeedbackObject[];

    // Optional properties
    public interpolatedTaskDescription?: string;
    public duration?: number;
    public startTime?: number;
    public endTime?: number;
    public llmUsageStats?: LLMUsageStats;
    public iterationCount?: number;
    public error?: string;

    // Store reference
    private store?: TeamStore;

    constructor(params: ITaskParams) {
        this.validateParams(params);

        // Initialize required properties
        this.id = uuidv4();
        this.title = params.title || params.description.substring(0, 50);
        this.description = params.description;
        this.expectedOutput = params.expectedOutput;
        this.agent = params.agent;
        this.isDeliverable = params.isDeliverable ?? false;
        this.externalValidationRequired = params.externalValidationRequired ?? false;

        // Initialize state properties
        this.status = 'TODO' as keyof typeof TASK_STATUS_enum;
        this.result = null;
        this.inputs = {};
        this.feedbackHistory = [];

        // Validate agent
        this.validateAgent();
    }

    /**
     * Set team store reference
     */
    public setStore(store: TeamStore): void {
        this.store = store;
    }

    /**
     * Execute task with provided data
     */
    public async execute(data: unknown): Promise<unknown> {
        try {
            this.startTime = Date.now();
            this.status = 'DOING' as keyof typeof TASK_STATUS_enum;

            // Execute task using agent
            const result = await this.agent.execute({
                task: this,
                inputs: data
            });

            this.endTime = Date.now();
            this.duration = this.endTime - this.startTime;
            this.result = result;
            this.status = 'DONE' as keyof typeof TASK_STATUS_enum;

            return result;
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
            throw new PrettyError({
                message: 'Invalid task parameters',
                context: { params, errors },
                type: 'ValidationError'
            });
        }
    }

    /**
     * Validate assigned agent
     */
    private validateAgent(): void {
        if (!this.agent) {
            throw new PrettyError({
                message: 'Task must have an assigned agent',
                context: { taskId: this.id },
                type: 'ValidationError'
            });
        }
    }

    /**
     * Get task state
     */
    public getState(): Record<string, unknown> {
        return {
            id: this.id,
            title: this.title,
            description: this.description,
            expectedOutput: this.expectedOutput,
            agent: this.agent.id,
            isDeliverable: this.isDeliverable,
            externalValidationRequired: this.externalValidationRequired,
            status: this.status,
            result: this.result,
            inputs: this.inputs,
            feedbackHistory: this.feedbackHistory,
            interpolatedTaskDescription: this.interpolatedTaskDescription,
            duration: this.duration,
            startTime: this.startTime,
            endTime: this.endTime,
            llmUsageStats: this.llmUsageStats,
            iterationCount: this.iterationCount,
            error: this.error
        };
    }

    /**
     * Update task state
     */
    public setState(updates: Partial<TaskType>): void {
        Object.assign(this, updates);
    }

    /**
     * Add feedback to task history
     */
    public addFeedback(feedback: FeedbackObject): void {
        this.feedbackHistory.push(feedback);
    }

    /**
     * Update task status
     */
    public updateStatus(status: keyof typeof TASK_STATUS_enum): void {
        this.status = status;
    }

    /**
     * Set task result
     */
    public setResult(result: TaskResult): void {
        this.result = result;
    }

    /**
     * Set error state
     */
    public setError(error: Error | string): void {
        this.error = error instanceof Error ? error.message : error;
        this.status = 'ERROR' as keyof typeof TASK_STATUS_enum;
    }

    /**
     * Check if task is complete
     */
    public isComplete(): boolean {
        return this.status === 'DONE' || 
               this.status === 'VALIDATED';
    }

    /**
     * Check if task has error
     */
    public hasError(): boolean {
        return this.status === 'ERROR' || !!this.error;
    }

    /**
     * Check if task needs validation
     */
    public needsValidation(): boolean {
        return this.status === 'AWAITING_VALIDATION';
    }

    /**
     * Check if task can be executed
     */
    public canExecute(): boolean {
        return this.status === 'TODO' || 
               this.status === 'REVISE';
    }

    /**
     * Reset task state
     */
    public reset(): void {
        this.status = 'TODO' as keyof typeof TASK_STATUS_enum;
        this.result = null;
        this.duration = undefined;
        this.startTime = undefined;
        this.endTime = undefined;
        this.llmUsageStats = undefined;
        this.iterationCount = undefined;
        this.error = undefined;
    }

    /**
     * Clone task
     */
    public clone(): Task {
        return new Task({
            title: this.title,
            description: this.description,
            expectedOutput: this.expectedOutput,
            agent: this.agent,
            isDeliverable: this.isDeliverable,
            externalValidationRequired: this.externalValidationRequired
        });
    }
}

export default Task;
