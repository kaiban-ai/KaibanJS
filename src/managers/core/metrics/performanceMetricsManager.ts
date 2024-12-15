/**
 * @file performanceMetricsManager.ts
 * @path src/managers/core/metrics/performanceMetricsManager.ts
 * @description Specialized manager for system performance metrics
 *
 * @module @managers/core/metrics
 */

import { CoreManager } from '../coreManager';
import { MANAGER_CATEGORY_enum } from '../../../types/common/enumTypes';
import { 
    MetricDomain, 
    MetricType,
    MutableMetrics,
    IMetricsHandlerMetadata
} from '../../../types/metrics/base/metricsManagerTypes';
import type { 
    IMetricEvent,
    IMetricsHandlerResult
} from '../../../types/metrics/base/metricsManagerTypes';
import { 
    IPerformanceMetrics,
    ITimeMetrics,
    IThroughputMetrics,
    PerformanceMetricsTypeGuards,
    PerformanceMetricsValidation
} from '../../../types/metrics/base/performanceMetrics';
import { ResourceMetricsTypeGuards, IResourceMetrics } from '../../../types/metrics/base/resourceMetrics';
import { validateMetricEvent } from './utils/metricValidation';
import { PerformanceMetricsUtils } from './utils/performanceMetricsUtils';
import { createBaseMetadata, createErrorResult, createSuccessResult } from '../../../types/common/baseTypes';
import { ERROR_KINDS, createError } from '../../../types/common/errorTypes';

// ─── Performance Manager ────────────────────────────────────────────────────────

export class PerformanceMetricsManager extends CoreManager {
    private static instance: PerformanceMetricsManager | null = null;
    private performanceMetrics: MutableMetrics<IPerformanceMetrics>;
    private measurements: {
        execution: number[];
        latency: number[];
        response: number[];
        operations: number;
        dataProcessed: number;
        errors: number;
        successes: number;
    };

    public readonly category = MANAGER_CATEGORY_enum.METRICS;

    private constructor() {
        super();
        this.measurements = this.initializeMeasurements();
        this.performanceMetrics = this.initializePerformanceMetrics() as MutableMetrics<IPerformanceMetrics>;
        this.registerDomainManager('PerformanceMetricsManager', this);
    }

    public static getInstance(): PerformanceMetricsManager {
        if (!PerformanceMetricsManager.instance) {
            PerformanceMetricsManager.instance = new PerformanceMetricsManager();
        }
        return PerformanceMetricsManager.instance;
    }

    private initializeMeasurements() {
        return {
            execution: [],
            latency: [],
            response: [],
            operations: 0,
            dataProcessed: 0,
            errors: 0,
            successes: 0
        };
    }

    private initializeTimeMetrics(): ITimeMetrics {
        return {
            total: 0,
            average: 0,
            min: 0,
            max: 0
        };
    }

    private initializeThroughputMetrics(): IThroughputMetrics {
        return {
            operationsPerSecond: 0,
            dataProcessedPerSecond: 0
        };
    }

    private initializeResourceMetrics(): IResourceMetrics {
        return {
            cpuUsage: 0,
            memoryUsage: 0,
            diskIO: { read: 0, write: 0 },
            networkUsage: { upload: 0, download: 0 },
            timestamp: Date.now()
        };
    }

    private initializePerformanceMetrics(): IPerformanceMetrics {
        return {
            executionTime: this.initializeTimeMetrics(),
            latency: this.initializeTimeMetrics(),
            throughput: this.initializeThroughputMetrics(),
            responseTime: this.initializeTimeMetrics(),
            queueLength: 0,
            errorRate: 0,
            successRate: 1,
            errorMetrics: {
                totalErrors: 0,
                errorRate: 0
            },
            resourceUtilization: this.initializeResourceMetrics(),
            timestamp: Date.now()
        };
    }

    private createMetricsMetadata(baseMetadata: ReturnType<typeof createBaseMetadata>): IMetricsHandlerMetadata {
        return {
            ...baseMetadata,
            domain: MetricDomain.AGENT,
            type: MetricType.PERFORMANCE,
            processingTime: this.initializeTimeMetrics()
        };
    }

    private updatePerformanceMetrics(metrics: MutableMetrics<IPerformanceMetrics>, event: IMetricEvent): void {
        const metadata = event.metadata as Record<string, unknown>;

        // Update time metrics
        if ('executionTime' in metadata && typeof metadata.executionTime === 'number') {
            this.measurements.execution.push(metadata.executionTime);
            metrics.executionTime = PerformanceMetricsUtils.calculateTimeMetrics(this.measurements.execution);
        }

        if ('latency' in metadata && typeof metadata.latency === 'number') {
            this.measurements.latency.push(metadata.latency);
            metrics.latency = PerformanceMetricsUtils.calculateTimeMetrics(this.measurements.latency);
        }

        if ('responseTime' in metadata && typeof metadata.responseTime === 'number') {
            this.measurements.response.push(metadata.responseTime);
            metrics.responseTime = PerformanceMetricsUtils.calculateTimeMetrics(this.measurements.response);
        }

        // Update throughput metrics
        if ('operations' in metadata && typeof metadata.operations === 'number') {
            this.measurements.operations += metadata.operations;
        }

        if ('dataProcessed' in metadata && typeof metadata.dataProcessed === 'number') {
            this.measurements.dataProcessed += metadata.dataProcessed;
        }

        const timeWindow = Date.now() - metrics.timestamp;
        metrics.throughput = PerformanceMetricsUtils.calculateThroughput(
            this.measurements.operations,
            this.measurements.dataProcessed,
            timeWindow
        );

        // Update queue length
        if ('queueLength' in metadata && typeof metadata.queueLength === 'number') {
            metrics.queueLength = Math.max(0, metadata.queueLength);
        }

        // Update error and success metrics
        if ('error' in metadata && typeof metadata.error === 'boolean') {
            if (metadata.error) {
                this.measurements.errors++;
            } else {
                this.measurements.successes++;
            }
        }

        const total = this.measurements.errors + this.measurements.successes;
        metrics.errorRate = PerformanceMetricsUtils.calculateErrorRate(this.measurements.errors, total);
        metrics.successRate = PerformanceMetricsUtils.calculateSuccessRate(this.measurements.successes, total);
        metrics.errorMetrics = {
            totalErrors: this.measurements.errors,
            errorRate: metrics.errorRate
        };

        // Update resource utilization if provided
        if ('resourceUtilization' in metadata) {
            const resourceUtil = metadata.resourceUtilization;
            if (ResourceMetricsTypeGuards.isResourceMetrics(resourceUtil)) {
                metrics.resourceUtilization = { ...resourceUtil };
            }
        }

        metrics.timestamp = Date.now();
    }

    public async updateMetrics(event: IMetricEvent): Promise<IMetricsHandlerResult> {
        const baseMetadata = createBaseMetadata('PerformanceMetricsManager', 'updateMetrics');
        const metadata = this.createMetricsMetadata(baseMetadata);
        const validationResult = validateMetricEvent(event);

        if (!validationResult.isValid) {
            return createErrorResult(
                createError({
                    message: validationResult.errors.join(', '),
                    type: ERROR_KINDS.ValidationError
                }),
                { ...metadata, validation: validationResult }
            );
        }

        try {
            this.updatePerformanceMetrics(this.performanceMetrics, event);
            const metricsValidation = PerformanceMetricsValidation.validatePerformanceMetrics(this.performanceMetrics);

            if (!metricsValidation.isValid) {
                return createErrorResult(
                    createError({
                        message: metricsValidation.errors.join(', '),
                        type: ERROR_KINDS.ValidationError
                    }),
                    { ...metadata, validation: metricsValidation }
                );
            }

            return createSuccessResult(undefined, { ...metadata, validation: metricsValidation });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            return createErrorResult(
                createError({
                    message: `Failed to update performance metrics: ${errorMessage}`,
                    type: ERROR_KINDS.ExecutionError
                }),
                metadata
            );
        }
    }

    public getMetrics(): IPerformanceMetrics {
        return { ...this.performanceMetrics };
    }

    public getPerformanceTrends(): {
        execution: { trend: 'improving' | 'stable' | 'degrading'; changeRate: number };
        latency: { trend: 'improving' | 'stable' | 'degrading'; changeRate: number };
        response: { trend: 'improving' | 'stable' | 'degrading'; changeRate: number };
    } {
        return {
            execution: PerformanceMetricsUtils.analyzePerformanceTrend(this.measurements.execution),
            latency: PerformanceMetricsUtils.analyzePerformanceTrend(this.measurements.latency),
            response: PerformanceMetricsUtils.analyzePerformanceTrend(this.measurements.response)
        };
    }

    public resetMeasurements(): void {
        this.measurements = this.initializeMeasurements();
        this.performanceMetrics = this.initializePerformanceMetrics() as MutableMetrics<IPerformanceMetrics>;
    }
}

export default PerformanceMetricsManager.getInstance();
