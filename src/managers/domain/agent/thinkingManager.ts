/**
 * @file thinkingManager.ts 
 * @path KaibanJS/src/managers/domain/agent/thinkingManager.ts
 * @description Centralized manager for agent thinking processes and LLM interactions
 */

import CoreManager from '../../core/coreManager';
import { createError, toErrorType } from '../../../types/common/commonErrorTypes';
import { createBaseMetadata } from '../../../types/common/commonMetadataTypes';

// Import types from canonical locations
import type { IAgentType } from '../../../types/agent/agentBaseTypes';
import type { ITaskType } from '../../../types/task/taskBaseTypes';
import type { IOutput, IParsedOutput, ILLMUsageStats } from '../../../types/llm/llmResponseTypes';
import type { IHandlerResult } from '../../../types/common/commonHandlerTypes';
import type { IBaseHandlerMetadata } from '../../../types/common/commonMetadataTypes';
import type { IStandardCostDetails } from '../../../types/common/commonMetricTypes';
import type { ITimeMetrics, IThroughputMetrics, IErrorMetrics } from '../../../types/metrics';
import {
    IAgentUsageMetrics,
    IAgentResourceMetrics,
    IAgentPerformanceMetrics,
    AgentMetricsTypeGuards,
    AgentMetricsValidation
} from '../../../types/agent/agentMetricTypes';
import { AGENT_STATUS_enum } from '../../../types/common/commonEnums';

// Import thinking-specific types from canonical location
import type {
    IThinkingMetadata,
    IThinkingExecutionParams,
    IThinkingResult,
    IThinkingHandlerResult
} from '../../../types/agent/agentHandlersTypes';

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
export class ThinkingManager extends CoreManager {
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
     * Execute thinking iteration with standardized handling
     */
    public async executeThinking(params: IThinkingExecutionParams): Promise<IThinkingHandlerResult<IThinkingResult>> {
        const { task, ExecutableAgent, feedbackMessage } = params;
        const agent = task.agent;

        // Create base metadata
        const baseMetadata = createBaseMetadata('ThinkingManager', 'executeThinking');
        const performanceMetrics = this.createPerformanceMetrics(agent.id, 0);
        const resourceMetrics = this.getInitialResourceMetrics();

        // Create agent-specific usage metrics
        const usageMetrics: IAgentUsageMetrics = {
            state: {
                currentState: 'thinking',
                stateTime: 0,
                transitionCount: 0,
                failedTransitions: 0
            },
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

        // Validate usage metrics
        const validationResult = AgentMetricsValidation.validateAgentUsageMetrics(usageMetrics);
        if (!validationResult.isValid) {
            this.log(
                `Agent usage metrics validation failed: ${validationResult.errors.join(', ')}`,
                agent.name,
                task.id,
                'error'
            );
        }

        // Create thinking-specific metadata
        const metadata: IThinkingMetadata = {
            ...baseMetadata,
            thinking: {
                messageCount: 0,
                processingTime: 0,
                llmStats: this.createDefaultLLMStats(),
                context: {
                    iteration: 0,
                    totalTokens: 0,
                    confidence: 0,
                    reasoningChain: []
                },
                performance: performanceMetrics,
                resources: resourceMetrics,
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
                    llmUsageStats: this.createDefaultLLMStats()
                }
            },
            task: {
                id: task.id,
                title: task.title,
                metrics: {
                    iterations: 0,
                    executionTime: 0,
                    llmUsageStats: this.createDefaultLLMStats()
                }
            },
            llm: {
                model: agent.llmConfig?.model || 'unknown',
                provider: agent.llmConfig?.provider || 'unknown',
                requestId: `req_${Date.now()}`,
                usageStats: this.createDefaultLLMStats()
            }
        };

        return this.handleThinkingOperation(
            async () => {
                // Execute the thinking process through the LLM
                const result = await ExecutableAgent.invoke(
                    { messages: [], feedbackMessage },
                    { 
                        timeout: 60000,
                        metadata: { taskId: task.id },
                        tags: ['thinking']
                    }
                );

                // Extract and process result data
                const { llmOutput, llmUsageStats } = this.extractResultData(result);
                const parsedLLMOutput = await this.parseThinkingOutput(llmOutput);
                
                if (!parsedLLMOutput) {
                    throw new Error('Failed to parse LLM output');
                }

                // Update metadata with LLM stats
                metadata.thinking.llmStats = llmUsageStats;
                metadata.thinking.context.totalTokens = llmUsageStats.inputTokens + llmUsageStats.outputTokens;
                metadata.thinking.context.confidence = parsedLLMOutput.metadata?.confidence || 0;
                metadata.llm.usageStats = llmUsageStats;

                return {
                    parsedLLMOutput,
                    llmOutput,
                    llmUsageStats,
                    messages: result.messages,
                    output: result.output
                };
            },
            agent,
            task,
            metadata
        );
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
     * Extract LLM result data
     */
    private extractResultData(result: any): {
        llmOutput: string;
        llmUsageStats: ILLMUsageStats;
    } {
        return {
            llmOutput: result.output || '',
            llmUsageStats: result.llmUsageStats || this.createDefaultLLMStats()
        };
    }

    /**
     * Parse thinking output
     */
    private async parseThinkingOutput(content: string): Promise<IParsedOutput | null> {
        try {
            const parsed = JSON.parse(content);
            return {
                thought: parsed.thought,
                action: parsed.action,
                actionInput: parsed.actionInput,
                observation: parsed.observation,
                isFinalAnswerReady: parsed.isFinalAnswerReady,
                finalAnswer: parsed.finalAnswer,
                metadata: {
                    reasoning: parsed.reasoning,
                    confidence: parsed.confidence,
                    alternativeActions: parsed.alternativeActions
                }
            };
        } catch (error) {
            this.log('Error parsing thinking output:', undefined, undefined, 'error', error as Error);
            return null;
        }
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

    /**
     * Create default LLM stats
     */
    private createDefaultLLMStats(): ILLMUsageStats {
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

export default ThinkingManager.getInstance();
