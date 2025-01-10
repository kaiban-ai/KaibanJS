import { Tool } from '@langchain/core/tools';
import { CoreManager } from '../../core/coreManager';
import { MANAGER_CATEGORY_enum } from '../../../types/common/enumTypes';
import { MetricsManager } from '../../core/metricsManager';
import { METRIC_DOMAIN_enum as MetricDomain } from '../../../types/metrics/base/metricsManagerTypes';

interface IToolExecutionRecord {
    startTime: number;
    endTime?: number;
    success?: boolean;
    error?: Error;
}

export class ToolMetricsManager extends CoreManager {
    private static instance: ToolMetricsManager;
    public readonly category = MANAGER_CATEGORY_enum.METRICS;
    private toolExecutionHistory: Map<string, IToolExecutionRecord[]>;
    protected metricsManager: MetricsManager;

    private constructor() {
        super();
        this.toolExecutionHistory = new Map();
        this.metricsManager = MetricsManager.getInstance();
        this.registerDomainManager('ToolMetricsManager', this);
    }

    public static getInstance(): ToolMetricsManager {
        if (!ToolMetricsManager.instance) {
            ToolMetricsManager.instance = new ToolMetricsManager();
        }
        return ToolMetricsManager.instance;
    }

    public async trackToolExecution(params: {
        tool: Tool;
        duration: number;
        success: boolean;
        error?: Error;
    }): Promise<void> {
        const { tool, duration, success, error } = params;
        const now = Date.now();
        const history = this.toolExecutionHistory.get(tool.name) || [];
        
        history.push({
            startTime: now - duration,
            endTime: now,
            success,
            error
        });
        
        this.toolExecutionHistory.set(tool.name, history);

        await this.metricsManager.trackMetric({
            timestamp: now,
            domain: MetricDomain.TOOL,
            type: success ? 'SUCCESS' : 'ERROR',
            value: duration,
            metadata: {
                toolName: tool.name,
                error: error?.message
            }
        });
    }

    public async getToolMetrics(toolName: string): Promise<{
        totalExecutions: number;
        successfulExecutions: number;
        failedExecutions: number;
        averageDuration: number;
        lastExecutionTime?: number;
        lastError?: Error;
    }> {
        const history = this.toolExecutionHistory.get(toolName) || [];
        const durations = history
            .filter(h => h.endTime && h.startTime)
            .map(h => h.endTime! - h.startTime);

        return {
            totalExecutions: history.length,
            successfulExecutions: history.filter(h => h.success).length,
            failedExecutions: history.filter(h => !h.success).length,
            averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length || 0,
            lastExecutionTime: history[history.length - 1]?.endTime,
            lastError: history.find(h => h.error)?.error
        };
    }

    public clearMetrics(toolName: string): void {
        this.toolExecutionHistory.delete(toolName);
    }
}

export default ToolMetricsManager.getInstance();
