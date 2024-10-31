/**
 * @file index.ts
 * @path src/utils/types/agent/index.ts
 */

// Base agent types
export {
    IBaseAgent,
    IReactChampionAgent,
    SystemAgent,
    AgentType,
    AgentTypeGuards
} from './base';

// Configuration types
export {
    BaseAgentConfig,
    IAgentParams
} from './config';

// Handler types
export {
    HandlerBaseParams,
    ThinkingHandlerParams,
    ToolHandlerParams,
    ToolExecutionResult,
    IterationHandlerParams,
    TaskCompletionParams,
    StreamHandlerParams,
    ErrorHandlerParams,
    ValidationHandlerParams,
    StatusHandlerParams
} from './handlers';

// Re-export common types from external dependencies
export type { Tool } from "langchain/tools";
export type { BaseMessage } from "@langchain/core/messages";

// Import types needed for type guards
import type { BaseAgentConfig, IAgentParams } from './config';
import type { ToolHandlerParams, StreamHandlerParams } from './handlers';

// Type utility functions
export const AgentTypeUtils = {
    isAgentConfig: (value: unknown): value is BaseAgentConfig => {
        return (
            typeof value === 'object' &&
            value !== null &&
            'name' in value &&
            'role' in value &&
            'goal' in value &&
            'background' in value
        );
    },

    isAgentParams: (value: unknown): value is IAgentParams => {
        return (
            typeof value === 'object' &&
            value !== null &&
            'name' in value &&
            'role' in value &&
            'goal' in value &&
            'background' in value
        );
    },

    isToolHandlerParams: (value: unknown): value is ToolHandlerParams => {
        return (
            typeof value === 'object' &&
            value !== null &&
            'agent' in value &&
            'task' in value
        );
    },

    isStreamHandlerParams: (value: unknown): value is StreamHandlerParams => {
        return (
            typeof value === 'object' &&
            value !== null &&
            'buffer' in value &&
            'bufferSize' in value &&
            Array.isArray((value as StreamHandlerParams).buffer)
        );
    }
};