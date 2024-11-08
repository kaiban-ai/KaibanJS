/**
 * @file base.ts
 * @path src/utils/types/task/base.ts
 * @description Core task interfaces and types
 */

import { IBaseAgent } from "../agent/base";
import { TeamStore } from "@/utils/types/team/base";
import { ModelUsageStats } from "../workflow";
import { LLMUsageStats } from "../llm/responses";
import { TASK_STATUS_enum, FEEDBACK_STATUS_enum } from "@/utils/types/common/enums";

// ─── Task Result Type ──────────────────────────────────────────────────────

export type TaskResult = string | Record<string, unknown> | null;

// ─── Task Stats Interface ──────────────────────────────────────────────────

export interface TaskStats {
    startTime: number;
    endTime: number;
    duration: number;
    llmUsageStats: LLMUsageStats;
    iterationCount: number;
    modelUsage: ModelUsageStats;
}

// ─── Task Metadata Interface ───────────────────────────────────────────────

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

// ─── Feedback Object Interface ─────────────────────────────────────────────

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

// ─── Core Task Interface ───────────────────────────────────────────────────

export interface TaskType {
    id: string;
    title: string;
    description: string;
    expectedOutput: string;
    agent: IBaseAgent;
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

// ─── Task Initialization Parameters Interface ──────────────────────────────

export interface ITaskParams {
    title?: string;
    description: string;
    expectedOutput: string;
    agent: IBaseAgent;
    isDeliverable?: boolean;
    externalValidationRequired?: boolean;
}

// ─── Task Interface ────────────────────────────────────────────────────────

export interface ITask {
    id: string;
    title: string;
    description: string;
    expectedOutput: string;
    agent: IBaseAgent;
    isDeliverable: boolean;
    externalValidationRequired: boolean;
    inputs: Record<string, unknown>;
    feedbackHistory: FeedbackObject[];
    status: keyof typeof TASK_STATUS_enum;
    result: TaskResult;
    interpolatedTaskDescription: string | null;
    store: TeamStore | null;
    setStore(store: TeamStore): void;
    execute(data: unknown): Promise<unknown>;
}

// ─── Task Validation Result Interface ──────────────────────────────────────

export interface TaskValidationResult {
    isValid: boolean;
    errors: string[];
    warnings?: string[];
}

// ─── Task Type Guards ──────────────────────────────────────────────────────

export const TaskTypeGuards = {
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