/**
 * @file messageMetricTypes.ts
 * @path KaibanJS/src/types/llm/message/messageMetricTypes.ts
 * @description Message metrics type definitions and type guards for LLM domain
 * 
 * @module @types/llm/message
 */

// ─── Performance Metrics ─────────────────────────────────────────────────────────

export interface IMessagePerformanceMetrics {
    deliveryMetrics: {
        successRate: number;
        attempts: number;
        latency: {
            total: number;
            average: number;
            min: number;
            max: number;
        };
        errors: {
            count: number;
            types: Record<string, number>;
        };
    };
    processingMetrics: {
        patterns: {
            avgTime: number;
            peakTime: number;
            distribution: Map<string, number>;
        };
        throughput: {
            operationsPerSecond: number;
            dataProcessedPerSecond: number;
        };
        errors: {
            count: number;
            types: Record<string, number>;
        };
    };
    queueMetrics: {
        waitTime: {
            total: number;
            average: number;
            min: number;
            max: number;
        };
        clearanceRate: number;
        backlogSize: number;
    };
}

// ─── Usage Metrics ───────────────────────────────────────────────────────────────

export interface IMessageUsageMetrics {
    utilizationMetrics: {
        patterns: {
            timeDistribution: Map<string, number>;
            sizeDistribution: Map<string, number>;
        };
    };
    volumeMetrics: {
        total: number;
        perSecond: number;
        peak: number;
        distribution: {
            hourly: number[];
            daily: number[];
        };
    };
    rateLimit: {
        current: number;
        limit: number;
        remaining: number;
        resetTime: number;
    };
}

// ─── Type Guards ────────────────────────────────────────────────────────────────

export const MessageMetricTypeGuards = {
    isMessagePerformanceMetrics: (value: unknown): value is IMessagePerformanceMetrics => {
        if (typeof value !== 'object' || value === null) return false;
        const metrics = value as Partial<IMessagePerformanceMetrics>;

        return (
            typeof metrics.deliveryMetrics === 'object' &&
            metrics.deliveryMetrics !== null &&
            typeof metrics.processingMetrics === 'object' &&
            metrics.processingMetrics !== null &&
            typeof metrics.queueMetrics === 'object' &&
            metrics.queueMetrics !== null
        );
    },

    isMessageUsageMetrics: (value: unknown): value is IMessageUsageMetrics => {
        if (typeof value !== 'object' || value === null) return false;
        const metrics = value as Partial<IMessageUsageMetrics>;

        return (
            typeof metrics.utilizationMetrics === 'object' &&
            metrics.utilizationMetrics !== null &&
            typeof metrics.volumeMetrics === 'object' &&
            metrics.volumeMetrics !== null &&
            typeof metrics.rateLimit === 'object' &&
            metrics.rateLimit !== null
        );
    }
};
