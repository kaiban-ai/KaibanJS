/**
 * @file Agent.ts
 * @description Core Agent implementation with updated type system
 */

import { v4 as uuidv4 } from 'uuid';
import { Tool } from "langchain/tools";
import { BaseMessage } from "@langchain/core/messages";
import { logger } from '@/utils/core/logger';
import { PrettyError } from '@/utils/core/errors';
import { DefaultFactory } from '@/utils/factories';
import { LogCreator } from '@/utils/factories/logCreator';
import { MetadataFactory } from '@/utils/factories/metadataFactory';
import { MessageHistoryManager } from '@/utils/managers/messageHistoryManager';

// Import types from canonical locations
import type { 
    IBaseAgent, 
    IReactChampionAgent,
    BaseAgentConfig,
    AgentType,
    SystemAgent 
} from '@/utils/types/agent';

import type {
    AgentStoreState,
    AgentRuntimeState,
    AgentExecutionMetrics,
    AgentExecutionContext,
    AgentExecutionResult
} from '@/utils/types/agent';

import type {
    HandlerResult,
    ThinkingResult,
    ToolHandlerParams,
    ThinkingHandlerParams
} from '@/utils/types/agent';

import type {
    TeamStore,
    TeamState,
    LogType,
    Log
} from '@/utils/types/team';

import type {
    TaskType,
    FeedbackObject
} from '@/utils/types/task';

import type {
    LLMConfig,
    Output,
    LLMUsageStats,
    AgenticLoopResult
} from '@/utils/types/llm';

import { AGENT_STATUS_enum } from '@/utils/types/common/enums';

/**
 * Base Agent Implementation
 */
export class Agent implements IBaseAgent {
    public readonly id: string;
    public name: string;
    public role: string;
    public goal: string;
    public background: string;
    public tools: Tool[];
    public maxIterations: number;
    public store!: TeamStore;
    public status: keyof typeof AGENT_STATUS_enum;
    public env: Record<string, unknown> | null;
    public llmInstance: any | null;
    public llmConfig: LLMConfig;
    public llmSystemMessage: string | null;
    public forceFinalAnswer: boolean;
    public promptTemplates: Record<string, unknown>;
    public messageHistory: MessageHistoryManager;

    constructor(config: BaseAgentConfig) {
        this.validateConfig(config);

        this.id = uuidv4();
        this.name = config.name;
        this.role = config.role;
        this.goal = config.goal;
        this.background = config.background;
        this.tools = config.tools;
        this.maxIterations = config.maxIterations || 10;
        this.status = AGENT_STATUS_enum.INITIAL;
        this.env = null;
        this.llmInstance = config.llmInstance || null;
        this.llmConfig = this.normalizeLlmConfig(config.llmConfig || DefaultFactory.createLLMConfig());
        this.llmSystemMessage = null;
        this.forceFinalAnswer = config.forceFinalAnswer ?? true;
        this.promptTemplates = config.promptTemplates || {};
        this.messageHistory = config.messageHistory || new MessageHistoryManager();

        logger.debug(`Created new agent: ${this.name} (${this.id})`);
    }

    /**
     * Validate agent configuration
     */
    private validateConfig(config: BaseAgentConfig): void {
        const errors: string[] = [];
        
        if (!config.name) errors.push('Agent name is required');
        if (!config.role) errors.push('Agent role is required');
        if (!config.goal) errors.push('Agent goal is required');
        if (!config.background) errors.push('Agent background is required');

        if (errors.length > 0) {
            throw new PrettyError({
                message: 'Invalid agent configuration',
                context: { config, errors },
                type: 'AgentValidationError'
            });
        }
    }

    /**
     * Initialize agent with store and environment
     */
    public initialize(store: TeamStore, env: Record<string, unknown>): void {
        if (!store) {
            throw new PrettyError({
                message: 'Store must be provided for initialization',
                context: { agentId: this.id },
                type: 'AgentInitializationError'
            });
        }

        this.store = store;
        this.env = env;

        if (!this.llmInstance) {
            const apiKey = this.llmConfig.apiKey || env[`${this.llmConfig.provider.toUpperCase()}_API_KEY`];
            if (!apiKey && !this.llmConfig.apiBaseUrl) {
                throw new PrettyError({
                    message: 'API key is required via config or environment',
                    context: { provider: this.llmConfig.provider },
                    type: 'AgentConfigurationError'
                });
            }
            this.llmConfig.apiKey = apiKey;
            this.createLLMInstance();
        }

        // Log initialization using LogCreator
        const initLog = LogCreator.createAgentLog({
            agent: this as AgentType,
            task: null,
            description: `Agent initialized: ${this.name}`,
            metadata: {
                output: {
                    llmUsageStats: DefaultFactory.createLLMUsageStats(),
                },
                timestamp: Date.now()
            },
            agentStatus: AGENT_STATUS_enum.INITIAL
        });

        store.setState(state => ({
            workflowLogs: [...state.workflowLogs, initLog]
        }));

        logger.info(`Initialized agent: ${this.name}`);
    }

    /**
     * Set store reference
     */
    public setStore(store: TeamStore): void {
        if (!store) {
            throw new PrettyError({
                message: 'Store must be provided',
                context: { agentId: this.id },
                type: 'AgentConfigurationError'
            });
        }
        this.store = store;
    }

    /**
     * Set agent status
     */
    public setStatus(status: keyof typeof AGENT_STATUS_enum): void {
        const previousStatus = this.status;
        this.status = status;

        if (this.store) {
            const statusLog = LogCreator.createAgentLog({
                agent: this as AgentType,
                task: null,
                description: `Agent status changed: ${status}`,
                metadata: {
                    previousStatus,
                    timestamp: Date.now(),
                    output: {
                        llmUsageStats: DefaultFactory.createLLMUsageStats()
                    }
                },
                agentStatus: status
            });

            this.store.setState(state => ({
                workflowLogs: [...state.workflowLogs, statusLog]
            }));
        }

        logger.debug(`Updated agent ${this.name} status to: ${status}`);
    }

    /**
     * Set environment variables
     */
    public setEnv(env: Record<string, unknown>): void {
        this.env = env;
    }

    /**
     * Create LLM instance - to be implemented by subclasses
     */
    public createLLMInstance(): void {
        throw new Error("createLLMInstance must be implemented by subclasses");
    }

    /**
     * Work on task - to be implemented by subclasses
     */
    public async workOnTask(task: TaskType): Promise<AgenticLoopResult> {
        throw new Error("workOnTask must be implemented by subclasses");
    }

    /**
     * Process feedback - to be implemented by subclasses
     */
    public async workOnFeedback(
        task: TaskType,
        feedbackList: FeedbackObject[],
        context: string
    ): Promise<void> {
        throw new Error("workOnFeedback must be implemented by subclasses");
    }

    /**
     * Normalize LLM configuration
     */
    public normalizeLlmConfig(llmConfig: LLMConfig): LLMConfig {
        const defaultConfig = DefaultFactory.createLLMConfig();
        return {
            ...defaultConfig,
            ...llmConfig,
            streaming: llmConfig.streaming ?? defaultConfig.streaming,
            temperature: llmConfig.temperature ?? defaultConfig.temperature,
            maxTokens: llmConfig.maxTokens ?? defaultConfig.maxTokens
        };
    }

    /**
     * Get agent metrics
     */
    public getMetrics(): AgentExecutionMetrics {
        if (!this.store) {
            return DefaultFactory.createAgentMetrics();
        }

        const logs = this.store.getState().workflowLogs;
        const agentLogs = logs.filter(log => log.agent?.id === this.id);

        return {
            llmUsageStats: this.calculateLLMStats(agentLogs),
            iterationCount: this.calculateIterationCount(agentLogs),
            totalCalls: agentLogs.length,
            errorCount: this.calculateErrorCount(agentLogs),
            averageLatency: this.calculateAverageLatency(agentLogs),
            costDetails: DefaultFactory.createCostDetails()
        };
    }

    /**
     * Calculate LLM usage statistics
     */
    private calculateLLMStats(logs: Log[]): LLMUsageStats {
        const stats = DefaultFactory.createLLMUsageStats();
        
        logs.forEach(log => {
            const logStats = log.metadata?.output?.llmUsageStats;
            if (logStats) {
                stats.inputTokens += logStats.inputTokens || 0;
                stats.outputTokens += logStats.outputTokens || 0;
                stats.callsCount += logStats.callsCount || 0;
                stats.callsErrorCount += logStats.callsErrorCount || 0;
                stats.parsingErrors += logStats.parsingErrors || 0;
                stats.totalLatency += logStats.totalLatency || 0;
            }
        });

        stats.averageLatency = stats.callsCount ? stats.totalLatency / stats.callsCount : 0;
        return stats;
    }

    /**
     * Calculate total iterations
     */
    private calculateIterationCount(logs: Log[]): number {
        return logs.filter(log => log.agentStatus === AGENT_STATUS_enum.ITERATION_END).length;
    }

    /**
     * Calculate total errors
     */
    private calculateErrorCount(logs: Log[]): number {
        return logs.filter(log => 
            log.agentStatus === AGENT_STATUS_enum.THINKING_ERROR ||
            log.agentStatus === AGENT_STATUS_enum.USING_TOOL_ERROR ||
            log.agentStatus === AGENT_STATUS_enum.MAX_ITERATIONS_ERROR
        ).length;
    }

    /**
     * Calculate average latency
     */
    private calculateAverageLatency(logs: Log[]): number {
        const latencies = logs.map(log => log.metadata?.output?.llmUsageStats?.totalLatency || 0);
        return latencies.length ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
    }

    /**
     * Clean up agent resources
     */
    public async cleanup(): Promise<void> {
        await this.messageHistory.clear();
        this.llmInstance = null;
        logger.debug(`Cleaned up agent: ${this.name}`);
    }
}

export default Agent;