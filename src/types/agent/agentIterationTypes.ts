/**
 * @file agentIterationTypes.ts
 * @path KaibanJS/src/types/agent/agentIterationTypes.ts
 * @description Types for agent iteration handling and control flow
 *
 * @module types/agent
 */

import type { IHandlerResult } from '../common/commonHandlerTypes';
import type { IAgentType } from './agentBaseTypes';
import type { ITaskType } from '../task/taskBaseTypes';
import type { IOutput } from '../llm/llmResponseTypes';

// ─── Iteration Parameters ────────────────────────────────────────────────────

export interface IIterationStartParams {
    agent: IAgentType;
    task: ITaskType;
    iterations: number;
    maxAgentIterations: number;
}

export interface IIterationEndParams extends IIterationStartParams {
    output?: IOutput;
}

export interface IIterationControlParams {
    maxIterations?: number;
    iterationDelay?: number;
    timeoutPerIteration?: number;
}

export type { IHandlerResult };
