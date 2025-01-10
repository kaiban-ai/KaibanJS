import { CoreManager } from '../../core/coreManager';
import { MANAGER_CATEGORY_enum } from '../../../types/common/enumTypes';
import type { IMetricEvent } from '../../../types/metrics/base/metricTypes';
import { METRIC_DOMAIN_enum, METRIC_TYPE_enum } from '../../../types/metrics/base/metricEnums';

export class AgentManager extends CoreManager {
    public readonly category = MANAGER_CATEGORY_enum.AGENT;
    private readonly metrics: IMetricEvent[] = [];
    private readonly maxMetrics = 1000;

    private constructor() {
        super();
    }

    private static instance: AgentManager | null = null;

    public static getInstance(): AgentManager {
        if (!AgentManager.instance) {
            AgentManager.instance = new AgentManager();
        }
        return AgentManager.instance;
    }

    public async trackAgentMetric(agentId: string, type: METRIC_TYPE_enum, value: number, metadata?: Record<string, unknown>): Promise<void> {
        const metric: IMetricEvent = {
            timestamp: Date.now(),
            domain: METRIC_DOMAIN_enum.AGENT,
            type,
            value,
            metadata: {
                agentId,
                ...metadata
            }
        };

        this.metrics.push(metric);
        if (this.metrics.length > this.maxMetrics) {
            this.metrics.shift();
        }

        await this.metricsManager.trackMetric(metric);
    }

    public async trackAgentError(agentId: string, error: Error): Promise<void> {
        await this.trackAgentMetric(agentId, METRIC_TYPE_enum.ERROR, 1, {
            error: error.message,
            stack: error.stack,
            timestamp: Date.now()
        });
    }

    public getMetrics(): IMetricEvent[] {
        return [...this.metrics];
    }

    public clearMetrics(): void {
        this.metrics.length = 0;
    }
}

export default AgentManager.getInstance();
