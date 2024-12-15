/**
 * @file metricsManager.ts
 * @description Core metrics management with delegated responsibilities to specialized managers
 */

import { CoreManager } from './coreManager';
import { MetricsAdapter } from '../../metrics/MetricsAdapter';
import { LLMMetricsCollector } from '../../metrics/LLMMetricsCollector';
import { MANAGER_CATEGORY_enum } from '../../types/common/enumTypes';
import { ERROR_KINDS, createError } from '../../types/common/errorTypes';
import { createBaseMetadata } from '../../types/common/baseTypes';
import { 
    MetricDomain,
    MetricType,
    IMetricsManager,
    IMetricEvent,
    IMetricFilter,
    IAggregationQuery,
    IMetricsHandlerResult,
    IMetricsHandlerMetadata
} from '../../types/metrics/base/metricsManagerTypes';
import type { IResourceMetrics } from '../../types/metrics/base/resourceMetrics';
import type { IPerformanceMetrics } from '../../types/metrics/base/performanceMetrics';
import type { IEnhancedErrorMetrics } from '../../types/metrics/base/errorMetrics';

import { ErrorMetricsManager } from './metrics/errorMetricsManager';
import { ResourceMetricsManager } from './metrics/resourceMetricsManager';
import { PerformanceMetricsManager } from './metrics/performanceMetricsManager';
import { SystemHealthManager } from './metrics/systemHealthManager';
import { AggregationManager } from './metrics/aggregationManager';
import { validateMetricEvent } from './metrics/utils/metricValidation';

export class MetricsManager extends CoreManager implements IMetricsManager {
    private static instance: MetricsManager | null = null;
    private readonly metricsCollector: LLMMetricsCollector;
    private readonly errorMetricsManager: ErrorMetricsManager;
    private readonly resourceMetricsManager: ResourceMetricsManager;
    private readonly performanceMetricsManager: PerformanceMetricsManager;
    private readonly systemHealthManager: SystemHealthManager;
    private readonly aggregationManager: AggregationManager;

    public readonly category = MANAGER_CATEGORY_enum.CORE;

    private constructor() {
        super();
        this.metricsCollector = new LLMMetricsCollector();
        this.errorMetricsManager = ErrorMetricsManager.getInstance();
        this.resourceMetricsManager = ResourceMetricsManager.getInstance();
        this.performanceMetricsManager = PerformanceMetricsManager.getInstance();
        this.systemHealthManager = SystemHealthManager.getInstance();
        this.aggregationManager = AggregationManager.getInstance();
        this.registerDomainManager('MetricsManager', this);
    }

    public static getInstance(): MetricsManager {
        if (!MetricsManager.instance) {
            MetricsManager.instance = new MetricsManager();
        }
        return MetricsManager.instance;
    }

    private createMetricsMetadata(
        domain: MetricDomain,
        type: MetricType,
        startTime: number
    ): IMetricsHandlerMetadata {
        return {
            ...createBaseMetadata(this.constructor.name, 'metrics'),
            domain,
            type,
            processingTime: {
                total: Date.now() - startTime,
                average: Date.now() - startTime,
                min: Date.now() - startTime,
                max: Date.now() - startTime
            }
        };
    }

    public async trackMetric(event: IMetricEvent): Promise<IMetricsHandlerResult<void>> {
        const startTime = Date.now();
        const metadata = this.createMetricsMetadata(event.domain, event.type, startTime);

        try {
            const validation = validateMetricEvent(event);
            if (!validation.isValid) {
                throw createError({
                    message: `Invalid metric event: ${validation.errors.join(', ')}`,
                    type: ERROR_KINDS.ValidationError,
                    context: {
                        component: this.constructor.name,
                        operation: 'trackMetric',
                        event
                    }
                });
            }

            // Delegate to appropriate manager based on metric type
            switch (event.type) {
                case MetricType.RESOURCE:
                    await this.resourceMetricsManager.trackMetric(event);
                    break;
                case MetricType.PERFORMANCE:
                    await this.performanceMetricsManager.trackMetric(event);
                    break;
                default:
                    await this.aggregationManager.trackMetric(event);
            }

            // Special handling for LLM metrics
            if (event.domain === MetricDomain.LLM) {
                this.metricsCollector.trackMetrics(event.type, event.metadata);
            }

            this.logDebug('Tracked metric');
            return {
                success: true,
                metadata
            };
        } catch (error) {
            return {
                success: false,
                error: createError({
                    message: error instanceof Error ? error.message : String(error),
                    type: ERROR_KINDS.SystemError,
                    context: {
                        component: this.constructor.name,
                        operation: 'trackMetric'
                    }
                }),
                metadata
            };
        }
    }

    public async getMetrics(filter: IMetricFilter): Promise<IMetricsHandlerResult<IMetricEvent[]>> {
        return this.aggregationManager.getMetrics(filter);
    }

    public async aggregateMetrics(query: IAggregationQuery): Promise<IMetricsHandlerResult<any>> {
        return this.aggregationManager.aggregateMetrics(query);
    }

    public async rollupMetrics(query: IAggregationQuery): Promise<IMetricsHandlerResult<any>> {
        return this.aggregationManager.rollupMetrics(query);
    }

    public async getInitialResourceMetrics(): Promise<IResourceMetrics> {
        return this.resourceMetricsManager.getInitialMetrics();
    }

    public async getInitialPerformanceMetrics(): Promise<IPerformanceMetrics> {
        return this.performanceMetricsManager.getInitialMetrics();
    }

    public getErrorMetrics(): IEnhancedErrorMetrics {
        return this.errorMetricsManager.getMetrics();
    }
}

export default MetricsManager.getInstance();
