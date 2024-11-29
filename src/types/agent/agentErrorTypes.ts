/**
 * @file agentErrorTypes.ts
 * @path KaibanJS/src/types/agent/agentErrorTypes.ts
 * @description Agent-specific error type definitions
 */

import { ERROR_KINDS, IErrorKind } from '../common/commonErrorTypes';

export const AGENT_ERROR_KINDS = {
    ...ERROR_KINDS,
    MaxIterationsError: 'MaxIterationsError',
    ToolNotFoundError: 'ToolNotFoundError',
    ToolExecutionError: 'ToolExecutionError',
    AgentValidationError: 'AgentValidationError',
    AgentStateError: 'AgentStateError',
    AgentTimeoutError: 'AgentTimeoutError'
} as const;

export type IAgentErrorKind = typeof AGENT_ERROR_KINDS[keyof typeof AGENT_ERROR_KINDS];

export const isAgentErrorKind = (value: string): value is IAgentErrorKind => {
    return Object.values(AGENT_ERROR_KINDS).includes(value as IAgentErrorKind);
};
