import { MetricsManager } from '../metricsManager';
import type { IMetricEvent } from '../../../types/metrics/base/metricTypes';
import { METRIC_DOMAIN_enum, METRIC_TYPE_enum } from '../../../types/metrics/base/metricEnums';
import { validateMetricValue } from './utils/metricValidation';

class CircularBuffer<T> {
    private buffer: T[];
    private head = 0;
    private tail = 0;
    private size = 0;

    constructor(private capacity: number) {
        this.buffer = new Array(capacity);
    }

    push(item: T): void {
        this.buffer[this.tail] = item;
        this.tail = (this.tail + 1) % this.capacity;
        if (this.size < this.capacity) {
            this.size++;
        } else {
            this.head = (this.head + 1) % this.capacity;
        }
    }

    getItems(): T[] {
        const items: T[] = [];
        let current = this.head;
        for (let i = 0; i < this.size; i++) {
            items.push(this.buffer[current]);
            current = (current + 1) % this.capacity;
        }
        return items;
    }

    clear(): void {
        this.head = 0;
        this.tail = 0;
        this.size = 0;
    }
}

export class MetricsCollector {
    private readonly metricsManager: MetricsManager;
    private readonly buffer: CircularBuffer<IMetricEvent>;
    private readonly flushInterval: number = 5000; // 5 seconds
    private readonly batchSize: number = 100;
    private flushTimer: NodeJS.Timeout | null = null;
    private lastFlushTime: number = Date.now();
    private collectionRate: number = 0;
    private samplingRate: number = 1; // 1 = collect all, 0.5 = collect half, etc.

    constructor(bufferSize: number = 1000) {
        this.metricsManager = MetricsManager.getInstance();
        this.buffer = new CircularBuffer<IMetricEvent>(bufferSize);
        this.startFlushTimer();
    }

    private static instance: MetricsCollector | null = null;

    public static getInstance(): MetricsCollector {
        if (!MetricsCollector.instance) {
            MetricsCollector.instance = new MetricsCollector();
        }
        return MetricsCollector.instance;
    }

    private startFlushTimer(): void {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
        }
        this.flushTimer = setInterval(() => this.flush(), this.flushInterval);
    }

    public async collect(
        domain: METRIC_DOMAIN_enum,
        type: METRIC_TYPE_enum,
        value: number,
        metadata?: Record<string, unknown>
    ): Promise<void> {
        // Apply sampling
        if (Math.random() > this.samplingRate) {
            return;
        }

        const metric: IMetricEvent = {
            timestamp: Date.now(),
            domain,
            type,
            value,
            metadata: {
                component: metadata?.component || 'unknown',
                operation: metadata?.operation || 'unknown',
                ...metadata
            }
        };

        // Validate metric
        if (!validateMetricValue(metric)) {
            console.warn('Invalid metric:', metric);
            return;
        }

        // Update collection rate
        this.updateCollectionRate();

        // Store metric
        this.buffer.push(metric);

        // Check if we should flush
        if (this.shouldFlush()) {
            await this.flush();
        }
    }

    private updateCollectionRate(): void {
        const now = Date.now();
        const timeSinceLastFlush = now - this.lastFlushTime;
        if (timeSinceLastFlush > 0) {
            this.collectionRate = this.batchSize / (timeSinceLastFlush / 1000);
            
            // Adjust sampling rate based on collection rate
            if (this.collectionRate > 1000) { // More than 1000 metrics per second
                this.samplingRate = Math.max(0.1, this.samplingRate * 0.8);
            } else if (this.collectionRate < 100) { // Less than 100 metrics per second
                this.samplingRate = Math.min(1, this.samplingRate * 1.2);
            }
        }
    }

    private shouldFlush(): boolean {
        const metrics = this.buffer.getItems();
        return metrics.length >= this.batchSize;
    }

    private async flush(): Promise<void> {
        const metrics = this.buffer.getItems();
        if (metrics.length === 0) {
            return;
        }

        try {
            // Track collector metrics
            await this.metricsManager.trackMetric({
                timestamp: Date.now(),
                domain: METRIC_DOMAIN_enum.SYSTEM,
                type: METRIC_TYPE_enum.PERFORMANCE,
                value: this.collectionRate,
                metadata: {
                    component: 'MetricsCollector',
                    operation: 'collection',
                    samplingRate: this.samplingRate,
                    batchSize: metrics.length
                }
            });

            // Flush metrics in batches
            for (let i = 0; i < metrics.length; i += this.batchSize) {
                const batch = metrics.slice(i, i + this.batchSize);
                await Promise.all(batch.map(m => this.metricsManager.trackMetric(m)));
            }

            // Clear buffer and update state
            this.buffer.clear();
            this.lastFlushTime = Date.now();
        } catch (error) {
            console.error('Error flushing metrics:', error);
            // Track error
            await this.metricsManager.trackMetric({
                timestamp: Date.now(),
                domain: METRIC_DOMAIN_enum.SYSTEM,
                type: METRIC_TYPE_enum.ERROR,
                value: 1,
                metadata: {
                    component: 'MetricsCollector',
                    operation: 'flush',
                    error: error instanceof Error ? error.message : String(error)
                }
            });
        }
    }

    public getCollectionRate(): number {
        return this.collectionRate;
    }

    public getSamplingRate(): number {
        return this.samplingRate;
    }

    public async stop(): Promise<void> {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = null;
        }
        await this.flush();
    }
}

export default MetricsCollector.getInstance();
