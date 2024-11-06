/**
 * @file utils.ts
 * @path src/utils/types/task/utils.ts
 * @description Task utility types and helper functions
 */

import { TaskType } from './base';
import { TaskProgress, TaskMetrics, TaskHistoryEntry, TaskDependencyTracking, TaskAuditRecord, TaskTrackingUtils } from './tracking';

/**
 * Composite type combining common task interfaces
 */
export type ComprehensiveTaskType = TaskType & {
    progress?: TaskProgress;
    metrics?: TaskMetrics;
    history?: TaskHistoryEntry[];
    dependencies?: TaskDependencyTracking;
    audit?: TaskAuditRecord[];
};

/**
 * Helper function to check if a task has tracking data
 */
export function hasTrackingData(task: TaskType): task is ComprehensiveTaskType {
    return (
        'progress' in task ||
        'metrics' in task ||
        'history' in task ||
        'dependencies' in task ||
        'audit' in task
    );
}

/**
 * Helper function to convert a basic task to a comprehensive task
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
                cpu: 0, // CPU usage would need to be tracked separately if needed
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