/**
 * @file base.ts
 * @path src/utils/types/task/base.ts
 * @description Core task interfaces and types
 */

import { IBaseAgent } from "../agent/base";
import { TeamStore } from "@/utils/types/team/base";
import { LLMUsageStats } from "../llm/responses";
import { TASK_STATUS_enum, FEEDBACK_STATUS_enum } from "@/utils/types/common/enums";

/**
 * Task result type
 */
export type TaskResult = string | Record<string, unknown> | null;

/**
 * Task statistics interface
 */
export interface TaskStats {
    /** Start time of task execution */
    startTime: number;
    
    /** End time of task execution */
    endTime: number;
    
    /** Duration of task execution */
    duration: number;
    
    /** LLM usage statistics */
    llmUsageStats: LLMUsageStats;
    
    /** Number of iterations performed */
    iterationCount: number;
    
    /** Usage statistics per model */
    modelUsage: Record<string, LLMUsageStats>;
}

/**
 * Task metadata interface
 */
export interface TaskMetadata {
    /** LLM usage statistics */
    llmUsageStats: LLMUsageStats;
    
    /** Number of iterations */
    iterationCount: number;
    
    /** Task duration */
    duration: number;
    
    /** Cost details */
    costDetails: {
        inputCost: number;
        outputCost: number;
        totalCost: number;
        currency: string;
    };
    
    /** Task result */
    result?: unknown;
    
    /** Error message if failed */
    error?: string;
}

/**
 * Feedback object interface
 */
export interface FeedbackObject {
    /** Unique identifier */
    id: string;
    
    /** Feedback content */
    content: string;
    
    /** Feedback status */
    status: keyof typeof FEEDBACK_STATUS_enum;
    
    /** Timestamp */
    timestamp: Date;
    
    /** User ID who provided feedback */
    userId: string;
    
    /** Feedback category */
    category?: string;
    
    /** Priority level */
    priority?: 'low' | 'medium' | 'high';
    
    /** Assigned agent/user */
    assignedTo?: string;
}

/**
 * Core task interface
 */
export interface TaskType {
    /** Unique identifier */
    id: string;
    
    /** Task title */
    title: string;
    
    /** Task description */
    description: string;
    
    /** Expected output format/content */
    expectedOutput: string;
    
    /** Assigned agent */
    agent: IBaseAgent;
    
    /** Deliverable flag */
    isDeliverable: boolean;
    
    /** External validation requirement */
    externalValidationRequired: boolean;
    
    /** Task inputs */
    inputs: Record<string, unknown>;
    
    /** Feedback history */
    feedbackHistory: FeedbackObject[];
    
    /** Task status */
    status: keyof typeof TASK_STATUS_enum;
    
    /** Task result */
    result?: TaskResult;
    
    /** Interpolated task description */
    interpolatedTaskDescription?: string;
    
    /** Task duration */
    duration?: number;
    
    /** Start time */
    startTime?: number;
    
    /** End time */
    endTime?: number;
    
    /** LLM usage stats */
    llmUsageStats?: LLMUsageStats;
    
    /** Iteration count */
    iterationCount?: number;
    
    /** Error message */
    error?: string;

    /**
     * Set team store
     */
    setStore: (store: TeamStore) => void;

    /**
     * Execute task
     */
    execute: (data: unknown) => Promise<unknown>;
}

/**
 * Task initialization parameters
 */
export interface ITaskParams {
    /** Task title */
    title?: string;
    
    /** Task description */
    description: string;
    
    /** Expected output */
    expectedOutput: string;
    
    /** Assigned agent */
    agent: IBaseAgent;
    
    /** Deliverable flag */
    isDeliverable?: boolean;
    
    /** External validation requirement */
    externalValidationRequired?: boolean;
}

/**
 * Task validation result
 */
export interface TaskValidationResult {
    /** Valid flag */
    isValid: boolean;
    
    /** Validation errors */
    errors: string[];
    
    /** Optional warnings */
    warnings?: string[];
}

/**
 * Type guards for task-related types
 */
export const TaskTypeGuards = {
    /**
     * Check if value is TaskType
     */
    isTaskType: (value: unknown): value is TaskType => {
        return (
            typeof value === 'object' &&
            value !== null &&
            'id' in value &&
            'title' in value &&
            'description' in value &&
            'agent' in value &&
            'status' in value
        );
    },

    /**
     * Check if value is FeedbackObject
     */
    isFeedbackObject: (value: unknown): value is FeedbackObject => {
        return (
            typeof value === 'object' &&
            value !== null &&
            'id' in value &&
            'content' in value &&
            'status' in value &&
            'timestamp' in value &&
            'userId' in value
        );
    }
};