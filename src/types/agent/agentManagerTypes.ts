/**
 * @file agentManagerTypes.ts
 * @description Type definitions for agent-related managers
 * 
 * @module @types/agent
 */

import { IHandlerResult } from '../common/commonHandlerTypes';
import { IAgentType, IReactChampionAgent } from './agentBaseTypes';
import { IExecutionContext } from './agentConfigTypes';
import { ITaskType } from '../task/taskBaseTypes';
import { IParsedOutput, IOutput, ILLMUsageStats } from '../llm/llmResponseTypes';
import { Tool } from 'langchain/tools';
import { IErrorType } from '../common/commonErrorTypes';
import { IThinkingResult, IThinkingHandlerResult } from './agentHandlersTypes';
import { IIterationContext, IIterationHandlerResult } from './agentIterationTypes';
import { ILoopHandlerResult } from './agentLoopTypes';

export interface IIterationManager {
    handleIterationStart(params: {
        agent: IAgentType;
        task: ITaskType;
        iterations: number;
        maxAgentIterations: number;
    }): Promise<IIterationHandlerResult<IIterationContext>>;

    handleIterationEnd(params: {
        agent: IAgentType;
        task: ITaskType;
        iterations: number;
        maxAgentIterations: number;
    }): Promise<IIterationHandlerResult<IIterationContext>>;

    handleMaxIterationsError(params: {
        agent: IAgentType;
        task: ITaskType;
        iterations: number;
        maxIterations: number;
        error: Error;
    }): Promise<IIterationHandlerResult<IIterationContext>>;
}

export interface IThinkingManager {
    executeThinking(params: {
        agent: IReactChampionAgent;
        task: ITaskType;
        ExecutableAgent: any;
        feedbackMessage?: string;
    }): Promise<IThinkingHandlerResult<IThinkingResult>>;
}

export interface IToolManager {
    executeTool(params: {
        agent: IAgentType;
        task: ITaskType;
        tool: Tool;
        input: Record<string, unknown>;
        parsedOutput: IParsedOutput;
    }): Promise<IHandlerResult>;
    validateToolConfig(tool: any): Promise<void>;
    initializeTools(agent: IAgentType): Promise<any[]>;
    cleanupTools(agent: IAgentType): Promise<void>;
}

export interface IAgenticLoopManager {
    executeLoop(params: {
        agent: IReactChampionAgent;
        task: ITaskType;
        feedbackMessage?: string;
    }): Promise<ILoopResult>;
}

export interface IMessageManager {
    clear(): Promise<void>;
    getMessageCount(): Promise<number>;
    getMessages(): Promise<any[]>;
}

export interface ILLMManager {
    validateConfig(config: any): Promise<void>;
    createInstance(config: any): Promise<any>;
    cleanup(instance: any): Promise<void>;
    getUsageStats(): Promise<ILLMUsageStats>;
}

export interface ILoopResult {
    success: boolean;
    result?: IOutput;
    error?: string;
    metadata: {
        iterations: number;
        maxAgentIterations: number;
        [key: string]: unknown;
    };
}
