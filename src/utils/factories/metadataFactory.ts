/**
 * @file metadataFactory.ts
 * @path KaibanJS\src\utils\factories\metadataFactory.ts
 * @description Factory for creating metadata objects with runtime validation
 */

import { 
    ITaskLogMetadata,
    IWorkflowLogMetadata,
    IBaseLogMetadata,
    IToolExecutionMetadataPayload
} from '../../types/team/teamLogsTypes';
import { 
    MessageMetadataFields,
    MessageRole,
    FunctionCall
} from '../../types/messaging/messagingBaseTypes';
import { 
    LLMProviders,
    IStreamingChunk
} from '../../types/llm/llmCommonTypes';
import { ITaskType, ITaskResult } from '../../types/task/taskBaseTypes';
import { ICostDetails } from '../../types/workflow/workflowCostsTypes';
import { ITeamState } from '../../types/team/teamBaseTypes';
import { DefaultFactory } from './defaultFactory';
import { 
    IValidationResult,
    createValidationResult
} from '../../types/common/commonValidationTypes';
import { 
    IToolExecutionMetadata,
    IErrorMetadata,
    ISuccessMetadata,
    IAgentMetadata,
    ITaskMetadata,
    IBaseHandlerMetadata,
    IStatusChangeMetadata,
    createBaseMetadata,
    createDefaultResourceMetrics,
} from '../../types/common/commonMetadataTypes';
import { MetadataTypeGuards } from '../../types/common/commonTypeGuards';
import {
    IPerformanceMetrics,
    IResourceMetrics,
    IUsageMetrics,
    IStandardCostDetails
} from '../../types/common/commonMetricTypes';
import { 
    IHandlerResult,
    createSuccessResult,
    createErrorResult
} from '../../types/common/commonHandlerTypes';
import { IBaseError, IErrorType, createError } from '../../types/common/commonErrorTypes';
import { ILLMUsageStats } from '../../types/llm/llmResponseTypes';
import { validateMetadataWithDetails } from '../validation/metadataValidation';
import { 
    ITeamHandlerResult,
    ITeamHandlerMetadata,
    TeamStoreTypeGuards
} from '../../types/team/teamStoreTypes';
import { IStatusEntity, IStatusType } from '../../types/common/commonStatusTypes';
import { ILoopHandlerMetadata } from '../../types/agent/agentLoopTypes';
import { IReactChampionAgent } from '../../types/agent/agentBaseTypes';

export class MetadataFactory {
    // ─── Base Methods ────────────────────────────────────────────────────────

    private static createBaseMetadata(
        component: string,
        operation: string,
        source = 'system',
        target = 'system'
    ): IBaseHandlerMetadata {
        return {
            timestamp: Date.now(),
            component,
            operation,
            performance: this.createPerformanceMetrics(),
            context: {
                source,
                target,
                correlationId: `${component}-${Date.now()}`,
                causationId: `${operation}-${Date.now()}`
            },
            validation: {
                isValid: true,
                errors: [],
                warnings: []
            }
        };
    }

    // ─── Success & Error Results ────────────────────────────────────────────────

    static createSuccessResult<T>(data: T): IHandlerResult<T, ISuccessMetadata> {
        const metadata: ISuccessMetadata = {
            ...this.createBaseMetadata('success', 'completion'),
            validation: createValidationResult(),
            details: {
                duration: 0,
                status: 'success',
                warnings: [],
                metrics: {
                    executionTime: 0,
                    memoryUsage: process.memoryUsage().heapUsed,
                    cpuUsage: 0
                }
            }
        };

        if (!MetadataTypeGuards.isSuccessMetadata(metadata)) {
            const error = createError({
                message: 'Invalid success metadata structure',
                type: 'ValidationError',
                context: { metadata }
            });
            throw error;
        }

        return createSuccessResult(data, metadata);
    }

    static createErrorResult(error: Error | IBaseError): IHandlerResult<never, IErrorMetadata> {
        const baseError: IErrorType = error instanceof Error ? createError({
            message: error.message,
            type: 'SystemError',
            context: {
                source: 'system',
                target: 'error-handler',
                data: error
            }
        }) : error;

        const metadata: IErrorMetadata = {
            ...this.createBaseMetadata('error', 'handling'),
            error: {
                code: baseError.name,
                type: baseError.type,
                message: baseError.message,
                context: {
                    source: 'system',
                    target: 'error-handler',
                    data: error
                },
                severity: 'medium',
                rootError: error instanceof Error ? error : new Error(error.message),
                recommendedAction: 'Review error and retry operation',
                stackTrace: error instanceof Error ? error.stack || '' : '',
                metrics: {
                    occurrenceCount: 1,
                    lastOccurrence: Date.now(),
                    meanTimeBetweenFailures: 0,
                    performance: this.createPerformanceMetrics()
                }
            },
            debug: {
                lastKnownState: 'error',
                recoveryAttempts: 0,
                diagnostics: {
                    memory: process.memoryUsage().heapUsed,
                    cpu: 0,
                    network: 0
                }
            },
            validation: createValidationResult(),
            transition: {
                from: 'running',
                to: 'error',
                entity: 'system',
                entityId: `error-${Date.now()}`,
                timestamp: Date.now()
            }
        };

        if (!MetadataTypeGuards.isErrorMetadata(metadata)) {
            const validationError = createError({
                message: 'Invalid error metadata structure',
                type: 'ValidationError',
                context: { metadata }
            });
            throw validationError;
        }

        return createErrorResult(baseError, metadata);
    }

    // ─── Tool Execution Methods ────────────────────────────────────────────────

    static forToolExecution(params: {
        toolName: string;
        input: unknown;
        output?: unknown;
        error?: Error | IBaseError;
        metadata?: IToolExecutionMetadata;
    }): IBaseLogMetadata {
        const { toolName, input, output, error, metadata } = params;
        const base = createBaseMetadata('tool', 'execution');

        const baseError = error instanceof Error ? createError({
            message: error.message,
            type: 'SystemError',
            context: {
                toolName,
                originalError: error
            }
        }) : error;

        const toolExecution: IToolExecutionMetadataPayload = {
            tool: toolName,
            input,
            output,
            ...(error && {
                error: {
                    message: baseError?.message || '',
                    name: baseError?.name || '',
                    stack: error instanceof Error ? error.stack : undefined
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

    // ─── Message Methods ───────────────────────────────────────────────────────

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

    // ─── Streaming Methods ─────────────────────────────────────────────────────

    static forStreamingOutput(params: {
        content: string;
        done: boolean;
    }): IStreamingChunk {
        const { content, done } = params;
        
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

    // ─── Task & Workflow Methods ──────────────────────────────────────────────

    static forTask(
        stats: { 
            llmUsageStats: ILLMUsageStats; 
            iterationCount: number; 
            duration: number 
        },
        result: ITaskResult,
        costDetails: ICostDetails
    ): ITaskLogMetadata {
        const metadata = {
            ...createBaseMetadata('task', 'execution'),
            task: {
                llmUsageStats: stats.llmUsageStats,
                iterationCount: stats.iterationCount,
                duration: stats.duration,
                costDetails,
                result
            }
        };

        if (!MetadataTypeGuards.isTaskMetadata(metadata)) {
            const error = createError({
                message: 'Invalid task metadata structure',
                type: 'ValidationError',
                context: { metadata }
            });
            throw error;
        }

        return metadata;
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
        const metadata = {
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

        if (!MetadataTypeGuards.isWorkflowMetadata(metadata)) {
            const error = createError({
                message: 'Invalid workflow metadata structure',
                type: 'ValidationError',
                context: { metadata }
            });
            throw error;
        }

        return metadata;
    }

    // ─── Loop Methods ────────────────────────────────────────────────────────

    static forLoop(params: {
        agent: IReactChampionAgent;
        task: ITaskType;
    }): ILoopHandlerMetadata {
        const baseMetadata = createBaseMetadata('AgenticLoopManager', 'executeLoop');
        const performanceMetrics = this.createPerformanceMetrics();
        const defaultLLMStats = this.createDefaultLLMStats();

        const metadata: ILoopHandlerMetadata = {
            ...baseMetadata,
            loop: {
                iterations: 0,
                maxIterations: params.agent.maxIterations,
                status: 'running',
                performance: performanceMetrics,
                context: {
                    startTime: Date.now(),
                    totalTokens: 0,
                    confidence: 0,
                    reasoningChain: []
                },
                resources: this.createResourceMetrics(),
                usage: this.createUsageMetrics(),
                costs: this.createCostDetails(),
                llmStats: defaultLLMStats
            },
            agent: {
                id: params.agent.id,
                name: params.agent.name,
                metrics: {
                    iterations: 0,
                    executionTime: 0,
                    llmUsageStats: defaultLLMStats,
                    performance: performanceMetrics
                }
            },
            task: {
                id: params.task.id,
                title: params.task.title,
                metrics: {
                    iterations: 0,
                    executionTime: 0,
                    llmUsageStats: defaultLLMStats,
                    performance: performanceMetrics
                }
            }
        };

        try {
            validateMetadataWithDetails(
                metadata,
                MetadataTypeGuards.isBaseHandlerMetadata,
                'LoopHandlerMetadata'
            );
            return metadata;
        } catch (error) {
            throw createError({
                message: error instanceof Error ? error.message : 'Invalid loop metadata structure',
                type: 'ValidationError',
                context: { 
                    metadata,
                    originalError: error
                }
            });
        }
    }

    // ─── Metrics Methods ──────────────────────────────────────────────────────

    static createPerformanceMetrics(executionTime: number = 0): IPerformanceMetrics {
        return {
            executionTime: {
                total: executionTime,
                average: executionTime,
                min: executionTime,
                max: executionTime
            },
            throughput: {
                operationsPerSecond: executionTime > 0 ? 1000 / executionTime : 0,
                dataProcessedPerSecond: 0
            },
            errorMetrics: {
                totalErrors: 0,
                errorRate: 0
            },
            resourceUtilization: {
                cpuUsage: process.cpuUsage().user / 1000000,
                memoryUsage: process.memoryUsage().heapUsed,
                diskIO: { read: 0, write: 0 },
                networkUsage: { upload: 0, download: 0 },
                timestamp: Date.now()
            },
            timestamp: Date.now()
        };
    }

    static createResourceMetrics(): IResourceMetrics {
        return {
            cpuUsage: 0,
            memoryUsage: process.memoryUsage().heapUsed,
            diskIO: { read: 0, write: 0 },
            networkUsage: { upload: 0, download: 0 },
            timestamp: Date.now()
        };
    }

    static createUsageMetrics(): IUsageMetrics {
        return {
            totalOperations: 0,
            successRate: 0,
            averageDuration: 0,
            costDetails: this.createCostDetails(),
            timestamp: Date.now()
        };
    }

    static createCostDetails(): IStandardCostDetails {
        return {
            inputCost: 0,
            outputCost: 0,
            totalCost: 0,
            currency: 'USD',
            breakdown: {
                promptTokens: { count: 0, cost: 0 },
                completionTokens: { count: 0, cost: 0 }
            }
        };
    }

    static createDefaultLLMStats(): ILLMUsageStats {
        return {
            inputTokens: 0,
            outputTokens: 0,
            callsCount: 0,
            callsErrorCount: 0,
            parsingErrors: 0,
            totalLatency: 0,
            averageLatency: 0,
            lastUsed: Date.now(),
            memoryUtilization: {
                peakMemoryUsage: 0,
                averageMemoryUsage: 0,
                cleanupEvents: 0
            },
            costBreakdown: {
                input: 0,
                output: 0,
                total: 0,
                currency: 'USD'
            }
        };
    }
}
