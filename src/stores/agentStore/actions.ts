/**
 * @file actions.ts
 * @path src/stores/agentStore/actions.ts
 * @description Consolidated agent store actions with manager integration
 *
 * @module @stores/agent
 */

import type { IAgentState } from '../../utils/types/agent/store';
import type { AgentType } from '../../utils/types/agent/base';
import type { TaskType } from '../../utils/types/task/base';
import type { Output, ParsedOutput } from '../../utils/types/llm/responses';
import type { HandlerResult } from '../../utils/types/agent/handlers';
import { AGENT_STATUS_enum } from '../../utils/types/common/enums';

// ─── Agent Management Actions ────────────────────────────────────────────────────

export const addAgent = (state: IAgentState, agent: AgentType) => ({
    agents: [...state.agents, agent],
    metadata: {
        ...state.metadata,
        [agent.id]: {
            id: agent.id,
            name: agent.name,
            capabilities: [],
            skills: [],
            created: new Date()
        }
    },
    executionState: {
        ...state.executionState,
        [agent.id]: {
            status: 'idle' as keyof typeof AGENT_STATUS_enum,
            completedTasks: [],
            failedTasks: [],
            iterations: 0,
            maxIterations: 10,
            thinking: false,
            busy: false
        }
    },
    performanceStats: {
        ...state.performanceStats,
        [agent.id]: {
            completedTaskCount: 0,
            failedTaskCount: 0,
            averageTaskDuration: 0,
            successRate: 0,
            totalTokensUsed: 0,
            totalCost: 0,
            llmUsageStats: {
                totalTokens: 0,
                promptTokens: 0,
                completionTokens: 0,
                totalCost: 0
            }
        }
    }
});

export const removeAgent = (state: IAgentState, agentId: string) => {
    const { [agentId]: metadataToRemove, ...remainingMetadata } = state.metadata;
    const { [agentId]: executionStateToRemove, ...remainingExecutionState } = state.executionState;
    const { [agentId]: statsToRemove, ...remainingPerformanceStats } = state.performanceStats;
    
    return {
        agents: state.agents.filter((a: AgentType) => a.id !== agentId),
        activeAgents: state.activeAgents.filter((a: AgentType) => a.id !== agentId),
        metadata: remainingMetadata,
        executionState: remainingExecutionState,
        performanceStats: remainingPerformanceStats
    };
};

// ─── Task Management Actions ─────────────────────────────────────────────────────

export const assignTask = (state: IAgentState, agentId: string, task: TaskType) => ({
    executionState: {
        ...state.executionState,
        [agentId]: {
            ...state.executionState[agentId],
            currentTask: task,
            status: 'working' as keyof typeof AGENT_STATUS_enum,
            busy: true
        }
    }
});

export const completeTask = (state: IAgentState, agentId: string, task: TaskType) => {
    const executionState = state.executionState[agentId];
    if (!executionState) return state;

    return {
        executionState: {
            ...state.executionState,
            [agentId]: {
                ...executionState,
                currentTask: undefined,
                completedTasks: [...executionState.completedTasks, task],
                status: 'idle' as keyof typeof AGENT_STATUS_enum,
                busy: false,
                thinking: false
            }
        },
        performanceStats: {
            ...state.performanceStats,
            [agentId]: {
                ...state.performanceStats[agentId],
                completedTaskCount: state.performanceStats[agentId].completedTaskCount + 1,
                successRate: (state.performanceStats[agentId].completedTaskCount + 1) /
                    (state.performanceStats[agentId].completedTaskCount + 
                     state.performanceStats[agentId].failedTaskCount + 1)
            }
        }
    };
};

// ─── Execution State Actions ────────────────────────────────────────────────────

export const updateAgentStatus = (state: IAgentState, agentId: string, status: keyof typeof AGENT_STATUS_enum) => ({
    executionState: {
        ...state.executionState,
        [agentId]: {
            ...state.executionState[agentId],
            status
        }
    }
});

export const setAgentThinking = (state: IAgentState, agentId: string, thinking: boolean) => ({
    executionState: {
        ...state.executionState,
        [agentId]: {
            ...state.executionState[agentId],
            thinking
        }
    }
});

// ─── Progress Actions ─────────────────────────────────────────────────────────

export const updateAgentProgress = (
    state: IAgentState,
    agentId: string,
    progress: {
        iterations: number;
        maxIterations: number;
    }
) => ({
    executionState: {
        ...state.executionState,
        [agentId]: {
            ...state.executionState[agentId],
            iterations: progress.iterations,
            maxIterations: progress.maxIterations
        }
    }
});

// ─── Output And Response Actions ─────────────────────────────────────────────────

export const updateAgentOutput = (state: IAgentState, agentId: string, output: Output) => ({
    executionState: {
        ...state.executionState,
        [agentId]: {
            ...state.executionState[agentId],
            lastOutput: output.llmOutput
        }
    }
});

export const setFinalAnswer = (state: IAgentState, agentId: string, answer: ParsedOutput) => ({
    executionState: {
        ...state.executionState,
        [agentId]: {
            ...state.executionState[agentId],
            lastOutput: answer.finalAnswer as string,
            thinking: false
        }
    }
});

// ─── Performance & Stats Actions ─────────────────────────────────────────────────

export const updateAgentPerformance = (
    state: IAgentState, 
    agentId: string, 
    stats: Partial<IAgentState['performanceStats'][string]>
) => ({
    performanceStats: {
        ...state.performanceStats,
        [agentId]: {
            ...state.performanceStats[agentId],
            ...stats
        }
    }
});

export const updateAgentCosts = (
    state: IAgentState,
    agentId: string,
    costs: {
        tokenCost: number;
        totalCost: number;
    }
) => ({
    performanceStats: {
        ...state.performanceStats,
        [agentId]: {
            ...state.performanceStats[agentId],
            totalTokensUsed: state.performanceStats[agentId].totalTokensUsed + costs.tokenCost,
            totalCost: state.performanceStats[agentId].totalCost + costs.totalCost
        }
    }
});

// ─── Error Handling Actions ──────────────────────────────────────────────────────

export const addAgentError = (state: IAgentState, error: Error, agentId?: string) => ({
    errors: [...state.errors, error],
    ...(agentId && {
        executionState: {
            ...state.executionState,
            [agentId]: {
                ...state.executionState[agentId],
                lastError: error,
                status: 'error' as keyof typeof AGENT_STATUS_enum
            }
        }
    })
});

export const clearAgentErrors = () => ({
    errors: []
});

// ─── Capability Management Actions ───────────────────────────────────────────────

export const updateAgentCapabilities = (
    state: IAgentState,
    agentId: string,
    capabilities: string[]
) => ({
    metadata: {
        ...state.metadata,
        [agentId]: {
            ...state.metadata[agentId],
            capabilities
        }
    }
});

export const updateAgentSkills = (
    state: IAgentState,
    agentId: string,
    skills: string[]
) => ({
    metadata: {
        ...state.metadata,
        [agentId]: {
            ...state.metadata[agentId],
            skills
        }
    }
});

export const addAgentCapability = (
    state: IAgentState,
    agentId: string,
    capability: string
) => ({
    metadata: {
        ...state.metadata,
        [agentId]: {
            ...state.metadata[agentId],
            capabilities: [...(state.metadata[agentId]?.capabilities || []), capability]
        }
    }
});
