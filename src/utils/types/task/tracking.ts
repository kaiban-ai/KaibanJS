/**
 * @file tracking.ts
 * @path src/utils/types/task/tracking.ts
 * @description Task tracking and monitoring interfaces
 */

import { TASK_STATUS_enum } from "../common";
import { LLMUsageStats } from "../llm";
import { TaskType } from "./base";

// Task progress interface
export interface TaskProgress {
    taskId: string;
    status: keyof typeof TASK_STATUS_enum;
    progress: number;
    timeElapsed: number;
    estimatedTimeRemaining?: number;
    currentIteration?: number;
    resourceUsage?: {
        memory: number;
        cpu: number;
        tokens: number;
    };
}

// Task metrics interface
export interface TaskMetrics {
    executionTime: number;
    tokenUsage: {
        input: number;
        output: number;
        total: number;
    };
    costs: {
        input: number;
        output: number;
        total: number;
        currency: string;
    };
    performance: {
        averageIterationTime: number;
        averageTokensPerSecond: number;
        peakMemoryUsage: number;
    };
    errors: {
        count: number;
        types: Record<string, number>;
        retries: number;
    };
}

// Task history entry
export interface TaskHistoryEntry {
    timestamp: number;
    eventType: string;
    statusChange?: {
        from: keyof typeof TASK_STATUS_enum;
        to: keyof typeof TASK_STATUS_enum;
    };
    agent?: string;
    details?: Record<string, unknown>;
    resourceUsage?: {
        llmStats: LLMUsageStats;
        memory: number;
        tokens: number;
    };
}

// Task dependency tracking
export interface TaskDependencyTracking {
    taskId: string;
    dependencies: {
        taskId: string;
        status: keyof typeof TASK_STATUS_enum;
        required: boolean;
    }[];
    dependents: {
        taskId: string;
        status: keyof typeof TASK_STATUS_enum;
        blocking: boolean;
    }[];
    status: 'pending' | 'satisfied' | 'blocked';
}

// Task audit record
export interface TaskAuditRecord {
    taskId: string;
    timestamp: number;
    action: string;
    actor: string;
    changes: {
        field: string;
        oldValue: unknown;
        newValue: unknown;
    }[];
    context?: Record<string, unknown>;
}

// Task tracking utilities
export const TaskTrackingUtils = {
    calculateProgress: (task: TaskType): number => {
        if (task.status === TASK_STATUS_enum.DONE) return 100;
        if (task.status === TASK_STATUS_enum.PENDING) return 0;
        
        if (task.iterationCount !== undefined) {
            const maxIterations = 10;
            return Math.min((task.iterationCount / maxIterations) * 100, 99);
        }

        const statusProgress: Record<keyof typeof TASK_STATUS_enum, number> = {
            PENDING: 0,
            TODO: 10,
            DOING: 50,
            BLOCKED: 25,
            REVISE: 75,
            DONE: 100,
            ERROR: 0,
            AWAITING_VALIDATION: 90,
            VALIDATED: 100
        };

        return statusProgress[task.status] || 0;
    },

    calculateResourceUtilization: (task: TaskType): Record<string, number> => {
        return {
            tokens: (task.llmUsageStats?.inputTokens || 0) + (task.llmUsageStats?.outputTokens || 0),
            cost: task.llmUsageStats?.costBreakdown?.total || 0,
            time: task.duration || 0,
            memory: task.llmUsageStats?.memoryUtilization?.peakMemoryUsage || 0
        };
    },

    formatDuration: (milliseconds: number): string => {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }
};

// Task tracking type guards
export const TaskTrackingTypeGuards = {
    isTaskProgress: (value: unknown): value is TaskProgress => {
        return (
            typeof value === 'object' &&
            value !== null &&
            'taskId' in value &&
            'status' in value &&
            'progress' in value &&
            'timeElapsed' in value
        );
    },

    isTaskHistoryEntry: (value: unknown): value is TaskHistoryEntry => {
        return (
            typeof value === 'object' &&
            value !== null &&
            'timestamp' in value &&
            'eventType' in value
        );
    },

    isTaskDependencyTracking: (value: unknown): value is TaskDependencyTracking => {
        return (
            typeof value === 'object' &&
            value !== null &&
            'taskId' in value &&
            'dependencies' in value &&
            'dependents' in value &&
            'status' in value
        );
    }
};
