/**
 * Path: C:\Users\pwalc\Documents\GroqEmailAssistant\KaibanJS\src\index.ts
 * API module for the Library.
  *    
 * This module defines the primary classes used throughout the library, encapsulating
 * the core functionalities of agents, tasks, and team coordination. It serves as the
 * public interface for the library, allowing external applications to interact with
 * and utilize the main features provided.
 * 
 * Classes:
 * - Agent: Represents an entity capable of performing tasks using specific AI models.
 *   Agents have properties such as name, role, and the tools they use, and are capable
 *   of executing tasks based on these properties.
 * - Task: Defines a specific activity or job that an agent can perform. Tasks are 
 *   characterized by descriptions, expected outcomes, and their deliverability status.
 * - Team: Manages a group of agents and orchestrates the execution of tasks. It is 
 *   responsible for coordinating the agents to achieve collective goals effectively.
 */


import { v4 as uuidv4 } from 'uuid';
import { createTeamStore } from './stores';
import { ReactChampionAgent } from './agents';
import { TASK_STATUS_enum, WORKFLOW_STATUS_enum, AGENT_STATUS_enum } from './utils/core/enums';
import CustomMessageHistory from './utils/CustomMessageHistory';
import { 
    AgentType, 
    TaskType, 
    FeedbackObject, 
    TaskResult, 
    TeamStore,
    LLMConfig,
    GroqConfig,
    BaseAgentConfig,
    IReactChampionAgent,
    AgenticLoopResult,
    UseBoundTeamStore
} from '../types/types';
import {
    SystemMessage,
    HumanMessage,
    AIMessage
} from "@langchain/core/messages";

const defaultGroqConfig: GroqConfig = {
    provider: 'groq',
    model: 'llama3-groq-70b-8192-tool-use-preview',
    temperature: 0.1,
    streaming: true,
    apiKey: process.env.GROQ_API_KEY || '',
    maxTokens: 8192,
    stop: null
};

interface ExtendedBaseAgentConfig extends BaseAgentConfig {
    messageHistory?: CustomMessageHistory;
}

class Agent implements IReactChampionAgent {
    id: string;
    name: string;
    role: string;
    goal: string;
    background: string;
    tools: any[];
    maxIterations: number;
    store: TeamStore | null;
    status: keyof typeof AGENT_STATUS_enum;
    env: Record<string, any>;
    llmInstance: any;
    llmConfig: LLMConfig;
    llmSystemMessage: string | null;
    forceFinalAnswer: boolean;
    promptTemplates: Record<string, any>;
    executableAgent: ReactChampionAgent;
    messageHistory: CustomMessageHistory;

    constructor(config: ExtendedBaseAgentConfig) {
        this.id = uuidv4();
        this.name = config.name;
        this.role = config.role;
        this.goal = config.goal;
        this.background = config.background;
        this.tools = config.tools;
        this.maxIterations = config.maxIterations || 10;
        this.store = null;
        this.status = 'INITIAL';
        this.env = {};
        this.llmInstance = null;
        this.llmConfig = this.normalizeLlmConfig(config.llmConfig || defaultGroqConfig);
        this.llmSystemMessage = null;
        this.forceFinalAnswer = config.forceFinalAnswer ?? true;
        this.promptTemplates = config.promptTemplates || {};
        this.messageHistory = config.messageHistory || new CustomMessageHistory();
        this.executableAgent = new ReactChampionAgent({
            ...config,
            llmConfig: this.llmConfig
        });
    }

    async workOnTask(task: TaskType): Promise<AgenticLoopResult> {
        const message = new HumanMessage(
            `Task: ${task.description}\nInputs: ${JSON.stringify(task.inputs)}\nContext: ${task.interpolatedTaskDescription || ''}`
        );
        await this.messageHistory.addMessage(message);
        
        const result = await this.executableAgent.workOnTask(task);
        
        const responseMessage = new AIMessage(JSON.stringify(result));
        await this.messageHistory.addMessage(responseMessage);

        return result;
    }

    async workOnFeedback(task: TaskType, feedbackList: FeedbackObject[], context: string): Promise<void> {
        if (!this.executableAgent) {
            throw new Error("Agent not properly initialized");
        }
        await this.executableAgent.workOnFeedback(task, feedbackList, context);
    }

    setStatus(status: keyof typeof AGENT_STATUS_enum): void {
        this.status = status;
        if (this.executableAgent) {
            this.executableAgent.setStatus(status);
        }
    }

    initialize(store: TeamStore, env: Record<string, any>): void {
        this.store = store;
        this.env = env;
        if (this.executableAgent) {
            this.executableAgent.initialize(store, env);
        }
    }

    setStore(store: TeamStore): void {
        this.store = store;
        if (this.executableAgent) {
            this.executableAgent.setStore(store);
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
        // Ensure we're creating a new config object that matches GroqConfig type
        const normalizedConfig: GroqConfig = {
            provider: 'groq',
            model: config.model || defaultGroqConfig.model,
            temperature: config.temperature ?? defaultGroqConfig.temperature,
            streaming: config.streaming ?? defaultGroqConfig.streaming,
            maxTokens: config.maxTokens ?? defaultGroqConfig.maxTokens,
            apiKey: config.apiKey || process.env.GROQ_API_KEY || '',
            stop: config.stop ?? null
        };

        return normalizedConfig;
    }
}

class Task implements TaskType {
    id: string;
    title: string;
    description: string;
    expectedOutput: string;
    agent: IReactChampionAgent;
    isDeliverable: boolean;
    externalValidationRequired: boolean;
    inputs: Record<string, any>;
    feedbackHistory: FeedbackObject[];
    status: keyof typeof TASK_STATUS_enum;
    result: TaskResult | null;
    interpolatedTaskDescription?: string;
    duration?: number;
    startTime?: number;
    endTime?: number;
    llmUsageStats?: any;
    iterationCount?: number;
    error?: string;
    store: TeamStore;

    constructor({ 
        title, 
        description, 
        expectedOutput, 
        agent, 
        isDeliverable = false, 
        externalValidationRequired = false 
    }: {
        title: string;
        description: string;
        expectedOutput: string;
        agent: IReactChampionAgent;
        isDeliverable?: boolean;
        externalValidationRequired?: boolean;
    }) {
        if (!agent.store) {
            throw new Error("Agent must be initialized with a store before creating a task");
        }

        this.id = uuidv4();
        this.title = title;
        this.description = description;
        this.expectedOutput = expectedOutput;
        this.agent = agent;
        this.isDeliverable = isDeliverable;
        this.status = 'TODO';
        this.result = null;
        this.inputs = {};
        this.feedbackHistory = [];
        this.externalValidationRequired = externalValidationRequired;
        this.store = agent.store;
    }

    setStore(store: TeamStore): void {
        this.store = store;
    }

    async execute(data: any): Promise<any> {
        throw new Error("Execute method must be implemented by specific task types");
    }
}

class Team {
    private store: UseBoundTeamStore;
    private messageHistory: CustomMessageHistory;

    constructor({ 
        name, 
        agents = [], 
        tasks = [], 
        logLevel = 'info', 
        inputs = {}, 
        env = {} 
    }: {
        name: string;
        agents?: IReactChampionAgent[];
        tasks?: TaskType[];
        logLevel?: string;
        inputs?: Record<string, any>;
        env?: Record<string, any>;
    }) {
        this.store = createTeamStore({ name, agents: [], tasks: [], inputs, env, logLevel });
        this.messageHistory = new CustomMessageHistory();

        agents.forEach(agent => agent.initialize(this.store.getState(), env));
        tasks.forEach(task => task.setStore(this.store.getState()));
        
        this.store.getState().addAgents(agents);
        this.store.getState().addTasks(tasks);
    }

    async start(inputs: Record<string, any> = {}): Promise<{ status: string; result: any; stats: Record<string, any> }> {
        return new Promise((resolve, reject) => {
            const unsubscribe = this.store.subscribe((state) => {
                const status = state.teamWorkflowStatus;
                switch (status) {
                    case WORKFLOW_STATUS_enum.FINISHED:
                        unsubscribe();
                        resolve({
                            status,
                            result: state.workflowResult,
                            stats: this.getWorkflowStats()
                        });
                        break;
                    case WORKFLOW_STATUS_enum.ERRORED:
                        unsubscribe();
                        reject(new Error('Workflow encountered an error'));
                        break;
                    case WORKFLOW_STATUS_enum.BLOCKED:
                        unsubscribe();
                        resolve({
                            status,
                            result: null,
                            stats: this.getWorkflowStats()
                        });
                        break;
                }
            });

            try {
                const message = new SystemMessage(JSON.stringify({ inputs }));
                this.messageHistory.addMessage(message);
                this.store.getState().startWorkflow(inputs);
            } catch (error) {
                reject(error);
                unsubscribe();
            }
        });
    }

    getStore(): UseBoundTeamStore {
        return this.store;
    }

    useStore(): UseBoundTeamStore {
        return this.store;
    }

    subscribeToChanges(listener: (newValues: ReturnType<typeof this.store.getState>) => void): () => void {
        return this.store.subscribe(listener);
    }

    provideFeedback(taskId: string, feedbackContent: string): void {
        this.store.getState().provideFeedback(taskId, feedbackContent);
    }

    validateTask(taskId: string): void {
        this.store.getState().validateTask(taskId);
    }

    onWorkflowStatusChange(callback: (status: keyof typeof WORKFLOW_STATUS_enum) => void): () => void {
        return this.store.subscribe((state) => {
            callback(state.teamWorkflowStatus);
        });
    }

    getTasksByStatus(status: keyof typeof TASK_STATUS_enum): TaskType[] {
        return this.store.getState().tasks.filter(task => task.status === status);
    }

    getWorkflowStatus(): keyof typeof WORKFLOW_STATUS_enum {
        return this.store.getState().teamWorkflowStatus;
    }

    getWorkflowResult(): any {
        const state = this.store.getState();
        if (state.teamWorkflowStatus === WORKFLOW_STATUS_enum.FINISHED) {
            return state.workflowResult;
        }
        return null;
    }    

    getTasks(): TaskType[] {
        return this.store.getState().tasks;
    }

    getWorkflowStats(): Record<string, any> {
        const state = this.store.getState();
        const logs = state.workflowLogs;

        const completionLog = logs.find(log =>
            log.logType === "WorkflowStatusUpdate" && 
            (log.workflowStatus === "FINISHED" || log.workflowStatus === "BLOCKED")
        );

        if (completionLog) {
            const {
                startTime,
                endTime,
                duration,
                llmUsageStats,
                iterationCount,
                costDetails,
                teamName,
                taskCount,
                agentCount
            } = completionLog.metadata;

            return {
                startTime,
                endTime,
                duration,
                llmUsageStats,
                iterationCount,
                costDetails,
                teamName,
                taskCount,
                agentCount,
                messageCount: this.messageHistory.length
            };
        }
        
        return {
            startTime: 0,
            endTime: 0,
            duration: 0,
            llmUsageStats: {
                inputTokens: 0,
                outputTokens: 0,
                callsCount: 0,
                callsErrorCount: 0,
                parsingErrors: 0
            },
            iterationCount: 0,
            costDetails: {
                costInputTokens: 0,
                costOutputTokens: 0,
                totalCost: 0
            },
            teamName: this.store.getState().name,
            taskCount: this.store.getState().tasks.length,
            agentCount: this.store.getState().agents.length,
            messageCount: this.messageHistory.length
        };
    }
}

// Consolidated exports at the end of the file
export {
    Agent,
    Task,
    Team,
    defaultGroqConfig,
    ExtendedBaseAgentConfig
};