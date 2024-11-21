/**
 * @file toolExecutionTypes.ts
 * @path KaibanJS/src/types/tool/toolExecutionTypes.ts
 * @description Types for tool execution and management, including execution parameters, results, and statistics
 *
 * @module types/tool
 */

import { Tool } from 'langchain/tools';
import { IAgentType } from '../agent/agentBaseTypes';
import { ITaskType } from '../task/taskBaseTypes';
import { IParsedOutput, ILLMUsageStats } from '../llm/llmResponseTypes';
import { IHandlerResult, IToolHandlerParams } from '../common/commonHandlerTypes';

// ─── Cost Management ───────────────────────────────────────────────────────────

export interface ICostDetails {
    totalCost: number;
    inputCost: number;
    outputCost: number;
    modelName?: string;
    tokenRates?: {
        inputTokenRate: number;
        outputTokenRate: number;
    };
}

// ─── Tool Execution Parameters ──────────────────────────────────────────────────

export interface IToolExecutionParams {
    agent: IAgentType;
    task: ITaskType;
    tool: Tool;
    input: unknown;
    context?: Record<string, unknown>;
    parsedOutput?: IParsedOutput;
}

// ─── Tool Execution Results ────────────────────────────────────────────────────

export interface IToolExecutionResult {
    success: boolean;
    result?: string;
    error?: Error;
    feedbackMessage?: string;
    costDetails?: ICostDetails;
    usageStats?: ILLMUsageStats;
}
