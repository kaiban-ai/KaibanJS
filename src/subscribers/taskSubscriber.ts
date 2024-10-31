/**
 * Path: src/subscribers/taskSubscriber.ts
 */

import { UseBoundStore } from 'zustand';
import { getTaskTitleForLogs } from '@/utils/tasks';
import { logPrettyTaskCompletion, logPrettyTaskStatus } from "@/utils/helpers/prettyLogs";
import { TASK_STATUS_enum } from '@/utils/core/enums';
import { logger } from "@/utils/core/logger";
import type {
    TaskType,
    TeamStoreApi,
    TaskMetadata,
    Log
} from '@/utils/types';

/**
 * Type guard to check if the metadata matches TaskMetadata structure
 */
function isTaskMetadata(metadata: unknown): metadata is TaskMetadata {
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
                llmUsageStats: log.metadata.llmUsageStats,
                iterationCount: log.metadata.iterationCount,
                duration: log.metadata.duration,
                agentName: log.agent?.name || '',
                agentModel: log.agent?.llmConfig.model || '',
                taskTitle: getTaskTitleForLogs(log.task),
                currentTaskNumber,
                costDetails: log.metadata.costDetails,
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
    store: UseBoundStore<TeamStoreApi>
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