/**
 * @file Task.ts
 * @path C:\Users\pwalc\Documents\GroqEmailAssistant\KaibanJS\src\tasks\Tasks.ts
 * @description Core Task entity implementation with pure entity focus
 *
 * @module @entities
 */

import { v4 as uuidv4 } from 'uuid';
import { PrettyError } from '@/utils/core/errors';

// Import types from canonical locations
import type { 
    TaskType,
    ITaskParams,
    TaskResult,
    FeedbackObject 
} from '@/utils/types/task/base';

import type { 
    IReactChampionAgent 
} from '@/utils/types/agent/base';

import type { 
    LLMUsageStats 
} from '@/utils/types/llm/responses';

import { TASK_STATUS_enum } from '@/utils/types/common/enums';

/**
 * Core Task entity implementation
 */
export class Task implements TaskType {
    // Required properties
    public readonly id: string;
    public title: string;
    public description: string;
    public expectedOutput: string;
    public agent: IReactChampionAgent;
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
        this.status = TASK_STATUS_enum.TODO;
        this.result = null;
        this.inputs = {};
        this.feedbackHistory = [];

        // Validate agent
        this.validateAgent();
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
        if (!this.agent) {
            throw new PrettyError({
                message: 'Task must have an assigned agent',
                context: { taskId: this.id },
                type: 'TaskValidationError'
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
        this.status = TASK_STATUS_enum.ERROR;
    }

    /**
     * Check if task is complete
     */
    public isComplete(): boolean {
        return this.status === TASK_STATUS_enum.DONE || 
               this.status === TASK_STATUS_enum.VALIDATED;
    }

    /**
     * Check if task has error
     */
    public hasError(): boolean {
        return this.status === TASK_STATUS_enum.ERROR || !!this.error;
    }

    /**
     * Check if task needs validation
     */
    public needsValidation(): boolean {
        return this.status === TASK_STATUS_enum.AWAITING_VALIDATION;
    }

    /**
     * Check if task can be executed
     */
    public canExecute(): boolean {
        return this.status === TASK_STATUS_enum.TODO || 
               this.status === TASK_STATUS_enum.REVISE;
    }

    /**
     * Reset task state
     */
    public reset(): void {
        this.status = TASK_STATUS_enum.TODO;
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