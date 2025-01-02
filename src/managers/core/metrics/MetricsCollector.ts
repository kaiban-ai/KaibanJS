/**
 * @file MetricsCollector.ts
 * @description Centralized metrics collection system
 */

import { MetricDomain, MetricType } from '../../../types/metrics/base/metricTypes';
import { IMetricsHandlerResult } from '../../../types/metrics/agent/agentMetricsTypes';
import { IMetricEvent } from '../../../types/metrics/base/metricEvents';
import { MetricsStorage } from './MetricsStorage';
import { ErrorManager } from '../errorManager';

interface MetricsCollectorOptions {
    storage: MetricsStorage;
    errorManager: ErrorManager;
    maxRetries?: number;
    batchSize?: number;
}

export class MetricsCollector {
    private storage: MetricsStorage;
    private errorManager: ErrorManager;
    private maxRetries: number;
    private batchSize: number;

    constructor(options: MetricsCollectorOptions) {
        this.storage = options.storage;
        this.errorManager = options.errorManager;
        this.maxRetries = options.maxRetries || 3;
        this.batchSize = options.batchSize || 100;
    }

    public async getMetrics<T>(options: {
        timeRange: string;
        domain: MetricDomain;
        type: MetricType;
    }): Promise<IMetricsHandlerResult<T>> {
        try {
            const metrics = await this.storage.queryMetrics<T>({
                startTime: this.parseTimeRange(options.timeRange).start,
                endTime: this.parseTimeRange(options.timeRange).end,
                domain: options.domain,
                type: options.type,
                limit: this.batchSize
            });

            return {
                data: metrics,
                timestamp: Date.now(),
                domain: options.domain,
                type: options.type,
                success: true
            };
        } catch (error) {
            this.errorManager.handleError(error, 'MetricsCollector.getMetrics');
            return {
                data: [],
                timestamp: Date.now(),
                domain: options.domain,
                type: options.type,
                success: false,
                error: {
                    message: error instanceof Error ? error.message : 'Unknown error',
                    code: 'METRICS_QUERY_FAILED'
                }
            };
        }
    }

    public async trackMetric(metric: IMetricEvent): Promise<void> {
        let retries = 0;
        
        while (retries < this.maxRetries) {
            try {
                await this.storage.storeMetric(metric);
                return;
            } catch (error) {
                retries++;
                if (retries === this.maxRetries) {
                    this.errorManager.handleError(error, 'MetricsCollector.trackMetric');
                    throw error;
                }
            }
        }
    }

    private parseTimeRange(timeRange: string): { start: Date, end: Date } {
        const now = new Date();
        const [value, unit] = timeRange.split(/(?<=\d)(?=\D)/);
        
        switch (unit) {
            case 'm':
                return {
                    start: new Date(now.getTime() - parseInt(value) * 60 * 1000),
                    end: now
                };
            case 'h':
                return {
                    start: new Date(now.getTime() - parseInt(value) * 60 * 60 * 1000),
                    end: now
                };
            case 'd':
                return {
                    start: new Date(now.getTime() - parseInt(value) * 24 * 60 * 60 * 1000),
                    end: now
                };
            default:
                throw new Error(`Invalid time range unit: ${unit}`);
        }
    }
}
