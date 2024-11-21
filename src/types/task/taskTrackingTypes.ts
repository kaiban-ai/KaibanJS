/**
 * @file taskTrackingTypes.ts
 * @path KaibanJS/src/types/task/taskTrackingTypes.ts
 * @description Task tracking, metrics, and monitoring type definitions
 *
 * @module types/task
 */

import type { ILLMUsageStats } from '../llm/llmResponseTypes';
import type { TASK_STATUS_enum } from '../common/commonEnums';
import type { ITaskType } from './taskBaseTypes';

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
    taskId: string;
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

// ─── Task Dependency Types ──────────────────────────────────────────────────────

/**
 * Task dependency tracking
 */
export interface ITaskDependencyTracking {
    taskId: string;
    dependencies: {
        taskId: string;
        status: string;
        required: boolean;
    }[];
    dependents: {
        taskId: string;
        status: string;
        blocking: boolean;
    }[];
    status: 'pending' | 'satisfied' | 'blocked';
}

// ─── Task Audit Types ─────────────────────────────────────────────────────────

/**
 * Task audit record
 */
export interface ITaskAuditRecord {
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

// ─── Task Tracking Utils ────────────────────────────────────────────────────────

/**
 * Task tracking utility functions
 */
export const TaskTrackingUtils = {
    /**
     * Calculate task progress percentage
     */
    calculateProgress: (task: ITaskType): number => {
        if (task.status === 'DONE') return 100;
        if (task.status === 'PENDING') return 0;
        
        if (task.metrics.iterationCount !== undefined) {
            const maxIterations = 10; // Default max iterations
            return Math.min((task.metrics.iterationCount / maxIterations) * 100, 99);
        }

        const statusProgress: Record<string, number> = {
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

    /**
     * Format duration for display
     */
    formatDuration: (milliseconds: number): string => {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    },

    /**
     * Initialize task metrics
     */
    initializeMetrics: (): ITaskMetrics => {
        const now = Date.now();
        return {
            startTime: now,
            endTime: now,
            duration: 0,
            iterationCount: 0,
            resources: {
                memory: 0,
                cpu: 0,
                tokens: 0
            },
            performance: {
                averageIterationTime: 0,
                averageTokensPerSecond: 0,
                peakMemoryUsage: 0
            },
            costs: {
                input: 0,
                output: 0,
                total: 0,
                currency: 'USD'
            },
            llmUsage: {
                inputTokens: 0,
                outputTokens: 0,
                callsCount: 0,
                callsErrorCount: 0,
                parsingErrors: 0,
                totalLatency: 0,
                averageLatency: 0,
                lastUsed: now,
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
    }
};

// ─── Type Guards ────────────────────────────────────────────────────────────────

export const TaskTrackingTypeGuards = {
    /**
     * Check if value is task metrics
     */
    isTaskMetrics: (value: unknown): value is ITaskMetrics => {
        if (typeof value !== 'object' || value === null) return false;
        const metrics = value as Partial<ITaskMetrics>;
        return (
            typeof metrics.startTime === 'number' &&
            typeof metrics.endTime === 'number' &&
            typeof metrics.duration === 'number' &&
            typeof metrics.iterationCount === 'number' &&
            'resources' in metrics &&
            'performance' in metrics &&
            'costs' in metrics &&
            'llmUsage' in metrics
        );
    },

    /**
     * Check if value is task progress
     */
    isTaskProgress: (value: unknown): value is ITaskProgress => {
        if (typeof value !== 'object' || value === null) return false;
        const progress = value as Partial<ITaskProgress>;
        return (
            typeof progress.taskId === 'string' &&
            'status' in progress &&
            typeof progress.progress === 'number' &&
            typeof progress.timeElapsed === 'number'
        );
    },

    /**
     * Check if value is task history entry
     */
    isTaskHistoryEntry: (value: unknown): value is ITaskHistoryEntry => {
        if (typeof value !== 'object' || value === null) return false;
        const entry = value as Partial<ITaskHistoryEntry>;
        return (
            typeof entry.timestamp === 'number' &&
            typeof entry.eventType === 'string'
        );
    },

    /**
     * Check if value is task dependency tracking
     */
    isTaskDependencyTracking: (value: unknown): value is ITaskDependencyTracking => {
        if (typeof value !== 'object' || value === null) return false;
        const tracking = value as Partial<ITaskDependencyTracking>;
        return (
            typeof tracking.taskId === 'string' &&
            Array.isArray(tracking.dependencies) &&
            Array.isArray(tracking.dependents) &&
            'status' in tracking
        );
    },

    /**
     * Check if value is task audit record
     */
    isTaskAuditRecord: (value: unknown): value is ITaskAuditRecord => {
        if (typeof value !== 'object' || value === null) return false;
        const record = value as Partial<ITaskAuditRecord>;
        return (
            typeof record.taskId === 'string' &&
            typeof record.timestamp === 'number' &&
            typeof record.action === 'string' &&
            typeof record.actor === 'string' &&
            Array.isArray(record.changes)
        );
    }
};
