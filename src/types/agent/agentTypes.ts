/**
 * @file agentTypes.ts
 * @path KaibanJS/src/types/agent/agentTypes.ts
 * @description Core agent type definitions and interfaces
 *
 * @module types/agent
 */

import { Tool } from "langchain/tools";
import { AGENT_STATUS_enum } from '../common/commonEnums';
import { IErrorType } from '../common/commonErrorTypes';
import { IValidationSchema } from '../common/commonValidationTypes';
import { BaseMessage } from "@langchain/core/messages";
import { ILLMConfig } from '../llm/llmCommonTypes';
import { IAgentStoreMethods } from './agentStoreTypes';
import { ILLMInstance, IAgenticLoopResult } from '../llm/llmInstanceTypes';
import { ITaskType, ITaskFeedback } from '../task/taskBaseTypes';
import { IREACTChampionAgentPrompts } from './promptsTypes';
import { IHandlerResult } from '../common/commonHandlerTypes';
import { IResourceMetrics, IUsageMetrics } from '../common/commonMetricTypes';
import { Runnable } from "@langchain/core/runnables";
import { ChatMessageHistory } from "langchain/stores/message/in_memory";
import { IMessageHistory } from '../llm/message/messagingHistoryTypes';
import { IAgentMetadata } from './agentBaseTypes';
import { IAgentExecutionState } from './agentStateTypes';
import { IAgentTypeGuards } from './agentBaseTypes';

// ─── Common Types ───────────────────────────────────────────────────────────────

export type IStatusType = keyof typeof AGENT_STATUS_enum;

// ─── Capability Interfaces ───────────────────────────────────────────────────

export interface IAgentCapabilities {
    canThink: boolean;
    canUseTools: boolean;
    canLearn: boolean;
    supportedToolTypes: string[];
    supportedTools?: string[];
    maxConcurrentTasks?: number;
    memoryCapacity?: number;
}

// ─── Base Agent Interfaces ───────────────────────────────────────────────────

export interface IBaseAgent {
    readonly id: string;
    readonly name: string;
    readonly role: string;
    readonly goal: string;
    readonly background: string;
    readonly version: string;
    readonly capabilities: IAgentCapabilities;
    readonly validationSchema: IValidationSchema;

    tools: Tool[];
    maxIterations: number;
    store: IAgentStoreMethods;
    status: IStatusType;
    env: Record<string, unknown> | null;

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

// ─── Extended Agent Types ───────────────────────────────────────────────────

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

// ─── Type Aliases ───────────────────────────────────────────────────────────

export type IAgentType = IBaseAgent | IReactChampionAgent;
