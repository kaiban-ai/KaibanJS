/**
 * @file teamHandlersTypes.ts
 * @path KaibanJS/src/types/team/teamHandlersTypes.ts
 * @description Types for team message and task handling, including parameters and type guards
 *
 * @module types/team
 */

import { Tool } from 'langchain/tools';
import { BaseMessage } from "@langchain/core/messages";
import { WORKFLOW_STATUS_enum, TASK_STATUS_enum, AGENT_STATUS_enum } from '../common/commonEnums';
import { IErrorType } from '../common/commonErrorTypes';
import { IOutput, ILLMUsageStats, IParsedOutput } from '../llm';
import { ICostDetails, IWorkflowStats, IWorkflowResult } from '../workflow';
import { IAgentType } from '../agent';
import { ITaskType } from '../task/taskBaseTypes';
import { ILog } from './teamLogsTypes';
import { IHandlerResult } from '../common/commonHandlerTypes';

// ─── Team Inputs ────────────────────────────────────────────────────────────────

/** Team inputs interface for workflow initialization */
export interface ITeamInputs {
    context?: Record<string, unknown>;
    parameters?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
}

// ─── Message Handling ──────────────────────────────────────────────────────────

/** Team message handler parameters */
export interface ITeamMessageParams {
    content: string | BaseMessage;
    context?: Record<string, unknown>;
    type: 'system' | 'user' | 'ai' | 'function';
    functionName?: string;
}

/** Team task handler parameters */
export interface ITeamTaskParams {
    agent: IAgentType;
    task: ITaskType;
    result: IParsedOutput | null;
    metadata?: Record<string, unknown>;
}

// ─── Type Guards ────────────────────────────────────────────────────────────

export const HandlerTypeGuards = {
    isMessageParams: (value: unknown): value is ITeamMessageParams => {
        return (
            typeof value === 'object' &&
            value !== null &&
            'content' in value &&
            'type' in value
        );
    },

    isTaskParams: (value: unknown): value is ITeamTaskParams => {
        return (
            typeof value === 'object' &&
            value !== null &&
            'agent' in value &&
            'task' in value &&
            'result' in value
        );
    }
};
