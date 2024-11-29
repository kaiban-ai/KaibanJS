/**
 * @file metadataFactory.ts
 * @path KaibanJS\src\utils\factories\metadataFactory.ts
 * @description Factory for creating metadata objects with runtime validation
 */

import { 
    BaseMessage, 
    SystemMessage, 
    HumanMessage, 
    AIMessage,
    MessageContent,
    MessageType,
    BaseMessageFields,
    BaseMessageChunk,
    AIMessageChunk,
    _mergeDicts,
    mergeContent
} from '@langchain/core/messages';
import { MESSAGE_STATUS_enum, LLM_PROVIDER_enum } from '../../types/common/commonEnums';
import { IBaseLLMResponse } from '../../types/llm/llmResponseTypes';
import { ITaskHandlerResult } from '../../types/task/taskHandlerTypes';
import { ICostDetails } from '../../types/workflow/workflowCostsTypes';
import { ITeamState } from '../../types/team/teamBaseTypes';
import { DefaultFactory } from './defaultFactory';
import { 
    createValidationResult, 
    createValidationMetadata,
    IValidationMetadata 
} from '../../types/common/commonValidationTypes';
import { 
    IToolExecutionMetadata,
    IErrorMetadata,
    ISuccessMetadata,
    IBaseHandlerMetadata,
    createBaseMetadata
} from '../../types/common/commonMetadataTypes';
import { MetadataTypeGuards } from '../../types/common/commonTypeGuards';
import { IBaseError, createError } from '../../types/common/commonErrorTypes';
import { ILLMUsageMetrics } from '../../types/llm/llmMetricTypes';
import { IHandlerResult, createSuccessResult, createErrorResult } from '../../types/common/commonHandlerTypes';
import { ITimeMetrics, IPerformanceMetrics } from '../../types/metrics/base/performanceMetrics';
import { IBaseMetrics } from '../../types/metrics/base/baseMetrics';

/**
 * Custom AIMessageChunk that properly implements BaseMessageChunk
 */
class CustomAIMessageChunk extends AIMessageChunk {
    constructor(fields: BaseMessageFields) {
        super(fields);
    }

    concat(chunk: BaseMessageChunk): BaseMessageChunk {
        // Merge content following Langchain's pattern
        const content = mergeContent(this.content, chunk.content);

        // Merge additional kwargs
        const additional_kwargs = _mergeDicts(
            this.additional_kwargs ?? {},
            chunk.additional_kwargs ?? {}
        );

        // Create new chunk with merged content
        return new CustomAIMessageChunk({
            content,
            additional_kwargs,
            name: this.name,
        });
    }
}

export class MetadataFactory {
    private static createDefaultTimeMetrics(): ITimeMetrics {
        return {
            total: 0,
            average: 0,
            min: 0,
            max: 0
        };
    }

    private static createDefaultPerformanceMetrics(): IPerformanceMetrics {
        return {
            executionTime: this.createDefaultTimeMetrics(),
            latency: this.createDefaultTimeMetrics(),
            throughput: {
                operationsPerSecond: 0,
                dataProcessedPerSecond: 0
            },
            responseTime: this.createDefaultTimeMetrics(),
            queueLength: 0,
            errorRate: 0,
            successRate: 1,
            errorMetrics: {
                totalErrors: 0,
                errorRate: 0
            },
            resourceUtilization: {
                cpuUsage: 0,
                memoryUsage: process.memoryUsage().heapUsed,
                diskIO: { read: 0, write: 0 },
                networkUsage: { upload: 0, download: 0 },
                timestamp: Date.now()
            },
            timestamp: Date.now()
        };
    }

    private static createDefaultBaseMetrics(): IBaseMetrics {
        return {
            resource: {
                cpuUsage: 0,
                memoryUsage: process.memoryUsage().heapUsed,
                diskIO: { read: 0, write: 0 },
                networkUsage: { upload: 0, download: 0 },
                timestamp: Date.now()
            },
            performance: this.createDefaultPerformanceMetrics(),
            usage: {
                totalRequests: 0,
                activeUsers: 0,
                requestsPerSecond: 0,
                averageResponseSize: 0,
                peakMemoryUsage: 0,
                uptime: 0,
                rateLimit: {
                    current: 0,
                    limit: 0,
                    remaining: 0,
                    resetTime: Date.now()
                },
                timestamp: Date.now()
            },
            timestamp: Date.now()
        };
    }

    private static createDefaultValidationMetadata(component: string, operation: string): IValidationMetadata {
        return createValidationMetadata({
            component,
            operation,
            validatedFields: [],
            validationDuration: 0,
            configHash: `${component}-${operation}-${Date.now()}`,
            validatorName: `${component}Validator`
        });
    }

    static createMessage(params: {
        role: MessageType;
        content: string | MessageContent;
        name?: string;
        additional_kwargs?: Record<string, unknown>;
        isChunk?: boolean;
    }): BaseMessage | BaseMessageChunk {
        const { role, content, name, additional_kwargs, isChunk } = params;

        const fields: BaseMessageFields = {
            content,
            name,
            additional_kwargs: {
                ...additional_kwargs,
                metadata: {
                    id: `msg_${Date.now()}`,
                    messageId: `msg_${Date.now()}`,
                    timestamp: Date.now(),
                    status: MESSAGE_STATUS_enum.INITIAL,
                    retryCount: 0,
                    role,
                    content: typeof content === 'string' ? content : JSON.stringify(content),
                    name,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                }
            }
        };

        switch (role) {
            case 'system':
                return new SystemMessage(fields);
            case 'ai':
                return isChunk ? new CustomAIMessageChunk(fields) : new AIMessage(fields);
            default:
                return new HumanMessage(fields);
        }
    }

    static createStreamingChunk(params: {
        content: string;
        done: boolean;
        provider?: LLM_PROVIDER_enum;
        model?: string;
    }): IBaseLLMResponse {
        const { content, done, provider = LLM_PROVIDER_enum.GROQ, model } = params;
        const message = this.createMessage({
            role: 'ai',
            content,
            isChunk: true,
            additional_kwargs: {
                done,
                provider,
                model: model ?? 'mixtral-8x7b-32768'
            }
        }) as BaseMessageChunk;
        
        return {
            provider,
            model: model ?? 'mixtral-8x7b-32768',
            metrics: this.createDefaultBaseMetrics(),
            message,
            generations: [[{
                text: content,
                generationInfo: {
                    finishReason: done ? 'stop' : undefined
                }
            }]],
            llmOutput: {
                tokenUsage: {
                    promptTokens: 0,
                    completionTokens: content.length / 4, // Rough estimate
                    totalTokens: content.length / 4
                }
            }
        };
    }

    static createToolExecution(params: {
        toolName: string;
        input: unknown;
        output?: unknown;
        error?: Error | IBaseError;
        metadata?: IToolExecutionMetadata;
    }): IToolExecutionMetadata {
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

        const toolMetadata: IToolExecutionMetadata = {
            ...base,
            tool: {
                name: toolName,
                executionTime: 0,
                status: error ? 'failed' : 'success',
                inputSize: typeof input === 'string' ? input.length : 0,
                outputSize: typeof output === 'string' ? output.length : 0,
                performance: this.createDefaultPerformanceMetrics(),
                resources: DefaultFactory.createIterationContext().resources,
                ...(error && {
                    error: {
                        code: baseError?.name || 'ERROR',
                        message: baseError?.message || 'Unknown error',
                        timestamp: Date.now()
                    }
                })
            }
        };

        if (!MetadataTypeGuards.isToolExecutionMetadata(toolMetadata)) {
            throw createError({
                message: 'Invalid tool execution metadata structure',
                type: 'ValidationError',
                context: { metadata: toolMetadata }
            });
        }

        return toolMetadata;
    }

    static createTaskMetadata(
        stats: { 
            llmUsageStats: ILLMUsageMetrics; 
            iterationCount: number; 
            duration: number 
        },
        result: ITaskHandlerResult,
        costDetails: ICostDetails
    ): IBaseHandlerMetadata {
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

        if (!MetadataTypeGuards.isBaseHandlerMetadata(metadata)) {
            throw createError({
                message: 'Invalid task metadata structure',
                type: 'ValidationError',
                context: { metadata }
            });
        }

        return metadata;
    }

    static createProviderMetadata(params: {
        provider: string;
        model: string;
        timestamp?: number;
    }): IBaseHandlerMetadata {
        const metadata = {
            ...createBaseMetadata('provider', 'initialization'),
            provider: {
                name: params.provider,
                model: params.model,
                timestamp: params.timestamp || Date.now(),
                metrics: this.createDefaultBaseMetrics(),
                performance: this.createDefaultPerformanceMetrics()
            }
        };

        if (!MetadataTypeGuards.isBaseHandlerMetadata(metadata)) {
            throw createError({
                message: 'Invalid provider metadata structure',
                type: 'ValidationError',
                context: { metadata }
            });
        }

        return metadata;
    }

    static createValidationMetadata(params: {
        component: string;
        operation: string;
        validatedFields: string[];
        timestamp?: number;
    }): IBaseHandlerMetadata {
        const metadata = {
            ...createBaseMetadata(params.component, params.operation),
            validation: {
                timestamp: params.timestamp || Date.now(),
                component: params.component,
                operation: params.operation,
                validatedFields: params.validatedFields,
                metrics: this.createDefaultBaseMetrics()
            }
        };

        if (!MetadataTypeGuards.isBaseHandlerMetadata(metadata)) {
            throw createError({
                message: 'Invalid validation metadata structure',
                type: 'ValidationError',
                context: { metadata }
            });
        }

        return metadata;
    }

    static createErrorMetadata(error: Error | IBaseError): IErrorMetadata {
        const baseError = error instanceof Error ? createError({
            message: error.message,
            type: 'SystemError',
            context: {
                source: 'system',
                target: 'error-handler',
                data: error
            }
        }) : error;

        const metadata: IErrorMetadata = {
            ...createBaseMetadata('error', 'handling'),
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
                    performance: this.createDefaultPerformanceMetrics()
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
            validation: createValidationResult({
                isValid: true,
                errors: [],
                warnings: [],
                metadata: this.createDefaultValidationMetadata('error', 'validation')
            }),
            transition: {
                from: 'running',
                to: 'error',
                entity: 'system',
                entityId: `error-${Date.now()}`,
                timestamp: Date.now()
            }
        };

        if (!MetadataTypeGuards.isErrorMetadata(metadata)) {
            throw createError({
                message: 'Invalid error metadata structure',
                type: 'ValidationError',
                context: { metadata }
            });
        }

        return metadata;
    }

    static createSuccessMetadata(): ISuccessMetadata {
        const metadata: ISuccessMetadata = {
            ...createBaseMetadata('success', 'completion'),
            validation: createValidationResult({
                isValid: true,
                errors: [],
                warnings: [],
                metadata: this.createDefaultValidationMetadata('success', 'validation')
            }),
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
            throw createError({
                message: 'Invalid success metadata structure',
                type: 'ValidationError',
                context: { metadata }
            });
        }

        return metadata;
    }

    static createErrorResult(error: Error | IBaseError): IHandlerResult<never, IErrorMetadata> {
        const baseError = error instanceof Error ? createError({
            message: error.message,
            type: 'SystemError',
            context: {
                source: 'system',
                target: 'error-handler',
                data: error
            }
        }) : error;
        
        const metadata = this.createErrorMetadata(baseError);
        return createErrorResult(baseError, metadata);
    }

    static createSuccessResult<T>(data: T): IHandlerResult<T, ISuccessMetadata> {
        const metadata = this.createSuccessMetadata();
        return createSuccessResult(data, metadata);
    }
}
