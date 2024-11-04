/**
 * Path: src/subscribers/taskSubscriber.ts
 */

import { UseBoundStore } from 'zustand';
import { getTaskTitleForLogs } from '@/utils/helpers/tasks';
import { logPrettyTaskCompletion, logPrettyTaskStatus } from "@/utils/helpers/formatting/prettyLogs";
import { TASK_STATUS_enum } from "@/utils/types/common/enums";
import { logger } from "@/utils/core/logger";

// Import types from their specific locations
import type { TaskType } from '@/utils/types/task/base';
import type { TeamStore } from '@/utils/types/team/base';
import type { 
    Log, 
    TaskLogMetadata 
} from '@/utils/types/team/logs';
import type { LLMUsageStats } from '@/utils/types/llm/responses';
import type { CostDetails } from '@/utils/types/workflow/stats';

// Default values for required stats
const DEFAULT_LLM_STATS: LLMUsageStats = {
    inputTokens: 0,
    outputTokens: 0,
    callsCount: 0,
    callsErrorCount: 0,
    parsingErrors: 0,
    totalLatency: 0,
    averageLatency: 0,
    lastUsed: Date.now(),
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
};

const DEFAULT_COST_DETAILS: CostDetails = {
    inputCost: 0,
    outputCost: 0,
    totalCost: 0,
    currency: 'USD',
    breakdown: {
        promptTokens: { count: 0, cost: 0 },
        completionTokens: { count: 0, cost: 0 }
    }
};

/**
 * Type guard to check if metadata matches TaskLogMetadata structure
 */
function isTaskMetadata(metadata: unknown): metadata is TaskLogMetadata {
    if (!metadata || typeof metadata !== 'object') {
        return false;
    }

    const m = metadata as any;
    return (
        'llmUsageStats' in m &&
        'iterationCount' in m &&
        'duration' in m &&
        'costDetails' in m &&
        typeof m.iterationCount === 'number' &&
        typeof m.duration === 'number' &&
        typeof m.llmUsageStats === 'object' &&
        m.llmUsageStats !== null &&
        typeof m.costDetails === 'object' &&
        m.costDetails !== null
    );
}

/**
 * Handle individual task status updates
 */
const handleTaskStatusUpdate = (
    log: Log,
    totalTasks: number,
    currentTaskNumber: number
): void => {
    if (!log.task) {
        logger.warn('Task status update received without task information');
        return;
    }

    switch (log.task.status) {
        case TASK_STATUS_enum.DONE: {
            if (!isTaskMetadata(log.metadata)) {
                logger.error('Invalid metadata format for task completion:', log.metadata);
                return;
            }

            logPrettyTaskCompletion({
                llmUsageStats: log.metadata.llmUsageStats || DEFAULT_LLM_STATS,
                iterationCount: log.metadata.iterationCount || 0,
                duration: log.metadata.duration || 0,
                agentName: log.agent?.name || '',
                agentModel: log.agent?.llmConfig.model || '',
                taskTitle: getTaskTitleForLogs(log.task),
                currentTaskNumber,
                costDetails: log.metadata.costDetails || DEFAULT_COST_DETAILS,
                totalTasks
            });
            break;
        }
        case TASK_STATUS_enum.DOING:
        case TASK_STATUS_enum.BLOCKED:
        case TASK_STATUS_enum.REVISE:
        case TASK_STATUS_enum.AWAITING_VALIDATION:
        case TASK_STATUS_enum.VALIDATED:
        case TASK_STATUS_enum.TODO:
        case TASK_STATUS_enum.PENDING:
            logPrettyTaskStatus({
                currentTaskNumber,
                totalTasks,
                taskTitle: getTaskTitleForLogs(log.task),
                taskStatus: log.task.status,
                agentName: log.agent?.name || ''
            });
            break;
        default:
            logger.warn(`Encountered an unexpected task status: ${log.task.status}`);
            break;
    }
};

/**
 * Subscribe to task status updates
 * @param store The team store instance
 * @returns Cleanup function to unsubscribe
 */
export const subscribeTaskStatusUpdates = (
    store: UseBoundStore<TeamStore>
): (() => void) => {
    try {
        return store.subscribe((state) => {
            const newLogs = state.workflowLogs;
            const previousLogs = newLogs.slice(0, -1);

            if (newLogs.length > previousLogs.length) {
                const newLog = newLogs[newLogs.length - 1];

                if (newLog.logType === 'TaskStatusUpdate' && newLog.task) {
                    const totalTasks = state.tasks.length;
                    const taskIndex = state.tasks.findIndex(
                        (t: TaskType) => t.id === newLog.task?.id
                    );
                    const currentTaskNumber = taskIndex + 1;

                    handleTaskStatusUpdate(newLog, totalTasks, currentTaskNumber);
                }
            }
        });
    } catch (error) {
        logger.error('Error setting up task status subscription:', error);
        return () => {};
    }
};