/**
 * @file agentMetricsManager.ts
 * @description Agent domain metrics management that leverages the centralized metrics system
 */

import { CoreManager } from '../../core/coreManager';
import { MANAGER_CATEGORY_enum } from '../../../types/common/enumTypes';
import { ERROR_KINDS, createError } from '../../../types/common/errorTypes';
import { createBaseMetadata } from '../../../types/common/baseTypes';
import { 
    MetricDomain, 
    MetricType
} from '../../../types/metrics/base/metricTypes';
import { IAgentMetrics, IMetricsHandlerResult } from '../../../types/metrics/agent/agentMetricsTypes';
import { MetricsCollector } from '../../core/metrics/MetricsCollector';
import { MetricsBenchmark } from '../../core/metrics/MetricsBenchmark';

import type { IAgentType } from '../../../types/agent/agentBaseTypes';
import type { ITaskType } from '../../../types/task/taskBaseTypes';
import type { IBaseManager } from '../../../types/agent/agentManagerTypes';

export class AgentMetricsManager extends CoreManager {
    private static instance: AgentMetricsManager;
    public readonly category = MANAGER_CATEGORY_enum.METRICS;

    private constructor() {
        super();
        this.registerDomainManager('AgentMetricsManager', this);
    }

    public static getInstance(): AgentMetricsManager {
        if (!AgentMetricsManager.instance) {
            AgentMetricsManager.instance = new AgentMetricsManager();
        }
        return AgentMetricsManager.instance;
    }

    /**
     * Record agent metrics
     */
    public async record(metrics: IAgentMetrics): Promise<void> {
        try {
            const metricsCollector = new MetricsCollector();

            // Track performance metrics
            await this.trackPerformanceMetrics(metrics, metricsCollector);
            
            // Track resource usage
            await this.trackResourceMetrics(metrics, metricsCollector);

            // Track agent state
            await this.trackStateMetrics(metrics, metricsCollector);

        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            throw createError({
                message: 'Failed to record agent metrics',
                type: ERROR_KINDS.ExecutionError,
                context: { metrics, error: err }
            });
        }
    }

    /**
     * Get agent metrics
     */
    public async get(): Promise<IMetricsHandlerResult<IAgentMetrics>> {
        try {
            const metricsCollector = new MetricsCollector();
            return await metricsCollector.getMetrics({
                timeRange: 'hour',
                domain: MetricDomain.AGENT,
                type: MetricType.PERFORMANCE
            });
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            throw createError({
                message: 'Failed to get agent metrics',
                type: ERROR_KINDS.ExecutionError,
                context: { error: err }
            });
        }
    }

    /**
     * Track agent execution metrics
     */
    public async trackAgentExecution(
        agent: IAgentType,
        task: ITaskType,
        duration: number
    ): Promise<void> {
        try {
            const metricsCollector = new MetricsCollector();

            await metricsCollector.trackMetric({
                timestamp: Date.now(),
                domain: MetricDomain.AGENT,
                type: MetricType.PERFORMANCE,
                value: duration,
                metadata: {
                    agentId: agent.id,
                    taskId: task.id,
                    status: agent.status,
                    operation: 'execution'
                }
            });
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            throw createError({
                message: 'Failed to track agent execution',
                type: ERROR_KINDS.ExecutionError,
                context: { agent, task, duration, error: err }
            });
        }
    }

    private async trackPerformanceMetrics(
        metrics: IAgentMetrics,
        metricsCollector: MetricsCollector
    ): Promise<void> {
        await metricsCollector.trackMetric({
            timestamp: Date.now(),
            domain: MetricDomain.AGENT,
            type: MetricType.PERFORMANCE,
            value: metrics.performance.duration,
            metadata: {
                responseTime: metrics.performance.responseTime,
                throughput: metrics.performance.throughput,
                operation: 'performance'
            }
        });
    }

    private async trackResourceMetrics(
        metrics: IAgentMetrics,
        metricsCollector: MetricsCollector
    ): Promise<void> {
        await metricsCollector.trackMetric({
            timestamp: Date.now(),
            domain: MetricDomain.AGENT,
            type: MetricType.RESOURCE,
            value: metrics.resources.usage,
            metadata: {
                cpuUsage: metrics.resources.cpuUsage,
                memoryUsage: metrics.resources.memoryUsage,
                diskIO: metrics.resources.diskIO,
                networkUsage: metrics.resources.networkUsage,
                operation: 'resources'
            }
        });
    }

    private async trackStateMetrics(
        metrics: IAgentMetrics,
        metricsCollector: MetricsCollector
    ): Promise<void> {
        await metricsCollector.trackMetric({
            timestamp: Date.now(),
            domain: MetricDomain.AGENT,
            type: MetricType.STATE,
            value: metrics.usage.state.transitionCount,
            metadata: {
                currentState: metrics.usage.state.currentState,
                stateTime: metrics.usage.state.stateTime,
                taskStats: metrics.usage.state.taskStats,
                operation: 'state'
            }
        });
    }

    /**
     * Track agent benchmark metrics
     */
    public async trackBenchmark(
        name: string,
        duration: number
    ): Promise<void> {
        try {
            const metricsCollector = new MetricsCollector();
            const benchmarkManager = this.getDomainManager<MetricsBenchmark>('MetricsBenchmark');

            await metricsCollector.trackMetric({
                timestamp: Date.now(),
                domain: MetricDomain.AGENT,
                type: MetricType.PERFORMANCE,
                value: duration,
                metadata: {
                    benchmarkName: name,
                    operation: 'benchmark'
                }
            });

            benchmarkManager.end(name);
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            throw createError({
                message: 'Failed to track agent benchmark',
                type: ERROR_KINDS.ExecutionError,
                context: { name, duration, error: err }
            });
        }
    }
}

export default AgentMetricsManager.getInstance();
