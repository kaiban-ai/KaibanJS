/**
 * @file defaultFactory.ts
 * @path C:\Users\pwalc\Documents\GroqEmailAssistant\KaibanJS\src\utils\factories\defaultFactory.ts
 * @description Default factory for creating standard objects and instances
 *
 * @packageDocumentation
 * @module @factories
 */

import { IterationStats } from '../types/agent/iteration';
import type { CostDetails, LLMUsageStats } from '../../types/tool/toolExecutionTypes';
import { createDefaultCostDetails } from '../helpers';
import type { AgentValidationSchema } from '../types/agent/config';
import type { BaseAgentConfig } from '../types/agent/config';

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

    /**
     * Create a default agent validation schema
     * @returns Default validation schema for agents
     */
    static createAgentValidationSchema(): AgentValidationSchema {
        return {
            required: ['name', 'role', 'goal', 'background'],
            constraints: {
                name: {
                    minLength: 2,
                    maxLength: 100
                },
                role: {
                    allowedValues: ['assistant', 'analyst', 'researcher', 'developer']
                },
                tools: {
                    minCount: 1,
                    maxCount: 10
                }
            },
            customValidation: (config: BaseAgentConfig) => {
                // Optional custom validation logic
                return config.name.trim().length > 0 && config.tools.length > 0;
            }
        };
    }
}
