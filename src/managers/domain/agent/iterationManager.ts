/**
 * @file iterationManager.ts
 * @path src/managers/domain/agent/iterationManager.ts
 * @description Centralized iteration management with integrated handler functionality
 */

import { CoreManager } from '../../core/coreManager';
import { ERROR_KINDS, createError, toErrorType } from '../../../types/common/commonErrorTypes';
import { MetadataFactory } from '../../../utils/factories/metadataFactory';
import { createBaseMetadata } from '../../../types/common/commonMetadataTypes';
import { AGENT_STATUS_enum } from '../../../types/common/commonEnums';
import { performance } from 'perf_hooks';
import AgentMetricsManager from './agentMetricsManager';
import { LLMResult } from '@langchain/core/outputs';
import { createDefaultCostDetails } from '../../../utils/helpers/llm/llmCostCalculator';
import { MetricsManager } from '../../core/metricsManager';

// Import types from canonical locations
import type { 
    IIterationStartParams,
    IIterationEndParams,
    IIterationContext,
    IIterationControl,
    IIterationHandlerResult,
    IIterationHandlerMetadata,
    IIterationTypeGuards
} from '../../../types/agent/agentIterationTypes';

import type { 
    IAgentType
} from '../../../types/agent/agentBaseTypes';

import type { 
    ITaskType 
} from '../../../types/task/taskBaseTypes';

import type {
    IAgentResourceMetrics,
    IAgentPerformanceMetrics,
    IAgentUsageMetrics
} from '../../../types/agent/agentMetricTypes';

import type { ILLMUsageMetrics } from '../../../types/llm/llmMetricTypes';
import type { IStandardCostDetails } from '../../../types/common/commonMetricTypes';

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
 * Manages iteration control and tracking for agent operations
 */
export class IterationManager extends CoreManager {
    private static instance: IterationManager;
    private readonly activeIterations: Map<string, IIterationContext>;
    private readonly iterationTimes: Map<string, number[]>;
    private readonly metricsManager: typeof AgentMetricsManager;
    private readonly coreMetricsManager: MetricsManager;

    private constructor() {
        super();
        this.activeIterations = new Map();
        this.iterationTimes = new Map();
        this.metricsManager = AgentMetricsManager;
        this.coreMetricsManager = MetricsManager.getInstance();
        this.registerDomainManager('IterationManager', this);
    }

    public static getInstance(): IterationManager {
        if (!IterationManager.instance) {
            IterationManager.instance = new IterationManager();
        }
        return IterationManager.instance;
    }

    /**
     * Handle iteration start
     */
    public async handleIterationStart(params: IIterationStartParams): Promise<IIterationHandlerResult<IIterationContext>> {
        const { agent, task, iterations, maxAgentIterations } = params;
        const iterationKey = this.generateIterationKey(agent.id, task.id);
        const metadata = await this.createIterationMetadata(agent, task, iterations, maxAgentIterations);
        const defaultCosts = createDefaultCostDetails('USD');

        return this.handleIterationOperation(
            async () => {
                await this.handleStatusTransition({
                    entity: 'agent',
                    entityId: agent.id,
                    currentStatus: agent.status,
                    targetStatus: AGENT_STATUS_enum.ITERATION_START,
                    context: {
                        iterations,
                        maxAgentIterations,
                        timestamp: Date.now()
                    }
                });

                const startTime = Date.now();
                const currentMetrics = await this.metricsManager.getCurrentMetrics(agent.id);

                // Create iteration context focused on state and metrics
                const context: IIterationContext = {
                    startTime,
                    iterations: iterations + 1,
                    maxIterations: maxAgentIterations,
                    lastUpdateTime: startTime,
                    status: 'running',
                    performance: currentMetrics.performance,
                    resources: currentMetrics.resources,
                    usage: currentMetrics.usage,
                    costs: defaultCosts
                };

                // Store the iteration context with its key
                this.activeIterations.set(iterationKey, context);

                this.log(
                    `Starting iteration ${iterations + 1}/${maxAgentIterations} for agent ${agent.name}`,
                    'IterationManager',
                    'handleIterationStart'
                );

                return {
                    success: true,
                    data: context,
                    metadata
                };
            },
            agent,
            task,
            metadata
        );
    }

    /**
     * Handle iteration end
     */
    public async handleIterationEnd(params: IIterationEndParams): Promise<IIterationHandlerResult<IIterationContext>> {
        const { agent, task, iterations, maxAgentIterations } = params;
        const iterationKey = this.generateIterationKey(agent.id, task.id);
        const metadata = await this.createIterationMetadata(agent, task, iterations, maxAgentIterations);

        return this.handleIterationOperation(
            async () => {
                await this.handleStatusTransition({
                    entity: 'agent',
                    entityId: agent.id,
                    currentStatus: agent.status,
                    targetStatus: AGENT_STATUS_enum.ITERATION_END,
                    context: {
                        iterations,
                        maxAgentIterations,
                        timestamp: Date.now()
                    }
                });

                const context = this.getIterationContext(iterationKey);
                const endTime = Date.now();
                context.endTime = endTime;
                context.status = 'completed';

                // Update iteration times
                const times = this.iterationTimes.get(iterationKey) || [];
                times.push(endTime - context.startTime);
                this.iterationTimes.set(iterationKey, times);

                // Update metrics
                const currentMetrics = await this.metricsManager.getCurrentMetrics(agent.id);
                context.performance = currentMetrics.performance;
                context.resources = currentMetrics.resources;
                context.usage = currentMetrics.usage;

                this.log(
                    `Completed iteration ${iterations + 1}/${maxAgentIterations} for agent ${agent.name}`,
                    'IterationManager',
                    'handleIterationEnd'
                );

                const result = context;
                this.cleanupIteration(iterationKey);

                return {
                    success: true,
                    data: result,
                    metadata
                };
            },
            agent,
            task,
            metadata
        );
    }

    /**
     * Handle maximum iterations error
     */
    public async handleMaxIterationsError(params: {
        agent: IAgentType;
        task: ITaskType;
        iterations: number;
        maxIterations: number;
        error: Error;
    }): Promise<IIterationHandlerResult<IIterationContext>> {
        const { agent, task, iterations, maxIterations, error } = params;
        const iterationKey = this.generateIterationKey(agent.id, task.id);
        const metadata = await this.createIterationMetadata(agent, task, iterations, maxIterations);

        return this.handleIterationOperation(
            async () => {
                await this.handleStatusTransition({
                    entity: 'agent',
                    entityId: agent.id,
                    currentStatus: agent.status,
                    targetStatus: AGENT_STATUS_enum.MAX_ITERATIONS_ERROR,
                    context: {
                        iterations,
                        maxIterations,
                        error: error.message,
                        timestamp: Date.now()
                    }
                });

                const context = this.getIterationContext(iterationKey);
                context.status = 'error';
                context.error = toErrorType(error);

                // Update metrics with error
                const currentMetrics = await this.metricsManager.getCurrentMetrics(agent.id);
                currentMetrics.performance.errorMetrics.totalErrors++;
                currentMetrics.performance.errorMetrics.errorRate = 
                    currentMetrics.performance.errorMetrics.totalErrors / context.iterations;
                
                context.performance = currentMetrics.performance;
                context.resources = currentMetrics.resources;
                context.usage = currentMetrics.usage;

                const result = context;
                this.cleanupIteration(iterationKey);

                return {
                    success: false,
                    data: result,
                    metadata,
                    error: toErrorType(error)
                };
            },
            agent,
            task,
            metadata
        );
    }

    /**
     * Generate a unique key for iteration tracking
     */
    private generateIterationKey(agentId: string, taskId: string): string {
        return `${agentId}-${taskId}`;
    }

    /**
     * Get iteration context by key
     */
    private getIterationContext(key: string): IIterationContext {
        const context = this.activeIterations.get(key);
        if (!context) {
            throw createError({
                message: `No active iteration found for key: ${key}`,
                type: ERROR_KINDS.StateError,
                context: { key }
            });
        }
        return context;
    }

    /**
     * Clean up iteration resources
     */
    private cleanupIteration(key: string): void {
        this.activeIterations.delete(key);
        this.iterationTimes.delete(key);
    }

    /**
     * Handle iteration operation with error handling
     */
    private async handleIterationOperation<T>(
        operation: () => Promise<T>,
        agent: IAgentType,
        task: ITaskType,
        metadata: IIterationHandlerMetadata
    ): Promise<T> {
        const defaultContext = this.coreMetricsManager.createIterationContext();
        const context: OperationContext = {
            operation: 'handleIteration',
            phase: 'pre-execution',
            startTime: performance.now(),
            resourceMetrics: defaultContext.resources,
            performanceMetrics: defaultContext.performance,
        };

        try {
            context.phase = 'execution';
            const result = await operation();
            context.phase = 'post-execution';
            return result;
        } catch (error) {
            context.phase = 'error';
            context.errorContext = error;
            await this.handleIterationError(agent, task, error as Error, context);
            throw error;
        }
    }

    /**
     * Create iteration metadata with proper LLM metrics
     */
    private async createIterationMetadata(
        agent: IAgentType,
        task: ITaskType,
        iterations: number,
        maxIterations: number
    ): Promise<IIterationHandlerMetadata> {
        const currentMetrics = await this.metricsManager.getCurrentMetrics(agent.id);
        const defaultCosts = createDefaultCostDetails('USD');
        
        // Create base result for metrics initialization
        const baseResult = MetadataFactory.createSuccessResult({});
        const { metrics: baseMetrics } = baseResult.metadata.details;

        // Create LLM usage metrics with all required properties
        const llmUsageMetrics: ILLMUsageMetrics = {
            // Base metrics from IUsageMetrics
            totalRequests: currentMetrics.usage.totalRequests,
            activeUsers: currentMetrics.usage.activeUsers,
            requestsPerSecond: currentMetrics.usage.requestsPerSecond,
            averageResponseSize: currentMetrics.usage.averageResponseSize,
            peakMemoryUsage: currentMetrics.usage.peakMemoryUsage,
            uptime: currentMetrics.usage.uptime,
            rateLimit: currentMetrics.usage.rateLimit,
            timestamp: currentMetrics.usage.timestamp,
            // Additional LLM-specific metrics
            activeInstances: 1,
            averageResponseLength: 0,
            tokenDistribution: {
                prompt: 0,
                completion: 0,
                total: 0
            },
            modelDistribution: {
                gpt4: 0,
                gpt35: 0,
                other: 1
            }
        };

        return {
            ...createBaseMetadata('IterationManager', 'handleIteration'),
            iteration: {
                current: iterations,
                max: maxIterations,
                status: 'running',
                performance: currentMetrics.performance,
                context: {
                    startTime: Date.now(),
                    totalTokens: 0,
                    confidence: 0,
                    reasoningChain: []
                },
                resources: currentMetrics.resources,
                usage: currentMetrics.usage,
                costs: defaultCosts
            },
            agent: {
                id: agent.id,
                name: agent.name,
                metrics: {
                    iterations: 0,
                    executionTime: 0,
                    llmUsageMetrics,
                    performance: currentMetrics.performance
                }
            },
            task: {
                id: task.id,
                title: task.title,
                metrics: {
                    iterations: 0,
                    executionTime: 0,
                    llmUsageMetrics,
                    performance: currentMetrics.performance
                }
            }
        };
    }

    /**
     * Handle iteration error
     */
    private async handleIterationError(
        agent: IAgentType,
        task: ITaskType,
        error: Error,
        context: OperationContext
    ): Promise<void> {
        const errorMetadata = MetadataFactory.createErrorMetadata(error);

        await this.handleStatusTransition({
            entity: 'agent',
            entityId: agent.id,
            currentStatus: agent.status,
            targetStatus: AGENT_STATUS_enum.ITERATION_COMPLETE,
            context: {
                agentId: agent.id,
                taskId: task.id,
                error: errorMetadata,
                operation: context.operation,
                phase: context.phase,
                startTime: context.startTime,
                resourceMetrics: context.resourceMetrics,
                performanceMetrics: context.performanceMetrics
            }
        });

        this.log(
            `Iteration error: ${error.message}`,
            agent.name,
            task.id,
            'error',
            error
        );
    }
}

export default IterationManager.getInstance();
