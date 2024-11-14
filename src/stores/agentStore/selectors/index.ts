/**
 * @file index.ts
 * @path KaibanJS/src/stores/agentStore/selectors/index.ts
 * @description State selectors for agent store
 */

import { TaskType, AgentType, Log, LLMUsageStats, CostDetails } from '@/utils/types';
import { AGENT_STATUS_enum, TASK_STATUS_enum } from '@/utils/types/common/enums';
import { calculateTaskCost } from '@/utils/helpers/costs/llmCostCalculator';
import { AgentState } from '../state';

// Agent selectors
export const agentSelectors = {
    // Get agent by ID
    getAgentById: (state: AgentState) => (agentId: string): AgentType | undefined => 
        state.agents.find(agent => agent.id === agentId),

    // Get agents by status
    getAgentsByStatus: (state: AgentState) => (status: keyof typeof AGENT_STATUS_enum): AgentType[] => 
        state.agents.filter(agent => agent.status === status),

    // Get current active agent
    getCurrentAgent: (state: AgentState): AgentType | null => 
        state.currentAgent,

    // Get all available agent tools
    getAllAgentTools: (state: AgentState): string[] => 
        Array.from(new Set(
            state.agents.flatMap(agent => 
                agent.tools.map(tool => tool.name)
            )
        ))
};

// Task selectors
export const taskSelectors = {
    // Get task by ID
    getTaskById: (state: AgentState) => (taskId: string): TaskType | undefined => 
        state.tasks.find(task => task.id === taskId),

    // Get tasks by status
    getTasksByStatus: (state: AgentState) => (status: keyof typeof TASK_STATUS_enum): TaskType[] => 
        state.tasks.filter(task => task.status === status),

    // Get current active task
    getCurrentTask: (state: AgentState): TaskType | null => 
        state.currentTask,

    // Get tasks for specific agent
    getTasksForAgent: (state: AgentState) => (agentId: string): TaskType[] => 
        state.tasks.filter(task => task.agent.id === agentId)
};

// Log selectors
export const logSelectors = {
    // Get logs for specific task
    getLogsForTask: (state: AgentState) => (taskId: string): Log[] => 
        state.workflowLogs.filter(log => log.task?.id === taskId),

    // Get logs for specific agent
    getLogsForAgent: (state: AgentState) => (agentId: string): Log[] => 
        state.workflowLogs.filter(log => log.agent?.id === agentId),

    // Get logs by status
    getLogsByStatus: (state: AgentState) => (status: keyof typeof AGENT_STATUS_enum): Log[] => 
        state.workflowLogs.filter(log => log.agentStatus === status),

    // Get recent logs with limit
    getRecentLogs: (state: AgentState) => (limit: number): Log[] => 
        [...state.workflowLogs]
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit)
};

// Stats selectors
export const statsSelectors = {
    // Get total LLM usage stats
    getTotalLLMStats: (state: AgentState): LLMUsageStats => 
        state.stats.llmUsageStats,

    // Get cost details
    getCostDetails: (state: AgentState): CostDetails => 
        state.stats.costDetails,

    // Get agent performance metrics
    getAgentMetrics: (state: AgentState) => (agentId: string) => {
        const agent = agentSelectors.getAgentById(state)(agentId);
        if (!agent) return null;

        const agentLogs = logSelectors.getLogsForAgent(state)(agentId);
        const tasks = taskSelectors.getTasksForAgent(state)(agentId);

        return {
            totalTasks: tasks.length,
            completedTasks: tasks.filter(task => 
                task.status === 'DONE' || task.status === 'VALIDATED'
            ).length,
            errorCount: state.stats.errorCount,
            averageLatency: state.stats.averageLatency,
            successRate: calculateSuccessRate(tasks),
            costDetails: calculateTaskCost(
                agent.llmConfig.model,
                state.stats.llmUsageStats
            )
        };
    },

    // Get current workflow progress
    getWorkflowProgress: (state: AgentState) => {
        const totalTasks = state.tasks.length;
        const completedTasks = state.tasks.filter(task => 
            task.status === 'DONE' || task.status === 'VALIDATED'
        ).length;

        return {
            totalTasks,
            completedTasks,
            progressPercentage: (completedTasks / totalTasks) * 100,
            remainingTasks: totalTasks - completedTasks,
            currentStatus: state.status
        };
    }
};

// Calculate task success rate
function calculateSuccessRate(tasks: TaskType[]): number {
    if (tasks.length === 0) return 0;

    const successfulTasks = tasks.filter(task => 
        task.status === 'DONE' || task.status === 'VALIDATED'
    ).length;

    return (successfulTasks / tasks.length) * 100;
}

// Export combined selectors
export const selectors = {
    ...agentSelectors,
    ...taskSelectors,
    ...logSelectors,
    ...statsSelectors,
};

// Type for combined selectors
export type Selectors = typeof selectors;
