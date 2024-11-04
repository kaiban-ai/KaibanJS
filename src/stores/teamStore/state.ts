/**
 * @file state.ts
 * @path src/stores/teamStore/state.ts
 * @description State definitions and initial state for the team store
 */

import { 
    WORKFLOW_STATUS_enum,
    TASK_STATUS_enum,
    AGENT_STATUS_enum 
} from "@/utils/types/common/enums";
import type {
    TeamState,
    AgentType,
    TaskType,
    TeamInputs,
    TeamEnvironment,
    Log,
    WorkflowResult
} from "@/utils/types";

/**
 * Initial state factory for the team store
 */
export const createInitialState = (): TeamState => ({
    teamWorkflowStatus: 'INITIAL',
    workflowResult: null,
    name: '',
    agents: [],
    tasks: [],
    workflowLogs: [],
    inputs: {},
    workflowContext: '',
    env: {},
    logLevel: 'info',
    tasksInitialized: false
});

/**
 * Default values for team store components
 */
export const defaultValues = {
    llmUsageStats: {
        inputTokens: 0,
        outputTokens: 0,
        callsCount: 0,
        callsErrorCount: 0,
        parsingErrors: 0,
        totalLatency: 0,
        averageLatency: 0,
        lastUsed: Date.now(),
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
    },
    costDetails: {
        inputCost: 0,
        outputCost: 0,
        totalCost: 0,
        currency: 'USD',
        breakdown: {
            promptTokens: { count: 0, cost: 0 },
            completionTokens: { count: 0, cost: 0 }
        }
    }
};

export type { TeamState };