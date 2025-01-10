import { CoreManager } from '../../core/coreManager';
import { MANAGER_CATEGORY_enum } from '../../../types/common/enumTypes';
import type { IMetricEvent } from '../../../types/metrics/base/metricTypes';
import { METRIC_DOMAIN_enum, METRIC_TYPE_enum } from '../../../types/metrics/base/metricEnums';
import type { ILLMProviderConfig } from '../../../types/llm/llmConfigTypes';

interface IProviderInstance {
    config: ILLMProviderConfig;
    lastUsed: number;
}

export class ProviderManager extends CoreManager {
    public readonly category = MANAGER_CATEGORY_enum.RESOURCE;
    private readonly providers: Map<string, IProviderInstance>;
    private readonly metrics: IMetricEvent[] = [];
    private readonly maxMetrics = 1000;

    private constructor() {
        super();
        this.providers = new Map();
    }

    private static instance: ProviderManager | null = null;

    public static getInstance(): ProviderManager {
        if (!ProviderManager.instance) {
            ProviderManager.instance = new ProviderManager();
        }
        return ProviderManager.instance;
    }

    public async registerProvider(providerId: string, config: ILLMProviderConfig): Promise<void> {
        const provider: IProviderInstance = {
            config,
            lastUsed: Date.now()
        };

        this.providers.set(providerId, provider);

        const metric: IMetricEvent = {
            timestamp: Date.now(),
            domain: METRIC_DOMAIN_enum.SYSTEM,
            type: METRIC_TYPE_enum.INITIALIZATION,
            value: 1,
            metadata: {
                providerId,
                providerType: config.type,
                operation: 'register'
            }
        };

        this.metrics.push(metric);
        if (this.metrics.length > this.maxMetrics) {
            this.metrics.shift();
        }

        await this.metricsManager.trackMetric(metric);
    }

    public async trackProviderUsage(providerId: string, tokens: number, cost: number): Promise<void> {
        const provider = this.providers.get(providerId);
        if (!provider) {
            throw new Error(`Provider not found: ${providerId}`);
        }

        provider.lastUsed = Date.now();

        const metric: IMetricEvent = {
            timestamp: Date.now(),
            domain: METRIC_DOMAIN_enum.SYSTEM,
            type: METRIC_TYPE_enum.USAGE,
            value: tokens,
            metadata: {
                providerId,
                providerType: provider.config.type,
                cost,
                operation: 'usage'
            }
        };

        this.metrics.push(metric);
        if (this.metrics.length > this.maxMetrics) {
            this.metrics.shift();
        }

        await this.metricsManager.trackMetric(metric);
    }

    public getProvider(providerId: string): IProviderInstance | undefined {
        return this.providers.get(providerId);
    }

    public getMetrics(): IMetricEvent[] {
        return [...this.metrics];
    }

    public clearMetrics(): void {
        this.metrics.length = 0;
    }
}

export default ProviderManager.getInstance();
