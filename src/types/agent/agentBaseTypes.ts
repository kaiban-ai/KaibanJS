/**
 * @file agentBaseTypes.ts
 * @path KaibanJS/src/types/agent/agentBaseTypes.ts
 * @description Core agent type definitions providing canonical types for the entire system
 *
 * @module types/agent
 */

import { Tool } from "langchain/tools";
import { AGENT_STATUS_enum } from '../common/enumTypes';
import { IErrorType } from '../common/errorTypes';
import { IValidationSchema } from '../common/validationTypes';
import { IRuntimeLLMConfig } from '../llm/llmCommonTypes';
import { ILLMInstance, IAgenticLoopResult } from '../llm/llmInstanceTypes';
import { ITaskType, ITaskFeedback } from '../task';
import { IREACTChampionAgentPrompts } from './promptsTypes';
import { Runnable } from "@langchain/core/runnables";
import { ChatMessageHistory } from "langchain/stores/message/in_memory";
import { IMessageHistory } from '../llm/message/messagingHistoryTypes';
import { IAgentExecutionState } from './agentStateTypes';
import { IAgentMetrics } from './agentMetricTypes';

// ─── Common Types ───────────────────────────────────────────────────────────────

export type IStatusType = keyof typeof AGENT_STATUS_enum;

/**
 * Base metadata interface for agents
 */
export interface IAgentMetadata {
    id: string;
    name: string;
    description?: string;
    capabilities: string[];
    skills: string[];
    created: Date;
    updated: Date;
    version: string;
    tags?: string[];
    lastActive?: Date;
}

/**
 * Agent capabilities interface
 */
export interface IAgentCapabilities {
    canThink: boolean;
    canUseTools: boolean;
    canLearn: boolean;
    supportedToolTypes: string[];
    supportedTools?: string[];
    maxConcurrentTasks?: number;
    memoryCapacity?: number;
}

/**
 * Base agent interface - Core properties and methods required by all agents
 * This interface is implemented by BaseAgent class which extends CoreManager
 */
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
    status: IStatusType;
    env: Record<string, unknown> | null;
    metrics?: IAgentMetrics;

    llmInstance: ILLMInstance | null;
    llmConfig: IRuntimeLLMConfig;
    llmSystemMessage: string | null;
    forceFinalAnswer: boolean;
    promptTemplates: IREACTChampionAgentPrompts;
    messageHistory: IMessageHistory;

    metadata: IAgentMetadata;
    executionState: IAgentExecutionState;

    initialize(env: Record<string, unknown>): void;
    setStatus(status: IStatusType): void;
    setEnv(env: Record<string, unknown>): void;
    workOnTask(task: ITaskType): Promise<IAgenticLoopResult>;
    workOnFeedback(task: ITaskType, feedbackList: ITaskFeedback[], context: string): Promise<void>;
    normalizeLlmConfig(llmConfig: IRuntimeLLMConfig): IRuntimeLLMConfig;
    createLLMInstance(): void;
    cleanup?(): Promise<void> | void;
}

/**
 * Executable agent interface - For agents that can be executed directly
 * This interface defines the contract for executable capabilities,
 * but the actual implementation is private within the agent class
 */
export interface IExecutableAgent {
    runnable: Runnable;
    getMessageHistory: () => ChatMessageHistory;
    inputMessagesKey: string;
    historyMessagesKey: string;
}

/**
 * REACT Champion agent interface - Extends base agent with REACT-specific capabilities
 * This interface is implemented by ReactChampionAgent class which extends BaseAgent
 * 
 * Note: The executableAgent is implemented as a private field in ReactChampionAgent
 * with a getter that returns an empty object for encapsulation
 */
export interface IReactChampionAgent extends IBaseAgent {
    readonly executableAgent: Record<string, never>;  // Empty object type to match implementation
    messageHistory: IMessageHistory;
    handleIterationStart(params: { task: ITaskType; iterations: number; maxAgentIterations: number }): void;
    handleIterationEnd(params: { task: ITaskType; iterations: number; maxAgentIterations: number }): void;
    handleThinkingError(params: { task: ITaskType; error: IErrorType }): void;
    handleMaxIterationsError(params: { task: ITaskType; iterations: number; maxAgentIterations: number }): void;
    handleAgenticLoopError(params: { task: ITaskType; error: IErrorType; iterations: number; maxAgentIterations: number }): void;
    handleTaskCompleted(params: { task: ITaskType; parsedResultWithFinalAnswer: any; iterations: number; maxAgentIterations: number }): void;
    handleFinalAnswer(params: { agent: IBaseAgent; task: ITaskType; parsedLLMOutput: any }): any;
    handleIssuesParsingLLMOutput(params: { agent: IBaseAgent; task: ITaskType; output: any; llmOutput: string }): string;
}

/**
 * Agent type - Represents any type of agent in the system
 * This type allows for both base agents and specialized REACT agents
 * while maintaining the proper inheritance hierarchy:
 * 
 * CoreManager (base class)
 * └── BaseAgent extends CoreManager, implements IBaseAgent
 *     └── ReactChampionAgent extends BaseAgent, implements IReactChampionAgent
 * 
 * Note: While IReactChampionAgent extends IBaseAgent, we keep both in the union
 * to support cases where we explicitly want to work with base agents
 */
export type IAgentType = IBaseAgent | IReactChampionAgent;
