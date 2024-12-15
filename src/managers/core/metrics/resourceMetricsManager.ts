/**
 * @file resourceMetricsManager.ts
 * @path src/managers/core/metrics/resourceMetricsManager.ts
 * @description Specialized manager for system resource metrics
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
    IResourceMetrics,
    ResourceMetricsTypeGuards,
    ResourceMetricsValidation
} from '../../../types/metrics/base/resourceMetrics';
import { validateMetricEvent } from './utils/metricValidation';
import { ResourceMetricsUtils } from './utils/resourceMetricsUtils';
import { createBaseMetadata, createErrorResult, createSuccessResult } from '../../../types/common/baseTypes';
import { ERROR_KINDS, createError } from '../../../types/common/errorTypes';

// ─── Resource Manager ────────────────────────────────────────────────────────

export class ResourceMetricsManager extends CoreManager {
    private static instance: ResourceMetricsManager | null = null;
    private resourceMetrics: MutableMetrics<IResourceMetrics>;

    public readonly category = MANAGER_CATEGORY_enum.METRICS;

    private constructor() {
        super();
        this.resourceMetrics = this.initializeResourceMetrics() as MutableMetrics<IResourceMetrics>;
        this.registerDomainManager('ResourceMetricsManager', this);
    }

    public static getInstance(): ResourceMetricsManager {
        if (!ResourceMetricsManager.instance) {
            ResourceMetricsManager.instance = new ResourceMetricsManager();
        }
        return ResourceMetricsManager.instance;
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

    private createMetricsMetadata(baseMetadata: ReturnType<typeof createBaseMetadata>): IMetricsHandlerMetadata {
        return {
            ...baseMetadata,
            domain: MetricDomain.AGENT,
            type: MetricType.RESOURCE,
            processingTime: {
                total: 0,
                average: 0,
                min: 0,
                max: 0
            }
        };
    }

    private updateResourceMetrics(metrics: MutableMetrics<IResourceMetrics>, event: IMetricEvent): void {
        const metadata = event.metadata as Record<string, unknown>;

        if ('cpuUsage' in metadata && typeof metadata.cpuUsage === 'number') {
            metrics.cpuUsage = Math.max(0, Math.min(100, metadata.cpuUsage));
        }

        if ('memoryUsage' in metadata && typeof metadata.memoryUsage === 'number') {
            metrics.memoryUsage = Math.max(0, metadata.memoryUsage);
        }

        if ('diskIO' in metadata && typeof metadata.diskIO === 'object') {
            const diskIO = metadata.diskIO as Record<string, unknown>;
            if ('read' in diskIO && typeof diskIO.read === 'number') {
                metrics.diskIO.read = Math.max(0, diskIO.read);
            }
            if ('write' in diskIO && typeof diskIO.write === 'number') {
                metrics.diskIO.write = Math.max(0, diskIO.write);
            }
        }

        if ('networkUsage' in metadata && typeof metadata.networkUsage === 'object') {
            const networkUsage = metadata.networkUsage as Record<string, unknown>;
            if ('upload' in networkUsage && typeof networkUsage.upload === 'number') {
                metrics.networkUsage.upload = Math.max(0, networkUsage.upload);
            }
            if ('download' in networkUsage && typeof networkUsage.download === 'number') {
                metrics.networkUsage.download = Math.max(0, networkUsage.download);
            }
        }

        metrics.timestamp = Date.now();
    }

    public async updateMetrics(event: IMetricEvent): Promise<IMetricsHandlerResult> {
        const baseMetadata = createBaseMetadata('ResourceMetricsManager', 'updateMetrics');
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
            this.updateResourceMetrics(this.resourceMetrics, event);
            const metricsValidation = ResourceMetricsValidation.validateResourceMetrics(this.resourceMetrics);

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
                    message: `Failed to update resource metrics: ${errorMessage}`,
                    type: ERROR_KINDS.ExecutionError
                }),
                metadata
            );
        }
    }

    public getMetrics(): IResourceMetrics {
        return { ...this.resourceMetrics };
    }

    public getResourceUtilization(): Record<string, number> {
        const metrics = this.getMetrics();
        const { calculateDiskUtilization, calculateNetworkUtilization, calculateMemoryUtilization } = ResourceMetricsUtils;

        return {
            cpuUtilization: metrics.cpuUsage,
            memoryUtilization: calculateMemoryUtilization(metrics.memoryUsage),
            diskUtilization: calculateDiskUtilization(metrics.diskIO.read, metrics.diskIO.write),
            networkUtilization: calculateNetworkUtilization(metrics.networkUsage.upload, metrics.networkUsage.download)
        };
    }

    public getResourceWarnings(): string[] {
        const utilization = this.getResourceUtilization();
        const { getResourceWarning } = ResourceMetricsUtils;

        return Object.entries(utilization)
            .map(([metric, value]) => getResourceWarning(metric, value))
            .filter((warning): warning is string => warning !== null);
    }

    public isResourceConstrained(): boolean {
        const utilization = this.getResourceUtilization();
        const { CRITICAL } = ResourceMetricsUtils.RESOURCE_THRESHOLDS;

        return Object.values(utilization).some(value => value > CRITICAL);
    }
}

export default ResourceMetricsManager.getInstance();
