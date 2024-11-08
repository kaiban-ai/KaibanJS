/**
 * @file baseAgent.ts
 * @path src/agents/baseAgent.ts
 * @description Base agent implementation
 */

import { v4 as uuidv4 } from 'uuid';
import { Tool } from "langchain/tools";
import { logger } from "@/utils/core/logger";
import { REACT_CHAMPION_AGENT_DEFAULT_PROMPTS } from '@/utils/helpers/prompts/prompts';
import { getApiKey } from '@/utils/helpers/agent/agentUtils';
import { errorHandler } from '@/utils/handlers';
import { IBaseAgent, BaseAgentConfig, HandlerBaseParams, AgentType } from '@/utils/types/agent';
import { LLMConfig, TaskType, TeamStore, FeedbackObject } from '@/utils/types';
import { AgenticLoopResult } from '@/utils/types/llm';
import { AGENT_STATUS_enum } from "@/utils/types/common/enums";
import CustomMessageHistory from '@/utils/managers/messageHistoryManager';

// Base agent implementation
export class BaseAgent implements IBaseAgent {
    public id: string;
    public name: string;
    public role: string;
    public goal: string;
    public background: string;
    public tools: Tool[];
    public maxIterations: number;
    public store!: TeamStore;
    public status: keyof typeof AGENT_STATUS_enum;
    public env: Record<string, any> | null;
    public llmInstance: any | null;
    public llmConfig: LLMConfig;
    public llmSystemMessage: string | null;
    public forceFinalAnswer: boolean;
    public promptTemplates: Record<string, any>;
    public messageHistory: CustomMessageHistory;

    constructor({ 
        name, 
        role, 
        goal, 
        background, 
        tools, 
        llmConfig = { provider: "openai", model: "gpt-4" },
        maxIterations = 10, 
        forceFinalAnswer = true, 
        promptTemplates = {}, 
        llmInstance = null 
    }: BaseAgentConfig) {
        // Initialize required properties
        this.id = uuidv4();
        this.name = name;
        this.role = role;
        this.goal = goal;
        this.background = background;
        this.tools = tools;
        this.maxIterations = maxIterations;
        this.status = AGENT_STATUS_enum.INITIAL;
        this.env = null;
        this.llmInstance = llmInstance;
        this.llmConfig = this.normalizeLlmConfig(llmConfig);
        this.llmSystemMessage = null;
        this.forceFinalAnswer = forceFinalAnswer;
        this.promptTemplates = { ...REACT_CHAMPION_AGENT_DEFAULT_PROMPTS, ...promptTemplates };
        this.messageHistory = new CustomMessageHistory();

        // Validate required fields
        if (!name || !role || !goal || !background) {
            throw new Error('Required agent configuration fields missing');
        }
    }

    // Initialize agent with store and environment
    initialize(store: TeamStore, env: Record<string, any>): void {
        if (!store) {
            throw new Error('Store must be provided');
        }
        this.store = store;
        this.env = env;

        if (!this.llmInstance) {
            const apiKey = getApiKey(this.llmConfig, this.env);
            if (!apiKey && !this.llmConfig.apiBaseUrl) {
                throw new Error('API key is required via config or environment');
            }
            this.llmConfig.apiKey = apiKey;
            this.createLLMInstance();
        }

        logger.info(`Initialized agent: ${this.name}`);
    }

    // Set store reference
    setStore(store: TeamStore): void {
        if (!store) {
            throw new Error('Store must be provided');
        }
        this.store = store;
    }

    // Set agent status
    setStatus(status: keyof typeof AGENT_STATUS_enum): void {
        this.status = status;
        logger.debug(`Updated agent ${this.name} status to: ${status}`);
    }

    // Set environment variables
    setEnv(env: Record<string, any>): void {
        this.env = env;
    }

    // Abstract method to be implemented by subclasses
    createLLMInstance(): void {
        throw new Error("createLLMInstance must be implemented by subclasses");
    }

    // Abstract method to be implemented by subclasses
    async workOnTask(task: TaskType): Promise<AgenticLoopResult> {
        throw new Error("workOnTask must be implemented by subclasses");
    }

    // Abstract method to be implemented by subclasses
    async workOnFeedback(task: TaskType, feedbackList: FeedbackObject[], context: string): Promise<void> {
        throw new Error("workOnFeedback must be implemented by subclasses");
    }

    // Normalize LLM configuration
    normalizeLlmConfig(llmConfig: LLMConfig): LLMConfig {
        return llmConfig;
    }

    // Handle agent iteration start
    public handleIterationStart(params: { task: TaskType; iterations: number; maxAgentIterations: number }): void {
        const { task, iterations, maxAgentIterations } = params;

        this.setStatus(AGENT_STATUS_enum.ITERATION_START);
        logger.debug(`Starting iteration ${iterations + 1}/${maxAgentIterations} for agent ${this.name}`);

        const log = this.store.prepareNewLog({
            agent: this as AgentType,
            task,
            logDescription: `Starting iteration ${iterations + 1}/${maxAgentIterations}`,
            metadata: {
                iterations,
                maxAgentIterations,
                timestamp: Date.now()
            },
            logType: 'AgentStatusUpdate',
            agentStatus: AGENT_STATUS_enum.ITERATION_START
        });

        this.store.setState(state => ({
            workflowLogs: [...state.workflowLogs, log]
        }));
    }

    // Handle iteration end
    public handleIterationEnd(params: { task: TaskType; iterations: number; maxAgentIterations: number }): void {
        const { task, iterations, maxAgentIterations } = params;

        this.setStatus(AGENT_STATUS_enum.ITERATION_END);
        logger.debug(`Completed iteration ${iterations + 1}/${maxAgentIterations} for agent ${this.name}`);

        const log = this.store.prepareNewLog({
            agent: this as AgentType,
            task,
            logDescription: `Completed iteration ${iterations + 1}/${maxAgentIterations}`,
            metadata: {
                iterations,
                maxAgentIterations,
                timestamp: Date.now()
            },
            logType: 'AgentStatusUpdate',
            agentStatus: AGENT_STATUS_enum.ITERATION_END
        });

        this.store.setState(state => ({
            workflowLogs: [...state.workflowLogs, log]
        }));
    }
}

export { BaseAgent as BaseAgentImplementation };
