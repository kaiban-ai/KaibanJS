/**
 * @file agentActions.ts
 * @path src/stores/agentStore/actions.ts
 * @description Agent store action implementations
 */

import type { AgentType } from '../../types/agent/agentBaseTypes';
import type { TaskType } from '../../types/task/taskBase';
import type { Output } from '../../types/llm/llmResponseTypes';
import type { HandlerResult } from '../../types/common/commonHandlerTypes';
import type { AgentStore } from './agentStore';

/**
 * Create agent store actions
 */
export const createAgentActions = (store: AgentStore) => ({
    // ─── Agent Management ────────────────────────────────────────────────────────

    /**
     * Add agent to store
     */
    addAgent: async (agent: AgentType): Promise<HandlerResult> => {
        const { getState, setState } = store;
        const state = getState();
        
        setState({
            agents: [...state.agents, agent]
        });
        
        return { success: true };
    },

    /**
     * Remove agent from store
     */
    removeAgent: async (agentId: string): Promise<HandlerResult> => {
        const { getState, setState } = store;
        const state = getState();
        
        setState({
            agents: state.agents.filter(a => a.id !== agentId),
            activeAgents: state.activeAgents.filter(a => a.id !== agentId)
        });
        
        return { success: true };
    },

    // ─── Task Assignment ─────────────────────────────────────────────────────────

    /**
     * Assign task to agent
     */
    assignTask: async (agentId: string, task: TaskType): Promise<HandlerResult> => {
        const { getState, setState } = store;
        const state = getState();
        
        const agent = state.agents.find(a => a.id === agentId);
        if (!agent) {
            return { 
                success: false, 
                error: new Error(`Agent ${agentId} not found`) 
            };
        }

        setState({
            executionState: {
                ...state.executionState,
                [agentId]: {
                    ...state.executionState[agentId],
                    currentTask: task
                }
            }
        });
        
        return { success: true };
    },

    // ─── Performance Tracking ──────────────────────────────────────────────────

    /**
     * Update agent performance statistics
     */
    updatePerformanceStats: async (agentId: string, stats: Partial<any>): Promise<HandlerResult> => {
        const { getState, setState } = store;
        const state = getState();
        
        setState({
            performanceStats: {
                ...state.performanceStats,
                [agentId]: {
                    ...state.performanceStats[agentId],
                    ...stats
                }
            }
        });
        
        return { success: true };
    },

    // ─── Resource Management ───────────────────────────────────────────────────

    /**
     * Update agent resource usage
     */
    updateResourceUsage: async (agentId: string, resourceStats: {
        memory: number;
        tokens: number;
        cost: number;
    }): Promise<HandlerResult> => {
        const { getState, setState } = store;
        const state = getState();

        setState({
            performanceStats: {
                ...state.performanceStats,
                [agentId]: {
                    ...state.performanceStats[agentId],
                    resources: {
                        ...state.performanceStats[agentId]?.resources,
                        memory: resourceStats.memory,
                        tokens: resourceStats.tokens,
                        cost: resourceStats.cost
                    }
                }
            }
        });

        return { success: true };
    },

    // ─── Error Management ─────────────────────────────────────────────────────

    /**
     * Clear agent errors
     */
    clearErrors: async (agentId: string): Promise<HandlerResult> => {
        const { getState, setState } = store;
        const state = getState();

        setState({
            executionState: {
                ...state.executionState,
                [agentId]: {
                    ...state.executionState[agentId],
                    lastError: undefined
                }
            }
        });

        return { success: true };
    },

    // ─── State Management ─────────────────────────────────────────────────────

    /**
     * Reset agent state
     */
    resetAgentState: async (agentId: string): Promise<HandlerResult> => {
        const { setState } = store;
        
        setState(state => ({
            executionState: {
                ...state.executionState,
                [agentId]: {
                    status: 'INITIAL',
                    completedTasks: [],
                    failedTasks: [],
                    iterations: 0,
                    maxIterations: 10,
                    thinking: false,
                    busy: false
                }
            }
        }));

        return { success: true };
    }
});

export type AgentActions = ReturnType<typeof createAgentActions>;