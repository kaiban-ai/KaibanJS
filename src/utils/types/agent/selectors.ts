/**
 * @file selectors.ts
 * @path src/utils/types/agent/selectors.ts
 * @description Consolidated agent selector types
 *
 * @module @types/agent
 */

import { AgentType } from './base';
import { TaskType } from '../task/base';
import { AgentState } from './state';
import { AGENT_STATUS_enum } from '../common/enums';
import { LLMUsageStats } from '../llm/responses';
import { CostDetails } from '../workflow/costs';

/**
 * Agent runtime selectors
 */
export interface AgentRuntimeSelectors {
    getCurrentAgent: (state: AgentState) => AgentType | null;
    getCurrentTask: (state: AgentState) => TaskType | null;
    getLastError: (state: AgentState) => Error | null;
    getStatus: (state: AgentState) => keyof typeof AGENT_STATUS_enum;
}

/**
 * Agent metrics selectors
 */
export interface AgentMetricSelectors {
    getLLMUsageStats: (state: AgentState) => LLMUsageStats;
    getIterationCount: (state: AgentState) => number;
    getTotalCalls: (state: AgentState) => number;
    getErrorCount: (state: AgentState) => number;
    getAverageLatency: (state: AgentState) => number;
    getCostDetails: (state: AgentState) => CostDetails;
}

/**
 * Complete agent store selectors interface
 */
export interface AgentStoreSelectors extends 
    AgentRuntimeSelectors,
    AgentMetricSelectors {}

/**
 * Type guards for agent selectors
 */
export const AgentSelectorTypeGuards = {
    /**
     * Check if value has runtime selectors
     */
    hasRuntimeSelectors: (value: unknown): value is AgentRuntimeSelectors => {
        if (typeof value !== 'object' || value === null) return false;
        const selectors = value as Partial<AgentRuntimeSelectors>;
        return (
            'getCurrentAgent' in selectors &&
            'getCurrentTask' in selectors &&
            'getLastError' in selectors &&
            'getStatus' in selectors
        );
    },

    /**
     * Check if value has metric selectors
     */
    hasMetricSelectors: (value: unknown): value is AgentMetricSelectors => {
        if (typeof value !== 'object' || value === null) return false;
        const selectors = value as Partial<AgentMetricSelectors>;
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
