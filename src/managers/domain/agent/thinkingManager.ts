import { CoreManager } from '../../core/coreManager';
import { MANAGER_CATEGORY_enum } from '../../../types/common/enumTypes';
import { ErrorManager } from '../../core/errorManager';
import { MetricsManager } from '../../core/metricsManager';
import type { IMetricEvent } from '../../../types/metrics/base/metricTypes';
import { METRIC_DOMAIN_enum, METRIC_TYPE_enum } from '../../../types/metrics/base/metricEnums';

export class ThinkingManager extends CoreManager {
    public readonly category = MANAGER_CATEGORY_enum.AGENT;
    private readonly metrics: IMetricEvent[] = [];
    private readonly maxMetrics = 1000;

    private constructor() {
        super();
    }

    private static instance: ThinkingManager | null = null;

    public static getInstance(): ThinkingManager {
        if (!ThinkingManager.instance) {
            ThinkingManager.instance = new ThinkingManager();
        }
        return ThinkingManager.instance;
    }

    public async trackThinking(agentId: string, duration: number, success: boolean): Promise<void> {
        const metric: IMetricEvent = {
            timestamp: Date.now(),
            domain: METRIC_DOMAIN_enum.AGENT,
            type: success ? METRIC_TYPE_enum.SUCCESS : METRIC_TYPE_enum.ERROR,
            value: duration,
            metadata: {
                agentId,
                operation: 'thinking'
            }
        };

        this.metrics.push(metric);
        if (this.metrics.length > this.maxMetrics) {
            this.metrics.shift();
        }

        await this.metricsManager.trackMetric(metric);
    }

    public getMetrics(): IMetricEvent[] {
        return [...this.metrics];
    }

    public clearMetrics(): void {
        this.metrics.length = 0;
    }
}

export default ThinkingManager.getInstance();
