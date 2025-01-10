import { CoreManager } from './coreManager';
import { IMetricEvent } from '../../types/metrics/base/metricEvents';
import { MANAGER_CATEGORY_enum } from '../../types/common/enumTypes';
import { METRIC_DOMAIN_enum as MetricDomain } from '../../types/metrics/base/metricsManagerTypes';

export class MetricsManager extends CoreManager {
  private static instance: MetricsManager;
  private metrics: Map<string, IMetricEvent[]>;

  public readonly category = MANAGER_CATEGORY_enum.METRICS;

  private constructor() {
    super();
    this.metrics = new Map();
    this.registerDomainManager('MetricsManager', this);
  }

  public static getInstance(): MetricsManager {
    if (!MetricsManager.instance) {
      MetricsManager.instance = new MetricsManager();
    }
    return MetricsManager.instance;
  }

  public async trackMetric(event: IMetricEvent): Promise<void> {
    const key = `${event.domain}:${event.type}`;
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    this.metrics.get(key)?.push(event);
  }

  public async getMetrics(domain: MetricDomain): Promise<IMetricEvent[]> {
    const result: IMetricEvent[] = [];
    for (const [key, events] of this.metrics.entries()) {
      if (key.startsWith(domain)) {
        result.push(...events);
      }
    }
    return result;
  }

  public async clearMetrics(domain: MetricDomain): Promise<void> {
    for (const [key] of this.metrics.entries()) {
      if (key.startsWith(domain)) {
        this.metrics.delete(key);
      }
    }
  }

  public getMetricsCount(): number {
    let count = 0;
    for (const events of this.metrics.values()) {
      count += events.length;
    }
    return count;
  }
}

export default MetricsManager.getInstance();
