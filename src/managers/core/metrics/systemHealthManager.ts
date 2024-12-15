/**
 * @file systemHealthManager.ts
 * @path src/managers/core/metrics/systemHealthManager.ts
 * @description Specialized manager for system health metrics
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
    ISystemHealthMetrics,
    ISystemStatus,
    ISystemCapacity,
    ISystemStability,
    ISystemThresholds,
    ISystemDegradation,
    SystemHealthTypeGuards,
    SystemHealthValidation
} from '../../../types/metrics/base/systemHealthMetrics';
import { validateMetricEvent } from './utils/metricValidation';
import { SystemHealthUtils } from './utils/systemHealthUtils';
import { createBaseMetadata, createErrorResult, createSuccessResult } from '../../../types/common/baseTypes';
import { ERROR_KINDS, createError } from '../../../types/common/errorTypes';
import type { IResourceMetrics } from '../../../types/metrics/base/resourceMetrics';
import type { IPerformanceMetrics } from '../../../types/metrics/base/performanceMetrics';

// ─── System Health Manager ────────────────────────────────────────────────────

export class SystemHealthManager extends CoreManager {
    private static instance: SystemHealthManager | null = null;
    private systemHealthMetrics: MutableMetrics<ISystemHealthMetrics>;
    private startTime: number;
    private crashes: number[];
    private recoveries: number[];
    private baselineMetrics: {
        resources: IResourceMetrics;
        performance: IPerformanceMetrics;
    };

    public readonly category = MANAGER_CATEGORY_enum.METRICS;

    private constructor() {
        super();
        this.startTime = Date.now();
        this.crashes = [];
        this.recoveries = [];
        this.systemHealthMetrics = this.initializeSystemHealthMetrics() as MutableMetrics<ISystemHealthMetrics>;
        this.baselineMetrics = {
            resources: this.systemHealthMetrics.resources,
            performance: this.systemHealthMetrics.performance
        };
        this.registerDomainManager('SystemHealthManager', this);
    }

    public static getInstance(): SystemHealthManager {
        if (!SystemHealthManager.instance) {
            SystemHealthManager.instance = new SystemHealthManager();
        }
        return SystemHealthManager.instance;
    }

    private initializeSystemHealthMetrics(): ISystemHealthMetrics {
        return {
            status: {
                isHealthy: true,
                isStable: true,
                isResponsive: true,
                lastHealthCheck: Date.now(),
                uptime: 0
            },
            capacity: {
                maxConcurrentOperations: 100,
                currentLoad: 0,
                availableCapacity: 100,
                scalingFactor: 1
            },
            stability: {
                crashCount: 0,
                recoveryCount: 0,
                lastIncident: 0,
                meanTimeBetweenFailures: 0,
                meanTimeToRecover: 0
            },
            thresholds: SystemHealthUtils.DEFAULT_THRESHOLDS,
            degradation: {
                performance: {
                    latencyIncrease: 0,
                    throughputDecrease: 0,
                    errorRateIncrease: 0
                },
                resources: {
                    cpuDegradation: 0,
                    memoryLeak: 0,
                    ioBottleneck: 0
                },
                service: {
                    availabilityImpact: 0,
                    reliabilityImpact: 0,
                    qualityImpact: 0
                }
            },
            resources: {
                cpuUsage: 0,
                memoryUsage: 0,
                diskIO: { read: 0, write: 0 },
                networkUsage: { upload: 0, download: 0 },
                timestamp: Date.now()
            },
            performance: {
                executionTime: { total: 0, average: 0, min: 0, max: 0 },
                latency: { total: 0, average: 0, min: 0, max: 0 },
                throughput: { operationsPerSecond: 0, dataProcessedPerSecond: 0 },
                responseTime: { total: 0, average: 0, min: 0, max: 0 },
                queueLength: 0,
                errorRate: 0,
                successRate: 1,
                errorMetrics: { totalErrors: 0, errorRate: 0 },
                resourceUtilization: {
                    cpuUsage: 0,
                    memoryUsage: 0,
                    diskIO: { read: 0, write: 0 },
                    networkUsage: { upload: 0, download: 0 },
                    timestamp: Date.now()
                },
                timestamp: Date.now()
            },
            timestamp: Date.now()
        };
    }

    private createMetricsMetadata(baseMetadata: ReturnType<typeof createBaseMetadata>): IMetricsHandlerMetadata {
        return {
            ...baseMetadata,
            domain: MetricDomain.AGENT,
            type: MetricType.SYSTEM_HEALTH,
            processingTime: {
                total: 0,
                average: 0,
                min: 0,
                max: 0
            }
        };
    }

    private updateSystemHealthMetrics(metrics: MutableMetrics<ISystemHealthMetrics>, event: IMetricEvent): void {
        const metadata = event.metadata as Record<string, unknown>;

        // Update resources and performance if provided
        if ('resources' in metadata && typeof metadata.resources === 'object') {
            metrics.resources = metadata.resources as IResourceMetrics;
        }

        if ('performance' in metadata && typeof metadata.performance === 'object') {
            metrics.performance = metadata.performance as IPerformanceMetrics;
        }

        // Update system status
        metrics.status = SystemHealthUtils.calculateSystemStatus(
            metrics.resources,
            metrics.performance,
            metrics.thresholds,
            this.startTime
        );

        // Update system capacity
        metrics.capacity = SystemHealthUtils.calculateSystemCapacity(
            metrics.resources,
            metrics.performance,
            metrics.capacity.maxConcurrentOperations
        );

        // Track crashes and recoveries
        if ('crash' in metadata && metadata.crash === true) {
            this.crashes.push(Date.now());
        }
        if ('recovery' in metadata && metadata.recovery === true) {
            this.recoveries.push(Date.now());
        }

        // Update stability metrics
        metrics.stability = SystemHealthUtils.calculateSystemStability(
            this.crashes,
            this.recoveries,
            Date.now()
        );

        // Update degradation metrics
        metrics.degradation = SystemHealthUtils.calculateSystemDegradation(
            {
                resources: metrics.resources,
                performance: metrics.performance
            },
            this.baselineMetrics
        );

        metrics.timestamp = Date.now();
    }

    public async updateMetrics(event: IMetricEvent): Promise<IMetricsHandlerResult> {
        const baseMetadata = createBaseMetadata('SystemHealthManager', 'updateMetrics');
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
            this.updateSystemHealthMetrics(this.systemHealthMetrics, event);
            const metricsValidation = SystemHealthValidation.validateSystemHealthMetrics(this.systemHealthMetrics);

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
                    message: `Failed to update system health metrics: ${errorMessage}`,
                    type: ERROR_KINDS.ExecutionError
                }),
                metadata
            );
        }
    }

    public getMetrics(): ISystemHealthMetrics {
        return { ...this.systemHealthMetrics };
    }

    public getSystemStatus(): ISystemStatus {
        return { ...this.systemHealthMetrics.status };
    }

    public getSystemCapacity(): ISystemCapacity {
        return { ...this.systemHealthMetrics.capacity };
    }

    public getSystemStability(): ISystemStability {
        return { ...this.systemHealthMetrics.stability };
    }

    public getDegradationMetrics(): ISystemDegradation {
        return { ...this.systemHealthMetrics.degradation };
    }

    public updateThresholds(thresholds: Partial<ISystemThresholds>): void {
        this.systemHealthMetrics.thresholds = {
            ...this.systemHealthMetrics.thresholds,
            ...thresholds
        };
    }

    public resetBaseline(): void {
        this.baselineMetrics = {
            resources: { ...this.systemHealthMetrics.resources },
            performance: { ...this.systemHealthMetrics.performance }
        };
    }

    public resetCrashHistory(): void {
        this.crashes = [];
        this.recoveries = [];
        this.systemHealthMetrics.stability = {
            crashCount: 0,
            recoveryCount: 0,
            lastIncident: 0,
            meanTimeBetweenFailures: 0,
            meanTimeToRecover: 0
        };
    }
}

export default SystemHealthManager.getInstance();
