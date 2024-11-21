/**
 * @file agentSelectorsTypes.ts
 * @path src/types/agent/agentSelectorsTypes.ts
 * @description Consolidated agent selector types and interfaces for accessing agent state
 *
 * @module @types/agent
 */

import type { IAgentType } from './agentBaseTypes';
import type { ITaskType } from '../task/taskBaseTypes';
import type { IAgentState } from './agentStoreTypes';
import type { AGENT_STATUS_enum } from '../common/commonEnums';
import type { ILLMUsageStats } from '../llm/llmResponseTypes';
import type { ICostDetails } from '../workflow/workflowCostsTypes';

// ─── Runtime Selectors ─────────────────────────────────────────────────────────

export interface IAgentRuntimeSelectors {
    getCurrentAgent: (state: IAgentState) => IAgentType | null;
    getCurrentTask: (state: IAgentState) => ITaskType | null;
    getLastError: (state: IAgentState) => Error | null;
    getStatus: (state: IAgentState) => keyof typeof AGENT_STATUS_enum;
}

// ─── Metric Selectors ──────────────────────────────────────────────────────────

export interface IAgentMetricSelectors {
    getLLMUsageStats: (state: IAgentState) => ILLMUsageStats;
    getIterationCount: (state: IAgentState) => number;
    getTotalCalls: (state: IAgentState) => number;
    getErrorCount: (state: IAgentState) => number;
    getAverageLatency: (state: IAgentState) => number;
    getCostDetails: (state: IAgentState) => ICostDetails;
}

// ─── Combined Selector Interface ──────────────────────────────────────────────

export interface IAgentStoreSelectors extends 
    IAgentRuntimeSelectors,
    IAgentMetricSelectors {}

// ─── Type Guards ────────────────────────────────────────────────────────────

export const AgentSelectorTypeGuards = {
    hasRuntimeSelectors: (value: unknown): value is IAgentRuntimeSelectors => {
        if (typeof value !== 'object' || value === null) return false;
        const selectors = value as Partial<IAgentRuntimeSelectors>;
        return (
            'getCurrentAgent' in selectors &&
            'getCurrentTask' in selectors &&
            'getLastError' in selectors &&
            'getStatus' in selectors
        );
    },

    hasMetricSelectors: (value: unknown): value is IAgentMetricSelectors => {
        if (typeof value !== 'object' || value === null) return false;
        const selectors = value as Partial<IAgentMetricSelectors>;
        return (
            'getLLMUsageStats' in selectors &&
            'getIterationCount' in selectors &&
            'getTotalCalls' in selectors &&
            'getErrorCount' in selectors &&
            'getAverageLatency' in selectors &&
            'getCostDetails' in selectors
        );
    }
};
