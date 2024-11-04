/**
 * @file state.ts
 * @path src/stores/taskStore/state.ts
 * @description Task store state interface and initial state definition
 */
import { PrepareNewLogParams } from '@/utils/types/team';

import { 
    TaskType, 
    TaskStats,
    AgentType,
    Log,
    WorkflowStats
} from '@/utils/types';

/**
 * Task store state interface
 */
export interface TaskStoreState {
    // Base store properties
    name: string;
    agents: AgentType[];
    tasks: TaskType[];
    workflowLogs: Log[];
    tasksInitialized: boolean;

    // Stats and metrics
    stats: {
        llmUsageStats: {
            inputTokens: number;
            outputTokens: number;
            callsCount: number;
            callsErrorCount: number;
            parsingErrors: number;
            totalLatency: number;
            averageLatency: number;
            lastUsed: number;
            memoryUtilization: {
                peakMemoryUsage: number;
                averageMemoryUsage: number;
                cleanupEvents: number;
            };
            costBreakdown: {
                input: number;
                output: number;
                total: number;
                currency: string;
            }
        };
        iterationCount: number;
        totalCalls: number;
        errorCount: number;
        averageLatency: number;
        costDetails: {
            inputCost: number;
            outputCost: number;
            totalCost: number;
            currency: string;
            breakdown: {
                promptTokens: { count: number; cost: number };
                completionTokens: { count: number; cost: number }
            }
        };
    };

    // Runtime state
    currentTask: TaskType | null;
    lastError: Error | null;
    
    /**
     * Get statistics for a specific task
     */
    getTaskStats: (task: TaskType) => TaskStats;

    /**
     * Get overall workflow statistics
     */
    getWorkflowStats: () => WorkflowStats;

    /**
     * Create a new log entry
     */
    prepareNewLog: (params: PrepareNewLogParams) => Log;
}

/**
 * Initial task store state
 */
export const initialTaskState: TaskStoreState = {
    // Base store properties
    name: '',
    agents: [],
    tasks: [],
    workflowLogs: [],
    tasksInitialized: false,

    // Stats and metrics
    stats: {
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
        iterationCount: 0,
        totalCalls: 0,
        errorCount: 0,
        averageLatency: 0,
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
    },

    // Runtime state
    currentTask: null,
    lastError: null,

    // Methods (implemented in actions)
    getTaskStats: () => ({
        startTime: 0,
        endTime: 0,
        duration: 0,
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
        iterationCount: 0,
        modelUsage: {}
    }),

    getWorkflowStats: () => ({
        startTime: 0,
        endTime: 0,
        duration: 0,
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
        iterationCount: 0,
        costDetails: {
            inputCost: 0,
            outputCost: 0,
            totalCost: 0,
            currency: 'USD',
            breakdown: {
                promptTokens: { count: 0, cost: 0 },
                completionTokens: { count: 0, cost: 0 }
            }
        },
        taskCount: 0,
        agentCount: 0,
        teamName: '',
        messageCount: 0,
        modelUsage: {}
    }),

    prepareNewLog: () => ({
        timestamp: Date.now(),
        task: null,
        agent: null,
        agentName: '',
        taskTitle: '',
        logDescription: '',
        taskStatus: 'TODO',
        agentStatus: 'INITIAL',
        workflowStatus: 'INITIAL',
        metadata: {},
        logType: 'TaskStatusUpdate'
    })
};

/**
 * Type guard for task store state
 */
export function isTaskStoreState(value: unknown): value is TaskStoreState {
    return (
        typeof value === 'object' &&
        value !== null &&
        'tasks' in value &&
        'agents' in value &&
        'name' in value &&
        'tasksInitialized' in value &&
        'workflowLogs' in value
    );
}