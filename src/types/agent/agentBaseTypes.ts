/**
 * @file agentBaseTypes.ts
 * @path src/types/agent/agentBaseTypes.ts
 * @description Base type definitions for agents
 *
 * @module @types/agent
 */

import { Tool } from '@langchain/core/tools';
import { BaseMessage } from '@langchain/core/messages';
import { IMessageHistory } from '../llm/message/messagingBaseTypes';
import { AGENT_STATUS_enum } from '../common/enumTypes';
import { IREACTChampionAgentPrompts } from './promptsTypes';
import { IRuntimeLLMConfig } from '../llm/llmCommonTypes';
import { ILLMInstance } from '../llm/llmInstanceTypes';
import { IAgentMetrics } from '../metrics/base/metricsManagerTypes';

// Re-export these types for backwards compatibility
export { ILLMInstance } from '../llm/llmInstanceTypes';
export { IAgentMetrics } from '../metrics/base/metricsManagerTypes';

// Status type definition
export type IStatusType = AGENT_STATUS_enum;

export interface IAgentCapabilities {
    readonly canLearn: boolean;
    readonly canTeach: boolean;
    readonly canDelegate: boolean;
    readonly canCollaborate: boolean;
    readonly canThink?: boolean;
    readonly canUseTools?: boolean;
    readonly supportedProviders: string[];
    readonly supportedModels: string[];
    readonly supportedToolTypes?: string[];
    readonly maxContextSize: number;
    readonly maxConcurrentTasks?: number;
    readonly memoryCapacity?: number;
    readonly features: {
        readonly streaming: boolean;
        readonly batching: boolean;
        readonly caching: boolean;
        readonly recovery: boolean;
        readonly metrics: boolean;
    };
}

export interface IAgentMetadata {
    readonly id: string;
    readonly name: string;
    readonly version: string;
    readonly type: string;
    readonly description: string;
    readonly capabilities: IAgentCapabilities;
    readonly created: Date;
    readonly modified: Date;
    readonly status: AGENT_STATUS_enum;
    readonly metrics?: IAgentMetrics & {
        iterations: number;
        executionTime: number;
        llmMetrics: unknown;
        thinkingMetrics?: {
            reasoningTime: number;
            planningTime: number;
            learningTime: number;
            decisionConfidence: number;
            learningEfficiency: number;
            startTime: number; // Using number for timestamp
        };
    };
}

export interface IAgentState {
    readonly id: string;
    readonly status: AGENT_STATUS_enum;
    readonly currentTask?: string;
    readonly lastActivity: Date;
    readonly metrics?: IAgentMetrics & {
        iterations: number;
        executionTime: number;
        llmMetrics: unknown;
        thinkingMetrics?: {
            reasoningTime: number;
            planningTime: number;
            learningTime: number;
            decisionConfidence: number;
            learningEfficiency: number;
            startTime: number; // Using number for timestamp
        };
    };
    readonly error?: IAgentError;
}

export interface IAgentError extends Error {
    readonly name: string;
    readonly message: string;
    readonly stack?: string;
    readonly errorCount: number;
    readonly errorHistory: Array<{
        readonly timestamp: Date;
        readonly error: Error;
        readonly context?: Record<string, unknown>;
    }>;
    readonly type?: string;
    readonly code?: string;
    readonly context?: Record<string, unknown>;
}

export interface IAgentExecutionState {
    readonly currentStep: number;
    readonly totalSteps: number;
    readonly startTime: Date;
    readonly lastUpdate: Date;
    readonly status: AGENT_STATUS_enum;
    readonly error?: IAgentError;
    readonly assignment?: {
        readonly taskId: string;
        readonly priority: number;
        readonly deadline?: Date;
        readonly progress: number;
    };
}

export interface IAgentConfig {
    readonly id: string;
    readonly name: string;
    readonly role: string;
    readonly goal: string;
    readonly version?: string;
    readonly background?: string;
    readonly capabilities: IAgentCapabilities;
    readonly tools?: Tool[];
    readonly llmConfig: IRuntimeLLMConfig;
    readonly messageHistory: IMessageHistory;
    readonly promptTemplates: IREACTChampionAgentPrompts;
    readonly providerConfig?: Record<string, unknown>;
    readonly stateConfig?: Record<string, unknown>;
    readonly metricsConfig?: Record<string, unknown>;
    readonly eventConfig?: Record<string, unknown>;
    readonly toolConfig?: Record<string, unknown>;
    readonly validationSchema?: Record<string, unknown>;
}

export interface IBaseAgent {
    readonly id: string;
    readonly name: string;
    readonly role: string;
    readonly goal: string;
    readonly background: string;
    readonly version: string;
    readonly capabilities: IAgentCapabilities;
    readonly tools: Tool[];
    readonly maxIterations: number;
    readonly status: AGENT_STATUS_enum;
    readonly env: Record<string, unknown> | null;
    readonly metrics?: IAgentMetrics & {
        iterations: number;
        executionTime: number;
        llmMetrics: unknown;
        thinkingMetrics?: {
            reasoningTime: number;
            planningTime: number;
            learningTime: number;
            decisionConfidence: number;
            learningEfficiency: number;
            startTime: number; // Using number for timestamp
        };
    };
    readonly llmInstance: ILLMInstance | null;
    readonly llmSystemMessage: string | null;
    readonly forceFinalAnswer: boolean;
    readonly promptTemplates: IREACTChampionAgentPrompts;
    readonly messageHistory: IMessageHistory;
    readonly metadata: IAgentMetadata;
    readonly executionState: IAgentExecutionState;
}

export interface IAgentType extends IBaseAgent {
    readonly type: string;
    readonly description: string;
    readonly supportedModels: string[];
    readonly supportedProviders: string[];
    readonly maxContextSize: number;
    readonly features: {
        readonly streaming: boolean;
        readonly batching: boolean;
        readonly caching: boolean;
    };
}

export interface IExecutableAgent extends IAgentType {
    readonly execute: () => Promise<void>;
    readonly pause: () => Promise<void>;
    readonly resume: () => Promise<void>;
    readonly stop: () => Promise<void>;
    readonly reset: () => Promise<void>;
    readonly validate: () => Promise<boolean>;
}

import { IProviderInstance } from '../llm/llmProviderTypes';

export interface IReactChampionAgent extends IExecutableAgent {
    readonly capabilities: IAgentCapabilities & {
        readonly canThink: boolean;
        readonly canUseTools: boolean;
        readonly canLearn: boolean;
        readonly supportedToolTypes: string[];
        readonly maxConcurrentTasks: number;
        readonly memoryCapacity: number;
    };
    readonly messages: BaseMessage[];
    readonly context: string;
    readonly history: IMessageHistory;
    readonly executableAgent: {
        runnable: IProviderInstance;
    };
}
