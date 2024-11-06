/**
 * @file state.ts
 * @path src/stores/agentStore/state.ts
 * @description Agent store state interface and initial state definition
 */

import { DefaultFactory } from '@/utils/factories/defaultFactory';
import { AgentStoreState } from '@/utils/types/agent/store';
import { AGENT_STATUS_enum } from '@/utils/types/common/enums';

/**
 * Initial agent store state
 */
export const initialAgentState: AgentStoreState = {
    // Base store properties
    name: '',
    agents: [],
    tasks: [],
    workflowLogs: [],

    // Runtime state
    runtime: {
        currentAgent: null,
        currentTask: null,
        lastError: null,
        status: 'INITIAL'
    },

    // Stats and metrics
    stats: {
        llmUsageStats: DefaultFactory.createLLMUsageStats(),
        iterationCount: 0,
        totalCalls: 0,
        errorCount: 0,
        averageLatency: 0,
        costDetails: DefaultFactory.createCostDetails()
    }
};

/**
 * State validator for agent store
 */
export function validateAgentState(state: Partial<AgentStoreState>): state is AgentStoreState {
    return (
        typeof state === 'object' &&
        state !== null &&
        Array.isArray(state.agents) &&
        Array.isArray(state.tasks) &&
        Array.isArray(state.workflowLogs) &&
        typeof state.runtime === 'object' &&
        state.runtime !== null &&
        typeof state.stats === 'object' &&
        state.stats !== null &&
        typeof state.stats.iterationCount === 'number' &&
        typeof state.stats.totalCalls === 'number' &&
        typeof state.stats.errorCount === 'number' &&
        typeof state.stats.averageLatency === 'number'
    );
}

/**
 * Helper function to create a sanitized version of the state for logging
 */
export function getSanitizedState(state: AgentStoreState): Record<string, unknown> {
    return {
        name: state.name,
        agentCount: state.agents.length,
        taskCount: state.tasks.length,
        logCount: state.workflowLogs.length,
        stats: {
            ...state.stats,
            llmUsageStats: {
                ...state.stats.llmUsageStats,
                // Remove sensitive data
                apiKeys: '[REDACTED]',
                credentials: '[REDACTED]'
            }
        },
        status: state.runtime.status,
        hasCurrentAgent: state.runtime.currentAgent !== null,
        hasCurrentTask: state.runtime.currentTask !== null,
        hasError: state.runtime.lastError !== null
    };
}