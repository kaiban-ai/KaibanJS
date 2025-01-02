/**
 * @file agentMetricsAccessor.ts
 * @path src/types/agent/agentMetricsAccessor.ts
 * @description Type definitions for agent metrics access patterns
 */

import type { ICognitiveResourceMetrics, IThinkingOperationMetrics, IAgentStateMetrics } from './agentMetricTypes';
import type { IAgentType } from './agentBaseTypes';
import type { ICostDetails } from '../workflow/workflowCostsTypes';
import type { IRateLimitMetrics } from '../metrics/base/usageMetrics';
import type { IBaseManager } from './agentManagerTypes';
import type { MANAGER_CATEGORY_enum } from '../common/enumTypes';
import type { IBaseManagerMetadata } from './agentManagerTypes';

/**
 * Base metrics accessor interface
 */
interface IBaseMetricsAccessor extends IBaseManager<unknown> {
    readonly category: MANAGER_CATEGORY_enum;
    initialize(): Promise<void>;
    validate(): Promise<boolean>;
    getMetadata(): IBaseManagerMetadata;
}

/**
 * Metrics accessor for thinking operations
 */
export interface IThinkingMetricsAccessor extends IBaseMetricsAccessor {
    getCognitiveMetrics(agentId: string): Promise<ICognitiveResourceMetrics>;
    getOperationMetrics(agentId: string): Promise<IThinkingOperationMetrics>;
}

/**
 * Metrics accessor for agentic loop operations
 */
export interface IAgenticLoopMetricsAccessor extends IBaseMetricsAccessor {
    getTaskMetrics(agentId: string): Promise<{
        successRate: number;
        goalAchievementRate: number;
        completionCount: number;
        averageTime: number;
    }>;
    getPerformanceMetrics(agentId: string): Promise<{
        totalRequests: number;
        requestsPerSecond: number;
        averageResponseSize: number;
        rateLimit: IRateLimitMetrics;
    }>;
    getCostMetrics(agentId: string): Promise<ICostDetails>;
}

/**
 * State accessor for agent management
 */
export interface IAgentStateAccessor extends IBaseMetricsAccessor {
    getLatestSnapshot(): { agents: Map<string, IAgentType> };
    getAgent(agentId: string): IAgentType | undefined;
    getActiveAgents(): IAgentType[];
    getStateMetrics(agentId: string): Promise<IAgentStateMetrics>;
}

/**
 * Tool usage metrics accessor
 */
export interface IToolMetricsAccessor extends IBaseMetricsAccessor {
    getUsageFrequency(agentId: string): Promise<Record<string, number>>;
    getToolMetrics(agentId: string): Promise<{
        totalUsage: number;
        successRate: number;
        averageLatency: number;
    }>;
}
