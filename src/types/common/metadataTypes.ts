/**
 * @file metadataTypes.ts
 * @description Core metadata type definitions with enhanced type safety
 */

import type { Tool } from "langchain/tools";
import type { BaseMessage } from "@langchain/core/messages";
import type { IPerformanceMetrics } from '../metrics/base/performanceMetrics';
import type { IResourceMetrics } from '../metrics/base/resourceMetrics';
import type { ILLMUsageMetrics } from '../llm/llmMetricTypes';
import type { ICostDetails } from '../workflow/workflowCostsTypes';
import type { LLMResponse } from '../llm/llmResponseTypes';
import type { IBaseHandlerMetadata, IBaseHandlerParams } from './baseTypes';
import type { IValidationResult } from './validationTypes';
import type { IErrorType, IBaseError } from './errorTypes';
import type { WORKFLOW_STATUS_enum, TASK_STATUS_enum, AGENT_STATUS_enum, MESSAGE_STATUS_enum } from './enumTypes';
import type { IStatusEntity, IStatusType } from './statusTypes';

// ================ Status Change Metadata Types ================

export interface IStatusChangeMetadata extends IBaseHandlerMetadata {
    readonly timestamp: number;
    readonly component: string;
    readonly operation: string;
    readonly performance: IPerformanceMetrics;
    readonly entity: {
        readonly type: IStatusEntity;
        readonly id: string;
        readonly name: string;
    };
    readonly transition: {
        readonly from: IStatusType;
        readonly to: IStatusType;
        readonly reason: string;
        readonly triggeredBy: string;
    };
    readonly validation: IValidationResult;
    readonly resources: IResourceMetrics;
    readonly context: {
        readonly source: string;
        readonly target: string;
        readonly correlationId: string;
        readonly causationId: string;
        readonly taskId: string;
        readonly taskName: string;
        readonly agentId: string;
        readonly agentName: string;
        readonly workflowId: string;
        readonly messageId: string;
        readonly phase: string;
        readonly duration: number;
    };
}

// ================ Error Metadata Types ================

export interface IErrorMetadata extends IBaseHandlerMetadata {
    readonly error: {
        readonly name: string;
        readonly code: string;
        readonly message: string;
        readonly timestamp: number;
        readonly stack?: string;
    };
}

// ================ Tool Metadata Types ================

export interface IToolExecutionMetadata extends IBaseHandlerMetadata {
    readonly tool: {
        readonly name: string;
        readonly executionTime: number;
        readonly status: 'success' | 'failed';
        readonly inputSize: number;
        readonly outputSize: number;
        readonly performance: IPerformanceMetrics;
        readonly resources: IResourceMetrics;
        readonly error?: {
            readonly name: string;
            readonly code: string;
            readonly message: string;
            readonly timestamp: number;
        };
    };
}

// ================ Response Metadata Types ================

export interface IResponseMetadata extends IBaseHandlerMetadata {
    readonly response: {
        readonly id: string;
        readonly type: 'text' | 'json' | 'binary' | 'stream';
        readonly size: number;
        readonly processingTime: number;
        readonly compressionRatio: number;
        readonly format: string;
        readonly encoding: string;
        readonly performance: IPerformanceMetrics;
        readonly resources: IResourceMetrics;
    };
}

// ================ Message Metadata Types ================

export interface IMessageMetadata extends IBaseHandlerMetadata {
    readonly messageDetails: {
        readonly id: string;
        readonly processingInfo: {
            readonly parseTime: number;
            readonly tokenCount: number;
            readonly compressionRatio: number;
            readonly priority: number;
        };
        readonly context: {
            readonly threadId: string;
            readonly parentMessageId?: string;
            readonly references: ReadonlyArray<string>;
            readonly depth: number;
            readonly path: ReadonlyArray<string>;
        };
        readonly performance: IPerformanceMetrics;
        readonly type: MESSAGE_STATUS_enum;
    };
}

// ================ Team Metadata Types ================

export interface ITeamMetadata extends IBaseHandlerMetadata {
    readonly team: {
        readonly name: string;
        readonly agents: Readonly<Record<string, IAgentMetadata>>;
        readonly tasks: Readonly<Record<string, ITaskMetadata>>;
        readonly performance: IPerformanceMetrics;
        readonly llmUsageMetrics: ILLMUsageMetrics;
        readonly costDetails: ICostDetails;
        readonly messageCount: number;
        readonly iterationCount: number;
        readonly metrics: {
            readonly agentUtilization: number;
            readonly taskCompletionRate: number;
            readonly averageTaskTime: number;
            readonly resourceEfficiency: number;
            readonly errorRate: number;
        };
    };
}

// ================ Workflow Metadata Types ================

export interface IWorkflowMetadata extends IBaseHandlerMetadata {
    readonly workflow: {
        readonly id: string;
        readonly performance: IPerformanceMetrics;
        readonly debugInfo: {
            readonly lastCheckpoint: string;
            readonly warnings: ReadonlyArray<string>;
            readonly errors: ReadonlyArray<{
                readonly code: string;
                readonly message: string;
                readonly timestamp: number;
            }>;
        };
        readonly priority: number;
        readonly retryCount: number;
        readonly taskCount: number;
        readonly agentCount: number;
        readonly costDetails: ICostDetails;
        readonly llmUsageMetrics: ILLMUsageMetrics;
        readonly teamName: string;
        readonly messageCount: number;
        readonly iterationCount: number;
        readonly status: WORKFLOW_STATUS_enum;
    };
}

// ================ Agent Metadata Types ================

export interface IAgentMetadata extends IBaseHandlerMetadata {
    readonly agent: {
        readonly id: string;
        readonly name: string;
        readonly role: string;
        readonly status: AGENT_STATUS_enum;
        readonly metrics: {
            readonly iterations: number;
            readonly executionTime: number;
            readonly llmUsageMetrics: ILLMUsageMetrics;
            readonly performance: IPerformanceMetrics;
            readonly resources: IResourceMetrics;
            readonly successRate: number;
            readonly taskCompletion: number;
            readonly responseTime: number;
        };
        readonly lastActivity: number;
        readonly capabilities: ReadonlyArray<string>;
    };
}

export interface IAgentCreationMetadata extends IBaseHandlerMetadata {
    readonly createdAt: number;
    readonly configHash: string;
    readonly version: string;
    readonly resources: IResourceMetrics;
    readonly initialization: {
        readonly duration: number;
        readonly status: 'success' | 'failed';
        readonly errors: ReadonlyArray<string>;
    };
}

export interface IAgentExecutionMetadata extends IBaseHandlerMetadata {
    readonly iterations: number;
    readonly executionTime: number;
    readonly llmUsageMetrics: ILLMUsageMetrics;
    readonly performance: IPerformanceMetrics;
    readonly resources: IResourceMetrics;
    readonly status: AGENT_STATUS_enum;
    readonly error?: {
        readonly name: string;
        readonly code: string;
        readonly message: string;
        readonly timestamp: number;
    };
}

// ================ Task Metadata Types ================

export interface ITaskMetadata extends IBaseHandlerMetadata {
    readonly task: {
        readonly id: string;
        readonly type: string;
        readonly priority: number;
        readonly status: TASK_STATUS_enum;
        readonly metrics: {
            readonly iterations: number;
            readonly executionTime: number;
            readonly llmUsageMetrics: ILLMUsageMetrics;
            readonly performance: IPerformanceMetrics;
            readonly resources: IResourceMetrics;
            readonly completionRate: number;
            readonly errorRate: number;
        };
        readonly dependencies: ReadonlyArray<string>;
        readonly assignedAgent?: string;
    };
}

// ================ Handler Types ================

export interface IErrorHandlerParams extends IBaseHandlerParams {
    error: IErrorType;
    metadata: IErrorMetadata;
}

export interface IThinkingHandlerParams extends IBaseHandlerParams {
    messages: unknown[];
    output?: LLMResponse;
    metadata: IBaseHandlerMetadata & {
        messageCount: number;
        processingTime: number;
    };
}

export interface IToolHandlerParams extends IBaseHandlerParams {
    tool?: Tool;
    error: IBaseError;
    toolName: string;
    metadata: IBaseHandlerMetadata & IToolExecutionMetadata;
}

export interface ITaskExecutionParams extends IBaseHandlerParams {
    input?: unknown;
    options?: {
        timeout?: number;
        retries?: number;
        signal?: AbortSignal;
        strict?: boolean;
        customValidators?: ((value: unknown) => boolean)[];
    };
}

export interface ITaskCompletionParams extends IBaseHandlerParams {
    result: LLMResponse | null;
    metadata: IBaseHandlerMetadata & {
        completionTime: number;
        resultSize: number;
    };
}

export interface ITeamMessageParams extends Omit<IBaseHandlerParams, 'agent' | 'task'> {
    content: string | BaseMessage;
    type: 'system' | 'user' | 'ai' | 'function';
    functionName?: string;
    metadata: IBaseHandlerMetadata & IMessageMetadata;
}

export interface IResourceHandlerParams extends IBaseHandlerParams {
    resourceStats: {
        memory: number;
        tokens: number;
        cpuTime: number;
        networkRequests: number;
    };
    thresholds: Record<string, number>;
}

// ================ Result Types ================

export interface IAgentCreationResult {
    success: boolean;
    agent: unknown;
    validation: IValidationResult;
    metadata: IAgentCreationMetadata;
}

export interface IAgentExecutionResult {
    success: boolean;
    result?: LLMResponse;
    metadata: IAgentExecutionMetadata;
}
