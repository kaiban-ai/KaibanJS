/**
 * @file agentConfigTypes.ts
 * @path KaibanJS/src/types/agent/agentConfigTypes.ts
 * @description Agent configuration types and validation schemas
 *
 * @module types/agent
 */

import { Tool } from "langchain/tools";
import type { IBaseAgent } from './agentBaseTypes';
import type { ILLMConfig } from "../llm/llmCommonTypes";
import type { ITaskType } from "../task/taskBaseTypes";
import type { ILLMMetrics } from "../llm/llmMetricTypes";
import type { IErrorType } from "../common/commonErrorTypes";

// ─── Configuration Types ────────────────────────────────────────────────────

export interface IExecutionContext {
    task: ITaskType;
    agent: IBaseAgent;
    iterations: number;
    maxAgentIterations: number;
    startTime: number;
    lastOutput?: ILLMMetrics;
    lastError?: IErrorType;
}

// ─── Type Guards ────────────────────────────────────────────────────────────

export const IAgentConfigTypeGuards = {
    isExecutionContext: (value: unknown): value is IExecutionContext => {
        if (!value || typeof value !== 'object') return false;
        const ctx = value as Partial<IExecutionContext>;
        return !!(
            ctx.task &&
            ctx.agent &&
            typeof ctx.iterations === 'number' &&
            typeof ctx.maxAgentIterations === 'number' &&
            typeof ctx.startTime === 'number'
        );
    }
};
