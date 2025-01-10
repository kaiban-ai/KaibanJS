import { CoreManager } from '../../core/coreManager';
import { MANAGER_CATEGORY_enum } from '../../../types/common/enumTypes';
import type { IMetricEvent } from '../../../types/metrics/base/metricTypes';
import { METRIC_DOMAIN_enum, METRIC_TYPE_enum } from '../../../types/metrics/base/metricEnums';
import type { ILLMConfig } from '../../../types/llm/llmConfigTypes';

interface ILLMInstance {
    id: string;
    config: ILLMConfig;
    startTime: number;
}

export class LLMInitializationManager extends CoreManager {
    public readonly category = MANAGER_CATEGORY_enum.CORE;
    private readonly activeInstances: Map<string, ILLMInstance>;
    private readonly metrics: IMetricEvent[] = [];
    private readonly maxMetrics = 1000;

    private constructor() {
        super();
        this.activeInstances = new Map();
    }

    private static instance: LLMInitializationManager | null = null;

    public static getInstance(): LLMInitializationManager {
        if (!LLMInitializationManager.instance) {
            LLMInitializationManager.instance = new LLMInitializationManager();
        }
        return LLMInitializationManager.instance;
    }

    public async initializeLLM(id: string, config: ILLMConfig): Promise<void> {
        const startTime = Date.now();

        const instance: ILLMInstance = {
            id,
            config,
            startTime
        };

        this.activeInstances.set(id, instance);

        const metric: IMetricEvent = {
            timestamp: startTime,
            domain: METRIC_DOMAIN_enum.SYSTEM,
            type: METRIC_TYPE_enum.INITIALIZATION,
            value: 1,
            metadata: {
                instanceId: id,
                provider: config.provider.type,
                model: config.model.modelName,
                operation: 'initialize'
            }
        };

        this.metrics.push(metric);
        if (this.metrics.length > this.maxMetrics) {
            this.metrics.shift();
        }

        await this.metricsManager.trackMetric(metric);
    }

    public async terminateLLM(id: string): Promise<void> {
        const instance = this.activeInstances.get(id);
        if (!instance) {
            throw new Error(`LLM instance not found: ${id}`);
        }

        const duration = Date.now() - instance.startTime;
        this.activeInstances.delete(id);

        const metric: IMetricEvent = {
            timestamp: Date.now(),
            domain: METRIC_DOMAIN_enum.SYSTEM,
            type: METRIC_TYPE_enum.STATE_TRANSITION,
            value: duration,
            metadata: {
                instanceId: id,
                provider: instance.config.provider.type,
                model: instance.config.model.modelName,
                operation: 'terminate',
                duration
            }
        };

        this.metrics.push(metric);
        if (this.metrics.length > this.maxMetrics) {
            this.metrics.shift();
        }

        await this.metricsManager.trackMetric(metric);
    }

    public getInstance(id: string): ILLMInstance | undefined {
        return this.activeInstances.get(id);
    }

    public getMetrics(): IMetricEvent[] {
        return [...this.metrics];
    }

    public clearMetrics(): void {
        this.metrics.length = 0;
    }
}

export default LLMInitializationManager.getInstance();
