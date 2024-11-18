/**
 * @file selectors.ts
 * @path src/stores/agentStore/selectors.ts
 * @description Consolidated agent store selectors with type safety and memoization support
 *
 * @module @stores/agent
 */

import type { IAgentState } from '@/utils/types/agent/state';
import type { AgentType } from '@/utils/types/agent/base';
import type { TaskType } from '@/utils/types/task/base';
import type { AGENT_STATUS_enum } from '@/utils/types/common/enums';

// ─── Core Agent Selectors ────────────────────────────────────────────────────────

/**
 * Select agent by ID with type safety
 */
export const selectAgentById = (state: IAgentState, id: string): AgentType | undefined =>
    state.agents.find(agent => agent.id === id);

/**
 * Select all agents with given status
 */
export const selectAgentsByStatus = (
    state: IAgentState,
    status: keyof typeof AGENT_STATUS_enum
): AgentType[] =>
    state.agents.filter(agent => 
        state.executionState[agent.id]?.status === status
    );

/**
 * Select currently active agents
 */
export const selectActiveAgents = (state: IAgentState): AgentType[] =>
    state.activeAgents;

// ─── Metadata Selectors ─────────────────────────────────────────────────────────

/**
 * Select agent metadata
 */
export const selectAgentMetadata = (state: IAgentState, id: string) =>
    state.metadata[id];

/**
 * Select agent capabilities
 */
export const selectAgentCapabilities = (state: IAgentState, id: string): string[] =>
    state.metadata[id]?.capabilities ?? [];

/**
 * Select agent skills
 */
export const selectAgentSkills = (state: IAgentState, id: string): string[] =>
    state.metadata[id]?.skills ?? [];

/**
 * Select agent creation date
 */
export const selectAgentCreationDate = (state: IAgentState, id: string): Date | undefined =>
    state.metadata[id]?.created;

// ─── Execution State Selectors ─────────────────────────────────────────────────

/**
 * Select agent execution state
 */
export const selectAgentExecutionState = (state: IAgentState, id: string) =>
    state.executionState[id];

/**
 * Select agent current status
 */
export const selectAgentStatus = (
    state: IAgentState,
    id: string
): keyof typeof AGENT_STATUS_enum | undefined =>
    state.executionState[id]?.status;

/**
 * Select agent's current task
 */
export const selectAgentCurrentTask = (state: IAgentState, id: string): TaskType | undefined =>
    state.executionState[id]?.currentTask;

/**
 * Select agent's last output
 */
export const selectAgentLastOutput = (state: IAgentState, id: string): string | undefined =>
    state.executionState[id]?.lastOutput;

/**
 * Select agent iteration state
 */
export const selectAgentIterations = (
    state: IAgentState,
    id: string
): { current: number; max: number } | undefined => {
    const executionState = state.executionState[id];
    return executionState ? {
        current: executionState.iterations,
        max: executionState.maxIterations
    } : undefined;
};

// ─── Performance Selectors ──────────────────────────────────────────────────────

/**
 * Select agent performance stats
 */
export const selectAgentPerformanceStats = (state: IAgentState, id: string) =>
    state.performanceStats[id];

/**
 * Select agent success rate
 */
export const selectAgentSuccessRate = (state: IAgentState, id: string): number =>
    state.performanceStats[id]?.successRate ?? 0;

/**
 * Select agent token usage
 */
export const selectAgentTokenUsage = (state: IAgentState, id: string): number =>
    state.performanceStats[id]?.totalTokensUsed ?? 0;

/**
 * Select agent total cost
 */
export const selectAgentTotalCost = (state: IAgentState, id: string): number =>
    state.performanceStats[id]?.totalCost ?? 0;

/**
 * Select agent average task duration
 */
export const selectAgentAverageTaskDuration = (state: IAgentState, id: string): number =>
    state.performanceStats[id]?.averageTaskDuration ?? 0;

// ─── Task History Selectors ──────────────────────────────────────────────────────

/**
 * Select agent completed tasks
 */
export const selectAgentCompletedTasks = (state: IAgentState, id: string): TaskType[] =>
    state.executionState[id]?.completedTasks ?? [];

/**
 * Select agent failed tasks
 */
export const selectAgentFailedTasks = (state: IAgentState, id: string): TaskType[] =>
    state.executionState[id]?.failedTasks ?? [];

/**
 * Select agent task completion count
 */
export const selectAgentTaskCounts = (
    state: IAgentState,
    id: string
): { completed: number; failed: number; total: number } => {
    const stats = state.performanceStats[id];
    return {
        completed: stats?.completedTaskCount ?? 0,
        failed: stats?.failedTaskCount ?? 0,
        total: (stats?.completedTaskCount ?? 0) + (stats?.failedTaskCount ?? 0)
    };
};

// ─── Status Selectors ──────────────────────────────────────────────────────────

/**
 * Select if agent is busy
 */
export const selectIsAgentBusy = (state: IAgentState, id: string): boolean =>
    state.executionState[id]?.busy ?? false;

/**
 * Select if agent is thinking
 */
export const selectIsAgentThinking = (state: IAgentState, id: string): boolean =>
    state.executionState[id]?.thinking ?? false;

/**
 * Select agent last error
 */
export const selectAgentLastError = (state: IAgentState, id: string): Error | undefined =>
    state.executionState[id]?.lastError;

// ─── Composite Selectors ────────────────────────────────────────────────────────

/**
 * Select available (non-busy) agents
 */
export const selectAvailableAgents = (state: IAgentState): AgentType[] =>
    state.agents.filter(agent => !selectIsAgentBusy(state, agent.id));

/**
 * Select agents with specific capability
 */
export const selectAgentsWithCapability = (state: IAgentState, capability: string): AgentType[] =>
    state.agents.filter(agent => 
        selectAgentCapabilities(state, agent.id).includes(capability)
    );

/**
 * Select high performing agents
 */
export const selectHighPerformingAgents = (
    state: IAgentState,
    threshold = 0.8
): AgentType[] =>
    state.agents.filter(agent => 
        selectAgentSuccessRate(state, agent.id) >= threshold
    );

/**
 * Select agents by skill level
 */
export const selectAgentsBySkill = (
    state: IAgentState,
    skill: string
): AgentType[] =>
    state.agents.filter(agent => 
        selectAgentSkills(state, agent.id).includes(skill)
    );

/**
 * Select agents sorted by performance
 */
export const selectAgentsSortedByPerformance = (state: IAgentState): AgentType[] =>
    [...state.agents].sort((a, b) => 
        selectAgentSuccessRate(state, b.id) - selectAgentSuccessRate(state, a.id)
    );

/**
 * Select agents with current stats
 */
export const selectAgentsWithStats = (state: IAgentState): Array<{
    agent: AgentType;
    stats: {
        successRate: number;
        taskCount: { completed: number; failed: number; total: number };
        costs: { tokens: number; total: number };
        status: keyof typeof AGENT_STATUS_enum | undefined;
    };
}> =>
    state.agents.map(agent => ({
        agent,
        stats: {
            successRate: selectAgentSuccessRate(state, agent.id),
            taskCount: selectAgentTaskCounts(state, agent.id),
            costs: {
                tokens: selectAgentTokenUsage(state, agent.id),
                total: selectAgentTotalCost(state, agent.id)
            },
            status: selectAgentStatus(state, agent.id)
        }
    }));