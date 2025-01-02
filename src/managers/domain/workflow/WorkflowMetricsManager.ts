/**
 * @file WorkflowMetricsManager.ts
 * @description Workflow-specific metrics management
 */

import { CoreManager } from '../../core/coreManager';
import { MetricsManager } from '../../core/metricsManager';
import { WorkflowMetricsValidation } from '../../../types/workflow/workflowMetricTypes';
import { MetricDomain, MetricType } from '../../../types/metrics/base/metricsManagerTypes';
import { ERROR_KINDS, createError } from '../../../types/common/errorTypes';
import { MANAGER_CATEGORY_enum } from '../../../types/common/enumTypes';

import type { 
    IWorkflowResourceMetrics,
    IWorkflowPerformanceMetrics,
    IWorkflowUsageMetrics
} from '../../../types/workflow/workflowMetricTypes';
import type { IStepConfig, IStepResult } from '../../../types/workflow/workflowStateTypes';

export interface IWorkflowMetrics {
    resource: IWorkflowResourceMetrics;
    performance: IWorkflowPerformanceMetrics;
    usage: IWorkflowUsageMetrics;
}

export class WorkflowMetricsManager extends CoreManager {
    private static instance: WorkflowMetricsManager | null = null;
    private readonly coreMetricsManager: MetricsManager;
    private workflowMetrics: Map<string, IWorkflowMetrics>;

    public readonly category = MANAGER_CATEGORY_enum.METRICS;

    private constructor() {
        super();
        this.coreMetricsManager = MetricsManager.getInstance();
        this.workflowMetrics = new Map();
        this.registerDomainManager('WorkflowMetricsManager', this);
    }

    public static getInstance(): WorkflowMetricsManager {
        if (!WorkflowMetricsManager.instance) {
            WorkflowMetricsManager.instance = new WorkflowMetricsManager();
        }
        return WorkflowMetricsManager.instance;
    }

    public async initializeMetrics(workflowId: string): Promise<void> {
        // Get initial metrics from core managers
        const [resourceMetrics, performanceMetrics] = await Promise.all([
            this.coreMetricsManager.getInitialResourceMetrics(),
            this.coreMetricsManager.getInitialPerformanceMetrics()
        ]);

        // Create workflow-specific metrics
        const metrics = {
            resource: {
                ...resourceMetrics,
                concurrentWorkflows: 0,
                resourceAllocation: {
                    cpu: 0,
                    memory: 0
                }
            },
            performance: {
                ...performanceMetrics,
                completionRate: 0,
                averageStepsPerWorkflow: 0,
                errorMetrics: this.coreMetricsManager.getErrorMetrics(),
                resourceUtilization: {
                    ...resourceMetrics,
                    concurrentWorkflows: 0,
                    resourceAllocation: {
                        cpu: 0,
                        memory: 0
                    }
                },
                timestamp: Date.now()
            },
            usage: this.createDefaultUsageMetrics()
        };

        this.workflowMetrics.set(workflowId, metrics);

        // Track initialization in core metrics
        await this.coreMetricsManager.trackMetric({
            domain: MetricDomain.WORKFLOW,
            type: MetricType.PERFORMANCE,
            value: 0,
            timestamp: Date.now(),
            metadata: {
                workflowId,
                operation: 'initialize_metrics',
                status: 'success'
            }
        });
    }

    public getMetrics(workflowId: string): IWorkflowMetrics | undefined {
        return this.workflowMetrics.get(workflowId);
    }

    public async updateResourceMetrics(workflowId: string, metrics: Partial<IWorkflowResourceMetrics>): Promise<void> {
        const currentMetrics = this.workflowMetrics.get(workflowId);
        if (!currentMetrics) return;

        const updatedMetrics = {
            ...currentMetrics.resource,
            ...metrics,
            timestamp: Date.now()
        };

        const validationResult = WorkflowMetricsValidation.validateWorkflowResourceMetrics(updatedMetrics);
        if (!validationResult.isValid) {
            throw createError({
                message: `Invalid resource metrics: ${validationResult.errors.join(', ')}`,
                type: ERROR_KINDS.ValidationError
            });
        }

        currentMetrics.resource = updatedMetrics;
        this.workflowMetrics.set(workflowId, currentMetrics);

        // Track in core metrics
        await this.coreMetricsManager.trackMetric({
            domain: MetricDomain.WORKFLOW,
            type: MetricType.RESOURCE,
            value: metrics.cpuUsage || 0,
            timestamp: Date.now(),
            metadata: {
                workflowId,
                metrics: updatedMetrics
            }
        });
    }

    public async updateUsageMetrics(workflowId: string, metrics: Partial<IWorkflowUsageMetrics>): Promise<void> {
        const currentMetrics = this.workflowMetrics.get(workflowId);
        if (!currentMetrics) return;

        const updatedMetrics = {
            ...currentMetrics.usage,
            ...metrics,
            timestamp: Date.now()
        };

        const validationResult = WorkflowMetricsValidation.validateWorkflowUsageMetrics(updatedMetrics);
        if (!validationResult.isValid) {
            throw createError({
                message: `Invalid usage metrics: ${validationResult.errors.join(', ')}`,
                type: ERROR_KINDS.ValidationError
            });
        }

        currentMetrics.usage = updatedMetrics;
        this.workflowMetrics.set(workflowId, currentMetrics);

        // Track in core metrics
        await this.coreMetricsManager.trackMetric({
            domain: MetricDomain.WORKFLOW,
            type: MetricType.USAGE,
            value: metrics.totalRequests || 0,
            timestamp: Date.now(),
            metadata: {
                workflowId,
                metrics: updatedMetrics
            }
        });
    }

    public async updatePerformanceMetrics(workflowId: string, data: {
        executionTime: number;
        success: boolean;
        error?: Error;
    }): Promise<void> {
        const currentMetrics = this.workflowMetrics.get(workflowId);
        if (!currentMetrics) return;

        const { performance } = currentMetrics;
        const updatedMetrics: IWorkflowPerformanceMetrics = {
            ...performance,
            executionTime: {
                ...performance.executionTime,
                total: performance.executionTime.total + data.executionTime,
                average: (performance.executionTime.total + data.executionTime) / 2,
                max: Math.max(performance.executionTime.max, data.executionTime),
                min: Math.min(performance.executionTime.min, data.executionTime)
            },
            errorRate: data.success ? performance.errorRate : performance.errorRate + 1,
            successRate: data.success ? performance.successRate + 1 : performance.successRate,
            timestamp: Date.now()
        };

        const validationResult = WorkflowMetricsValidation.validateWorkflowPerformanceMetrics(updatedMetrics);
        if (!validationResult.isValid) {
            throw createError({
                message: `Invalid performance metrics: ${validationResult.errors.join(', ')}`,
                type: ERROR_KINDS.ValidationError
            });
        }

        currentMetrics.performance = updatedMetrics;
        this.workflowMetrics.set(workflowId, currentMetrics);

        // Track in core metrics
        await this.coreMetricsManager.trackMetric({
            domain: MetricDomain.WORKFLOW,
            type: MetricType.PERFORMANCE,
            value: data.executionTime,
            timestamp: Date.now(),
            metadata: {
                workflowId,
                success: data.success,
                error: data.error?.message
            }
        });
    }

    public async updateStepMetrics(workflowId: string, step: IStepConfig): Promise<void> {
        const metrics = this.workflowMetrics.get(workflowId);
        if (!metrics) return;

        await this.updateUsageMetrics(workflowId, {
            totalRequests: metrics.usage.totalRequests + 1,
            activeUsers: metrics.usage.activeUsers + 1,
            requestsPerSecond: (metrics.usage.totalRequests + 1) / ((Date.now() - metrics.usage.timestamp) / 1000),
            totalExecutions: metrics.usage.totalExecutions + 1,
            activeWorkflows: metrics.usage.activeWorkflows + 1,
            workflowsPerSecond: (metrics.usage.totalExecutions + 1) / ((Date.now() - metrics.usage.timestamp) / 1000)
        });

        // Track step execution in core metrics
        await this.coreMetricsManager.trackMetric({
            domain: MetricDomain.WORKFLOW,
            type: MetricType.PERFORMANCE,
            value: 0,
            timestamp: Date.now(),
            metadata: {
                workflowId,
                stepId: step.id,
                operation: 'step_execution'
            }
        });
    }

    public async updateStepCompletionMetrics(workflowId: string, result: IStepResult): Promise<void> {
        const metrics = this.workflowMetrics.get(workflowId);
        if (!metrics) return;

        await this.updateUsageMetrics(workflowId, {
            activeUsers: metrics.usage.activeUsers - 1,
            activeWorkflows: metrics.usage.activeWorkflows - 1
        });

        // Track step completion in core metrics
        await this.coreMetricsManager.trackMetric({
            domain: MetricDomain.WORKFLOW,
            type: MetricType.PERFORMANCE,
            value: result.metrics?.duration || 0,
            timestamp: Date.now(),
            metadata: {
                workflowId,
                stepId: result.stepId,
                status: result.status,
                operation: 'step_completion'
            }
        });
    }

    private createDefaultUsageMetrics(): IWorkflowUsageMetrics {
        const timestamp = Date.now();
        return {
            totalRequests: 0,
            activeUsers: 0,
            requestsPerSecond: 0,
            averageResponseSize: 0,
            peakMemoryUsage: 0,
            uptime: 0,
            rateLimit: {
                current: 0,
                limit: 100,
                remaining: 100,
                resetTime: timestamp + 3600000
            },
            totalExecutions: 0,
            activeWorkflows: 0,
            workflowsPerSecond: 0,
            averageComplexity: 0,
            workflowDistribution: {
                sequential: 0,
                parallel: 0,
                conditional: 0
            },
            timestamp
        };
    }

    public cleanup(): void {
        this.workflowMetrics.clear();
    }
}

export default WorkflowMetricsManager.getInstance();
