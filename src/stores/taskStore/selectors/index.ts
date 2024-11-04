/**
 * @file index.ts
 * @path src/stores/taskStore/selectors/index.ts
 * @description Task store selectors for retrieving and computing state
 */

import { TaskType, AgentType, Log } from '@/utils/types';
import { TASK_STATUS_enum, AGENT_STATUS_enum } from '@/utils/types/common/enums';
import { TaskStoreState } from '../state';

/**
 * Task-related selectors
 */
export const taskSelectors = {
    /**
     * Get task by ID
     */
    getTaskById: (state: TaskStoreState) => (taskId: string): TaskType | undefined => 
        state.tasks.find(task => task.id === taskId),

    /**
     * Get all tasks
     */
    getAllTasks: (state: TaskStoreState): TaskType[] => 
        state.tasks,

    /**
     * Get tasks by status
     */
    getTasksByStatus: (state: TaskStoreState) => (status: keyof typeof TASK_STATUS_enum): TaskType[] => 
        state.tasks.filter(task => task.status === status),

    /**
     * Get current active task
     */
    getCurrentTask: (state: TaskStoreState): TaskType | null => 
        state.currentTask,

    /**
     * Get tasks assigned to specific agent
     */
    getTasksForAgent: (state: TaskStoreState) => (agentId: string): TaskType[] => 
        state.tasks.filter(task => task.agent?.id === agentId),

    /**
     * Get tasks by deliverable status
     */
    getDeliverableTasks: (state: TaskStoreState): TaskType[] =>
        state.tasks.filter(task => task.isDeliverable),

    /**
     * Get tasks requiring validation
     */
    getTasksNeedingValidation: (state: TaskStoreState): TaskType[] =>
        state.tasks.filter(task => 
            task.externalValidationRequired && 
            task.status === TASK_STATUS_enum.AWAITING_VALIDATION
        ),

    /**
     * Get task completion percentage
     */
    getTaskCompletionPercentage: (state: TaskStoreState): number => {
        const totalTasks = state.tasks.length;
        if (totalTasks === 0) return 0;

        const completedTasks = state.tasks.filter(task => 
            task.status === TASK_STATUS_enum.DONE || 
            task.status === TASK_STATUS_enum.VALIDATED
        ).length;

        return (completedTasks / totalTasks) * 100;
    },

    /**
     * Get tasks with errors
     */
    getErroredTasks: (state: TaskStoreState): TaskType[] =>
        state.tasks.filter(task => task.status === TASK_STATUS_enum.ERROR)
};

/**
 * Log-related selectors
 */
export const logSelectors = {
    /**
     * Get logs for specific task
     */
    getLogsForTask: (state: TaskStoreState) => (taskId: string): Log[] => 
        state.workflowLogs.filter(log => log.task?.id === taskId),

    /**
     * Get logs for specific agent
     */
    getLogsForAgent: (state: TaskStoreState) => (agentId: string): Log[] => 
        state.workflowLogs.filter(log => log.agent?.id === agentId),

    /**
     * Get logs by status
     */
    getLogsByStatus: (state: TaskStoreState) => (status: keyof typeof AGENT_STATUS_enum): Log[] => 
        state.workflowLogs.filter(log => log.agentStatus === status),

    /**
     * Get recent logs with limit
     */
    getRecentLogs: (state: TaskStoreState) => (limit: number): Log[] => 
        [...state.workflowLogs]
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit),

    /**
     * Get error logs
     */
    getErrorLogs: (state: TaskStoreState): Log[] =>
        state.workflowLogs.filter(log => 
            log.metadata?.error !== undefined
        )
};

/**
 * Stats-related selectors
 */
export const statsSelectors = {
    /**
     * Get total LLM usage stats
     */
    getTotalLLMStats: (state: TaskStoreState) => 
        state.stats.llmUsageStats,

    /**
     * Get cost details
     */
    getCostDetails: (state: TaskStoreState) => 
        state.stats.costDetails,

    /**
     * Get task performance metrics
     */
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

    /**
     * Get workflow progress
     */
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

/**
 * Agent-related selectors
 */
export const agentSelectors = {
    /**
     * Get agent by ID
     */
    getAgentById: (state: TaskStoreState) => (agentId: string): AgentType | undefined => 
        state.agents.find(agent => agent.id === agentId),

    /**
     * Get agents by status
     */
    getAgentsByStatus: (state: TaskStoreState) => (status: keyof typeof AGENT_STATUS_enum): AgentType[] => 
        state.agents.filter(agent => agent.status === status),

    /**
     * Get all available agent tools
     */
    getAllAgentTools: (state: TaskStoreState): string[] => 
        Array.from(new Set(
            state.agents.flatMap(agent => 
                agent.tools.map(tool => tool.name)
            )
        ))
};

/**
 * Export combined selectors
 */
export const selectors = {
    ...taskSelectors,
    ...logSelectors,
    ...statsSelectors,
    ...agentSelectors
};

/**
 * Type for selectors
 */
export type Selectors = typeof selectors;