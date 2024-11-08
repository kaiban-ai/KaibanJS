/**
 * @file index.ts
 * @path src/stores/taskStore/selectors/index.ts
 * @description Task store selectors for retrieving and computing state
 */

import { TaskType, AgentType, Log } from '@/utils/types';
import { TASK_STATUS_enum, AGENT_STATUS_enum } from '@/utils/types/common/enums';
import { TaskStoreState } from '../state';

// Task selectors
export const taskSelectors = {
    getTaskById: (state: TaskStoreState) => (taskId: string): TaskType | undefined => 
        state.tasks.find(task => task.id === taskId),

    getAllTasks: (state: TaskStoreState): TaskType[] => 
        state.tasks,

    getTasksByStatus: (state: TaskStoreState) => (status: keyof typeof TASK_STATUS_enum): TaskType[] => 
        state.tasks.filter(task => task.status === status),

    getCurrentTask: (state: TaskStoreState): TaskType | null => 
        state.currentTask,

    getTasksForAgent: (state: TaskStoreState) => (agentId: string): TaskType[] => 
        state.tasks.filter(task => task.agent?.id === agentId),

    getDeliverableTasks: (state: TaskStoreState): TaskType[] =>
        state.tasks.filter(task => task.isDeliverable),

    getTasksNeedingValidation: (state: TaskStoreState): TaskType[] =>
        state.tasks.filter(task => 
            task.externalValidationRequired && 
            task.status === TASK_STATUS_enum.AWAITING_VALIDATION
        ),

    getTaskCompletionPercentage: (state: TaskStoreState): number => {
        const totalTasks = state.tasks.length;
        if (totalTasks === 0) return 0;

        const completedTasks = state.tasks.filter(task => 
            task.status === TASK_STATUS_enum.DONE || 
            task.status === TASK_STATUS_enum.VALIDATED
        ).length;

        return (completedTasks / totalTasks) * 100;
    },

    getErroredTasks: (state: TaskStoreState): TaskType[] =>
        state.tasks.filter(task => task.status === TASK_STATUS_enum.ERROR)
};

// Log selectors
export const logSelectors = {
    getLogsForTask: (state: TaskStoreState) => (taskId: string): Log[] => 
        state.workflowLogs.filter(log => log.task?.id === taskId),

    getLogsForAgent: (state: TaskStoreState) => (agentId: string): Log[] => 
        state.workflowLogs.filter(log => log.agent?.id === agentId),

    getLogsByStatus: (state: TaskStoreState) => (status: keyof typeof AGENT_STATUS_enum): Log[] => 
        state.workflowLogs.filter(log => log.agentStatus === status),

    getRecentLogs: (state: TaskStoreState) => (limit: number): Log[] => 
        [...state.workflowLogs]
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit),

    getErrorLogs: (state: TaskStoreState): Log[] =>
        state.workflowLogs.filter(log => 
            log.metadata?.error !== undefined
        )
};

// Stats selectors
export const statsSelectors = {
    getTotalLLMStats: (state: TaskStoreState) => 
        state.stats.llmUsageStats,

    getCostDetails: (state: TaskStoreState) => 
        state.stats.costDetails,

    getTaskMetrics: (state: TaskStoreState) => (taskId: string) => {
        const task = taskSelectors.getTaskById(state)(taskId);
        if (!task) return null;

        const taskLogs = logSelectors.getLogsForTask(state)(taskId);
        return {
            totalIterations: taskLogs.filter(log => 
                log.agentStatus === AGENT_STATUS_enum.ITERATION_END
            ).length,
            errorCount: taskLogs.filter(log => 
                log.metadata?.error !== undefined
            ).length,
            duration: task.duration || 0,
            completionStatus: task.status,
            llmStats: task.llmUsageStats
        };
    },

    getWorkflowProgress: (state: TaskStoreState) => {
        const totalTasks = state.tasks.length;
        const completedTasks = state.tasks.filter(task => 
            task.status === TASK_STATUS_enum.DONE || 
            task.status === TASK_STATUS_enum.VALIDATED
        ).length;

        return {
            totalTasks,
            completedTasks,
            progressPercentage: (completedTasks / totalTasks) * 100,
            remainingTasks: totalTasks - completedTasks
        };
    }
};

// Agent selectors
export const agentSelectors = {
    getAgentById: (state: TaskStoreState) => (agentId: string): AgentType | undefined => 
        state.agents.find(agent => agent.id === agentId),

    getAgentsByStatus: (state: TaskStoreState) => (status: keyof typeof AGENT_STATUS_enum): AgentType[] => 
        state.agents.filter(agent => agent.status === status),

    getAllAgentTools: (state: TaskStoreState): string[] => 
        Array.from(new Set(
            state.agents.flatMap(agent => 
                agent.tools.map(tool => tool.name)
            )
        ))
};

// Combined selectors
export const selectors = {
    ...taskSelectors,
    ...logSelectors,
    ...statsSelectors,
    ...agentSelectors
};

// Selectors type
export type Selectors = typeof selectors;
