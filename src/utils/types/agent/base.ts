/**
 * @file base.ts
 * @path src/utils/types/agent/base.ts
 * @description Core agent interfaces and types that serve as the foundation for the agent system
 *
 * @module @types/agent/base
 */

import { Tool } from "langchain/tools";
import { AGENT_STATUS_enum } from "../common/enums";
import { ErrorType } from "../common";
import { BaseMessage } from "@langchain/core/messages";
import { LLMConfig } from "../llm";
import { TeamStore } from "../team/base";
import { LLMInstance, AgenticLoopResult } from "../llm/instance";
import { TaskType, FeedbackObject } from "../task/base";
import { IMessageHistory } from "../messaging/history";
import { ValidationSchema } from "../common/validation";
import { REACTChampionAgentPrompts } from "./prompts";
import { Runnable } from "@langchain/core/runnables";
import { ChatMessageHistory } from "langchain/stores/message/in_memory";

// ─── Core Types ────────────────────────────────────────────────────────────────

export type StatusType = keyof typeof AGENT_STATUS_enum;

/**
 * Agent capabilities interface
 */
export interface IAgentCapabilities {
    canThink: boolean;
    canUseTools: boolean;
    canLearn: boolean;
    supportedToolTypes: string[];
    maxConcurrentTasks?: number;
    memoryCapacity?: number;
}

/**
 * Core agent interface
 */
export interface IBaseAgent {
    // Core properties
    readonly id: string;
    readonly name: string;
    readonly role: string;
    readonly goal: string;
    readonly background: string;
    readonly version: string;
    readonly capabilities: IAgentCapabilities;
    readonly validationSchema: ValidationSchema;

    // Configuration
    tools: Tool[];
    maxIterations: number;
    store: TeamStore;
    status: StatusType;
    env: Record<string, unknown> | null;

    // LLM-related
    llmInstance: LLMInstance | null;
    llmConfig: LLMConfig;
    llmSystemMessage: string | null;
    forceFinalAnswer: boolean;
    promptTemplates: REACTChampionAgentPrompts;
    messageHistory: IMessageHistory;

    // Methods
    initialize(store: TeamStore, env: Record<string, unknown>): void;
    setStore(store: TeamStore): void;
    setStatus(status: StatusType): void;
    setEnv(env: Record<string, unknown>): void;
    workOnTask(task: TaskType): Promise<AgenticLoopResult>;
    workOnFeedback(task: TaskType, feedbackList: FeedbackObject[], context: string): Promise<void>;
    normalizeLlmConfig(llmConfig: LLMConfig): LLMConfig;
    createLLMInstance(): void;
    cleanup?(): Promise<void> | void;

    // Optional analytics methods
    getMetrics?(): {
        totalTasks: number;
        completedTasks: number;
        averageIterationsPerTask: number;
        performanceScore: number;
        resourceUtilization: {
            memoryUsage: number;
            cpuUsage: number;
        };
        llmUsageStats: {
            totalTokensUsed: number;
            costEstimate: number;
            costBreakdown: {
                inputTokens: number;
                outputTokens: number;
                inputCost: number;
                outputCost: number;
                total: number;
                costBreakdown?: {
                    model: string;
                    tokenRate: number;
                    contextWindowTokens: number;
                };
            };
        };
    };
}

interface ExecutableAgent {
  runnable: Runnable;
  getMessageHistory: () => ChatMessageHistory;
  inputMessagesKey: string;
  historyMessagesKey: string;
}

/**
 * React Champion agent interface extending base agent
 */
export interface IReactChampionAgent extends IBaseAgent {
    executableAgent: ExecutableAgent;
    messageHistory: IMessageHistory;
    workOnTask(task: TaskType): Promise<AgenticLoopResult>;
    createLLMInstance(): void;
    handleIterationStart(params: { task: TaskType; iterations: number; maxAgentIterations: number }): void;
    handleIterationEnd(params: { task: TaskType; iterations: number; maxAgentIterations: number }): void;
    handleThinkingError(params: { task: TaskType; error: ErrorType }): void;
    handleMaxIterationsError(params: { task: TaskType; iterations: number; maxAgentIterations: number }): void;
    handleAgenticLoopError(params: { task: TaskType; error: ErrorType; iterations: number; maxAgentIterations: number }): void;
    handleTaskCompleted(params: { task: TaskType; parsedResultWithFinalAnswer: any; iterations: number; maxAgentIterations: number }): void;
    handleFinalAnswer(params: { agent: IBaseAgent; task: TaskType; parsedLLMOutput: any }): any;
    handleIssuesParsingLLMOutput(params: { agent: IBaseAgent; task: TaskType; output: any; llmOutput: string }): string;
}

/**
 * System agent interface for internal operations
 */
export interface ISystemAgent extends IBaseAgent {
    readonly id: 'system';
    readonly name: 'System';
    readonly role: 'System Message Handler';
    readonly goal: 'Handle system-wide messages';
    readonly background: 'Internal system component';
    readonly tools: Tool[];
    readonly status: StatusType;
}

// Union type for any agent type
export type AgentType = IBaseAgent | IReactChampionAgent;

// ─── Type Guards ─────────────────────────────────────────────────────────────

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
            'status' in agent &&
            'capabilities' in agent
        );
    },

    isReactChampionAgent: (agent: unknown): agent is IReactChampionAgent => {
        return (
            AgentTypeGuards.isBaseAgent(agent) &&
            'executableAgent' in agent &&
            'messageHistory' in agent &&
            typeof agent.handleIterationStart === 'function' &&
            typeof agent.handleIterationEnd === 'function'
        );
    },

    isSystemAgent: (agent: unknown): agent is ISystemAgent => {
        return (
            AgentTypeGuards.isBaseAgent(agent) &&
            agent.id === 'system' &&
            agent.name === 'System' &&
            agent.role === 'System Message Handler'
        );
    },

    hasAgentCapabilities: (value: unknown): value is IAgentCapabilities => {
        if (typeof value !== 'object' || value === null) return false;
        const caps = value as Partial<IAgentCapabilities>;
        return (
            typeof caps.canThink === 'boolean' &&
            typeof caps.canUseTools === 'boolean' &&
            typeof caps.canLearn === 'boolean' &&
            Array.isArray(caps.supportedToolTypes)
        );
    }
};

// Export type utilities
export { ValidationSchema };
