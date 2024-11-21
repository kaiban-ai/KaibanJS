/**
 * @file managerTypes.ts
 * @description Type definitions for agent-related managers
 */

import { IHandlerResult } from '../common/commonHandlerTypes';
import { IAgentType, IReactChampionAgent } from './agentBaseTypes';
import { ITaskType } from '../task/taskBaseTypes';
import { IParsedOutput } from '../llm/llmResponseTypes';
import { Tool } from 'langchain/tools';

export interface IIterationManager {
    handleIterationStart(params: {
        agent: IAgentType;
        task: ITaskType;
        iterations: number;
        maxAgentIterations: number;
    }): Promise<IHandlerResult>;

    handleIterationEnd(params: {
        agent: IAgentType;
        task: ITaskType;
        iterations: number;
        maxAgentIterations: number;
    }): Promise<IHandlerResult>;

    handleMaxIterationsError(params: {
        agent: IAgentType;
        task: ITaskType;
        iterations: number;
        maxIterations: number;
        error: Error;
    }): Promise<IHandlerResult>;
}

export interface IThinkingManager {
    executeThinking(params: {
        agent: IReactChampionAgent;
        task: ITaskType;
        ExecutableAgent: any;
        feedbackMessage?: string;
    }): Promise<{
        llmOutput: string;
        llmUsageStats: any;
        parsedLLMOutput: IParsedOutput;
    }>;
}

export interface IToolManager {
    executeTool(params: {
        agent: IAgentType;
        task: ITaskType;
        tool: Tool;
        input: Record<string, unknown>;
        parsedOutput: IParsedOutput;
    }): Promise<IHandlerResult>;
}
