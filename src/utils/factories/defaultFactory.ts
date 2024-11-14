/**
 * @file defaultFactory.ts
 * @path KaibanJS/src/utils/factories/defaultFactory.ts
 * @description Factory implementation for creating default objects used throughout the application
 */

import { v4 as uuidv4 } from 'uuid';
import { Tool } from "langchain/tools";
import { logger } from "../core/logger";
import { PrettyError } from "../core/errors";
import { AGENT_STATUS_enum, TASK_STATUS_enum, WORKFLOW_STATUS_enum } from "@/utils/types/common/enums";
import { MessageHistoryManager } from '@/utils/managers/domain/llm/MessageHistoryManager';
import { REACT_CHAMPION_AGENT_DEFAULT_PROMPTS } from '@/utils/helpers/prompts/prompts';
import { getApiKey } from '@/utils/helpers/agent/agentUtils';

import type { 
    IBaseAgent, 
    AgentType,
    BaseAgentConfig,
    AgentCreationResult,
    AgentValidationSchema 
} from '@/utils/types/agent';

import type { 
    LLMUsageStats, 
    LLMConfig, 
    TokenUsage 
} from '@/utils/types/llm';

import type {
    TeamState,
    TeamInputs,
    TeamEnvironment,
    CostDetails,
    WorkflowMetadata,
    ModelUsageStats,
    TaskStats,
} from '@/utils/types';

// ─── Factory Class ──────────────────────────────────────────────────────────────

export class DefaultFactory {
    // ─── Agent Factory Methods ────────────────────────────────────────────────────

    static createAgent(config: BaseAgentConfig): AgentCreationResult {
        try {
            const validationResult = this.validateAgentConfig(config);
            if (!validationResult.isValid) {
                throw new PrettyError({
                    message: 'Invalid agent configuration',
                    context: { errors: validationResult.errors }
                });
            }

            const agent: IBaseAgent = {
                id: uuidv4(),
                name: config.name,
                role: config.role,
                goal: config.goal,
                background: config.background,
                tools: config.tools || [],
                maxIterations: config.maxIterations || 10,
                status: AGENT_STATUS_enum.INITIAL,
                env: null,
                llmInstance: config.llmInstance || null,
                llmConfig: this.normalizeLlmConfig(config.llmConfig || this.createLLMConfig()),
                llmSystemMessage: null,
                forceFinalAnswer: config.forceFinalAnswer ?? true,
                promptTemplates: { ...REACT_CHAMPION_AGENT_DEFAULT_PROMPTS, ...config.promptTemplates },
                messageHistory: config.messageHistory || new MessageHistoryManager(),
                store: null as any,
                initialize: () => {},
                setStore: () => {},
                setStatus: () => {},
                setEnv: () => {},
                workOnTask: async () => ({ error: '', metadata: { iterations: 0, maxAgentIterations: 0 }}),
                workOnFeedback: async () => {},
                normalizeLlmConfig: (config) => config,
                createLLMInstance: () => {}
            };

            return {
                success: true,
                agent,
                validation: validationResult,
                metadata: {
                    createdAt: Date.now(),
                    configHash: Buffer.from(JSON.stringify(config)).toString('base64'),
                    version: '1.0.0'
                }
            };

        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error : new Error(String(error)),
                validation: {
                    isValid: false,
                    errors: [error instanceof Error ? error.message : String(error)]
                }
            };
        }
    }

    // ─── LLM Configuration Methods ─────────────────────────────────────────────────

    static createLLMConfig(): LLMConfig {
        return {
            provider: 'anthropic',
            model: 'claude-3-sonnet-20240229',
            temperature: 0.7,
            maxTokens: 4096,
            streaming: true
        };
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

    // ─── Task Stats Methods ───────────────────────────────────────────────────────

    static createTaskStats(): TaskStats {
        return {
            startTime: Date.now(),
            endTime: Date.now(),
            duration: 0,
            llmUsageStats: this.createLLMUsageStats(),
            iterationCount: 0,
            modelUsage: {}
        };
    }

    // ─── Cost Methods ──────────────────────────────────────────────────────────────

    static createCostDetails(): CostDetails {
        return {
            inputCost: 0,
            outputCost: 0,
            totalCost: 0,
            currency: 'USD',
            breakdown: {
                promptTokens: { count: 0, cost: 0 },
                completionTokens: { count: 0, cost: 0 }
            }
        };
    }

    // ─── State Methods ─────────────────────────────────────────────────────────────

    static createInitialState(): Partial<TeamState> {
        return {
            teamWorkflowStatus: 'INITIAL',
            workflowResult: null,
            name: '',
            agents: [],
            tasks: [],
            workflowLogs: [],
            inputs: {},
            workflowContext: '',
            env: {},
            logLevel: 'info',
            tasksInitialized: false
        };
    }

    // ─── Private Validation Methods ────────────────────────────────────────────────

    private static validateAgentConfig(config: BaseAgentConfig): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];
        
        if (!config.name) errors.push('Agent name is required');
        if (!config.role) errors.push('Agent role is required');
        if (!config.goal) errors.push('Agent goal is required');
        if (!config.background) errors.push('Agent background is required');

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    private static normalizeLlmConfig(llmConfig: LLMConfig): LLMConfig {
        const defaultConfig = this.createLLMConfig();
        return {
            ...defaultConfig,
            ...llmConfig,
            streaming: llmConfig.streaming ?? defaultConfig.streaming,
            temperature: llmConfig.temperature ?? defaultConfig.temperature,
            maxTokens: llmConfig.maxTokens ?? defaultConfig.maxTokens
        };
    }
}

export default DefaultFactory;