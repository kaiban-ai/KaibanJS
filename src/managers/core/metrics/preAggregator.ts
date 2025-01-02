export class PreAggregator {
    private metrics: Map<string, number[]>;

    constructor() {
        this.metrics = new Map();
    }

    public addMetric(event: any): void {
        const key = `${event.domain}:${event.type}`;
        if (!this.metrics.has(key)) {
            this.metrics.set(key, []);
        }
        this.metrics.get(key)?.push(event.value);
    }

    public async getAggregates(query: any): Promise<Map<string, number[]>> {
        if (query) {
            return new Map(
                Array.from(this.metrics.entries())
                    .filter(([key]) => key.includes(query.domain) && key.includes(query.type))
            );
        }
        return new Map(this.metrics);
    }
}
