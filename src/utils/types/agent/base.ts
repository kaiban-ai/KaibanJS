/**
 * @file base.ts
 * @path src/utils/types/agent/base.ts
 * @description Core agent interfaces and types
 *
 * @packageDocumentation
 * @module @types/agent
 */

import { Tool } from "langchain/tools";
import { AGENT_STATUS_enum } from "@/utils/core/enums";
import { ErrorType } from "@/utils/core/errors";
import { BaseMessage } from "@langchain/core/messages";
import { LLMConfig } from "../llm/providers";
import { 
    Output, 
    ParsedOutput 
} from "../llm/responses";
import { 
    LLMInstance,
    AgenticLoopResult 
} from "../llm/instance";
import { TeamStore } from "../team/base";
import { TaskType, FeedbackObject } from "../task/base";
import { IMessageHistory } from "../messaging/history";
import { MessageHistoryManager } from "@/utils/managers/messageHistoryManager";

/**
 * Base agent interface
 */
export interface IBaseAgent {
    /** Unique identifier for the agent */
    id: string;
    
    /** Display name of the agent */
    name: string;
    
    /** Agent's role or function */
    role: string;
    
    /** Agent's primary goal or objective */
    goal: string;
    
    /** Agent's background information */
    background: string;
    
    /** Tools available to the agent */
    tools: Tool[];
    
    /** Maximum number of iterations allowed */
    maxIterations: number;
    
    /** Reference to the team store */
    store: TeamStore;
    
    /** Current status of the agent */
    status: keyof typeof AGENT_STATUS_enum;
    
    /** Environment variables */
    env: Record<string, unknown> | null;
    
    /** LLM instance for agent operations */
    llmInstance: LLMInstance | null;
    
    /** LLM configuration */
    llmConfig: LLMConfig;
    
    /** System message for LLM interactions */
    llmSystemMessage: string | null;
    
    /** Whether to force a final answer */
    forceFinalAnswer: boolean;
    
    /** Prompt templates for agent communication */
    promptTemplates: Record<string, unknown>;
    
    /** Message history */
    messageHistory: IMessageHistory;

    /**
     * Initialize the agent
     * @param store - Team store instance
     * @param env - Environment variables
     */
    initialize(store: TeamStore, env: Record<string, unknown>): void;

    /**
     * Set the team store
     * @param store - Team store instance
     */
    setStore(store: TeamStore): void;

    /**
     * Update agent status
     * @param status - New agent status
     */
    setStatus(status: keyof typeof AGENT_STATUS_enum): void;

    /**
     * Set environment variables
     * @param env - Environment variables
     */
    setEnv(env: Record<string, unknown>): void;

    /**
     * Process a task
     * @param task - Task to work on
     */
    workOnTask(task: TaskType): Promise<AgenticLoopResult>;

    /**
     * Process feedback for a task
     * @param task - Task to process feedback for
     * @param feedbackList - List of feedback objects
     * @param context - Context for feedback processing
     */
    workOnFeedback(
        task: TaskType, 
        feedbackList: FeedbackObject[], 
        context: string
    ): Promise<void>;

    /**
     * Normalize LLM configuration
     * @param llmConfig - Configuration to normalize
     */
    normalizeLlmConfig(llmConfig: LLMConfig): LLMConfig;

    /**
     * Create LLM instance
     */
    createLLMInstance(): void;
}

/**
 * Interface for REACT Champion agent
 */
export interface IReactChampionAgent extends IBaseAgent {
    /** Executable agent instance */
    executableAgent: any;
    
    /** Message history manager */
    messageHistory: IMessageHistory;
    
    // Core methods
    workOnTask(task: TaskType): Promise<AgenticLoopResult>;
    createLLMInstance(): void;

    // Iteration handlers
    handleIterationStart(params: { 
        task: TaskType; 
        iterations: number; 
        maxAgentIterations: number 
    }): void;
    
    handleIterationEnd(params: { 
        task: TaskType; 
        iterations: number; 
        maxAgentIterations: number 
    }): void;

    // Error handlers
    handleThinkingError(params: { 
        task: TaskType; 
        error: ErrorType 
    }): void;
    
    handleMaxIterationsError(params: { 
        task: TaskType; 
        iterations: number; 
        maxAgentIterations: number 
    }): void;
    
    handleAgenticLoopError(params: { 
        task: TaskType; 
        error: ErrorType; 
        iterations: number; 
        maxAgentIterations: number 
    }): void;

    // Task completion handlers
    handleTaskCompleted(params: { 
        task: TaskType; 
        parsedResultWithFinalAnswer: ParsedOutput; 
        iterations: number; 
        maxAgentIterations: number 
    }): void;

    // Output handlers
    handleFinalAnswer(params: { 
        agent: IBaseAgent; 
        task: TaskType; 
        parsedLLMOutput: ParsedOutput 
    }): ParsedOutput;
    
    handleIssuesParsingLLMOutput(params: { 
        agent: IBaseAgent; 
        task: TaskType; 
        output: Output; 
        llmOutput: string 
    }): string;
}

/**
 * System agent interface
 */
export interface SystemAgent extends IBaseAgent {
    readonly id: 'system';
    readonly name: 'System';
    readonly role: 'System Message Handler';
    readonly goal: 'Handle system-wide messages';
    readonly background: 'Internal system component';
    readonly tools: Tool[];
    readonly status: keyof typeof AGENT_STATUS_enum;
}

/**
 * Union type for all agent types
 */
export type AgentType = IBaseAgent | IReactChampionAgent;

/**
 * Type guards for agent types
 */
export const AgentTypeGuards = {
    isBaseAgent: (agent: unknown): agent is IBaseAgent => {
        return (
            typeof agent === 'object' &&
            agent !== null &&
            'id' in agent &&
            'name' in agent &&
            'role' in agent &&
            'goal' in agent &&
            'tools' in agent &&
            'status' in agent
        );
    },

    isReactChampionAgent: (agent: unknown): agent is IReactChampionAgent => {
        return (
            AgentTypeGuards.isBaseAgent(agent) &&
            'executableAgent' in agent &&
            'messageHistory' in agent
        );
    },

    isSystemAgent: (agent: unknown): agent is SystemAgent => {
        return (
            AgentTypeGuards.isBaseAgent(agent) &&
            agent.id === 'system' &&
            agent.name === 'System'
        );
    }
};