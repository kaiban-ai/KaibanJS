import { CoreManager } from '../../core/coreManager';
import { MANAGER_CATEGORY_enum } from '../../../types/common/enumTypes';
import { METRIC_DOMAIN_enum as MetricDomain } from '../../../types/metrics/base/metricsManagerTypes';
import { IMetricEvent } from '../../../types/metrics/base/metricEvents';
import { MetricsManager } from '../../core/metricsManager';
import type { IAgentType } from '../../../types/agent/agentBaseTypes';
import type { ITaskType } from '../../../types/task/taskBaseTypes';

export class AgentMetricsManager extends CoreManager {
    private static instance: AgentMetricsManager;
    public readonly category = MANAGER_CATEGORY_enum.METRICS;
    protected metricsManager: MetricsManager;

    private constructor() {
        super();
        this.metricsManager = MetricsManager.getInstance();
        this.registerDomainManager('AgentMetricsManager', this);
    }

    public static getInstance(): AgentMetricsManager {
        if (!AgentMetricsManager.instance) {
            AgentMetricsManager.instance = new AgentMetricsManager();
        }
        return AgentMetricsManager.instance;
    }

    public async trackMetric(event: IMetricEvent): Promise<void> {
        await this.metricsManager.trackMetric(event);
    }

    public async trackAgentExecution(
        agent: IAgentType,
        task: ITaskType,
        duration: number
    ): Promise<void> {
        await this.trackMetric({
            timestamp: Date.now(),
            domain: MetricDomain.AGENT,
            type: 'PERFORMANCE',
            value: duration,
            metadata: {
                agentId: agent.id,
                taskId: task.id,
                status: agent.status,
                operation: 'execution'
            }
        });
    }

    public async getMetrics(): Promise<IMetricEvent[]> {
        return this.metricsManager.getMetrics(MetricDomain.AGENT);
    }

    public async clearMetrics(): Promise<void> {
        await this.metricsManager.clearMetrics(MetricDomain.AGENT);
    }
}

export default AgentMetricsManager.getInstance();
