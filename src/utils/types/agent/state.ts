/**
 * @file state.ts
 * @path src/utils/types/agent/state.ts
 * @description Agent state types and interfaces
 *
 * @module @types/agent
 */

import type { TaskType } from '../task/base';
import type { AGENT_STATUS_enum } from '../common/enums';
import type { LLMUsageStats } from '../llm/responses';

// ─── Agent State Interfaces ───────────────────────────────────────────────────

/**
 * Agent metadata interface
 */
export interface IAgentMetadata {
    id: string;
    name: string;
    description?: string;
    capabilities: string[];
    skills: string[];
    created: Date;
    lastActive?: Date;
    tags?: string[];
}

/**
 * Agent execution state interface
 */
export interface IAgentExecutionState {
    status: keyof typeof AGENT_STATUS_enum;
    currentTask?: TaskType;
    completedTasks: TaskType[];
    failedTasks: TaskType[];
    iterations: number;
    maxIterations: number;
    lastError?: Error;
    lastOutput?: string;
    thinking: boolean;
    busy: boolean;
}

/**
 * Agent performance stats interface
 */
export interface IAgentPerformanceStats {
    completedTaskCount: number;
    failedTaskCount: number;
    averageTaskDuration: number;
    successRate: number;
    totalTokensUsed: number;
    totalCost: number;
    llmUsageStats: {
        totalTokens: number;
        promptTokens: number;
        completionTokens: number;
        totalCost: number;
    };
}

// ─── State Type Guards ──────────────────────────────────────────────────────────

export const AgentStateTypeGuards = {
    /**
     * Check if value is agent metadata
     */
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

    /**
     * Check if value is agent execution state
     */
    isAgentExecutionState: (value: unknown): value is IAgentExecutionState => {
        if (typeof value !== 'object' || value === null) return false;
        const state = value as Partial<IAgentExecutionState>;
        return (
            typeof state.status === 'string' &&
            Array.isArray(state.completedTasks) &&
            Array.isArray(state.failedTasks) &&
            typeof state.iterations === 'number' &&
            typeof state.maxIterations === 'number' &&
            typeof state.thinking === 'boolean' &&
            typeof state.busy === 'boolean'
        );
    },

    /**
     * Check if value is agent performance stats
     */
    isAgentPerformanceStats: (value: unknown): value is IAgentPerformanceStats => {
        if (typeof value !== 'object' || value === null) return false;
        const stats = value as Partial<IAgentPerformanceStats>;
        return (
            typeof stats.completedTaskCount === 'number' &&
            typeof stats.failedTaskCount === 'number' &&
            typeof stats.averageTaskDuration === 'number' &&
            typeof stats.successRate === 'number' &&
            typeof stats.totalTokensUsed === 'number' &&
            typeof stats.totalCost === 'number' &&
            typeof stats.llmUsageStats === 'object' &&
            stats.llmUsageStats !== null
        );
    }
};

// ─── State Creation Utilities ────────────────────────────────────────────────────

/**
 * Create default agent metadata
 */
export const createDefaultAgentMetadata = (
    id: string,
    name: string
): IAgentMetadata => ({
    id,
    name,
    capabilities: [],
    skills: [],
    created: new Date()
});

/**
 * Create default agent execution state
 */
export const createDefaultAgentExecutionState = (): IAgentExecutionState => ({
    status: 'INITIAL',
    completedTasks: [],
    failedTasks: [],
    iterations: 0,
    maxIterations: 10,
    thinking: false,
    busy: false
});

/**
 * Create default agent performance stats
 */
export const createDefaultAgentPerformanceStats = (): IAgentPerformanceStats => ({
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
});