import { v4 as uuidv4 } from 'uuid';
import { AGENT_STATUS_enum } from '../utils/enums';
import { REACT_CHAMPION_AGENT_DEFAULT_PROMPTS } from '../utils/prompts';
import type { 
    IBaseAgent, 
    BaseAgentConfig, 
    LLMConfig, 
    TaskType, 
    FeedbackObject,
    AgenticLoopResult
} from '../../types/types';
import { Tool } from "langchain/tools";
import { logger } from "../utils/logger";

class BaseAgentImplementation implements IBaseAgent {
    id: string;
    name: string;
    role: string;
    goal: string;
    background: string;
    tools: Tool[];
    maxIterations: number;
    store: any | null;
    status: keyof typeof AGENT_STATUS_enum;
    env: any | null;
    llmInstance: any | null;
    llmConfig: LLMConfig;
    llmSystemMessage: string | null;
    forceFinalAnswer: boolean;
    promptTemplates: Record<string, any>;

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
        this.id = uuidv4();
        this.name = name;
        this.role = role;
        this.goal = goal;
        this.background = background;
        this.tools = tools;
        this.maxIterations = maxIterations;
        this.store = null;
        this.status = AGENT_STATUS_enum.INITIAL;
        this.env = null;
        this.llmInstance = llmInstance;
        
        this.llmConfig = this.normalizeLlmConfig(llmConfig);
        this.llmSystemMessage = null;
        this.forceFinalAnswer = forceFinalAnswer;
        this.promptTemplates = { ...REACT_CHAMPION_AGENT_DEFAULT_PROMPTS, ...promptTemplates };
    }

    normalizeLlmConfig(llmConfig: LLMConfig): LLMConfig {
        const normalizedConfig: LLMConfig = { ...llmConfig };
        
        // Ensure required fields are present
        if (!normalizedConfig.provider) {
            throw new Error("LLM provider must be specified");
        }
        if (!normalizedConfig.model) {
            throw new Error("LLM model must be specified");
        }

        // Set default values if not provided
        normalizedConfig.maxRetries = normalizedConfig.maxRetries || 1;
        normalizedConfig.temperature = normalizedConfig.temperature ?? 0;

        return normalizedConfig;
    }

    initialize(store: any, env: Record<string, string>): void {
        this.store = store;
        this.env = env;

        if (!this.llmInstance) {
            const apiKey = this.getApiKey(this.llmConfig, this.env);
            if (!apiKey && !this.llmConfig.apiBaseUrl) {
                throw new Error('API key is missing. Please provide it through the Agent llmConfig or through the team env variable.');
            }
            this.llmConfig.apiKey = apiKey;

            this.createLLMInstance();
        }
    }

    createLLMInstance(): void {
        // This method should be overridden by specific agent implementations
        throw new Error("createLLMInstance must be implemented by subclasses.");
    }

    getApiKey(llmConfig: LLMConfig, env: Record<string, string>): string | undefined {
        if (llmConfig?.apiKey) return llmConfig.apiKey;

        const apiKeys: Record<string, string | undefined> = {
            anthropic: env.ANTHROPIC_API_KEY,
            google: env.GOOGLE_API_KEY,
            mistral: env.MISTRAL_API_KEY,
            openai: env.OPENAI_API_KEY,
            groq: env.GROQ_API_KEY
        };
        return apiKeys[llmConfig?.provider || ''];    
    }

    setStore(store: any): void {
        this.store = store;
    }

    setStatus(status: keyof typeof AGENT_STATUS_enum): void {
        this.status = status;
    }

    setEnv(env: Record<string, any>): void {
        this.env = env;
    }

    async workOnTask(task: TaskType): Promise<{ error?: string; result?: any; metadata: { iterations: number; maxAgentIterations: number } }> {
        throw new Error("workOnTask must be implemented by subclasses.");
    }

    async workOnFeedback(task: TaskType, feedbackList: FeedbackObject[], context: string): Promise<void> {
        throw new Error("workOnFeedback must be implemented by subclasses.");
    }

    protected handleIterationStart({task, iterations, maxAgentIterations}: { task: TaskType; iterations: number; maxAgentIterations: number }): void {
        this.setStatus(AGENT_STATUS_enum.ITERATION_START);
        const newLog = this.store.getState().prepareNewLog({
            agent: this,
            task,
            logDescription: `🏁 Agent ${this.name} - ${AGENT_STATUS_enum.ITERATION_START} (${iterations+1}/${maxAgentIterations})`,
            metadata: { iterations, maxAgentIterations },
            logType: 'AgentStatusUpdate',
            agentStatus: this.status
        });
        logger.trace(`🏁 ${AGENT_STATUS_enum.ITERATION_START}: Agent ${this.name} -  (${iterations+1}/${maxAgentIterations})`);
        this.store.getState().workflowLogs.push(newLog);
    }

    protected handleIterationEnd({task, iterations, maxAgentIterations}: { task: TaskType; iterations: number; maxAgentIterations: number }): void {
        this.setStatus(AGENT_STATUS_enum.ITERATION_END);
        const newLog = this.store.getState().prepareNewLog({
            agent: this,
            task,
            logDescription: `🔄 Agent ${this.name} - ${AGENT_STATUS_enum.ITERATION_END}`,
            metadata: { iterations, maxAgentIterations },
            logType: 'AgentStatusUpdate',
            agentStatus: this.status,
        });
        logger.trace(`🔄 ${AGENT_STATUS_enum.ITERATION_END}: Agent ${this.name} ended another iteration.`);
        this.store.getState().workflowLogs.push(newLog);
    }

    protected handleThinkingError({ task, error }: { task: TaskType; error: Error }): void {
        this.setStatus(AGENT_STATUS_enum.THINKING_ERROR);
        const newLog = this.store.getState().prepareNewLog({
            agent: this,
            task,
            logDescription: `🛑 Agent ${this.name} encountered an error during ${AGENT_STATUS_enum.THINKING}.`,
            metadata: { error },
            logType: 'AgentStatusUpdate',
            agentStatus: this.status,
        });
        logger.error(`🛑 ${AGENT_STATUS_enum.THINKING_ERROR}: Agent ${this.name} encountered an error thinking. Further details: ${error.name ? error.name : 'No additional error details'}`, error.message);
        this.store.getState().workflowLogs.push(newLog);
        this.store.getState().handleTaskBlocked({ task, error });
    }
}

export { BaseAgentImplementation as BaseAgent };