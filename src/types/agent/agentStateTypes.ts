/**
 * @file agentStateTypes.ts
 * @path KaibanJS/src/types/agent/agentStateTypes.ts
 * @description Agent state types and interfaces providing unified execution state management
 *
 * @module types/agent
 */

import type { ITaskType } from '../task/taskBaseTypes';
import type { AGENT_STATUS_enum } from '../common/commonEnums';
import type { ILLMUsageStats } from '../llm/llmResponseTypes';
import type { IAgentMetadata } from './agentBaseTypes';

// ─── Unified Agent Execution State ──────────────────────────────────────────────

export interface IAgentExecutionState {
    // Core State
    status: keyof typeof AGENT_STATUS_enum;
    thinking: boolean;
    busy: boolean;
    currentTask?: ITaskType;
    lastOutput?: string;
    
    // Timing
    startTime?: Date;
    endTime?: Date;
    duration?: number;
    lastActiveTime?: Date;
    
    // Error Handling
    lastError?: Error;
    errorCount: number;
    retryCount: number;
    maxRetries: number;
    
    // Assignment
    assignedTasks: ITaskType[];
    completedTasks: ITaskType[];
    failedTasks: ITaskType[];
    iterations: number;
    maxIterations: number;
    
    // Metrics
    performance: {
        completedTaskCount: number;
        failedTaskCount: number;
        averageTaskDuration: number;
        successRate: number;
        averageIterationsPerTask: number;
    };
    
    resourceUsage: {
        cpuUsage?: number;
        memoryUsage?: number;
        networkUsage?: number;
    };
    
    llmMetrics: {
        totalTokensUsed: number;
        promptTokens: number;
        completionTokens: number;
        totalCost: number;
        averageResponseTime: number;
    };
}

// ─── Type Guards ────────────────────────────────────────────────────────────

export const IAgentStateTypeGuards = {
    isAgentMetadata: (value: unknown): value is IAgentMetadata => {
        if (typeof value !== 'object' || value === null) return false;
        const metadata = value as Partial<IAgentMetadata>;
        return (
            typeof metadata.id === 'string' &&
            typeof metadata.name === 'string' &&
            Array.isArray(metadata.capabilities) &&
            Array.isArray(metadata.skills) &&
            metadata.created instanceof Date
        );
    },

    isAgentExecutionState: (value: unknown): value is IAgentExecutionState => {
        if (typeof value !== 'object' || value === null) return false;
        const state = value as Partial<IAgentExecutionState>;
        return (
            typeof state.status === 'string' &&
            typeof state.thinking === 'boolean' &&
            typeof state.busy === 'boolean' &&
            typeof state.errorCount === 'number' &&
            typeof state.retryCount === 'number' &&
            typeof state.maxRetries === 'number' &&
            Array.isArray(state.assignedTasks) &&
            Array.isArray(state.completedTasks) &&
            Array.isArray(state.failedTasks) &&
            typeof state.iterations === 'number' &&
            typeof state.maxIterations === 'number' &&
            typeof state.performance === 'object' &&
            typeof state.resourceUsage === 'object' &&
            typeof state.llmMetrics === 'object'
        );
    }
};
