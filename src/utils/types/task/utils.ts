/**
 * @file utils.ts
 * @path KaibanJS/src/utils/types/task/utils.ts
 * @description Task utility types and helper interfaces
 *
 * @module @types/task
 */

import { TaskType } from './base';
import { 
    TaskProgress, 
    TaskMetrics, 
    TaskHistoryEntry, 
    TaskDependencyTracking, 
    TaskAuditRecord,
    TaskTrackingUtils 
} from './tracking';

// ─── Composite Task Types ───────────────────────────────────────────────────────

/** 
 * Enhanced task type combining all tracking interfaces 
 */
export type ComprehensiveTaskType = TaskType & {
    progress?: TaskProgress;
    metrics?: TaskMetrics;
    history?: TaskHistoryEntry[];
    dependencies?: TaskDependencyTracking;
    audit?: TaskAuditRecord[];
};

// ─── Task Operation Types ───────────────────────────────────────────────────────

/**
 * Task interpolation options
 */
export interface TaskInterpolationOptions {
    /** Custom template pattern */
    pattern?: string | RegExp;
    /** Whether to throw on missing variables */
    strict?: boolean;
    /** Custom transformer function */
    transform?: (value: unknown) => string;
}

/**
 * Task description template
 */
export interface TaskDescriptionTemplate {
    /** Template string */
    template: string;
    /** Variable mappings */
    variables: Record<string, unknown>;
    /** Interpolation options */
    options?: TaskInterpolationOptions;
}

// ─── Type Guards ────────────────────────────────────────────────────────────────

export const TaskUtilTypeGuards = {
    /**
     * Check if task has tracking data
     */
    hasTrackingData: (task: TaskType): task is ComprehensiveTaskType => {
        return (
            'progress' in task ||
            'metrics' in task ||
            'history' in task ||
            'dependencies' in task ||
            'audit' in task
        );
    },

    /**
     * Check if value is task description template
     */
    isTaskDescriptionTemplate: (value: unknown): value is TaskDescriptionTemplate => {
        if (typeof value !== 'object' || value === null) return false;
        const template = value as Partial<TaskDescriptionTemplate>;
        return (
            typeof template.template === 'string' &&
            template.variables !== undefined &&
            typeof template.variables === 'object'
        );
    }
};

// ─── Task Operation Functions ─────────────────────────────────────────────────

/**
 * Convert basic task to comprehensive task
 */
export function enrichTaskWithTracking(task: TaskType): ComprehensiveTaskType {
    return {
        ...task,
        progress: {
            taskId: task.id,
            status: task.status,
            progress: TaskTrackingUtils.calculateProgress(task),
            timeElapsed: (task.endTime || Date.now()) - (task.startTime || Date.now()),
            currentIteration: task.iterationCount,
            resourceUsage: {
                memory: task.llmUsageStats?.memoryUtilization?.peakMemoryUsage || 0,
                cpu: 0,
                tokens: (task.llmUsageStats?.inputTokens || 0) + (task.llmUsageStats?.outputTokens || 0)
            }
        },
        metrics: {
            executionTime: task.duration || 0,
            tokenUsage: {
                input: task.llmUsageStats?.inputTokens || 0,
                output: task.llmUsageStats?.outputTokens || 0,
                total: (task.llmUsageStats?.inputTokens || 0) + (task.llmUsageStats?.outputTokens || 0)
            },
            costs: {
                input: task.llmUsageStats?.costBreakdown?.input || 0,
                output: task.llmUsageStats?.costBreakdown?.output || 0,
                total: task.llmUsageStats?.costBreakdown?.total || 0,
                currency: task.llmUsageStats?.costBreakdown?.currency || 'USD'
            },
            performance: {
                averageIterationTime: task.duration ? task.duration / (task.iterationCount || 1) : 0,
                averageTokensPerSecond: task.duration ? 
                    ((task.llmUsageStats?.inputTokens || 0) + (task.llmUsageStats?.outputTokens || 0)) / (task.duration / 1000) : 0,
                peakMemoryUsage: task.llmUsageStats?.memoryUtilization?.peakMemoryUsage || 0
            },
            errors: {
                count: task.error ? 1 : 0,
                types: task.error ? { [task.error]: 1 } : {},
                retries: 0
            }
        },
        history: [],
        dependencies: {
            taskId: task.id,
            dependencies: [],
            dependents: [],
            status: 'satisfied'
        },
        audit: [{
            taskId: task.id,
            timestamp: Date.now(),
            action: 'TASK_ENRICHED',
            actor: 'system',
            changes: [{
                field: 'tracking',
                oldValue: null,
                newValue: 'added'
            }]
        }]
    };
}

export { TaskTrackingUtils };