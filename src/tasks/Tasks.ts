/**
 * Path: src/tasks/Tasks.ts
 * 
 * Implementation of the Task class that represents a unit of work to be performed
 * by an agent within the KaibanJS library.
 */

import { v4 as uuidv4 } from 'uuid';
import { TASK_STATUS_enum } from "@/utils/types/common/enums";
import { logger } from '@/utils/core/logger';
import type {
    TaskType,
    TaskResult,
    FeedbackObject,
    TeamStore,
    IBaseAgent,
    AgenticLoopResult
} from '@/utils/types';

export interface ITaskParams {
    title?: string;
    description: string;
    expectedOutput: string;
    agent: IBaseAgent;
    isDeliverable?: boolean;
    externalValidationRequired?: boolean;
}

export class Task implements TaskType {
    id: string;
    title: string;
    description: string;
    expectedOutput: string;
    agent: IBaseAgent;
    isDeliverable: boolean;
    externalValidationRequired: boolean;
    inputs: Record<string, any>;
    feedbackHistory: FeedbackObject[];
    status: keyof typeof TASK_STATUS_enum;
    result: TaskResult;
    interpolatedTaskDescription?: string;
    duration?: number;
    startTime?: number;
    endTime?: number;
    llmUsageStats?: any;
    iterationCount?: number;
    error?: string;
    store: TeamStore;

    constructor(params: ITaskParams) {
        // Validate required parameters
        if (!params.description) {
            throw new Error('Task description is required');
        }
        if (!params.expectedOutput) {
            throw new Error('Expected output is required');
        }
        if (!params.agent) {
            throw new Error('Agent is required');
        }

        // Initialize basic properties
        this.id = uuidv4();
        this.title = params.title || params.description.substring(0, 50);
        this.description = params.description;
        this.expectedOutput = params.expectedOutput;
        this.agent = params.agent;
        this.isDeliverable = params.isDeliverable ?? false;
        this.externalValidationRequired = params.externalValidationRequired ?? false;
        
        // Initialize state-related properties
        this.inputs = {};
        this.feedbackHistory = [];
        this.status = 'TODO';
        this.result = null;
        
        // Storage-related initialization
        if (!this.agent.store) {
            throw new Error('Agent must have a store initialized');
        }
        this.store = this.agent.store;

        logger.debug(`Created new task: ${this.title} (${this.id})`);
    }

    setStore(store: TeamStore): void {
        if (!store) {
            throw new Error('Cannot set null store');
        }
        
        this.store = store;
        logger.debug(`Store set for task: ${this.id}`);
    }

    async execute(data: any): Promise<any> {
        if (!this.store) {
            throw new Error('Task store must be set before execution');
        }

        if (!this.agent) {
            throw new Error('Task must have an assigned agent');
        }

        try {
            logger.info(`Executing task: ${this.title}`);
            this.status = 'DOING';
            this.startTime = Date.now();
            
            // Update inputs with provided data
            this.inputs = { ...this.inputs, ...data };
            
            // Execute the task using the assigned agent
            const agentResult = await this.agent.workOnTask(this);
            
            this.endTime = Date.now();
            this.duration = this.endTime - this.startTime;
            
            // Extract the relevant result from AgenticLoopResult
            const taskResult: TaskResult = agentResult.result?.finalAnswer || null;
            
            if (this.externalValidationRequired) {
                this.status = 'AWAITING_VALIDATION';
                logger.info(`Task ${this.id} awaiting validation`);
            } else {
                this.status = 'DONE';
                this.result = taskResult;
                logger.info(`Task ${this.id} completed successfully`);
            }

            // Store metadata from agent result
            if (agentResult.metadata) {
                this.iterationCount = agentResult.metadata.iterations;
                // Additional metadata can be stored here if needed
            }

            return taskResult;
        } catch (error) {
            this.error = error instanceof Error ? error.message : String(error);
            this.status = 'BLOCKED';
            this.endTime = Date.now();
            this.duration = this.endTime - (this.startTime || this.endTime);
            
            logger.error(`Error executing task ${this.id}:`, error);
            throw error;
        }
    }

    addFeedback(feedback: FeedbackObject): void {
        this.feedbackHistory.push(feedback);
        this.status = 'REVISE';
        logger.debug(`Added feedback to task ${this.id}`);
    }

    updateStatus(newStatus: keyof typeof TASK_STATUS_enum): void {
        this.status = newStatus;
        logger.debug(`Updated task ${this.id} status to ${newStatus}`);
    }

    setResult(result: TaskResult): void {
        this.result = result;
        logger.debug(`Set result for task ${this.id}`);
    }
}