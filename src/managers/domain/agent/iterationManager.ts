/**
 * @file iterationManager.ts
 * @path src/managers/domain/agent/iterationManager.ts
 * @description Centralized iteration management with integrated handler functionality
 */

import CoreManager from '../../core/coreManager';
import { createError, toErrorType } from '../../../types/common/commonErrorTypes';
import { MetadataFactory } from '../../../utils/factories/metadataFactory';
import { createBaseMetadata } from '../../../types/common/commonMetadataTypes';
import { AGENT_STATUS_enum } from '../../../types/common/commonEnums';
import { performance } from 'perf_hooks';
import AgentMetricsManager from './agentMetricsManager';

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
    IParsedOutput,
    ILLMUsageStats
} from '../../../types/llm/llmResponseTypes';

import type {
    IAgentResourceMetrics,
    IAgentPerformanceMetrics,
    IAgentUsageMetrics
} from '../../../types/agent/agentMetricTypes';

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
    private readonly iterationTimes: Map<string, number[]> = new Map();
    private metricsManager: typeof AgentMetricsManager;

    private constructor() {
        super();
        this.activeIterations = new Map();
        this.metricsManager = AgentMetricsManager;
        this.registerDomainManager('IterationManager', this);
    }

    public static getInstance(): IterationManager {
        if (!IterationManager.instance) {
            IterationManager.instance = new IterationManager();
        }
        return IterationManager.instance;
    }

    /**
     * Handle iteration operations with standardized pattern
     */
    protected async handleIterationOperation<T>(
        operation: () => Promise<T>,
        agent: IAgentType,
        task: ITaskType,
        metadata: IIterationHandlerMetadata
    ): Promise<IIterationHandlerResult<T>> {
        const startTime = Date.now();
        const currentMetrics = await this.metricsManager.getCurrentMetrics();
        
        const operationContext: OperationContext = {
            operation: 'handleIterationOperation',
            phase: 'pre-execution',
            startTime,
            resourceMetrics: currentMetrics.resources,
            performanceMetrics: currentMetrics.performance
        };

        try {
            // Pre-execution validation
            const validationResult = await this.validateIteration(agent, task);
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
            const executionMetrics = await this.metricsManager.getCurrentMetrics();
            operationContext.resourceMetrics = executionMetrics.resources;

            // Execute operation
            const result = await operation();

            // Update metrics for post-execution
            operationContext.phase = 'post-execution';
            const postMetrics = await this.metricsManager.getCurrentMetrics();
            operationContext.resourceMetrics = postMetrics.resources;
            
            const executionTime = Date.now() - startTime;

            // Update metadata with final metrics
            metadata.iteration.performance = postMetrics.performance;
            metadata.iteration.resources = postMetrics.resources;
            metadata.iteration.usage = postMetrics.usage;

            return {
                success: true,
                data: result,
                metadata
            };

        } catch (error) {
            const actualError = error instanceof Error ? error : new Error(String(error));
            
            operationContext.phase = 'error';
            const errorMetrics = await this.metricsManager.getCurrentMetrics();
            operationContext.resourceMetrics = errorMetrics.resources;
            operationContext.errorContext = {
                error: actualError,
                recoverable: true,
                retryCount: metadata.iteration.current,
                lastRetryTimestamp: Date.now(),
                failureReason: actualError.message
            };

            await this.handleIterationError(agent, task, actualError, operationContext);
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
     * Check iteration control conditions
     */
    public async checkIterationControl(params: {
        agent: IAgentType;
        task: ITaskType;
        iterations: number;
        maxIterations: number;
        parsedOutput: IParsedOutput | null;
    }): Promise<IIterationHandlerResult<IIterationControl>> {
        const { agent, task, iterations, maxIterations, parsedOutput } = params;
        const iterationKey = this.generateIterationKey(agent.id, task.id);
        const metadata = await this.createIterationMetadata(agent, task, iterations, maxIterations);

        return this.handleIterationOperation(
            async () => {
                const context = this.getIterationContext(iterationKey);

                // Check for final answer
                if (parsedOutput?.finalAnswer) {
                    await this.handleIterationEnd({
                        agent, 
                        task, 
                        iterations, 
                        maxAgentIterations: maxIterations
                    });
                    return { shouldContinue: false };
                }

                // Check max iterations
                if (iterations >= maxIterations) {
                    const error = new Error(`Maximum iterations [${maxIterations}] reached without final answer`);
                    await this.handleMaxIterationsError({
                        agent,
                        task,
                        iterations,
                        maxIterations,
                        error
                    });
                    return { shouldContinue: false };
                }

                // Force final answer when approaching max iterations
                if (iterations === maxIterations - 2) {
                    const feedback = agent.promptTemplates.FORCE_FINAL_ANSWER_FEEDBACK({
                        agent,
                        task,
                        iterations,
                        maxAgentIterations: maxIterations
                    });

                    return { 
                        shouldContinue: true, 
                        feedbackMessage: feedback,
                        metrics: {
                            confidence: parsedOutput?.metadata?.confidence || 0,
                            progress: (iterations / maxIterations) * 100,
                            remainingIterations: maxIterations - iterations
                        }
                    };
                }

                // Update context and continue
                const currentMetrics = await this.metricsManager.getCurrentMetrics();
                context.iterations = iterations;
                context.lastUpdateTime = Date.now();
                context.performance = currentMetrics.performance;
                context.resources = currentMetrics.resources;
                context.usage = currentMetrics.usage;
                this.activeIterations.set(iterationKey, context);

                return { 
                    shouldContinue: true,
                    metrics: {
                        confidence: parsedOutput?.metadata?.confidence || 0,
                        progress: (iterations / maxIterations) * 100,
                        remainingIterations: maxIterations - iterations
                    }
                };
            },
            agent,
            task,
            metadata
        );
    }

    /**
     * Handle iteration start
     */
    public async handleIterationStart(params: IIterationStartParams): Promise<IIterationHandlerResult<IIterationContext>> {
        const { agent, task, iterations, maxAgentIterations } = params;
        const iterationKey = this.generateIterationKey(agent.id, task.id);
        const metadata = await this.createIterationMetadata(agent, task, iterations, maxAgentIterations);

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
                const currentMetrics = await this.metricsManager.getCurrentMetrics();
                const context: IIterationContext = {
                    startTime,
                    iterations,
                    maxIterations: maxAgentIterations,
                    lastUpdateTime: startTime,
                    status: 'running',
                    performance: currentMetrics.performance,
                    resources: currentMetrics.resources,
                    usage: currentMetrics.usage,
                    costs: MetadataFactory.createCostDetails()
                };

                this.activeIterations.set(iterationKey, context);
                this.iterationTimes.set(iterationKey, []);

                this.logManager.info(`Starting iteration ${iterations + 1}/${maxAgentIterations} for agent ${agent.name}`);

                return context;
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
                const currentMetrics = await this.metricsManager.getCurrentMetrics();
                context.performance = currentMetrics.performance;
                context.resources = currentMetrics.resources;
                context.usage = currentMetrics.usage;

                this.logManager.info(`Completed iteration ${iterations + 1}/${maxAgentIterations} for agent ${agent.name}`);

                const result = context;
                this.cleanupIteration(iterationKey);

                return result;
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
                const currentMetrics = await this.metricsManager.getCurrentMetrics();
                currentMetrics.performance.errorMetrics.totalErrors++;
                currentMetrics.performance.errorMetrics.errorRate = 
                    currentMetrics.performance.errorMetrics.totalErrors / context.iterations;
                
                context.performance = currentMetrics.performance;
                context.resources = currentMetrics.resources;
                context.usage = currentMetrics.usage;

                const result = context;
                this.cleanupIteration(iterationKey);

                return result;
            },
            agent,
            task,
            metadata
        );
    }

    // ─── Private Helper Methods ───────────────────────────────────────────────

    /**
     * Create iteration metadata
     */
    private async createIterationMetadata(
        agent: IAgentType,
        task: ITaskType,
        iterations: number,
        maxIterations: number
    ): Promise<IIterationHandlerMetadata> {
        const currentMetrics = await this.metricsManager.getCurrentMetrics();
        const defaultLLMStats = MetadataFactory.createDefaultLLMStats();

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
                costs: MetadataFactory.createCostDetails()
            },
            agent: {
                id: agent.id,
                name: agent.name,
                metrics: {
                    iterations: 0,
                    executionTime: 0,
                    llmUsageStats: defaultLLMStats,
                    performance: currentMetrics.performance
                }
            },
            task: {
                id: task.id,
                title: task.title,
                metrics: {
                    iterations: 0,
                    executionTime: 0,
                    llmUsageStats: defaultLLMStats,
                    performance: currentMetrics.performance
                }
            }
        };
    }

    private async validateIteration(agent: IAgentType, task: ITaskType): Promise<{ 
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

    private async handleIterationError(
        agent: IAgentType,
        task: ITaskType,
        error: Error,
        context: OperationContext
    ): Promise<void> {
        await this.handleStatusTransition({
            entity: 'agent',
            entityId: agent.id,
            currentStatus: agent.status,
            targetStatus: AGENT_STATUS_enum.ITERATION_COMPLETE,
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
            `Iteration error: ${error.message}`,
            agent.name,
            task.id,
            'error',
            error
        );
    }

    private generateIterationKey(agentId: string, taskId: string): string {
        return `${agentId}:${taskId}`;
    }

    private getIterationContext(iterationKey: string): IIterationContext {
        const context = this.activeIterations.get(iterationKey);
        if (!context) {
            throw new Error(`No active iteration found for key: ${iterationKey}`);
        }
        return context;
    }

    private cleanupIteration(iterationKey: string): void {
        const context = this.activeIterations.get(iterationKey);
        if (context) {
            context.endTime = context.endTime || Date.now();
            this.activeIterations.delete(iterationKey);
            this.iterationTimes.delete(iterationKey);
        }
    }
}

export default IterationManager.getInstance();
