/**
 * @file agentSelectors.ts
 * @path src/stores/agentStore/selectors.ts
 * @description Agent store selector implementations
 */

import type { IAgentState } from '../../types/agent/agentStoreTypes';
import type { AgentType } from '../../types/agent/agentBaseTypes';
import type { TaskType } from '../../types/task/taskBase';

export const createAgentSelectors = () => ({
    // ─── Agent Selectors ─────────────────────────────────────────────────────────
    
    /**
     * Get agent by id
     */
    getAgentById: (state: IAgentState) => (id: string): AgentType | undefined => 
        state.agents.find(agent => agent.id === id),

    /**
     * Get all active agents
     */
    getActiveAgents: (state: IAgentState): AgentType[] => 
        state.activeAgents,

    /**
     * Get agents by capability
     */
    getAgentsByCapability: (state: IAgentState) => (capability: string): AgentType[] =>
        state.agents.filter(agent => 
            agent.capabilities.supportedToolTypes.includes(capability)
        ),

    // ─── Task Selectors ──────────────────────────────────────────────────────────
    
    /**
     * Get tasks assigned to agent
     */
    getAgentTasks: (state: IAgentState) => (agentId: string): TaskType[] =>
        state.tasks.filter(task => 
            task.agent.id === agentId
        ),

    /**
     * Get current task for agent
     */
    getCurrentTask: (state: IAgentState) => (agentId: string): TaskType | undefined => {
        const executionState = state.executionState[agentId];
        return executionState?.currentTask;
    },

    // ─── Status Selectors ────────────────────────────────────────────────────────
    
    /**
     * Get agent status
     */
    getAgentStatus: (state: IAgentState) => (agentId: string): string | undefined => {
        const executionState = state.executionState[agentId];
        return executionState?.status;
    },

    /**
     * Check if agent is busy
     */
    isAgentBusy: (state: IAgentState) => (agentId: string): boolean => {
        const executionState = state.executionState[agentId];
        return executionState?.busy || false;
    },

    // ─── Performance Selectors ─────────────────────────────────────────────────
    
    /**
     * Get agent performance metrics
     */
    getAgentPerformance: (state: IAgentState) => (agentId: string) => {
        return state.performanceStats[agentId];
    },

    /**
     * Get agent errors
     */
    getAgentErrors: (state: IAgentState) => (agentId: string): Error[] => {
        return state.errors.filter(error => 
            error instanceof Error && 
            'agentId' in error && 
            (error as any).agentId === agentId
        );
    },

    // ─── Composite Selectors ──────────────────────────────────────────────────

    /**
     * Get agent metrics with performance stats
     */
    getAgentMetrics: (state: IAgentState) => (agentId: string) => {
        const executionState = state.executionState[agentId];
        const performanceStats = state.performanceStats[agentId];

        return {
            taskCount: executionState?.completedTasks.length || 0,
            errorCount: executionState?.failedTasks.length || 0,
            averageIterations: performanceStats?.performance?.averageIterationsPerTask || 0,
            successRate: performanceStats?.performance?.performanceScore || 0,
            resources: performanceStats?.resources || {},
            usage: performanceStats?.usage || {}
        };
    },

    /**
     * Get agent availability status
     */
    getAgentAvailability: (state: IAgentState) => (agentId: string): 'available' | 'busy' | 'error' => {
        const executionState = state.executionState[agentId];
        
        if (!executionState) return 'available';
        if (executionState.lastError) return 'error';
        if (executionState.busy || executionState.thinking) return 'busy';
        return 'available';
    },

    /**
     * Get agent progress
     */
    getAgentProgress: (state: IAgentState) => (agentId: string) => {
        const executionState = state.executionState[agentId];
        if (!executionState) return 0;

        const { iterations, maxIterations } = executionState;
        return Math.min((iterations / maxIterations) * 100, 100);
    }
});

export type AgentSelectors = ReturnType<typeof createAgentSelectors>;