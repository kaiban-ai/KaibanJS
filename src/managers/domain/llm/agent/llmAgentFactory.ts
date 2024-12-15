/**
 * @file llmAgentFactory.ts
 * @path src/managers/domain/llm/agent/llmAgentFactory.ts
 * @description Factory for creating provider-specific LLM agents
 */

import { LLM_PROVIDER_enum } from '../../../../types/common/commonEnums';
import { LLMBaseAgent } from './llmBaseAgent';
import { LLMMetricsCollector } from '../../../../metrics/LLMMetricsCollector';
import { IMessageHistory } from '../../../../types/llm/message/messagingHistoryTypes';
import { IRuntimeLLMConfig } from '../../../../types/llm/llmCommonTypes';
import { createError } from '../../../../types/common/commonErrorTypes';

/**
 * Configuration for creating an LLM agent
 */
interface ILLMAgentConfig {
    llmConfig: IRuntimeLLMConfig;
    messageHistory: IMessageHistory;
    metricsCollector: LLMMetricsCollector;
}

/**
 * Provider-specific agent implementations
 */
class GroqAgent extends LLMBaseAgent {
    constructor(config: ILLMAgentConfig) {
        super(config);
    }
}

class OpenAIAgent extends LLMBaseAgent {
    constructor(config: ILLMAgentConfig) {
        super(config);
    }
}

class AnthropicAgent extends LLMBaseAgent {
    constructor(config: ILLMAgentConfig) {
        super(config);
    }
}

class GoogleAgent extends LLMBaseAgent {
    constructor(config: ILLMAgentConfig) {
        super(config);
    }
}

class MistralAgent extends LLMBaseAgent {
    constructor(config: ILLMAgentConfig) {
        super(config);
    }
}

/**
 * Factory for creating LLM agents
 */
export class LLMAgentFactory {
    private static instance: LLMAgentFactory;
    private agents: Map<LLM_PROVIDER_enum, new (config: ILLMAgentConfig) => LLMBaseAgent>;

    private constructor() {
        this.agents = new Map();
        this.registerDefaultAgents();
    }

    public static getInstance(): LLMAgentFactory {
        if (!LLMAgentFactory.instance) {
            LLMAgentFactory.instance = new LLMAgentFactory();
        }
        return LLMAgentFactory.instance;
    }

    private registerDefaultAgents(): void {
        this.agents.set(LLM_PROVIDER_enum.GROQ, GroqAgent);
        this.agents.set(LLM_PROVIDER_enum.OPENAI, OpenAIAgent);
        this.agents.set(LLM_PROVIDER_enum.ANTHROPIC, AnthropicAgent);
        this.agents.set(LLM_PROVIDER_enum.GOOGLE, GoogleAgent);
        this.agents.set(LLM_PROVIDER_enum.MISTRAL, MistralAgent);
    }

    /**
     * Register a new agent implementation
     */
    public registerAgent(provider: LLM_PROVIDER_enum, agent: new (config: ILLMAgentConfig) => LLMBaseAgent): void {
        this.agents.set(provider, agent);
    }

    /**
     * Create an agent instance for the specified provider
     */
    public createAgent(config: ILLMAgentConfig): LLMBaseAgent {
        const AgentClass = this.agents.get(config.llmConfig.provider);
        if (!AgentClass) {
            throw createError({
                message: `No agent registered for provider: ${config.llmConfig.provider}`,
                type: 'ValidationError',
                context: {
                    component: this.constructor.name,
                    provider: config.llmConfig.provider
                }
            });
        }
        return new AgentClass(config);
    }

    /**
     * Check if an agent implementation exists for the provider
     */
    public hasAgent(provider: LLM_PROVIDER_enum): boolean {
        return this.agents.has(provider);
    }

    /**
     * Get all registered providers
     */
    public getRegisteredProviders(): LLM_PROVIDER_enum[] {
        return Array.from(this.agents.keys());
    }
}

export const llmAgentFactory = LLMAgentFactory.getInstance();
