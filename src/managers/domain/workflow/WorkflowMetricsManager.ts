import { WorkflowMetricsValidation } from '../../../types/workflow/workflowMetricTypes';
import type { 
    IWorkflowResourceMetrics,
    IWorkflowPerformanceMetrics,
    IWorkflowUsageMetrics
} from '../../../types/workflow/workflowMetricTypes';
import type { IErrorMetrics } from '../../../types/metrics/base/performanceMetrics';
import type { IStepConfig, IStepResult } from '../../../types/workflow/workflowTypes';

export interface IWorkflowMetrics {
    resource: IWorkflowResourceMetrics;
    performance: IWorkflowPerformanceMetrics;
    usage: IWorkflowUsageMetrics;
}

export class WorkflowMetricsManager {
    private workflowMetrics: Map<string, IWorkflowMetrics>;

    constructor() {
        this.workflowMetrics = new Map();
    }

    public initializeMetrics(workflowId: string): void {
        this.workflowMetrics.set(workflowId, this.createDefaultMetrics());
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
            throw new Error(`Invalid resource metrics: ${validationResult.errors.join(', ')}`);
        }

        currentMetrics.resource = updatedMetrics;
        this.workflowMetrics.set(workflowId, currentMetrics);
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
            throw new Error(`Invalid performance metrics: ${validationResult.errors.join(', ')}`);
        }

        currentMetrics.performance = updatedMetrics;
        this.workflowMetrics.set(workflowId, currentMetrics);
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
            throw new Error(`Invalid usage metrics: ${validationResult.errors.join(', ')}`);
        }

        currentMetrics.usage = updatedMetrics;
        this.workflowMetrics.set(workflowId, currentMetrics);
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
    }

    public async updateStepCompletionMetrics(workflowId: string, result: IStepResult): Promise<void> {
        const metrics = this.workflowMetrics.get(workflowId);
        if (!metrics) return;

        await this.updateUsageMetrics(workflowId, {
            activeUsers: metrics.usage.activeUsers - 1,
            activeWorkflows: metrics.usage.activeWorkflows - 1
        });

        if (result.success) {
            await this.updatePerformanceMetrics(workflowId, {
                executionTime: 0,
                success: true
            });
        }
    }

    public updateErrorMetrics(workflowId: string): void {
        const metrics = this.workflowMetrics.get(workflowId);
        if (!metrics) return;

        const newErrorMetrics: IErrorMetrics = {
            totalErrors: metrics.performance.errorMetrics.totalErrors + 1,
            errorRate: (metrics.performance.errorMetrics.totalErrors + 1) / metrics.usage.totalExecutions
        };
        
        metrics.performance = {
            ...metrics.performance,
            errorMetrics: newErrorMetrics,
            errorRate: newErrorMetrics.errorRate
        };
    }

    private createDefaultMetrics(): IWorkflowMetrics {
        const timestamp = Date.now();
        
        return {
            resource: {
                cpuUsage: 0,
                memoryUsage: 0,
                diskIO: { read: 0, write: 0 },
                networkUsage: { upload: 0, download: 0 },
                concurrentWorkflows: 0,
                resourceAllocation: { cpu: 0, memory: 0 },
                timestamp
            },
            performance: {
                executionTime: { total: 0, average: 0, max: 0, min: 0 },
                latency: { total: 0, average: 0, max: 0, min: 0 },
                throughput: {
                    operationsPerSecond: 0,
                    dataProcessedPerSecond: 0
                },
                responseTime: { total: 0, average: 0, max: 0, min: 0 },
                queueLength: 0,
                errorRate: 0,
                successRate: 0,
                errorMetrics: {
                    totalErrors: 0,
                    errorRate: 0
                },
                resourceUtilization: {
                    cpuUsage: 0,
                    memoryUsage: 0,
                    diskIO: { read: 0, write: 0 },
                    networkUsage: { upload: 0, download: 0 },
                    concurrentWorkflows: 0,
                    resourceAllocation: { cpu: 0, memory: 0 },
                    timestamp
                },
                completionRate: 0,
                averageStepsPerWorkflow: 0,
                timestamp
            },
            usage: {
                // Base IUsageMetrics properties
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
                    resetTime: Date.now() + 3600000
                },
                // Workflow-specific properties
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
            }
        };
    }

    public cleanup(): void {
        this.workflowMetrics.clear();
    }
}
