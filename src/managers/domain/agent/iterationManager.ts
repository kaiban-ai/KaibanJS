/**
 * @file iterationManager.ts
 * @path src/managers/domain/agent/iterationManager.ts
 * @description Centralized iteration management with integrated handler functionality
 */

import { performance } from 'perf_hooks';
import { CoreManager } from '../../core/coreManager';
import { MetricsManager } from '../../core/metricsManager';
import { ERROR_KINDS, createError } from '../../../types/common/errorTypes';
import { createBaseMetadata } from '../../../types/common/baseTypes';
import { MANAGER_CATEGORY_enum, AGENT_STATUS_enum } from '../../../types/common/enumTypes';
import { MetricDomain, MetricType } from '../../../types/metrics/base/metricsManagerTypes';
import { createDefaultCostDetails } from '../../../utils/helpers/llm/llmCostCalculator';

// Import types
import type { 
    IIterationStartParams,
    IIterationEndParams,
    IIterationContext,
    IIterationHandlerResult,
    IIterationHandlerMetadata
} from '../../../types/agent/agentIterationTypes';
import type { IAgentType } from '../../../types/agent/agentBaseTypes';
import type { ITaskType } from '../../../types/task/taskBaseTypes';
import type { IAgentMetrics } from '../../../types/agent/agentMetricTypes';

// Operation phase type
type OperationPhase = 'pre-execution' | 'execution' | 'post-execution' | 'error';

/**
 * Manages iteration control and tracking for agent operations
 */
export class IterationManager extends CoreManager {
    private static instance: IterationManager;
    private readonly activeIterations: Map<string, IIterationContext>;
    private readonly iterationTimes: Map<string, number[]>;
    public readonly category = MANAGER_CATEGORY_enum.EXECUTION;
    protected readonly metricsManager: MetricsManager;

    private constructor() {
        super();
        this.activeIterations = new Map();
        this.iterationTimes = new Map();
        this.metricsManager = MetricsManager.getInstance();
        this.registerDomainManager('IterationManager', this);
    }

    public static getInstance(): IterationManager {
        if (!IterationManager.instance) {
            IterationManager.instance = new IterationManager();
        }
        return IterationManager.instance;
    }

    /**
     * Handle start of an iteration
     */
    public async handleIterationStart(
        params: IIterationStartParams
    ): Promise<IIterationHandlerResult<IIterationContext>> {
        const { agent, task, iterations, maxAgentIterations } = params;
        const iterationKey = this.generateIterationKey(agent.id, task.id);
        const startTime = Date.now();

        try {
            // Initialize iteration context
            const context = await this.initializeIterationContext(
                agent.id, 
                iterations,
                maxAgentIterations, 
                startTime
            );

            // Update agent status
            await this.handleStatusTransition({
                entity: 'agent',
                entityId: agent.id,
                currentStatus: agent.status,
                targetStatus: AGENT_STATUS_enum.ITERATION_START,
                context: { iterations, maxAgentIterations, timestamp: startTime }
            });

            // Store context
            this.activeIterations.set(iterationKey, context);

            // Track iteration start
            await this.trackIterationMetric('start', agent.id, iterations, maxAgentIterations);

            // Return success result
            return {
                success: true,
                data: context,
                metadata: await this.createIterationMetadata(agent, task, iterations, maxAgentIterations)
            };
        } catch (error) {
            return this.handleIterationError(error, agent, task, iterations, maxAgentIterations);
        }
    }

    /**
     * Handle end of an iteration
     */
    public async handleIterationEnd(
        params: IIterationEndParams
    ): Promise<IIterationHandlerResult<IIterationContext>> {
        const { agent, task, iterations, maxAgentIterations } = params;
        const iterationKey = this.generateIterationKey(agent.id, task.id);
        const endTime = Date.now();

        try {
            // Get and validate context
            const context = this.getIterationContext(iterationKey);
            
            // Update context
            context.endTime = endTime;
            context.status = 'completed';
            
            // Update timing metrics
            this.updateIterationTiming(iterationKey, context.startTime, endTime);

            // Update agent status
            await this.handleStatusTransition({
                entity: 'agent',
                entityId: agent.id,
                currentStatus: agent.status,
                targetStatus: AGENT_STATUS_enum.ITERATION_END,
                context: { iterations, maxAgentIterations, timestamp: endTime }
            });

            // Update metrics
            await this.trackIterationMetric('end', agent.id, iterations, maxAgentIterations);

            // Cleanup
            this.cleanupIteration(iterationKey);

            // Return success result
            return {
                success: true,
                data: context,
                metadata: await this.createIterationMetadata(agent, task, iterations, maxAgentIterations)
            };
        } catch (error) {
            return this.handleIterationError(error, agent, task, iterations, maxAgentIterations);
        }
    }

    /**
     * Handle max iterations error
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

        try {
            // Get and validate context
            const context = this.getIterationContext(iterationKey);
            
            // Update context
            context.status = 'error';
            context.error = createError({
                message: error.message,
                type: ERROR_KINDS.ExecutionError,
                context: { agentId: agent.id, taskId: task.id, iterations, maxIterations }
            });

            // Update agent status
            await this.handleStatusTransition({
                entity: 'agent',
                entityId: agent.id,
                currentStatus: agent.status,
                targetStatus: AGENT_STATUS_enum.MAX_ITERATIONS_ERROR,
                context: { iterations, maxIterations, error: error.message, timestamp: Date.now() }
            });

            // Track error metrics
            await this.trackIterationMetric('error', agent.id, iterations, maxIterations);

            // Cleanup
            this.cleanupIteration(iterationKey);

            // Return error result
            return {
                success: false,
                data: context,
                error: context.error,
                metadata: await this.createIterationMetadata(agent, task, iterations, maxIterations)
            };
        } catch (innerError) {
            return this.handleIterationError(innerError, agent, task, iterations, maxIterations);
        }
    }

    // ─── Private Helper Methods ────────────────────────────────────────────────────

    /**
     * Initialize iteration context
     */
    private async initializeIterationContext(
        agentId: string,
        iterations: number,
        maxIterations: number,
        startTime: number
    ): Promise<IIterationContext> {
        const metrics = await this.metricsManager.get({
            domain: MetricDomain.AGENT,
            timeRange: 'hour',
            metadata: { agentId }
        });

        return {
            startTime,
            iterations: iterations + 1,
            maxIterations,
            lastUpdateTime: startTime,
            status: 'running',
            performance: metrics.data?.performance || {},
            resources: metrics.data?.resources || {},
            usage: metrics.data?.usage || {},
            costs: createDefaultCostDetails('USD')
        };
    }

    /**
     * Track iteration metrics
     */
    private async trackIterationMetric(
        phase: 'start' | 'end' | 'error',
        agentId: string,
        iterations: number,
        maxIterations: number
    ): Promise<void> {
        await this.metricsManager.trackMetric({
            domain: MetricDomain.AGENT,
            type: MetricType.PERFORMANCE,
            value: iterations,
            timestamp: Date.now(),
            metadata: {
                phase,
                agentId,
                iterations,
                maxIterations,
                component: this.constructor.name
            }
        });
    }

    /**
     * Update iteration timing
     */
    private updateIterationTiming(
        iterationKey: string,
        startTime: number,
        endTime: number
    ): void {
        const times = this.iterationTimes.get(iterationKey) || [];
        times.push(endTime - startTime);
        this.iterationTimes.set(iterationKey, times);
    }

    /**
     * Generate iteration key
     */
    private generateIterationKey(agentId: string, taskId: string): string {
        return `${agentId}-${taskId}`;
    }

    /**
     * Get iteration context
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
     * Clean up iteration
     */
    private cleanupIteration(key: string): void {
        this.activeIterations.delete(key);
        this.iterationTimes.delete(key);
    }

    /**
     * Create iteration metadata
     */
    private async createIterationMetadata(
        agent: IAgentType,
        task: ITaskType,
        iterations: number,
        maxIterations: number
    ): Promise<IIterationHandlerMetadata> {
        const metrics = await this.metricsManager.get({
            domain: MetricDomain.AGENT,
            timeRange: 'hour',
            metadata: { agentId: agent.id }
        });

        return {
            ...createBaseMetadata(this.constructor.name, 'iteration'),
            iteration: {
                current: iterations,
                max: maxIterations,
                status: 'running',
                performance: metrics.data?.performance || {},
                context: {
                    startTime: Date.now(),
                    totalTokens: 0,
                    confidence: 0,
                    reasoningChain: []
                },
                resources: metrics.data?.resources || {},
                usage: metrics.data?.usage || {},
                costs: createDefaultCostDetails('USD')
            },
            agent: {
                id: agent.id,
                name: agent.name,
                role: agent.role,
                status: agent.status,
                metrics: { iterations: 0, executionTime: 0 }
            },
            task: {
                id: task.id,
                title: task.title,
                metrics: { iterations: 0, executionTime: 0 }
            }
        };
    }

    /**
     * Handle iteration error
     */
    private async handleIterationError(
        error: unknown,
        agent: IAgentType,
        task: ITaskType,
        iterations: number,
        maxIterations: number
    ): Promise<IIterationHandlerResult<IIterationContext>> {
        const formattedError = createError({
            message: error instanceof Error ? error.message : String(error),
            type: ERROR_KINDS.ExecutionError,
            context: { agentId: agent.id, taskId: task.id, iterations, maxIterations }
        });

        this.logError(
            `Iteration error: ${formattedError.message}`,
            formattedError,
            { agentId: agent.id, taskId: task.id }
        );

        return {
            success: false,
            error: formattedError,
            metadata: await this.createIterationMetadata(agent, task, iterations, maxIterations)
        };
    }
}

export default IterationManager.getInstance();