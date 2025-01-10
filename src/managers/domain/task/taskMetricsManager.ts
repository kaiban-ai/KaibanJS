import { CoreManager } from '../../core/coreManager';
import { MANAGER_CATEGORY_enum } from '../../../types/common/enumTypes';
import type { IMetricEvent } from '../../../types/metrics/base/metricTypes';
import { METRIC_DOMAIN_enum, METRIC_TYPE_enum } from '../../../types/metrics/base/metricEnums';

export class TaskMetricsManager extends CoreManager {
    public readonly category = MANAGER_CATEGORY_enum.METRICS;

    private constructor() {
        super();
    }

    private static instance: TaskMetricsManager | null = null;

    public static getInstance(): TaskMetricsManager {
        if (!TaskMetricsManager.instance) {
            TaskMetricsManager.instance = new TaskMetricsManager();
        }
        return TaskMetricsManager.instance;
    }

    public async trackExecution(
        taskId: string, 
        duration: number, 
        success: boolean,
        operationsPerSecond?: number
    ): Promise<void> {
        const metrics: IMetricEvent[] = [
            // Status metric
            {
                timestamp: Date.now(),
                domain: METRIC_DOMAIN_enum.TASK,
                type: success ? METRIC_TYPE_enum.SUCCESS : METRIC_TYPE_enum.ERROR,
                value: 1,
                metadata: {
                    taskId,
                    component: 'task',
                    operation: 'execution',
                    duration
                }
            },
            // Latency metric
            {
                timestamp: Date.now(),
                domain: METRIC_DOMAIN_enum.TASK,
                type: METRIC_TYPE_enum.LATENCY,
                value: duration,
                metadata: {
                    taskId,
                    component: 'task',
                    operation: 'execution'
                }
            }
        ];

        // Add throughput metric if provided
        if (operationsPerSecond !== undefined) {
            metrics.push({
                timestamp: Date.now(),
                domain: METRIC_DOMAIN_enum.TASK,
                type: METRIC_TYPE_enum.THROUGHPUT,
                value: operationsPerSecond,
                metadata: {
                    taskId,
                    component: 'task',
                    operation: 'execution'
                }
            });
        }

        await Promise.all(metrics.map(m => this.metricsManager.trackMetric(m)));
    }

    public async trackResource(taskId: string, resourceType: 'cpu' | 'memory' | 'network', value: number, cost?: number): Promise<void> {
        const metricType = resourceType === 'cpu' ? METRIC_TYPE_enum.CPU :
                          resourceType === 'memory' ? METRIC_TYPE_enum.MEMORY :
                          METRIC_TYPE_enum.NETWORK;

        const metric: IMetricEvent = {
            timestamp: Date.now(),
            domain: METRIC_DOMAIN_enum.TASK,
            type: metricType,
            value,
            metadata: {
                taskId,
                component: 'task',
                operation: 'resource',
                ...(cost && { cost })
            }
        };

        await this.metricsManager.trackMetric(metric);
    }

    public async trackStateTransition(taskId: string, from: string, to: string): Promise<void> {
        const metric: IMetricEvent = {
            timestamp: Date.now(),
            domain: METRIC_DOMAIN_enum.TASK,
            type: METRIC_TYPE_enum.STATE_TRANSITION,
            value: 1,
            metadata: {
                taskId,
                component: 'task',
                operation: 'state',
                from,
                to
            }
        };

        await this.metricsManager.trackMetric(metric);
    }
}

export default TaskMetricsManager.getInstance();
