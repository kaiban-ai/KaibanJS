/**
 * @file index.ts
 * @path KaibanJS/src/stores/teamStore/selectors/index.ts
 * @description Selectors for accessing and computing team store state
 */

import { calculateTaskStats } from '@/utils/helpers/stats';
import { calculateTotalWorkflowCost } from '@/utils/helpers/costs/llmCostCalculator';
import type { 
    TeamState, 
    TaskType, 
    AgentType, 
    WorkflowStats, 
    TaskStats,
    Log 
} from '@/utils/types';

/* Core state selectors */
export const selectors = {
    getWorkflowStatus: (state: TeamState) => state.teamWorkflowStatus,
    getWorkflowResult: (state: TeamState) => state.workflowResult,
    getAgents: (state: TeamState) => state.agents,
    getTasks: (state: TeamState) => state.tasks,
    getWorkflowLogs: (state: TeamState) => state.workflowLogs,
    getInputs: (state: TeamState) => state.inputs,
    getWorkflowContext: (state: TeamState) => state.workflowContext,
    getEnv: (state: TeamState) => state.env,
    getLogLevel: (state: TeamState) => state.logLevel
};

/* Computed selectors */
export const computedSelectors = {
    getAgentById: (state: TeamState, agentId: string) => 
        state.agents.find(agent => agent.id === agentId),

    getTaskById: (state: TeamState, taskId: string) =>
        state.tasks.find(task => task.id === taskId),

    getTasksByAgentId: (state: TeamState, agentId: string) =>
        state.tasks.filter(task => task.agent?.id === agentId),

    getTasksByStatus: (state: TeamState, status: string) =>
        state.tasks.filter(task => task.status === status),

    getLogsByTaskId: (state: TeamState, taskId: string) =>
        state.workflowLogs.filter(log => log.task?.id === taskId),

    getLogsByAgentId: (state: TeamState, agentId: string) =>
        state.workflowLogs.filter(log => log.agent?.id === agentId),

    getTaskStats: (state: TeamState, task: TaskType): TaskStats =>
        calculateTaskStats(task, state.workflowLogs),

    getWorkflowStats: (state: TeamState): WorkflowStats => {
        const endTime = Date.now();
        const workflowLogs = state.workflowLogs;
        const lastWorkflowRunningLog = workflowLogs
            .slice()
            .reverse()
            .find(log => 
                log.logType === 'WorkflowStatusUpdate' && 
                log.workflowStatus === 'RUNNING'
            );

        const startTime = lastWorkflowRunningLog?.timestamp || endTime;
        const duration = (endTime - startTime) / 1000;

        const stats = calculateTaskStats({ id: 'workflow' } as TaskType, workflowLogs);
        
        return {
            startTime,
            endTime,
            duration,
            llmUsageStats: stats.llmUsageStats,
            iterationCount: stats.iterationCount,
            costDetails: calculateTotalWorkflowCost(stats.modelUsage),
            taskCount: state.tasks.length,
            agentCount: state.agents.length,
            teamName: state.name,
            messageCount: workflowLogs.length,
            modelUsage: stats.modelUsage
        };
    },

    deriveTaskContext: (state: TeamState, taskId: string): string => {
        const relevantLogs = state.workflowLogs
            .filter(log => log.task?.id === taskId)
            .map(log => {
                const timestamp = new Date(log.timestamp).toISOString();
                let contextEntry = `[${timestamp}] ${log.logDescription}`;
                
                if (log.logType === 'AgentStatusUpdate' && 'output' in log.metadata) {
                    const output = log.metadata.output;
                    if (output?.thought) contextEntry += `\nThought: ${output.thought}`;
                    if (output?.observation) contextEntry += `\nObservation: ${output.observation}`;
                }
                
                return contextEntry;
            })
            .join('\n');

        return `Current context for task ${taskId}:\n${relevantLogs}`;
    },

    getActiveTask: (state: TeamState): TaskType | undefined =>
        state.tasks.find(task => task.status === 'DOING'),

    getNextTask: (state: TeamState): TaskType | undefined =>
        state.tasks.find(task => task.status === 'TODO'),

    getWorkflowProgress: (state: TeamState): number => {
        const totalTasks = state.tasks.length;
        if (totalTasks === 0) return 0;
        
        const completedTasks = state.tasks.filter(
            task => ['DONE', 'COMPLETED'].includes(task.status)
        ).length;
        
        return (completedTasks / totalTasks) * 100;
    }
};

export default {
    ...selectors,
    ...computedSelectors
};
