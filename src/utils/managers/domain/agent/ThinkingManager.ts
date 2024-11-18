/**
 * @file thinkingManager.ts 
 * @path src/utils/managers/domain/agent/thinkingManager.ts
 * @description Centralized manager for agent thinking processes and LLM interactions
 *
 * @module @managers/domain/agent
 */

import CoreManager from '../../core/coreManager';

// Import types from canonical locations
import type {
    ThinkingExecutionParams,
    ThinkingHandlerParams,
    ThinkingStats
} from '@/utils/types/agent/thinkingTypes';

import type {
    AgentType,
    TaskType,
    HandlerResult,
    Output,
    ParsedOutput,
    LLMUsageStats
} from '@/utils/types';

import { AGENT_STATUS_enum } from '@/utils/types/common/enums';

/**
 * Result interface for thinking execution
 */
interface ThinkingResult {
    parsedLLMOutput: ParsedOutput | null;
    llmOutput: string;
    llmUsageStats: LLMUsageStats;
    messages?: any[];
    output?: Output;
    error?: Error;
}

/**
 * Manages thinking process execution and lifecycle
 */
export class ThinkingManager extends CoreManager {
    private static instance: ThinkingManager;

    private constructor() {
        super();
        this.registerManager('ThinkingManager', this);
    }

    public static getInstance(): ThinkingManager {
        if (!ThinkingManager.instance) {
            ThinkingManager.instance = new ThinkingManager();
        }
        return ThinkingManager.instance;
    }

    /**
     * Execute thinking iteration with error handling
     */
    public async executeThinking(params: ThinkingExecutionParams): Promise<ThinkingResult> {
        const { task, ExecutableAgent, feedbackMessage } = params;
        
        return await this.safeExecute(async () => {
            const agent = task.agent;
            
            // Start thinking process with status transition
            await this.handleStatusTransition({
                currentStatus: agent.status,
                targetStatus: AGENT_STATUS_enum.THINKING,
                entity: 'agent',
                entityId: agent.id,
                metadata: this.prepareMetadata({ agent, task })
            });

            // Execute the thinking process through the LLM
            const llmManager = await this.getManager('LLMManager');
            const result = await ExecutableAgent.invoke(
                { messages: [], feedbackMessage },
                { 
                    timeout: 60000,
                    metadata: { taskId: task.id },
                    tags: ['thinking']
                }
            );

            // Extract relevant data from result
            const { llmOutput, llmUsageStats } = this.extractResultData(result);

            // Parse the LLM output
            const parsedLLMOutput = await this.parseThinkingOutput(llmOutput);
            if (!parsedLLMOutput) {
                throw new Error('Failed to parse LLM output');
            }

            // Complete thinking process
            await this.completeThinking(agent, task, {
                parsedLLMOutput,
                llmOutput,
                llmUsageStats
            });

            return {
                parsedLLMOutput,
                llmOutput,
                llmUsageStats
            };

        }, 'Thinking execution failed');
    }

    /**
     * Extract LLM result data
     */
    private extractResultData(result: any): {
        llmOutput: string;
        llmUsageStats: LLMUsageStats;
    } {
        return {
            llmOutput: result.output || '',
            llmUsageStats: result.llmUsageStats || this.createDefaultLLMStats()
        };
    }

    /**
     * Parse thinking output
     */
    private async parseThinkingOutput(content: string): Promise<ParsedOutput | null> {
        try {
            const parsed = JSON.parse(content);
            return {
                thought: parsed.thought,
                action: parsed.action,
                actionInput: parsed.actionInput,
                observation: parsed.observation,
                isFinalAnswerReady: parsed.isFinalAnswerReady,
                finalAnswer: parsed.finalAnswer,
                metadata: {
                    reasoning: parsed.reasoning,
                    confidence: parsed.confidence,
                    alternativeActions: parsed.alternativeActions
                }
            };
        } catch (error) {
            this.log('Error parsing thinking output:', undefined, undefined, 'error', error as Error);
            return null;
        }
    }

    /**
     * Complete thinking process
     */
    private async completeThinking(
        agent: AgentType,
        task: TaskType,
        result: {
            parsedLLMOutput: ParsedOutput;
            llmOutput: string;
            llmUsageStats: LLMUsageStats;
        }
    ): Promise<void> {
        await this.handleStatusTransition({
            currentStatus: agent.status,
            targetStatus: AGENT_STATUS_enum.THINKING_END,
            entity: 'agent',
            entityId: agent.id,
            metadata: this.prepareMetadata({
                agent,
                task,
                result: result.parsedLLMOutput
            })
        });
    }

    /**
     * Create default LLM stats
     */
    private createDefaultLLMStats(): LLMUsageStats {
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

export default ThinkingManager.getInstance();