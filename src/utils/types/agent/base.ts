/**
 * @file base.ts
 * @path KaibanJS/src/utils/types/agent/base.ts
 * @description Core agent interfaces and types
 *
 * @packageDocumentation
 * @module @types/agent
 */

import { Tool } from "langchain/tools";
import { AGENT_STATUS_enum } from "../common/enums";
import { ErrorType } from "../common";
import { BaseMessage } from "@langchain/core/messages";
import { LLMConfig } from "../llm";
import { Output, ParsedOutput } from "../llm/responses";
import { LLMInstance, AgenticLoopResult } from "../llm/instance";
import { TeamStore } from "../team/base";
import { TaskType, FeedbackObject } from "../task/base";
import { IMessageHistory } from "../messaging/history";
import { REACTChampionAgentPrompts } from "./prompts";

export type StatusType = keyof typeof AGENT_STATUS_enum;

export interface IBaseAgent {
    id: string;
    name: string;
    role: string;
    goal: string;
    background: string;
    tools: Tool[];
    maxIterations: number;
    store: TeamStore;
    status: StatusType;
    env: Record<string, unknown> | null;
    llmInstance: LLMInstance | null;
    llmConfig: LLMConfig;
    llmSystemMessage: string | null;
    forceFinalAnswer: boolean;
    promptTemplates: REACTChampionAgentPrompts;
    messageHistory: IMessageHistory;
    initialize(store: TeamStore, env: Record<string, unknown>): void;
    setStore(store: TeamStore): void;
    setStatus(status: StatusType): void;
    setEnv(env: Record<string, unknown>): void;
    workOnTask(task: TaskType): Promise<AgenticLoopResult>;
    workOnFeedback(task: TaskType, feedbackList: FeedbackObject[], context: string): Promise<void>;
    normalizeLlmConfig(llmConfig: LLMConfig): LLMConfig;
    createLLMInstance(): void;
    
    // New methods added to the interface
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
    
    cleanup?(): Promise<void> | void;
}

export interface IReactChampionAgent extends IBaseAgent {
    executableAgent: any;
    messageHistory: IMessageHistory;
    workOnTask(task: TaskType): Promise<AgenticLoopResult>;
    createLLMInstance(): void;
    handleIterationStart(params: { task: TaskType; iterations: number; maxAgentIterations: number }): void;
    handleIterationEnd(params: { task: TaskType; iterations: number; maxAgentIterations: number }): void;
    handleThinkingError(params: { task: TaskType; error: ErrorType }): void;
    handleMaxIterationsError(params: { task: TaskType; iterations: number; maxAgentIterations: number }): void;
    handleAgenticLoopError(params: { task: TaskType; error: ErrorType; iterations: number; maxAgentIterations: number }): void;
    handleTaskCompleted(params: { task: TaskType; parsedResultWithFinalAnswer: ParsedOutput; iterations: number; maxAgentIterations: number }): void;
    handleFinalAnswer(params: { agent: IBaseAgent; task: TaskType; parsedLLMOutput: ParsedOutput }): ParsedOutput;
    handleIssuesParsingLLMOutput(params: { agent: IBaseAgent; task: TaskType; output: Output; llmOutput: string }): string;
}

export interface SystemAgent extends IBaseAgent {
    readonly id: 'system';
    readonly name: 'System';
    readonly role: 'System Message Handler';
    readonly goal: 'Handle system-wide messages';
    readonly background: 'Internal system component';
    readonly tools: Tool[];
    readonly status: StatusType;
}

export type AgentType = IBaseAgent | IReactChampionAgent;

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
