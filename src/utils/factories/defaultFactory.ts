/**
 * @file defaultFactory.ts
 * @description Default factory for creating standard objects and instances
 * @deprecated This factory is being deprecated in favor of domain-specific managers:
 * - Use MetricsManager.getInstance() for metrics and iteration context
 * - Use LLMManager.getInstance() for LLM-specific functionality
 * - Use AgentManager.getInstance() for agent validation
 * 
 * @packageDocumentation
 * @module @factories
 */

import type { IIterationContext } from '../../types/agent/agentIterationTypes';
import type { ICostDetails } from '../../types/workflow/workflowCostsTypes';
import type { ILLMUsageMetrics } from '../../types/llm/llmMetricTypes';
import { AgentValidationSchema } from '../../types/agent/agentValidationTypes';
import { LLM_PROVIDER_enum } from '../../types/common/commonEnums';
import { MetricsManager } from '../../managers/core/metricsManager';
import { AgentManager } from '../../managers/domain/agent/agentManager';

/**
 * @deprecated This factory is being deprecated in favor of domain-specific managers.
 * See class documentation for migration details.
 */
export class DefaultFactory {
    /**
     * @deprecated Use MetricsManager.getInstance().createIterationContext() instead
     */
    static createIterationContext(): IIterationContext {
        console.warn('DefaultFactory.createIterationContext() is deprecated. Use MetricsManager.getInstance().createIterationContext() instead.');
        return MetricsManager.getInstance().createIterationContext();
    }

    /**
     * @deprecated Use MetricsManager.getInstance().createCostDetails() instead
     */
    static createCostDetails(): ICostDetails {
        console.warn('DefaultFactory.createCostDetails() is deprecated. Use MetricsManager.getInstance().createCostDetails() instead.');
        return MetricsManager.getInstance().createCostDetails();
    }

    /**
     * @deprecated Use LLMManager.getInstance() and appropriate methods instead
     */
    static createDefaultLLMMetrics(): ILLMUsageMetrics {
        console.warn('DefaultFactory.createDefaultLLMMetrics() is deprecated. Use LLMManager.getInstance() and appropriate methods instead.');
        return {
            totalRequests: 0,
            activeInstances: 0,
            requestsPerSecond: 0,
            averageResponseLength: 0,
            peakMemoryUsage: 0,
            uptime: 0,
            rateLimit: {
                current: 0,
                limit: 0,
                remaining: 0,
                resetTime: Date.now()
            },
            tokenDistribution: {
                prompt: 0,
                completion: 0,
                total: 0
            },
            modelDistribution: {
                gpt4: 0,
                gpt35: 0,
                other: 0
            },
            timestamp: Date.now()
        };
    }

    /**
     * Create a default agent validation schema using Zod
     * @deprecated Use AgentManager.getInstance().createValidationSchema() instead
     * @returns Default validation schema for agents
     */
    static createAgentValidationSchema() {
        console.warn('DefaultFactory.createAgentValidationSchema() is deprecated. Use AgentManager.getInstance().createValidationSchema() instead.');
        return AgentManager.getInstance().createValidationSchema();
    }
}
