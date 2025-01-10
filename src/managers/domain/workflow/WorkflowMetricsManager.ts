import { CoreManager } from '../../core/coreManager';
import { MANAGER_CATEGORY_enum } from '../../../types/common/enumTypes';
import type { IMetricEvent } from '../../../types/metrics/base/metricTypes';
import { METRIC_DOMAIN_enum, METRIC_TYPE_enum } from '../../../types/metrics/base/metricEnums';

export class WorkflowMetricsManager extends CoreManager {
    public readonly category = MANAGER_CATEGORY_enum.METRICS;

    private constructor() {
        super();
    }

    private static instance: WorkflowMetricsManager | null = null;

    public static getInstance(): WorkflowMetricsManager {
        if (!WorkflowMetricsManager.instance) {
            WorkflowMetricsManager.instance = new WorkflowMetricsManager();
        }
        return WorkflowMetricsManager.instance;
    }

    public async trackExecution(
        workflowId: string, 
        duration: number, 
        success: boolean,
        operationsPerSecond?: number
    ): Promise<void> {
        const metrics: IMetricEvent[] = [
            // Status metric
            {
                timestamp: Date.now(),
                domain: METRIC_DOMAIN_enum.WORKFLOW,
                type: success ? METRIC_TYPE_enum.SUCCESS : METRIC_TYPE_enum.ERROR,
                value: 1,
                metadata: {
                    workflowId,
                    component: 'workflow',
                    operation: 'execution',
                    duration
                }
            },
            // Latency metric
            {
                timestamp: Date.now(),
                domain: METRIC_DOMAIN_enum.WORKFLOW,
                type: METRIC_TYPE_enum.LATENCY,
                value: duration,
                metadata: {
                    workflowId,
                    component: 'workflow',
                    operation: 'execution'
                }
            }
        ];

        // Add throughput metric if provided
        if (operationsPerSecond !== undefined) {
            metrics.push({
                timestamp: Date.now(),
                domain: METRIC_DOMAIN_enum.WORKFLOW,
                type: METRIC_TYPE_enum.THROUGHPUT,
                value: operationsPerSecond,
                metadata: {
                    workflowId,
                    component: 'workflow',
                    operation: 'execution'
                }
            });
        }

        await Promise.all(metrics.map(m => this.metricsManager.trackMetric(m)));
    }

    public async trackResource(workflowId: string, resourceType: 'cpu' | 'memory' | 'network', value: number): Promise<void> {
        const metricType = resourceType === 'cpu' ? METRIC_TYPE_enum.CPU :
                          resourceType === 'memory' ? METRIC_TYPE_enum.MEMORY :
                          METRIC_TYPE_enum.NETWORK;

        const metric: IMetricEvent = {
            timestamp: Date.now(),
            domain: METRIC_DOMAIN_enum.WORKFLOW,
            type: metricType,
            value,
            metadata: {
                workflowId,
                component: 'workflow',
                operation: 'resource'
            }
        };

        await this.metricsManager.trackMetric(metric);
    }

    public async trackStateTransition(workflowId: string, from: string, to: string): Promise<void> {
        const metric: IMetricEvent = {
            timestamp: Date.now(),
            domain: METRIC_DOMAIN_enum.WORKFLOW,
            type: METRIC_TYPE_enum.STATE_TRANSITION,
            value: 1,
            metadata: {
                workflowId,
                component: 'workflow',
                operation: 'state',
                from,
                to
            }
        };

        await this.metricsManager.trackMetric(metric);
    }
}

export default WorkflowMetricsManager.getInstance();
