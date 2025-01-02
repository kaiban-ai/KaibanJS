import { IMetricEvent } from '../../../types/metrics/base/metricsManagerTypes';

export class MetricAggregator {
    private aggregates: Map<string, number>;

    constructor() {
        this.aggregates = new Map();
    }

    public add(event: IMetricEvent): void {
        const key = `${event.domain}:${event.type}`;
        const current = this.aggregates.get(key) || 0;
        this.aggregates.set(key, current + event.value);
    }

    public getAggregates(): Record<string, number> {
        return Object.fromEntries(this.aggregates);
    }

    public clear(): void {
        this.aggregates.clear();
    }
}
