/**
 * @file thinkingManager.ts 
 * @path KaibanJS/src/managers/domain/agent/thinkingManager.ts
 * @description Centralized manager for agent thinking processes and LLM interactions
 */

import { BaseMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { LLMResult } from '@langchain/core/outputs';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { RunnableWithMessageHistory } from '@langchain/core/runnables';
import { ChatMessageHistory } from 'langchain/stores/message/in_memory';

import CoreManager from '../../core/coreManager';
import { createError } from '../../../types/common/commonErrorTypes';
import { createBaseMetadata } from '../../../types/common/commonMetadataTypes';
import { AGENT_STATUS_enum } from '../../../types/common/commonEnums';
import { AgentMetricsValidation } from '../../../types/agent/agentMetricTypes';

import type { IAgentType } from '../../../types/agent/agentBaseTypes';
import type { ITaskType } from '../../../types/task/taskBaseTypes';
import type { IHandlerResult } from '../../../types/common/commonHandlerTypes';
import type { IBaseHandlerMetadata } from '../../../types/common/commonMetadataTypes';
import type { ITimeMetrics, IThroughputMetrics, IErrorMetrics } from '../../../types/metrics';
import type {
    IAgentUsageMetrics,
    IAgentResourceMetrics,
    IAgentPerformanceMetrics,
    IAgentStateMetrics
} from '../../../types/agent/agentMetricTypes';
import type {
    IThinkingMetadata,
    IThinkingExecutionParams,
    IThinkingResult,
    IThinkingHandlerResult
} from '../../../types/agent/agentHandlersTypes';
import type { ILLMMetrics } from '../../../types/llm/llmMetricTypes';

type OperationPhase = 'pre-execution' | 'execution' | 'post-execution' | 'error';

interface OperationContext {
    operation: string;
    phase: OperationPhase;
    startTime: number;
    resourceMetrics: IAgentResourceMetrics;
    performanceMetrics: IAgentPerformanceMetrics;
    errorContext?: any;
}

/**
 * Manages thinking process execution and lifecycle
 */
class ThinkingManager extends CoreManager {
    private static instance: ThinkingManager;
    private executionTimesMap: Map<string, number[]> = new Map();

    protected constructor() {
        super();
        this.registerDomainManager('ThinkingManager', this);
    }

    public static getInstance(): ThinkingManager {
        if (!ThinkingManager.instance) {
            ThinkingManager.instance = new ThinkingManager();
        }
        return ThinkingManager.instance;
    }

    /**
     * Execute thinking iteration with standardized handling
     */
    public async executeThinking(params: IThinkingExecutionParams): Promise<IThinkingHandlerResult<IThinkingResult>> {
        const { task, ExecutableAgent, feedbackMessage } = params;
        const agent = task.agent;

        // Create base metadata
        const baseMetadata = createBaseMetadata('ThinkingManager', 'executeThinking');
        const performanceMetrics = this.createPerformanceMetrics(agent.id, 0);
        const agentResourceMetrics = this.getInitialResourceMetrics();

        // Create agent-specific state metrics
        const stateMetrics: IAgentStateMetrics = {
            currentState: 'thinking',
            stateTime: 0,
            transitionCount: 0,
            failedTransitions: 0,
            blockedTaskCount: 0,
            historyEntryCount: 0,
            lastHistoryUpdate: Date.now()
        };

        // Create agent-specific usage metrics
        const usageMetrics: IAgentUsageMetrics = {
            state: stateMetrics,
            toolUsageFrequency: {},
            taskCompletionCount: 0,
            averageTaskTime: 0,
            totalRequests: 1,
            activeUsers: 1,
            requestsPerSecond: 0,
            averageResponseSize: 0,
            peakMemoryUsage: process.memoryUsage().heapUsed,
            uptime: process.uptime(),
            rateLimit: {
                current: 1,
                limit: 100,
                remaining: 99,
                resetTime: Date.now() + 3600000
            },
            timestamp: Date.now()
        };

        // Create LLM metrics
        const now = Date.now();
        const llmResourceMetrics = {
            cpuUsage: 0,
            memoryUsage: process.memoryUsage().heapUsed,
            diskIO: { read: 0, write: 0 },
            networkUsage: { upload: 0, download: 0 },
            gpuMemoryUsage: 0,
            modelMemoryAllocation: {
                weights: 0,
                cache: 0,
                workspace: 0
            },
            timestamp: now
        };

        const llmMetrics: ILLMMetrics = {
            resources: llmResourceMetrics,
            performance: {
                executionTime: { total: 0, average: 0, min: 0, max: 0 },
                latency: { total: 0, average: 0, min: 0, max: 0 },
                throughput: { operationsPerSecond: 0, dataProcessedPerSecond: 0 },
                responseTime: { total: 0, average: 0, min: 0, max: 0 },
                queueLength: 0,
                errorRate: 0,
                successRate: 1,
                errorMetrics: { totalErrors: 0, errorRate: 0 },
                resourceUtilization: llmResourceMetrics,
                tokensPerSecond: 0,
                coherenceScore: 0,
                temperatureImpact: 0,
                timestamp: now
            },
            usage: {
                totalRequests: 0,
                activeInstances: 0,
                requestsPerSecond: 0,
                averageResponseLength: 0,
                peakMemoryUsage: 0,
                uptime: 0,
                rateLimit: {
                    current: 0,
                    limit: 0,
                    remaining: 0,
                    resetTime: now
                },
                tokenDistribution: {
                    prompt: 0,
                    completion: 0,
                    total: 0
                },
                modelDistribution: {
                    gpt4: 0,
                    gpt35: 0,
                    other: 0
                },
                timestamp: now
            },
            timestamp: now
        };

        // Create thinking-specific metadata
        const metadata: IThinkingMetadata = {
            ...baseMetadata,
            thinking: {
                messageCount: 0,
                processingTime: 0,
                metrics: llmMetrics,
                context: {
                    iteration: 0,
                    totalTokens: 0,
                    confidence: 0,
                    reasoningChain: []
                },
                performance: performanceMetrics,
                resources: agentResourceMetrics,
                usage: usageMetrics,
                costs: {
                    inputCost: 0,
                    outputCost: 0,
                    totalCost: 0,
                    currency: 'USD',
                    breakdown: {
                        promptTokens: { count: 0, cost: 0 },
                        completionTokens: { count: 0, cost: 0 }
                    }
                }
            },
            agent: {
                id: agent.id,
                name: agent.name,
                metrics: {
                    iterations: 0,
                    executionTime: 0,
                    llmMetrics
                }
            },
            task: {
                id: task.id,
                title: task.title,
                metrics: {
                    iterations: 0,
                    executionTime: 0,
                    llmMetrics
                }
            },
            llm: {
                model: agent.llmConfig?.model || 'unknown',
                provider: agent.llmConfig?.provider || 'unknown',
                requestId: `req_${Date.now()}`,
                usageStats: llmMetrics
            }
        };

        return this.handleThinkingOperation(
            async () => {
                // Create prompt template
                const prompt = ChatPromptTemplate.fromMessages([
                    new SystemMessage(agent.llmSystemMessage || ''),
                    new MessagesPlaceholder('history'),
                    new MessagesPlaceholder('input')
                ]);

                // Create message history adapter
                const messageHistory = new ChatMessageHistory();
                const messages = await agent.messageHistory.getMessages();
                for (const message of messages) {
                    await messageHistory.addMessage(message);
                }

                // Create runnable with message history
                const chain = new RunnableWithMessageHistory({
                    runnable: prompt.pipe(ExecutableAgent),
                    getMessageHistory: async () => messageHistory,
                    inputMessagesKey: 'input',
                    historyMessagesKey: 'history',
                    outputMessagesKey: 'output'
                });

                // Execute the thinking process
                const result = await chain.invoke(
                    { input: feedbackMessage ? [new AIMessage(feedbackMessage)] : [] },
                    { 
                        configurable: { 
                            timeout: 60000,
                            metadata: { taskId: task.id },
                            tags: ['thinking']
                        }
                    }
                ) as LLMResult;

                // Extract metrics from result
                const metrics = {
                    inputTokens: result.llmOutput?.tokenUsage?.promptTokens || 0,
                    outputTokens: result.llmOutput?.tokenUsage?.completionTokens || 0,
                    callsCount: 1,
                    callsErrorCount: 0,
                    parsingErrors: 0,
                    totalLatency: result.llmOutput?.latency || 0,
                    averageLatency: result.llmOutput?.latency || 0,
                    lastUsed: Date.now(),
                    memoryUtilization: {
                        peakMemoryUsage: process.memoryUsage().heapUsed,
                        averageMemoryUsage: process.memoryUsage().heapUsed,
                        cleanupEvents: 0
                    },
                    costBreakdown: {
                        input: 0,
                        output: 0,
                        total: 0,
                        currency: 'USD'
                    }
                };

                // Update metadata with metrics
                metadata.thinking.metrics = {
                    ...llmMetrics,
                    usage: {
                        ...llmMetrics.usage,
                        tokenDistribution: {
                            prompt: metrics.inputTokens,
                            completion: metrics.outputTokens,
                            total: metrics.inputTokens + metrics.outputTokens
                        }
                    }
                };
                metadata.thinking.context.totalTokens = metrics.inputTokens + metrics.outputTokens;
                metadata.llm.usageStats = metadata.thinking.metrics;

                // Create AIMessage from generation text
                const generatedMessage = new AIMessage(result.generations[0][0].text);

                return {
                    parsedLLMOutput: null, // Deprecated
                    llmOutput: result.generations[0][0].text,
                    metrics: metadata.thinking.metrics,
                    messages: [generatedMessage],
                    output: result
                };
            },
            agent,
            task,
            metadata
        );
    }

    /**
     * Handle thinking operations with standardized pattern
     */
    protected async handleThinkingOperation<T>(
        operation: () => Promise<T>,
        agent: IAgentType,
        task: ITaskType,
        metadata: IThinkingMetadata
    ): Promise<IThinkingHandlerResult<T>> {
        const startTime = Date.now();
        const operationContext: OperationContext = {
            operation: 'handleThinkingOperation',
            phase: 'pre-execution',
            startTime,
            resourceMetrics: this.getInitialResourceMetrics(),
            performanceMetrics: this.createPerformanceMetrics(agent.id, 0)
        };

        try {
            // Pre-execution validation
            const validationResult = await this.validateThinking(agent, task);
            if (!validationResult.isValid) {
                throw createError({
                    message: validationResult.errors.join(', '),
                    type: 'ValidationError',
                    context: {
                        ...validationResult.context,
                        phase: operationContext.phase
                    }
                });
            }

            // Update operation context for execution phase
            operationContext.phase = 'execution';
            operationContext.resourceMetrics = await this.getCurrentResourceMetrics();

            // Transition to thinking state
            await this.handleStatusTransition({
                entity: 'agent',
                entityId: agent.id,
                currentStatus: agent.status,
                targetStatus: AGENT_STATUS_enum.THINKING,
                context: {
                    ...metadata,
                    operation: operationContext.operation,
                    phase: operationContext.phase,
                    startTime: operationContext.startTime,
                    resourceMetrics: operationContext.resourceMetrics,
                    performanceMetrics: operationContext.performanceMetrics
                }
            });

            // Execute operation
            const result = await operation();

            // Update metrics for post-execution
            operationContext.phase = 'post-execution';
            operationContext.resourceMetrics = await this.getCurrentResourceMetrics();
            
            const executionTime = Date.now() - startTime;
            const updatedPerformanceMetrics = this.createPerformanceMetrics(agent.id, executionTime);

            // Update metadata with final metrics
            metadata.thinking.performance = updatedPerformanceMetrics;
            metadata.thinking.processingTime = executionTime;

            // Handle completion
            await this.handleStatusTransition({
                entity: 'agent',
                entityId: agent.id,
                currentStatus: agent.status,
                targetStatus: AGENT_STATUS_enum.THINKING_END,
                context: {
                    ...metadata,
                    operation: operationContext.operation,
                    phase: operationContext.phase,
                    startTime: operationContext.startTime,
                    resourceMetrics: operationContext.resourceMetrics,
                    performanceMetrics: operationContext.performanceMetrics
                }
            });

            return {
                success: true,
                data: result,
                metadata
            };

        } catch (error) {
            const actualError = error instanceof Error ? error : new Error(String(error));
            
            operationContext.phase = 'error';
            operationContext.resourceMetrics = await this.getCurrentResourceMetrics();
            operationContext.errorContext = {
                error: actualError,
                recoverable: true,
                retryCount: metadata.thinking.context.iteration,
                lastRetryTimestamp: Date.now(),
                failureReason: actualError.message
            };

            await this.handleThinkingError(agent, task, actualError, operationContext);
            throw createError({
                message: actualError.message,
                type: 'AgentError',
                context: {
                    agentId: agent.id,
                    taskId: task.id,
                    error: metadata
                }
            });
        }
    }

    /**
     * Validate thinking operation
     */
    private async validateThinking(agent: IAgentType, task: ITaskType): Promise<{ 
        isValid: boolean; 
        errors: string[];
        context: Record<string, unknown>;
    }> {
        const errors: string[] = [];

        if (!agent) errors.push('Agent is required');
        if (!task) errors.push('Task is required');
        if (agent && !agent.id) errors.push('Agent ID is required');
        if (task && !task.id) errors.push('Task ID is required');

        return {
            isValid: errors.length === 0,
            errors,
            context: {
                agentId: agent?.id,
                taskId: task?.id,
                validationTime: Date.now()
            }
        };
    }

    /**
     * Handle thinking error
     */
    private async handleThinkingError(
        agent: IAgentType,
        task: ITaskType,
        error: Error,
        context: OperationContext
    ): Promise<void> {
        await this.handleStatusTransition({
            entity: 'agent',
            entityId: agent.id,
            currentStatus: agent.status,
            targetStatus: AGENT_STATUS_enum.THINKING_ERROR,
            context: {
                agentId: agent.id,
                taskId: task.id,
                error: context.errorContext,
                operation: context.operation,
                phase: context.phase,
                startTime: context.startTime,
                resourceMetrics: context.resourceMetrics,
                performanceMetrics: context.performanceMetrics
            }
        });

        this.log(
            `Thinking error: ${error.message}`,
            agent.name,
            task.id,
            'error',
            error
        );
    }

    /**
     * Create performance metrics
     */
    private createPerformanceMetrics(agentId: string, executionTime: number): IAgentPerformanceMetrics {
        const times = this.executionTimesMap.get(agentId) || [];
        times.push(executionTime);
        this.executionTimesMap.set(agentId, times);

        const total = times.reduce((sum, time) => sum + time, 0);
        const average = total / times.length;
        const min = Math.min(...times);
        const max = Math.max(...times);
        const operationsPerSecond = times.length / (total / 1000);

        const timeMetrics: ITimeMetrics = {
            total,
            average,
            min,
            max
        };

        const throughputMetrics: IThroughputMetrics = {
            operationsPerSecond,
            dataProcessedPerSecond: 0
        };

        const errorMetrics: IErrorMetrics = {
            totalErrors: 0,
            errorRate: 0
        };

        return {
            thinking: {
                reasoningTime: timeMetrics,
                planningTime: timeMetrics,
                learningTime: timeMetrics,
                decisionConfidence: 0.8,
                learningEfficiency: 0.7
            },
            taskSuccessRate: 0.9,
            goalAchievementRate: 0.85,
            executionTime: timeMetrics,
            latency: { ...timeMetrics, average: average / 2 }, // Estimate latency as half of execution time
            throughput: throughputMetrics,
            responseTime: timeMetrics,
            queueLength: 0,
            errorRate: 0,
            successRate: 1,
            errorMetrics,
            resourceUtilization: this.getInitialResourceMetrics(),
            timestamp: Date.now()
        };
    }

    /**
     * Get initial resource metrics
     */
    private getInitialResourceMetrics(): IAgentResourceMetrics {
        return {
            cognitive: {
                memoryAllocation: process.memoryUsage().heapUsed,
                cognitiveLoad: 0.5,
                processingCapacity: 0.8,
                contextUtilization: 0.4
            },
            cpuUsage: 0,
            memoryUsage: process.memoryUsage().heapUsed,
            diskIO: { read: 0, write: 0 },
            networkUsage: { upload: 0, download: 0 },
            timestamp: Date.now()
        };
    }

    /**
     * Get current resource metrics
     */
    private async getCurrentResourceMetrics(): Promise<IAgentResourceMetrics> {
        return {
            ...this.getInitialResourceMetrics(),
            timestamp: Date.now()
        };
    }
}

export default ThinkingManager.getInstance();
