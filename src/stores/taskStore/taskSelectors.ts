/**
 * @file taskSelectors.ts
 * @path src/stores/taskStore/taskSelectors.ts
 */

import type { ITaskState } from '../../types/task/taskStore';
import type { TaskType } from '../../types/task/taskBase';
import type { AgentType } from '../../types/agent/agentBaseTypes';
import { TASK_STATUS_enum } from '../../types/common/commonEnums';

export const createTaskSelectors = () => ({
    getTaskById: (state: ITaskState) => (taskId: string): TaskType | undefined =>
        state.tasks.find(task => task.id === taskId),

    getActiveTasks: (state: ITaskState): TaskType[] =>
        state.activeTasks,

    getTasksByStatus: (state: ITaskState) => (status: keyof typeof TASK_STATUS_enum): TaskType[] =>
        state.tasks.filter(task => 
            state.executionState[task.id]?.status === status
        ),

    getTasksByAgent: (state: ITaskState) => (agentId: string): TaskType[] =>
        state.tasks.filter(task => 
            task.agent.id === agentId
        ),

    getTaskProgress: (state: ITaskState) => (taskId: string): number | undefined =>
        state.executionState[taskId]?.progress,

    getTaskErrors: (state: ITaskState) => (taskId: string): Error[] =>
        state.errors.filter(error => 
            error instanceof Error && 
            'taskId' in error && 
            (error as any).taskId === taskId
        ),

    getTaskMetrics: (state: ITaskState) => (taskId: string) => {
        const stats = state.performanceStats[taskId];
        const executionState = state.executionState[taskId];
        
        if (!stats || !executionState) return undefined;

        return {
            duration: executionState.endTime 
                ? executionState.endTime.getTime() - executionState.startTime!.getTime() 
                : undefined,
            ...stats
        };
    },

    getBlockedTasks: (state: ITaskState): TaskType[] =>
        state.tasks.filter(task => 
            state.executionState[task.id]?.status === TASK_STATUS_enum.BLOCKED
        ),

    getTasksByPriority: (state: ITaskState): TaskType[] =>
        [...state.tasks].sort((a, b) => 
            (state.metadata[b.id]?.priority || 0) - 
            (state.metadata[a.id]?.priority || 0)
        )
});

export type TaskSelectors = ReturnType<typeof createTaskSelectors>;