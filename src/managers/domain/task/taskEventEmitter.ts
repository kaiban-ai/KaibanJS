import { CoreManager } from '../../core/coreManager';
import { MANAGER_CATEGORY_enum } from '../../../types/common/enumTypes';
import type { IMetricEvent } from '../../../types/metrics/base/metricTypes';
import { METRIC_DOMAIN_enum, METRIC_TYPE_enum } from '../../../types/metrics/base/metricEnums';

export class TaskEventEmitter extends CoreManager {
    public readonly category = MANAGER_CATEGORY_enum.EXECUTION;

    private constructor() {
        super();
    }

    private static instance: TaskEventEmitter | null = null;

    public static getInstance(): TaskEventEmitter {
        if (!TaskEventEmitter.instance) {
            TaskEventEmitter.instance = new TaskEventEmitter();
        }
        return TaskEventEmitter.instance;
    }

    public async trackTaskEvent(taskId: string, duration: number, success: boolean): Promise<void> {
        const metric: IMetricEvent = {
            timestamp: Date.now(),
            domain: METRIC_DOMAIN_enum.TASK,
            type: success ? METRIC_TYPE_enum.SUCCESS : METRIC_TYPE_enum.ERROR,
            value: duration,
            metadata: {
                taskId,
                operation: 'execution'
            }
        };

        await this.metricsManager.trackMetric(metric);
    }
}

export default TaskEventEmitter.getInstance();
