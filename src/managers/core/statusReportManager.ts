import { CoreManager } from './coreManager';
import { MANAGER_CATEGORY_enum } from '../../types/common/enumTypes';
import type { IMetricEvent } from '../../types/metrics/base/metricTypes';
import { METRIC_DOMAIN_enum, METRIC_TYPE_enum } from '../../types/metrics/base/metricEnums';

interface IStatusTrendAnalysis {
    anomalies: Array<{
        type: string;
        severity: string;
        message: string;
        timestamp: number;
    }>;
    recommendations: Array<{
        type: string;
        priority: string;
        message: string;
    }>;
}

export class StatusReportManager extends CoreManager {
    public readonly category = MANAGER_CATEGORY_enum.CORE;
    private readonly metrics: IMetricEvent[] = [];
    private readonly maxMetrics = 1000;

    private constructor() {
        super();
    }

    private static instance: StatusReportManager | null = null;

    public static getInstance(): StatusReportManager {
        if (!StatusReportManager.instance) {
            StatusReportManager.instance = new StatusReportManager();
        }
        return StatusReportManager.instance;
    }

    public async analyzeMetrics(metrics: IMetricEvent[]): Promise<IStatusTrendAnalysis> {
        const anomalies: IStatusTrendAnalysis['anomalies'] = [];
        const recommendations: IStatusTrendAnalysis['recommendations'] = [];

        // Analyze error metrics
        const errorMetrics = metrics.filter(m => m.type === METRIC_TYPE_enum.ERROR);
        if (errorMetrics.length > 0) {
            anomalies.push({
                type: 'error_rate',
                severity: 'high',
                message: `Found ${errorMetrics.length} errors`,
                timestamp: Date.now()
            });

            recommendations.push({
                type: 'error_handling',
                priority: 'high',
                message: 'Review error patterns and implement mitigation strategies'
            });
        }

        // Analyze performance metrics
        const perfMetrics = metrics.filter(m => m.type === METRIC_TYPE_enum.PERFORMANCE);
        if (perfMetrics.length > 0) {
            const avgValue = perfMetrics.reduce((sum, m) => sum + m.value, 0) / perfMetrics.length;
            if (avgValue > 1000) { // Example threshold
                anomalies.push({
                    type: 'performance_degradation',
                    severity: 'medium',
                    message: `Average response time (${avgValue.toFixed(2)}ms) exceeds threshold`,
                    timestamp: Date.now()
                });

                recommendations.push({
                    type: 'performance_optimization',
                    priority: 'medium',
                    message: 'Consider implementing performance optimizations'
                });
            }
        }

        // Track analysis as a metric
        const analysisMetric: IMetricEvent = {
            timestamp: Date.now(),
            domain: METRIC_DOMAIN_enum.SYSTEM,
            type: METRIC_TYPE_enum.SYSTEM_HEALTH,
            value: anomalies.length,
            metadata: {
                anomalyCount: anomalies.length,
                recommendationCount: recommendations.length
            }
        };

        this.metrics.push(analysisMetric);
        if (this.metrics.length > this.maxMetrics) {
            this.metrics.shift();
        }

        await this.metricsManager.trackMetric(analysisMetric);

        return {
            anomalies,
            recommendations
        };
    }

    public getMetrics(): IMetricEvent[] {
        return [...this.metrics];
    }

    public clearMetrics(): void {
        this.metrics.length = 0;
    }
}

export default StatusReportManager.getInstance();
