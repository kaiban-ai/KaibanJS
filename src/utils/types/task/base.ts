/**
 * @file base.ts
 * @path KaibanJS/src/utils/types/task/base.ts
 * @description Core task type definitions and interfaces
 *
 * @module @types/task
 */

import type { AgentType } from '../agent/base';
import type { TeamStore } from '../team/base';
import type { LLMUsageStats } from '../llm/responses';
import type { ModelUsageStats } from '../workflow';
import type { TASK_STATUS_enum, FEEDBACK_STATUS_enum } from '../common/enums';

// ─── Core Task Types ────────────────────────────────────────────────────────────

/** Task statistics interface */
export interface TaskStats {
    startTime: number;
    endTime: number;
    duration: number;
    llmUsageStats: LLMUsageStats;
    iterationCount: number;
    modelUsage: ModelUsageStats;
}

/** Task result type */
export type TaskResult = string | Record<string, unknown> | null;

/** Feedback object interface */
export interface FeedbackObject {
    id: string;
    content: string;
    status: keyof typeof FEEDBACK_STATUS_enum;
    timestamp: Date;
    userId: string;
    category?: string;
    priority?: 'low' | 'medium' | 'high';
    assignedTo?: string;
}

/** Core task interface */
export interface TaskType {
    id: string;
    title: string;
    description: string;
    expectedOutput: string;
    agent: AgentType;
    isDeliverable: boolean;
    externalValidationRequired: boolean;
    inputs: Record<string, unknown>;
    feedbackHistory: FeedbackObject[];
    status: keyof typeof TASK_STATUS_enum;
    result?: TaskResult;
    interpolatedTaskDescription?: string;
    duration?: number;
    startTime?: number;
    endTime?: number;
    llmUsageStats?: LLMUsageStats;
    iterationCount?: number;
    error?: string;
    setStore: (store: TeamStore) => void;
    execute: (data: unknown) => Promise<unknown>;
}

/** Task initialization parameters */
export interface ITaskParams {
    title?: string;
    description: string;
    expectedOutput: string;
    agent: AgentType;
    isDeliverable?: boolean;
    externalValidationRequired?: boolean;
}

/** Task validation result */
export interface TaskValidationResult {
    isValid: boolean;
    errors: string[];
    context?: Record<string, unknown>;
}

/** Task metadata */
export interface TaskMetadata {
    llmUsageStats: LLMUsageStats;
    iterationCount: number;
    duration: number;
    costDetails: {
        inputCost: number;
        outputCost: number;
        totalCost: number;
        currency: string;
    };
    result?: unknown;
    error?: string;
}

// ─── Type Guards ────────────────────────────────────────────────────────────────

export const TaskTypeGuards = {
    isTaskType: (value: unknown): value is TaskType => {
        if (typeof value !== 'object' || value === null) return false;
        const task = value as Partial<TaskType>;
        return (
            typeof task.id === 'string' &&
            typeof task.title === 'string' &&
            typeof task.description === 'string' &&
            typeof task.expectedOutput === 'string' &&
            Array.isArray(task.feedbackHistory) &&
            task.agent !== undefined &&
            'status' in task
        );
    },

    isFeedbackObject: (value: unknown): value is FeedbackObject => {
        if (typeof value !== 'object' || value === null) return false;
        const feedback = value as Partial<FeedbackObject>;
        return (
            typeof feedback.id === 'string' &&
            typeof feedback.content === 'string' &&
            'status' in feedback &&
            feedback.timestamp instanceof Date &&
            typeof feedback.userId === 'string'
        );
    },

    isTaskStats: (value: unknown): value is TaskStats => {
        if (typeof value !== 'object' || value === null) return false;
        const stats = value as Partial<TaskStats>;
        return (
            typeof stats.startTime === 'number' &&
            typeof stats.endTime === 'number' &&
            typeof stats.duration === 'number' &&
            typeof stats.iterationCount === 'number' &&
            'llmUsageStats' in stats &&
            'modelUsage' in stats
        );
    }
};