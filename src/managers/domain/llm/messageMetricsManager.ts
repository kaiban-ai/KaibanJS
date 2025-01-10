import { CoreManager } from '../../core/coreManager';
import { MANAGER_CATEGORY_enum } from '../../../types/common/enumTypes';
import type { IMetricEvent } from '../../../types/metrics/base/metricTypes';
import { METRIC_DOMAIN_enum, METRIC_TYPE_enum } from '../../../types/metrics/base/metricEnums';

export class MessageMetricsManager extends CoreManager {
    public readonly category = MANAGER_CATEGORY_enum.METRICS;

    private constructor() {
        super();
    }

    private static instance: MessageMetricsManager | null = null;

    public static getInstance(): MessageMetricsManager {
        if (!MessageMetricsManager.instance) {
            MessageMetricsManager.instance = new MessageMetricsManager();
        }
        return MessageMetricsManager.instance;
    }

    public async trackTokenUsage(messageId: string, tokens: number, cost: number): Promise<void> {
        const metric: IMetricEvent = {
            timestamp: Date.now(),
            domain: METRIC_DOMAIN_enum.LLM,
            type: METRIC_TYPE_enum.USAGE,
            value: tokens,
            metadata: {
                messageId,
                component: 'message',
                operation: 'tokens',
                cost
            }
        };

        await this.metricsManager.trackMetric(metric);
    }

    public async trackPerformance(messageId: string, latency: number, tokensPerSecond?: number): Promise<void> {
        const metrics: IMetricEvent[] = [
            {
                timestamp: Date.now(),
                domain: METRIC_DOMAIN_enum.LLM,
                type: METRIC_TYPE_enum.LATENCY,
                value: latency,
                metadata: {
                    messageId,
                    component: 'message',
                    operation: 'processing'
                }
            }
        ];

        if (tokensPerSecond !== undefined) {
            metrics.push({
                timestamp: Date.now(),
                domain: METRIC_DOMAIN_enum.LLM,
                type: METRIC_TYPE_enum.THROUGHPUT,
                value: tokensPerSecond,
                metadata: {
                    messageId,
                    component: 'message',
                    operation: 'processing'
                }
            });
        }

        await Promise.all(metrics.map(m => this.metricsManager.trackMetric(m)));
    }
}

export default MessageMetricsManager.getInstance();
