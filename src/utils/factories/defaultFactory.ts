/**
 * @file defaultFactory.ts
 * @path KaibanJS/src/utils/factories/defaultFactory.ts
 * @description Default factory for creating standard objects and instances
 *
 * @packageDocumentation
 * @module @factories
 */

import { IterationStats } from '../types/agent/iteration';
import type { CostDetails, LLMUsageStats } from '../types/tool/execution';
import { createDefaultCostDetails } from '../helpers/costs';

export class DefaultFactory {
    static createIterationStats(): IterationStats {
        return {
            startTime: Date.now(),
            endTime: Date.now(),
            duration: 0,
            iterations: 0,
            maxIterations: 0,
            status: 'running'
        };
    }

    static createCostDetails(): CostDetails {
        return createDefaultCostDetails('USD');
    }

    static createLLMUsageStats(): LLMUsageStats {
        return {
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
        };
    }
}
