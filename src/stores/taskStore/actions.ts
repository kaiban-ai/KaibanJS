/**
 * @file actions.ts
 * @path src/stores/taskStore/actions.ts
 * @description Task store actions
 */

import type { ITaskState, ITaskMetadata } from '@/utils/types/task/store';
import type { TaskType } from '@/utils/types/task/base';
import type { AgentType } from '@/utils/types/agent/base';
import type { TASK_STATUS_enum } from '@/utils/types/common/enums';
import { PrettyError } from '@/utils/core/errors';

// Task management actions
export const addTask = (state: ITaskState, task: TaskType) => ({
    tasks: [...state.tasks, task],
    metadata: {
        ...state.metadata,
        [task.id]: {
            id: task.id,
            name: task.name,
            priority: 1,
            created: new Date()
        }
    },
    executionState: {
        ...state.executionState,
        [task.id]: {
            status: 'pending' as keyof typeof TASK_STATUS_enum,
            retryCount: 0,
            progress: 0
        }
    },
    performanceStats: {
        ...state.performanceStats,
        [task.id]: {
            retryCount: 0,
            tokenCount: 0,
            cost: 0
        }
    }
});

export const removeTask = (state: ITaskState, taskId: string) => {
    const { [taskId]: _, ...remainingMetadata } = state.metadata;
    const { [taskId]: __, ...remainingExecutionState } = state.executionState;
    const { [taskId]: ___, ...remainingPerformanceStats } = state.performanceStats;
    
    return {
        tasks: state.tasks.filter(t => t.id !== taskId),
        activeTasks: state.activeTasks.filter(t => t.id !== taskId),
        metadata: remainingMetadata,
        executionState: remainingExecutionState,
        performanceStats: remainingPerformanceStats
    };
};

// Task execution actions
export const startTask = (state: ITaskState, taskId: string, agent: AgentType) => {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) throw new PrettyError('Task not found');

    return {
        activeTasks: [...state.activeTasks, task],
        executionState: {
            ...state.executionState,
            [taskId]: {
                ...state.executionState[taskId],
                status: 'running' as keyof typeof TASK_STATUS_enum,
                assignedAgent: agent,
                startTime: new Date(),
                progress: 0
            }
        }
    };
};

export const completeTask = (state: ITaskState, taskId: string) => {
    const endTime = new Date();
    const startTime = state.executionState[taskId]?.startTime;

    return {
        activeTasks: state.activeTasks.filter(t => t.id !== taskId),
        executionState: {
            ...state.executionState,
            [taskId]: {
                ...state.executionState[taskId],
                status: 'completed' as keyof typeof TASK_STATUS_enum,
                endTime,
                progress: 100
            }
        },
        performanceStats: {
            ...state.performanceStats,
            [taskId]: {
                ...state.performanceStats[taskId],
                duration: startTime ? endTime.getTime() - startTime.getTime() : undefined
            }
        }
    };
};

export const failTask = (state: ITaskState, taskId: string, error: Error) => ({
    activeTasks: state.activeTasks.filter(t => t.id !== taskId),
    executionState: {
        ...state.executionState,
        [taskId]: {
            ...state.executionState[taskId],
            status: 'failed' as keyof typeof TASK_STATUS_enum,
            lastError: error,
            retryCount: (state.executionState[taskId]?.retryCount ?? 0) + 1
        }
    }
});

// Task update actions
export const updateTaskProgress = (state: ITaskState, taskId: string, progress: number) => ({
    executionState: {
        ...state.executionState,
        [taskId]: {
            ...state.executionState[taskId],
            progress: Math.min(Math.max(progress, 0), 100)
        }
    }
});

export const updateTaskPriority = (state: ITaskState, taskId: string, priority: number) => ({
    metadata: {
        ...state.metadata,
        [taskId]: {
            ...state.metadata[taskId],
            priority
        }
    }
});

export const updateTaskMetadata = (
    state: ITaskState,
    taskId: string,
    metadata: Partial<ITaskMetadata>
) => ({
    metadata: {
        ...state.metadata,
        [taskId]: {
            ...state.metadata[taskId],
            ...metadata
        }
    }
});

// Error handling actions
export const addTaskError = (state: ITaskState, error: Error, taskId?: string) => ({
    errors: [...state.errors, error],
    ...(taskId && {
        executionState: {
            ...state.executionState,
            [taskId]: {
                ...state.executionState[taskId],
                lastError: error,
                status: 'error' as keyof typeof TASK_STATUS_enum
            }
        }
    })
});

export const clearTaskErrors = () => ({
    errors: []
});