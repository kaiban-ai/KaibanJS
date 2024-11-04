/**
 * @file index.ts
 * @path src/stores/teamStore/selectors/index.ts
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

/**
 * Core state selectors
 */
export const selectors = {
    /**
     * Selects the current workflow status
     */
    getWorkflowStatus: (state: TeamState) => state.teamWorkflowStatus,

    /**
     * Selects the workflow result
     */
    getWorkflowResult: (state: TeamState) => state.workflowResult,

    /**
     * Selects all agents
     */
    getAgents: (state: TeamState) => state.agents,

    /**
     * Selects all tasks
     */
    getTasks: (state: TeamState) => state.tasks,

    /**
     * Selects all workflow logs
     */
    getWorkflowLogs: (state: TeamState) => state.workflowLogs,

    /**
     * Selects team inputs
     */
    getInputs: (state: TeamState) => state.inputs,

    /**
     * Selects workflow context
     */
    getWorkflowContext: (state: TeamState) => state.workflowContext,

    /**
     * Selects environment variables
     */
    getEnv: (state: TeamState) => state.env,

    /**
     * Selects log level
     */
    getLogLevel: (state: TeamState) => state.logLevel
};

/**
 * Computed selectors
 */
export const computedSelectors = {
    /**
     * Selects an agent by ID
     */
    getAgentById: (state: TeamState, agentId: string) => 
        state.agents.find(agent => agent.id === agentId),

    /**
     * Selects a task by ID
     */
    getTaskById: (state: TeamState, taskId: string) =>
        state.tasks.find(task => task.id === taskId),

    /**
     * Selects tasks for a specific agent
     */
    getTasksByAgentId: (state: TeamState, agentId: string) =>
        state.tasks.filter(task => task.agent?.id === agentId),

    /**
     * Selects tasks by status
     */
    getTasksByStatus: (state: TeamState, status: string) =>
        state.tasks.filter(task => task.status === status),

    /**
     * Selects logs for a specific task
     */
    getLogsByTaskId: (state: TeamState, taskId: string) =>
        state.workflowLogs.filter(log => log.task?.id === taskId),

    /**
     * Selects logs for a specific agent
     */
    getLogsByAgentId: (state: TeamState, agentId: string) =>
        state.workflowLogs.filter(log => log.agent?.id === agentId),

    /**
     * Computes task statistics
     */
    getTaskStats: (state: TeamState, task: TaskType): TaskStats =>
        calculateTaskStats(task, state.workflowLogs),

    /**
     * Computes workflow statistics
     */
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

    /**
     * Derives context for a specific task
     */
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

    /**
     * Selects the current active task
     */
    getActiveTask: (state: TeamState): TaskType | undefined =>
        state.tasks.find(task => task.status === 'DOING'),

    /**
     * Selects the next available task
     */
    getNextTask: (state: TeamState): TaskType | undefined =>
        state.tasks.find(task => task.status === 'TODO'),

    /**
     * Computes the overall workflow progress
     */
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