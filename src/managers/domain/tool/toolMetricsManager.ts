/**
 * @file toolMetricsManager.ts
 * @path src/managers/domain/tool/toolMetricsManager.ts
 * @description Tool metrics management and monitoring implementation
 */

import CoreManager from '../../core/coreManager';
import { createValidationResult } from '../../../utils/validation/validationUtils';
import type { IValidationResult } from '../../../types/common/commonValidationTypes';
import type { IStandardCostDetails } from '../../../types/common/commonMetricTypes';
import {
    IToolUsageMetrics,
    IToolResourceMetrics,
    IToolPerformanceMetrics,
    ToolMetricsTypeGuards,
    ToolMetricsValidation
} from '../../../types/tool/toolMetricTypes';

/**
 * Manages tool metrics collection, validation, and monitoring
 */
export class ToolMetricsManager extends CoreManager {
    private static instance: ToolMetricsManager;
    private readonly metricsHistory: Map<string, {
        resources: IToolResourceMetrics[];
        performance: IToolPerformanceMetrics[];
        usage: IToolUsageMetrics[];
        timestamp: number;
    }>;

    private constructor() {
        super();
        this.metricsHistory = new Map();
        this.registerDomainManager('ToolMetricsManager', this);
    }

    public static getInstance(): ToolMetricsManager {
        if (!ToolMetricsManager.instance) {
            ToolMetricsManager.instance = new ToolMetricsManager();
        }
        return ToolMetricsManager.instance;
    }

    /**
     * Collect and validate tool metrics
     */
    public async collectMetrics(
        toolId: string,
        metrics: {
            resources: IToolResourceMetrics;
            performance: IToolPerformanceMetrics;
            usage: IToolUsageMetrics;
        }
    ): Promise<IValidationResult> {
        try {
            // Validate individual metrics
            const resourceValidation = ToolMetricsValidation.validateToolResourceMetrics(metrics.resources);
            const performanceValidation = ToolMetricsValidation.validateToolPerformanceMetrics(metrics.performance);
            const usageValidation = ToolMetricsValidation.validateToolUsageMetrics(metrics.usage);

            // Combine validation results
            const errors: string[] = [
                ...resourceValidation.errors,
                ...performanceValidation.errors,
                ...usageValidation.errors
            ];

            const warnings: string[] = [
                ...resourceValidation.warnings,
                ...performanceValidation.warnings,
                ...usageValidation.warnings
            ];

            // Store metrics if validation passes
            if (errors.length === 0) {
                const toolMetrics = this.metricsHistory.get(toolId) || {
                    resources: [],
                    performance: [],
                    usage: [],
                    timestamp: Date.now()
                };

                toolMetrics.resources.push(metrics.resources);
                toolMetrics.performance.push(metrics.performance);
                toolMetrics.usage.push(metrics.usage);
                toolMetrics.timestamp = Date.now();

                this.metricsHistory.set(toolId, toolMetrics);

                // Monitor for anomalies
                await this.monitorMetrics(toolId, metrics);
            }

            return createValidationResult(errors.length === 0, errors, warnings);
        } catch (error) {
            this.log(
                `Failed to collect tool metrics: ${error instanceof Error ? error.message : String(error)}`,
                undefined,
                undefined,
                'error',
                error instanceof Error ? error : undefined
            );

            return createValidationResult(false, [`Metrics collection failed: ${error instanceof Error ? error.message : String(error)}`]);
        }
    }

    /**
     * Monitor metrics for anomalies and performance issues
     */
    private async monitorMetrics(
        toolId: string,
        metrics: {
            resources: IToolResourceMetrics;
            performance: IToolPerformanceMetrics;
            usage: IToolUsageMetrics;
        }
    ): Promise<void> {
        try {
            // Monitor resource metrics
            if (metrics.resources.cpuUsage > 80) {
                this.log(
                    `High CPU usage detected for tool ${toolId}: ${metrics.resources.cpuUsage}%`,
                    undefined,
                    undefined,
                    'warn'
                );
            }

            if (metrics.resources.memoryUsage > 1000000000) { // 1GB
                this.log(
                    `High memory usage detected for tool ${toolId}: ${metrics.resources.memoryUsage} bytes`,
                    undefined,
                    undefined,
                    'warn'
                );
            }

            // Monitor performance metrics
            if (metrics.performance.errorRate > 0.1) { // 10% error rate
                this.log(
                    `High error rate detected for tool ${toolId}: ${metrics.performance.errorRate * 100}%`,
                    undefined,
                    undefined,
                    'warn'
                );
            }

            if (metrics.performance.latency.average > 5000) { // 5 seconds
                this.log(
                    `High latency detected for tool ${toolId}: ${metrics.performance.latency.average}ms`,
                    undefined,
                    undefined,
                    'warn'
                );
            }

            // Monitor usage metrics
            if (metrics.usage.utilizationMetrics.resourceConsumption.cpu > 90) {
                this.log(
                    `Critical CPU consumption for tool ${toolId}: ${metrics.usage.utilizationMetrics.resourceConsumption.cpu}%`,
                    undefined,
                    undefined,
                    'error'
                );
            }

            const toolMetrics = this.metricsHistory.get(toolId);
            if (toolMetrics) {
                // Analyze trends
                const recentErrors = toolMetrics.performance
                    .slice(-5)
                    .reduce((acc, curr) => acc + curr.errorRate, 0) / 5;

                if (recentErrors > 0.2) { // 20% average error rate over last 5 operations
                    this.log(
                        `Increasing error trend detected for tool ${toolId}: ${recentErrors * 100}% average`,
                        undefined,
                        undefined,
                        'warn'
                    );
                }
            }
        } catch (error) {
            this.log(
                `Failed to monitor tool metrics: ${error instanceof Error ? error.message : String(error)}`,
                undefined,
                undefined,
                'error',
                error instanceof Error ? error : undefined
            );
        }
    }

    /**
     * Get aggregated metrics for a tool
     */
    public getMetrics(toolId: string): {
        resources: IToolResourceMetrics[];
        performance: IToolPerformanceMetrics[];
        usage: IToolUsageMetrics[];
        timestamp: number;
    } | undefined {
        return this.metricsHistory.get(toolId);
    }

    /**
     * Clear metrics history for a tool
     */
    public clearMetrics(toolId: string): void {
        this.metricsHistory.delete(toolId);
    }

    /**
     * Get metrics history size
     */
    public getMetricsHistorySize(): number {
        return this.metricsHistory.size;
    }

    /**
     * Calculate cost details for tool execution
     */
    public calculateCostDetails(
        toolId: string,
        inputSize: number,
        outputSize: number
    ): IStandardCostDetails {
        return {
            inputCost: inputSize * 0.0001, // Example cost calculation
            outputCost: outputSize * 0.0002,
            totalCost: (inputSize * 0.0001) + (outputSize * 0.0002),
            currency: 'USD',
            breakdown: {
                promptTokens: { count: inputSize, cost: inputSize * 0.0001 },
                completionTokens: { count: outputSize, cost: outputSize * 0.0002 }
            }
        };
    }
}

export default ToolMetricsManager.getInstance();
