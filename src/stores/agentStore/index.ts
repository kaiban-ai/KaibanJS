// src/stores/agentStore/index.ts

import { useAgentActions } from './agentActions';
import { useAgentState } from './agentState';
import { useAgentStats } from './agentStats';
import { useAgentLogs } from './agentLogs';
import type { AgentStoreState } from '@/utils/types/store/base';

/**
 * Main agent store composition
 * Combines different aspects of agent management into a single store
 */
export const useAgentStore = (
    set: (fn: (state: AgentStoreState) => Partial<AgentStoreState>) => void,
    get: () => AgentStoreState
): AgentStoreState => ({
    ...useAgentState(set, get),
    ...useAgentActions(set, get),
    ...useAgentStats(set, get),
    ...useAgentLogs(set, get)
});

// Export all types from the local types file
export * from './types';

// Export individual store components for testing and composition
export { useAgentActions } from './agentActions';
export { useAgentState } from './agentState';
export { useAgentStats } from './agentStats';
export { useAgentLogs } from './agentLogs';