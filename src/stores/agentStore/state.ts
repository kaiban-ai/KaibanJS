/**
 * @file state.ts
 * @path src/stores/agentStore/state.ts
 * @description Agent store state interface and initial state definition
 */

import { 
    AgentType, 
    TaskType, 
    Log, 
    Output, 
    TeamStore, 
    AgentLogMetadata, 
    LLMUsageStats,
    CostDetails 
} from '@/utils/types';
import { AGENT_STATUS_enum } from '@/utils/types/common/enums';
import { DefaultFactory } from '@/utils/factories/defaultFactory';

/**
 * Core agent store state
 */
export interface AgentState {
    // Base store properties
    name: string;
    agents: AgentType[];
    tasks: TaskType[];
    workflowLogs: Log[];
    tasksInitialized: boolean;

    // Stats and metrics
    stats: {
        llmUsageStats: LLMUsageStats;
        iterationCount: number;
        totalCalls: number;
        errorCount: number;
        averageLatency: number;
        costDetails: CostDetails;
    };

    // Runtime state
    currentAgent: AgentType | null;
    currentTask: TaskType | null;
    lastError: Error | null;
    status: keyof typeof AGENT_STATUS_enum;
}

/**
 * Default initial agent state
 */
export const initialAgentState: AgentState = {
    // Base store properties
    name: '',
    agents: [],
    tasks: [],
    workflowLogs: [],
    tasksInitialized: false,

    // Stats and metrics
    stats: {
        llmUsageStats: DefaultFactory.createLLMUsageStats(),
        iterationCount: 0,
        totalCalls: 0,
        errorCount: 0,
        averageLatency: 0,
        costDetails: DefaultFactory.createCostDetails()
    },

    // Runtime state
    currentAgent: null,
    currentTask: null,
    lastError: null,
    status: 'INITIAL'
};

/**
 * State validator for agent store
 */
export function validateAgentState(state: Partial<AgentState>): state is AgentState {
    return (
        typeof state === 'object' &&
        state !== null &&
        Array.isArray(state.agents) &&
        Array.isArray(state.tasks) &&
        Array.isArray(state.workflowLogs) &&
        typeof state.tasksInitialized === 'boolean' &&
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
export function getSanitizedState(state: AgentState): Record<string, unknown> {
    return {
        name: state.name,
        agentCount: state.agents.length,
        taskCount: state.tasks.length,
        logCount: state.workflowLogs.length,
        tasksInitialized: state.tasksInitialized,
        stats: {
            ...state.stats,
            llmUsageStats: {
                ...state.stats.llmUsageStats,
                // Remove sensitive data
                apiKeys: '[REDACTED]',
                credentials: '[REDACTED]'
            }
        },
        status: state.status,
        hasCurrentAgent: state.currentAgent !== null,
        hasCurrentTask: state.currentTask !== null,
        hasError: state.lastError !== null
    };
}