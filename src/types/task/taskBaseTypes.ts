/**
 * @file taskBaseTypes.ts
 * @path KaibanJS/src/types/task/taskBaseTypes.ts
 * @description Core task interface definitions and base types
 *
 * @module types/task
 */

import type { IAgentType } from '../agent/agentBaseTypes';
import type { ITeamStoreMethods } from '../team/teamBaseTypes';
import type { ILLMUsageStats } from '../llm/llmResponseTypes';
import type { TASK_STATUS_enum, FEEDBACK_STATUS_enum } from '../common/commonEnums';

// ─── Task Result Types ─────────────────────────────────────────────────────────

export interface ITaskResult {
    value: string | Record<string, unknown> | null;
}

// ─── Task Metrics Types ────────────────────────────────────────────────────────

/**
 * Task resource metrics
 */
export interface ITaskResourceMetrics {
    memory: number;
    cpu: number;
    tokens: number;
}

/**
 * Task performance metrics
 */
export interface ITaskPerformanceMetrics {
    averageIterationTime: number;
    averageTokensPerSecond: number;
    peakMemoryUsage: number;
}

/**
 * Task cost metrics
 */
export interface ITaskCostMetrics {
    input: number;
    output: number;
    total: number;
    currency: string;
}

/**
 * Task metrics
 */
export interface ITaskMetrics {
    startTime: number;
    endTime: number;
    duration: number;
    iterationCount: number;
    resources: ITaskResourceMetrics;
    performance: ITaskPerformanceMetrics;
    costs: ITaskCostMetrics;
    llmUsage: ILLMUsageStats;
}

// ─── Task Progress Types ────────────────────────────────────────────────────────

/**
 * Task progress
 */
export interface ITaskProgress {
    status: keyof typeof TASK_STATUS_enum;
    progress: number;
    timeElapsed: number;
    estimatedTimeRemaining?: number;
    currentStep?: string;
    blockingReason?: string;
}

// ─── Task History Types ─────────────────────────────────────────────────────────

/**
 * Task history entry
 */
export interface ITaskHistoryEntry {
    timestamp: number;
    eventType: string;
    statusChange?: {
        from: keyof typeof TASK_STATUS_enum;
        to: keyof typeof TASK_STATUS_enum;
    };
    agent?: string;
    details?: Record<string, unknown>;
}

// ─── Task Feedback Types ────────────────────────────────────────────────────────

/**
 * Task feedback
 */
export interface ITaskFeedback {
    id: string;
    content: string;
    status: keyof typeof FEEDBACK_STATUS_enum;
    timestamp: Date;
    userId: string;
    category?: string;
    priority?: 'low' | 'medium' | 'high';
    assignedTo?: string;
}

// ─── Core Task Interface ────────────────────────────────────────────────────────

/**
 * Core task interface
 */
export interface ITaskType {
    // Core properties
    id: string;
    title: string;
    description: string;
    expectedOutput: string;
    agent: IAgentType;
    status: keyof typeof TASK_STATUS_enum;
    
    // Workflow tracking
    stepId: string;
    
    // Configuration
    isDeliverable: boolean;
    externalValidationRequired: boolean;
    inputs: Record<string, unknown>;
    
    // Results and state
    result?: string | Record<string, unknown> | null;
    error?: string;
    interpolatedTaskDescription?: string;
    
    // Tracking and metrics
    metrics: ITaskMetrics;
    progress: ITaskProgress;
    history: ITaskHistoryEntry[];
    feedback: ITaskFeedback[];
    
    // Methods
    setStore: (store: ITeamStoreMethods) => void;
    execute: (data: unknown) => Promise<unknown>;
}

// ─── Task Parameters Interface ───────────────────────────────────────────────────

/**
 * Task creation parameters
 */
export interface ITaskParams {
    title?: string;
    description: string;
    expectedOutput: string;
    agent: IAgentType;
    isDeliverable?: boolean;
    externalValidationRequired?: boolean;
}

// ─── Type Guards ────────────────────────────────────────────────────────────────

export const TaskTypeGuards = {
    /**
     * Check if value is TaskType
     */
    isTaskType: (value: unknown): value is ITaskType => {
        if (typeof value !== 'object' || value === null) return false;
        const task = value as Partial<ITaskType>;
        return (
            typeof task.id === 'string' &&
            typeof task.title === 'string' &&
            typeof task.description === 'string' &&
            typeof task.expectedOutput === 'string' &&
            Array.isArray(task.feedback) &&
            task.agent !== undefined &&
            'status' in task &&
            typeof task.stepId === 'string'
        );
    },

    /**
     * Check if value is TaskFeedback
     */
    isTaskFeedback: (value: unknown): value is ITaskFeedback => {
        if (typeof value !== 'object' || value === null) return false;
        const feedback = value as Partial<ITaskFeedback>;
        return (
            typeof feedback.id === 'string' &&
            typeof feedback.content === 'string' &&
            'status' in feedback &&
            feedback.timestamp instanceof Date &&
            typeof feedback.userId === 'string'
        );
    }
};
