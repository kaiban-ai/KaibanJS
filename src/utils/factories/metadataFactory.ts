/**
 * @file metadataFactory.ts
 * @description Factory for creating metadata objects for various system entities
 * 
 * @packageDocumentation
 * @module @factories/metadata
 */

import { 
    ITaskLogMetadata,
    IWorkflowLogMetadata,
    IBaseLogMetadata,
    IToolExecutionMetadataPayload,
    IErrorMetadataPayload,
    ILogMetadataPayload
} from '../../types/team/teamLogsTypes';
import { 
    MessageMetadataFields,
    MessageRole,
    FunctionCall
} from '../../types/messaging/messagingBaseTypes';
import { 
    ILLMProvider, 
    LLMProviders,
    IStreamingChunk,
    ILLMEventMetadata
} from '../../types/llm/llmCommonTypes';
import { ITaskResult } from '../../types/task/taskBaseTypes';
import { ICostDetails } from '../../types/workflow/workflowCostsTypes';
import { IWorkflowMetadata, createDefaultWorkflowMetadata } from '../../types/workflow/workflowMetadataTypes';
import { ITeamState } from '../../types/team/teamBaseTypes';
import { DefaultFactory } from './defaultFactory';
import { IValidationResult } from '../../types/common/commonValidationTypes';
import { 
    IToolExecutionMetadata,
    IErrorMetadata,
    ISuccessMetadata,
    ITeamMetadata,
    IAgentMetadata,
    ITaskMetadata,
    IAgentCreationMetadata,
    IAgentExecutionMetadata,
    createBaseMetadata 
} from '../../types/common/commonMetadataTypes';
import { IHandlerResult } from '../../types/common/commonHandlerTypes';
import { IBaseError, IErrorType, toErrorType } from '../../types/common/commonErrorTypes';
import { ILLMUsageStats } from '../../types/llm/llmResponseTypes';

export class MetadataFactory {
    // ─── Team Metadata Creation ────────────────────────────────────────────────

    static createTeamResult<T>(
        data: T,
        teamName: string,
        agents: Record<string, IAgentMetadata>,
        tasks: Record<string, ITaskMetadata>
    ): IHandlerResult<T, ITeamMetadata> {
        const metadata: ITeamMetadata = {
            ...createBaseMetadata('team', 'execution'),
            team: {
                name: teamName,
                agents,
                tasks,
                performance: {
                    startTime: Date.now(),
                    endTime: 0,
                    duration: 0,
                    memoryUsage: process.memoryUsage().heapUsed
                },
                llmUsageStats: DefaultFactory.createLLMUsageStats(),
                costDetails: DefaultFactory.createCostDetails(),
                messageCount: 0,
                iterationCount: 0
            }
        };

        return {
            success: true,
            data,
            metadata
        };
    }

    // ─── Workflow Metadata Creation ─────────────────────────────────────────────

    static createWorkflowResult<T>(
        data: T,
        teamName: string
    ): IHandlerResult<T, IWorkflowMetadata> {
        const metadata: IWorkflowMetadata = {
            ...createBaseMetadata('workflow', 'execution'),
            workflow: {
                performance: {
                    startTime: Date.now(),
                    endTime: 0,
                    duration: 0,
                    memoryUsage: process.memoryUsage().heapUsed
                },
                debugInfo: {
                    lastCheckpoint: 'workflow_start',
                    warnings: []
                },
                priority: 1,
                retryCount: 0,
                taskCount: 0,
                agentCount: 0,
                costDetails: DefaultFactory.createCostDetails(),
                llmUsageStats: DefaultFactory.createLLMUsageStats(),
                teamName
            }
        };

        return {
            success: true,
            data,
            metadata
        };
    }

    static createWorkflowMetadata(
        operation: string,
        teamName: string = 'default'
    ): IWorkflowMetadata {
        return createDefaultWorkflowMetadata('workflow', operation, teamName);
    }

    // ─── Agent Metadata Creation ────────────────────────────────────────────────

    static createAgentResult<T>(
        data: T,
        agentId: string,
        agentName: string,
        role: string,
        status: string
    ): IHandlerResult<T, IAgentMetadata> {
        const metadata: IAgentMetadata = {
            ...createBaseMetadata('agent', 'execution'),
            agent: {
                id: agentId,
                name: agentName,
                role,
                status,
                metrics: {
                    iterations: 0,
                    executionTime: 0,
                    llmUsageStats: DefaultFactory.createLLMUsageStats()
                }
            }
        };

        return {
            success: true,
            data,
            metadata
        };
    }

    static createAgentCreationResult<T>(
        data: T,
        configHash: string,
        version: string,
        validation?: IValidationResult
    ): IHandlerResult<T, IAgentCreationMetadata> {
        const metadata: IAgentCreationMetadata = {
            ...createBaseMetadata('agent', 'creation'),
            createdAt: Date.now(),
            configHash,
            version,
            validation
        };

        return {
            success: true,
            data,
            metadata
        };
    }

    static createAgentExecutionResult<T>(
        data: T,
        iterations: number,
        executionTime: number,
        llmUsageStats: ILLMUsageStats
    ): IHandlerResult<T, IAgentExecutionMetadata> {
        const metadata: IAgentExecutionMetadata = {
            ...createBaseMetadata('agent', 'execution'),
            iterations,
            executionTime,
            llmUsageStats
        };

        return {
            success: true,
            data,
            metadata
        };
    }

    // ─── Task Metadata Creation ────────────────────────────────────────────────

    static createTaskResult<T>(
        data: T,
        iterations: number,
        executionTime: number,
        llmUsageStats: ILLMUsageStats
    ): IHandlerResult<T, ITaskMetadata> {
        const metadata: ITaskMetadata = {
            ...createBaseMetadata('task', 'execution'),
            task: {
                iterations,
                executionTime,
                llmUsageStats
            }
        };

        return {
            success: true,
            data,
            metadata
        };
    }

    // ─── Success & Error Results ────────────────────────────────────────────────

    static createSuccessResult<T>(data: T): IHandlerResult<T, ISuccessMetadata> {
        const metadata: ISuccessMetadata = {
            ...createBaseMetadata('success', 'completion'),
            details: { data }
        };

        return {
            success: true,
            data,
            metadata
        };
    }

    static createErrorResult(error: Error | IBaseError): IHandlerResult<never, IErrorMetadata> {
        const actualError = error instanceof Error ? error : new Error(JSON.stringify(error));
        const errorType = error instanceof Error ? toErrorType(error) : error;
        const metadata: IErrorMetadata = {
            ...createBaseMetadata('error', 'handling'),
            error: {
                code: errorType.name,
                type: errorType.type,
                message: errorType.message,
                context: errorType.context || {},
                severity: 'medium',
                rootError: actualError,
                recommendedAction: 'Review error and retry operation',
                stackTrace: actualError.stack
            },
            debug: {
                lastKnownState: undefined,
                recoveryAttempts: 0
            }
        };

        return {
            success: false,
            error: errorType,
            metadata
        };
    }

    static createErrorMetadata(error: Error | IBaseError): IErrorMetadata {
        const actualError = error instanceof Error ? error : new Error(JSON.stringify(error));
        const errorType = error instanceof Error ? toErrorType(error) : error;
        return {
            ...createBaseMetadata('error', 'handling'),
            error: {
                code: errorType.name,
                type: errorType.type,
                message: errorType.message,
                context: errorType.context || {},
                severity: 'medium',
                rootError: actualError,
                recommendedAction: 'Review error and retry operation',
                stackTrace: actualError.stack
            },
            debug: {
                lastKnownState: undefined,
                recoveryAttempts: 0
            }
        };
    }

    // ─── Utility Methods ───────────────────────────────────────────────────────

    static forTask(
        stats: { 
            llmUsageStats: ILLMUsageStats; 
            iterationCount: number; 
            duration: number 
        },
        result: ITaskResult,
        costDetails: ICostDetails
    ): ITaskLogMetadata {
        return {
            ...createBaseMetadata('task', 'execution'),
            task: {
                llmUsageStats: stats.llmUsageStats,
                iterationCount: stats.iterationCount,
                duration: stats.duration,
                costDetails,
                result
            }
        };
    }

    static forWorkflow(
        state: ITeamState,
        stats: {
            duration: number;
            llmUsageStats: ILLMUsageStats;
            iterationCount: number;
            costDetails: ICostDetails;
        }
    ): IWorkflowLogMetadata {
        return {
            ...createBaseMetadata('workflow', 'execution'),
            workflow: {
                result: state.workflowResult?.status || '',
                duration: stats.duration,
                llmUsageStats: stats.llmUsageStats,
                iterationCount: stats.iterationCount,
                costDetails: stats.costDetails,
                teamName: state.name,
                taskCount: state.tasks.length,
                agentCount: state.agents.length
            }
        };
    }

    static forMessage(params: {
        role: MessageRole;
        content: string;
        functionCall?: FunctionCall;
        additionalFields?: MessageMetadataFields;
    }): MessageMetadataFields {
        const { role, content, functionCall, additionalFields = {} } = params;

        return {
            ...createBaseMetadata('message', 'processing'),
            messageId: `msg_${Date.now()}`,
            role,
            content,
            function_call: functionCall ? {
                name: functionCall.name,
                arguments: typeof functionCall.arguments === 'string'
                    ? functionCall.arguments
                    : JSON.stringify(functionCall.arguments)
            } : undefined,
            llmUsageStats: DefaultFactory.createLLMUsageStats(),
            costDetails: DefaultFactory.createCostDetails(),
            ...additionalFields,
        };
    }

    static forHandler(metadata?: IToolExecutionMetadata): IBaseLogMetadata {
        const base = createBaseMetadata('handler', 'execution');
        const toolExecution: IToolExecutionMetadataPayload = {
            tool: 'handler',
            input: {},
            metadata
        };

        return {
            ...base,
            llmUsageStats: DefaultFactory.createLLMUsageStats(),
            meta: { toolExecution }
        };
    }

    static forStreamingOutput(params: {
        content: string;
        chunk?: string;
        done: boolean;
    }): IStreamingChunk {
        const { content, chunk, done } = params;
        
        return {
            content,
            metadata: {
                ...createBaseMetadata('llm', 'streaming'),
                llm: {
                    provider: LLMProviders.OPENAI,
                    model: 'gpt-4',
                    requestId: `req_${Date.now()}`
                }
            },
            done,
            finishReason: done ? 'stop' : undefined
        };
    }

    static forToolExecution(params: {
        toolName: string;
        input: unknown;
        output?: unknown;
        error?: Error;
        metadata?: IToolExecutionMetadata;
    }): IBaseLogMetadata {
        const { toolName, input, output, error, metadata } = params;
        const base = createBaseMetadata('tool', 'execution');

        const toolExecution: IToolExecutionMetadataPayload = {
            tool: toolName,
            input,
            output,
            ...(error && {
                error: {
                    message: error.message,
                    name: error.name,
                    stack: error.stack
                }
            }),
            metadata
        };

        return {
            ...base,
            llmUsageStats: DefaultFactory.createLLMUsageStats(),
            meta: { toolExecution }
        };
    }

    static forError(
        error: Error | Record<string, unknown>,
        metadata?: IErrorMetadata
    ): IBaseLogMetadata {
        const base = createBaseMetadata('error', 'handling');
        const actualError = error instanceof Error ? error : new Error(JSON.stringify(error));
        const errorPayload: IErrorMetadataPayload = {
            error: {
                message: actualError.message,
                name: actualError.name,
                stack: actualError.stack
            },
            ...(metadata && { errorMetadata: metadata })
        };

        return {
            ...base,
            llmUsageStats: DefaultFactory.createLLMUsageStats(),
            meta: { error: errorPayload }
        };
    }
}

export default MetadataFactory;
