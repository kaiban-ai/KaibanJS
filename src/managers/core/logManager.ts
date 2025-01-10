import { CoreManager } from './coreManager';
import { MANAGER_CATEGORY_enum } from '../../types/common/enumTypes';
import type { IMetricEvent } from '../../types/metrics/base/metricTypes';
import { METRIC_DOMAIN_enum, METRIC_TYPE_enum } from '../../types/metrics/base/metricEnums';
import type { IBaseLogMetadata, ILog } from '../../types/team/teamLogsTypes';
import { v4 as uuidv4 } from 'uuid';

export class LogManager extends CoreManager {
    public readonly category = MANAGER_CATEGORY_enum.CORE;
    private readonly logs: Map<string, ILog[]>;
    private readonly maxLogsPerComponent = 1000;

    private constructor() {
        super();
        this.logs = new Map();
    }

    private static instance: LogManager | null = null;

    public static getInstance(): LogManager {
        if (!LogManager.instance) {
            LogManager.instance = new LogManager();
        }
        return LogManager.instance;
    }

    public async logEvent(
        component: string, 
        message: string, 
        level: string = 'info',
        operation: string = 'general',
        context?: Record<string, unknown>
    ): Promise<void> {
        const timestamp = Date.now();
        const metadata: IBaseLogMetadata = {
            timestamp,
            component,
            operation,
            performance: {
                startTime: timestamp,
                endTime: timestamp,
                duration: 0,
                success: true
            }
        };

        const log: ILog = {
            id: uuidv4(),
            timestamp,
            level,
            message,
            metadata,
            context,
            correlationId: context?.correlationId as string,
            traceId: context?.traceId as string,
            spanId: context?.spanId as string,
            parentSpanId: context?.parentSpanId as string,
            tags: context?.tags as string[]
        };

        let componentLogs = this.logs.get(component);
        if (!componentLogs) {
            componentLogs = [];
            this.logs.set(component, componentLogs);
        }

        componentLogs.push(log);
        if (componentLogs.length > this.maxLogsPerComponent) {
            componentLogs.shift();
        }

        // Track log event as a metric
        const metric: IMetricEvent = {
            timestamp,
            domain: METRIC_DOMAIN_enum.SYSTEM,
            type: METRIC_TYPE_enum.SYSTEM_HEALTH,
            value: 1,
            metadata: {
                component,
                operation,
                level,
                hasError: level === 'error'
            }
        };

        await this.metricsManager.trackMetric(metric);
    }

    public getLogs(component: string): ILog[] {
        return this.logs.get(component) || [];
    }

    public clearLogs(component: string): void {
        this.logs.delete(component);
    }
}

export default LogManager.getInstance();
