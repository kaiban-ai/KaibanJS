/**
 * @file agentBaseTypes.ts
 * @path KaibanJS/src/types/agent/agentBaseTypes.ts
 * @description Core agent type definitions providing canonical types for the entire system
 *
 * @module types/agent
 */

import { Tool } from "langchain/tools";
import { AGENT_STATUS_enum } from "../common/commonEnums";
import { IErrorType } from "../common/commonErrorTypes";
import { IValidationSchema } from "../common/commonValidationTypes";
import { BaseMessage } from "@langchain/core/messages";
import { ILLMConfig } from "../llm/llmCommonTypes";
import { IAgentStoreMethods } from "./agentStoreTypes";
import { ILLMInstance, IAgenticLoopResult } from "../llm/llmInstanceTypes";
import { ITaskType, ITaskFeedback } from "../task/taskBaseTypes";
import { IREACTChampionAgentPrompts } from "./promptsTypes";
import { IHandlerResult } from "../common/commonHandlerTypes";
import { IResourceMetrics, IUsageMetrics } from "../common/commonMetricTypes";
import { Runnable } from "@langchain/core/runnables";
import { ChatMessageHistory } from "langchain/stores/message/in_memory";
import { IMessageHistory } from "../llm/message/messagingHistoryTypes";
import { IAgentExecutionState } from "./agentStateTypes";
import { ToolName } from "../tool/toolTypes";

// ─── Common Types ───────────────────────────────────────────────────────────────

export type IStatusType = keyof typeof AGENT_STATUS_enum;

// ─── Core Agent Interfaces ─────────────────────────────────────────────────────

export interface IAgentMetadata {
    id: string;
    name: string;
    description?: string;
    capabilities: ToolName[];
    skills: string[];
    created: Date;
    lastActive?: Date;
    tags?: string[];
}

export interface IAgentCapabilities {
    canThink: boolean;
    canUseTools: boolean;
    canLearn: boolean;
    supportedToolTypes: ToolName[];
    supportedTools?: ToolName[];
    maxConcurrentTasks?: number;
    memoryCapacity?: number;
}

export interface IAgentMetrics {
    resourceUsage: IResourceMetrics;
    usageStats: IUsageMetrics;
    performance: {
        totalTasks: number;
        completedTasks: number;
        averageIterationsPerTask: number;
        performanceScore: number;
    };
}

// ─── Base Agent Interface ────────────────────────────────────────────────────

export interface IBaseAgent {
    readonly id: string;
    readonly name: string;
    readonly role: string;
    readonly goal: string;
    readonly background: string;
    readonly version: string;
    readonly capabilities: IAgentCapabilities;
    readonly validationSchema: IValidationSchema<IBaseAgent>;

    tools: Tool[];
    maxIterations: number;
    store: IAgentStoreMethods;
    status: IStatusType;
    env: Record<string, unknown> | null;
    metrics?: IAgentMetrics;

    llmInstance: ILLMInstance | null;
    llmConfig: ILLMConfig;
    llmSystemMessage: string | null;
    forceFinalAnswer: boolean;
    promptTemplates: IREACTChampionAgentPrompts;
    messageHistory: IMessageHistory;

    metadata: IAgentMetadata;
    executionState: IAgentExecutionState;

    initialize(store: IAgentStoreMethods, env: Record<string, unknown>): void;
    setStore(store: IAgentStoreMethods): void;
    setStatus(status: IStatusType): void;
    setEnv(env: Record<string, unknown>): void;
    workOnTask(task: ITaskType): Promise<IAgenticLoopResult>;
    workOnFeedback(task: ITaskType, feedbackList: ITaskFeedback[], context: string): Promise<void>;
    normalizeLlmConfig(llmConfig: ILLMConfig): ILLMConfig;
    createLLMInstance(): void;
    cleanup?(): Promise<void> | void;
}

// ─── Extended Agent Types ─────────────────────────────────────────────────────

export interface IExecutableAgent {
    runnable: Runnable;
    getMessageHistory: () => ChatMessageHistory;
    inputMessagesKey: string;
    historyMessagesKey: string;
}

export interface IReactChampionAgent extends IBaseAgent {
    executableAgent: IExecutableAgent;
    messageHistory: IMessageHistory;
    workOnTask(task: ITaskType): Promise<IAgenticLoopResult>;
    createLLMInstance(): void;
    handleIterationStart(params: { task: ITaskType; iterations: number; maxAgentIterations: number }): void;
    handleIterationEnd(params: { task: ITaskType; iterations: number; maxAgentIterations: number }): void;
    handleThinkingError(params: { task: ITaskType; error: IErrorType }): void;
    handleMaxIterationsError(params: { task: ITaskType; iterations: number; maxAgentIterations: number }): void;
    handleAgenticLoopError(params: { task: ITaskType; error: IErrorType; iterations: number; maxAgentIterations: number }): void;
    handleTaskCompleted(params: { task: ITaskType; parsedResultWithFinalAnswer: any; iterations: number; maxAgentIterations: number }): void;
    handleFinalAnswer(params: { agent: IBaseAgent; task: ITaskType; parsedLLMOutput: any }): any;
    handleIssuesParsingLLMOutput(params: { agent: IBaseAgent; task: ITaskType; output: any; llmOutput: string }): string;
}

// ─── Type Aliases ────────────────────────────────────────────────────────────

export type IAgentType = IBaseAgent | IReactChampionAgent;

// ─── Type Guards ────────────────────────────────────────────────────────────

export const IAgentTypeGuards = {
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
            'capabilities' in agent &&
            'metadata' in agent &&
            'executionState' in agent
        );
    },

    isExecutableAgent: (value: unknown): value is IExecutableAgent => {
        if (typeof value !== 'object' || value === null) return false;
        const agent = value as Partial<IExecutableAgent>;
        return (
            'runnable' in agent &&
            'getMessageHistory' in agent &&
            'inputMessagesKey' in agent &&
            'historyMessagesKey' in agent &&
            typeof agent.getMessageHistory === 'function'
        );
    },

    isReactChampionAgent: (agent: unknown): agent is IReactChampionAgent => {
        if (!IAgentTypeGuards.isBaseAgent(agent)) return false;
        const reactAgent = agent as Partial<IReactChampionAgent>;
        return (
            'executableAgent' in reactAgent &&
            'messageHistory' in reactAgent &&
            typeof reactAgent.handleIterationStart === 'function' &&
            typeof reactAgent.handleIterationEnd === 'function' &&
            typeof reactAgent.handleThinkingError === 'function' &&
            typeof reactAgent.handleMaxIterationsError === 'function' &&
            typeof reactAgent.handleAgenticLoopError === 'function' &&
            typeof reactAgent.handleTaskCompleted === 'function' &&
            typeof reactAgent.handleFinalAnswer === 'function' &&
            typeof reactAgent.handleIssuesParsingLLMOutput === 'function'
        );
    },

    isValidAgentMetadata: (metadata: unknown): metadata is IAgentMetadata => {
        if (typeof metadata !== 'object' || metadata === null) return false;
        const meta = metadata as Partial<IAgentMetadata>;
        return (
            typeof meta.id === 'string' &&
            typeof meta.name === 'string' &&
            Array.isArray(meta.capabilities) &&
            Array.isArray(meta.skills) &&
            meta.created instanceof Date
        );
    },

    isValidExecutionState: (state: unknown): state is IAgentExecutionState => {
        if (typeof state !== 'object' || state === null) return false;
        const executionState = state as Partial<IAgentExecutionState>;
        return (
            typeof executionState.status === 'string' &&
            typeof executionState.thinking === 'boolean' &&
            typeof executionState.busy === 'boolean' &&
            typeof executionState.errorCount === 'number' &&
            typeof executionState.retryCount === 'number' &&
            typeof executionState.maxRetries === 'number' &&
            Array.isArray(executionState.assignedTasks) &&
            Array.isArray(executionState.completedTasks) &&
            Array.isArray(executionState.failedTasks) &&
            Array.isArray(executionState.blockedTasks) &&
            Array.isArray(executionState.history) &&
            typeof executionState.iterations === 'number' &&
            typeof executionState.maxIterations === 'number' &&
            typeof executionState.performance === 'object' &&
            typeof executionState.metrics === 'object' &&
            executionState.metrics !== null
        );
    }
};
