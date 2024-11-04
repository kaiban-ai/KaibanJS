/**
 * Path: src/agents/Agent.ts
 */

import { v4 as uuidv4 } from 'uuid';
import { ReactChampionAgent } from './reactChampionAgent';
import { logger } from '@/utils/core/logger';
import CustomMessageHistory from '@/utils/CustomMessageHistory';
import { AGENT_STATUS_enum, TASK_STATUS_enum } from "@/utils/types/common/enums";
import { create } from 'zustand';
import { BaseMessage } from "@langchain/core/messages";
import { useAgentStore } from '@/stores/agentStore';
import { useTaskStore } from '@/stores/taskStore';
import type {
    IReactChampionAgent, 
    BaseAgentConfig, 
    LLMConfig,
    GroqConfig,
    OpenAIConfig,
    AnthropicConfig,
    GoogleConfig,
    MistralConfig,
    TaskType,
    TeamStore, 
    FeedbackObject, 
    AgenticLoopResult,
    PrepareNewLogParams,
    Log,
    ErrorType,
    AgentType,
    ParsedOutput,
    Output,
    StoreSubscribe,
} from '@/utils/types';
import { createTeamStore } from '@/stores/teamStore';

const defaultGroqConfig: GroqConfig = {
    provider: 'groq',
    model: 'llama3-groq-70b-8192-tool-use-preview',
    temperature: 0.1,
    streaming: true,
    max_tokens: 8192,
    stop: null,
    apiKey: process.env.GROQ_API_KEY || ''
};

export class Agent implements IReactChampionAgent {
    id: string;
    name: string;
    role: string;
    goal: string;
    background: string;
    tools: any[];
    maxIterations: number;
    store: TeamStore;
    status: keyof typeof AGENT_STATUS_enum = 'INITIAL';
    env: Record<string, any> | null = null;
    llmInstance: any | null;
    llmConfig: LLMConfig;
    llmSystemMessage: string | null;
    forceFinalAnswer: boolean;
    promptTemplates: Record<string, any>;
    executableAgent: ReactChampionAgent;
    messageHistory: CustomMessageHistory;

    constructor(config: BaseAgentConfig & { messageHistory?: CustomMessageHistory }) {
        this.id = uuidv4();
        this.name = config.name;
        this.role = config.role;
        this.goal = config.goal;
        this.background = config.background;
        this.tools = config.tools;
        this.maxIterations = config.maxIterations || 10;

        // Create a store using agentStore instead of implementing TeamStore directly
        this.store = createTeamStore({
            name: config.name,
            agents: [],
            tasks: [],
            workflowLogs: [],
            teamWorkflowStatus: 'INITIAL',
            workflowResult: null,
            inputs: {},
            workflowContext: '',
            env: {},
            logLevel: 'info',
        })();  // <-- Add () here to invoke the store creator

        // LLM configuration
        this.llmConfig = this.normalizeLlmConfig(config.llmConfig || defaultGroqConfig);
        this.llmSystemMessage = null;
        this.forceFinalAnswer = config.forceFinalAnswer ?? true;
        this.promptTemplates = config.promptTemplates || {};
        
        // Message history and executable agent initialization
        this.messageHistory = config.messageHistory || new CustomMessageHistory();
        this.executableAgent = new ReactChampionAgent({
            ...config,
            llmConfig: this.llmConfig,
            messageHistory: this.messageHistory
        });

        // LLM configuration
        this.llmConfig = this.normalizeLlmConfig(config.llmConfig || defaultGroqConfig);
        this.llmSystemMessage = null;
        this.forceFinalAnswer = config.forceFinalAnswer ?? true;
        this.promptTemplates = config.promptTemplates || {};
        
        // Message history and executable agent initialization
        this.messageHistory = config.messageHistory || new CustomMessageHistory();
        this.executableAgent = new ReactChampionAgent({
            ...config,
            llmConfig: this.llmConfig,
            messageHistory: this.messageHistory
        });
    }

    public handleIterationStart(params: { 
        task: TaskType; 
        iterations: number; 
        maxAgentIterations: number 
    }): void {
        this.executableAgent?.handleIterationStart(params);
    }

    public handleIterationEnd(params: { 
        task: TaskType; 
        iterations: number; 
        maxAgentIterations: number 
    }): void {
        this.executableAgent?.handleIterationEnd(params);
    }

    public handleThinkingError(params: { 
        task: TaskType; 
        error: Error 
    }): void {
        this.executableAgent?.handleThinkingError(params);
    }

    public handleTaskCompleted(params: {
        task: TaskType;
        parsedResultWithFinalAnswer: ParsedOutput;
        iterations: number;
        maxAgentIterations: number;
    }): void {
        this.executableAgent?.handleTaskCompleted(params);
    }

    public handleMaxIterationsError(params: {
        task: TaskType;
        iterations: number;
        maxAgentIterations: number;
    }): void {
        this.executableAgent?.handleMaxIterationsError(params);
    }

    public handleAgenticLoopError(params: {
        task: TaskType;
        error: Error;
        iterations: number;
        maxAgentIterations: number;
    }): void {
        this.executableAgent?.handleAgenticLoopError(params);
    }

    public handleFinalAnswer(params: {
        agent: IReactChampionAgent;
        task: TaskType;
        parsedLLMOutput: ParsedOutput;
    }): ParsedOutput {
        return this.executableAgent?.handleFinalAnswer(params) || params.parsedLLMOutput;
    }

    public handleIssuesParsingLLMOutput(params: {
        agent: IReactChampionAgent;
        task: TaskType;
        output: Output;
        llmOutput: string;
    }): string {
        return this.executableAgent?.handleIssuesParsingLLMOutput(params) || 'Error parsing LLM output';
    }

    async workOnTask(task: TaskType): Promise<AgenticLoopResult> {
        if (!this.executableAgent) {
            throw new Error("Agent not properly initialized");
        }

        logger.debug(`Agent ${this.name} starting work on task: ${task.title}`);
        
        try {
            const result = await this.executableAgent.workOnTask(task);
            logger.debug(`Agent ${this.name} completed task with result:`, result);
            return result;
        } catch (error) {
            logger.error(`Error in agent ${this.name} while working on task:`, error);
            throw error;
        }
    }

    async workOnFeedback(task: TaskType, feedbackList: FeedbackObject[], context: string): Promise<void> {
        if (!this.executableAgent) {
            throw new Error("Agent not properly initialized");
        }

        logger.debug(`Agent ${this.name} processing feedback for task: ${task.title}`);
        
        try {
            await this.executableAgent.workOnFeedback(task, feedbackList, context);
            logger.debug(`Agent ${this.name} completed feedback processing`);
        } catch (error) {
            logger.error(`Error in agent ${this.name} while processing feedback:`, error);
            throw error;
        }
    }

    initialize(store: TeamStore, env: Record<string, any>): void {
        this.store = store;
        this.env = env;
        
        if (this.executableAgent) {
            this.executableAgent.initialize(store, env);
        }
        
        logger.debug(`Agent ${this.name} initialized with store and environment`);
    }

    setStore(store: TeamStore): void {
        this.store = store;
        if (this.executableAgent) {
            this.executableAgent.setStore(store);
        }
    }

    setStatus(status: keyof typeof AGENT_STATUS_enum): void {
        this.status = status;
        if (this.executableAgent) {
            this.executableAgent.setStatus(status);
        }
    }

    setEnv(env: Record<string, any>): void {
        this.env = env;
        if (this.executableAgent) {
            this.executableAgent.setEnv(env);
        }
    }

    createLLMInstance(): void {
        if (!this.executableAgent) {
            throw new Error("Executable agent not initialized");
        }
        this.executableAgent.createLLMInstance();
    }

    normalizeLlmConfig(config: LLMConfig): LLMConfig {
        switch (config.provider) {
            case 'groq': {
                const groqConfig: GroqConfig = {
                    provider: 'groq',
                    model: config.model || defaultGroqConfig.model,
                    temperature: config.temperature ?? defaultGroqConfig.temperature,
                    streaming: config.streaming ?? defaultGroqConfig.streaming,
                    max_tokens: (config as GroqConfig).max_tokens ?? defaultGroqConfig.max_tokens,
                    stop: (config as GroqConfig).stop ?? null,
                    apiKey: config.apiKey || process.env.GROQ_API_KEY || ''
                };
                return groqConfig;
            }
            case 'openai': {
                const openaiConfig: OpenAIConfig = {
                    provider: 'openai',
                    model: config.model,
                    temperature: config.temperature,
                    streaming: config.streaming,
                    max_tokens: (config as OpenAIConfig).max_tokens,
                    stop: Array.isArray((config as OpenAIConfig).stop) ? (config as OpenAIConfig).stop : undefined,
                    apiKey: config.apiKey || process.env.OPENAI_API_KEY || '',
                    frequency_penalty: (config as OpenAIConfig).frequency_penalty,
                    presence_penalty: (config as OpenAIConfig).presence_penalty,
                    top_p: (config as OpenAIConfig).top_p,
                    n: (config as OpenAIConfig).n
                };
                return openaiConfig;
            }
            case 'anthropic': {
                const anthropicConfig: AnthropicConfig = {
                    provider: 'anthropic',
                    model: config.model,
                    temperature: config.temperature,
                    streaming: config.streaming,
                    max_tokens_to_sample: (config as AnthropicConfig).max_tokens_to_sample,
                    stop_sequences: (config as AnthropicConfig).stop_sequences,
                    apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY || ''
                };
                return anthropicConfig;
            }
            case 'google': {
                const googleConfig: GoogleConfig = {
                    provider: 'google',
                    model: config.model,
                    temperature: config.temperature,
                    streaming: config.streaming,
                    maxOutputTokens: (config as GoogleConfig).maxOutputTokens,
                    apiKey: config.apiKey || process.env.GOOGLE_API_KEY || '',
                    topK: (config as GoogleConfig).topK,
                    topP: (config as GoogleConfig).topP,
                    stopSequences: (config as GoogleConfig).stopSequences,
                    safetySettings: (config as GoogleConfig).safetySettings,
                    apiVersion: (config as GoogleConfig).apiVersion,
                    apiBaseUrl: (config as GoogleConfig).apiBaseUrl
                };
                return googleConfig;
            }
            case 'mistral': {
                const mistralConfig: MistralConfig = {
                    provider: 'mistral',
                    model: config.model,
                    temperature: config.temperature,
                    streaming: config.streaming,
                    max_tokens: (config as MistralConfig).max_tokens,
                    top_p: (config as MistralConfig).top_p,
                    safe_mode: (config as MistralConfig).safe_mode,
                    random_seed: (config as MistralConfig).random_seed,
                    apiKey: config.apiKey || process.env.MISTRAL_API_KEY || '',
                    endpoint: (config as MistralConfig).endpoint
                };
                return mistralConfig;
            }
            default:
                return defaultGroqConfig;
        }
    }
}


