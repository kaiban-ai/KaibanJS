/**
 * @file state.ts
 * @description Agent store state definition
 */

import { AGENT_STATUS_enum } from '../../utils/types/common'
import { 
    AgentType, 
    TaskType, 
    Log, 
    LLMUsageStats 
} from '../../utils/types';

/**
 * Agent workflow statistics
 */
export interface AgentStats {
    iterationCount: number;
    llmUsageStats: LLMUsageStats;
}

/**
 * Agent store state interface
 */
export interface AgentState {
    // Current agent instance
    currentAgent: AgentType | null;
    
    // Current task being processed
    currentTask: TaskType | null;
    
    // Current agent status
    status: keyof typeof AGENT_STATUS_enum;
    
    // Workflow execution logs
    workflowLogs: Log[];
    
    // Agent execution statistics
    stats: AgentStats;
}

/**
 * Initial agent store state
 */
export const initialAgentState: AgentState = {
    currentAgent: null,
    currentTask: null,
    status: 'IDLE',
    workflowLogs: [],
    stats: {
        iterationCount: 0,
        llmUsageStats: {
            inputTokens: 0,
            outputTokens: 0,
            callsCount: 0,
            callsErrorCount: 0,
            parsingErrors: 0,
            totalLatency: 0,
            averageLatency: 0,
            lastUsed: 0,
            memoryUtilization: {
                peakMemoryUsage: 0,
                averageMemoryUsage: 0,
                cleanupEvents: 0
            },
            costBreakdown: {
                input: 0,
                output: 0,
                total: 0,
                currency: 'USD'
            }
        }
    }
};
