/**
 * @file toolMetricsManager.ts
 * @path src/managers/domain/agent/toolMetricsManager.ts
 * @description Tool metrics collection and validation
 * 
 * @module @managers/domain/agent
 */

import { CoreManager } from '../../core/coreManager';
import { MANAGER_CATEGORY_enum } from '../../../types/common/enumTypes';
import { 
    IToolMetrics,
    IToolResourceMetrics,
    IToolPerformanceMetrics,
    IToolUsageMetrics,
    DefaultToolMetrics,
    ToolMetricsValidation
} from '../../../types/tool/toolMetricTypes';
import type { IBaseManager, IBaseManagerMetadata } from '../../../types/agent/agentManagerTypes';

// ─── Tool Metrics Manager ──────────────────────────────────────────────────────

export class ToolMetricsManager extends CoreManager implements IBaseManager {
    private static instance: ToolMetricsManager;
    private readonly toolMetrics: Map<string, IToolMetrics>;
    private readonly metricsHistory: Map<string, IToolMetrics[]>;
    private readonly collectionIntervals: Map<string, NodeJS.Timeout>;
    private readonly DEFAULT_SAMPLING_RATE = 1000;
    private isInitialized = false;
    public readonly category = MANAGER_CATEGORY_enum.METRICS;

    private constructor() {
        super();
        this.toolMetrics = new Map();
        this.metricsHistory = new Map();
        this.collectionIntervals = new Map();
    }

    public static getInstance(): ToolMetricsManager {
        if (!ToolMetricsManager.instance) {
            ToolMetricsManager.instance = new ToolMetricsManager();
        }
        return ToolMetricsManager.instance;
    }

    public async initialize(): Promise<void> {
        if (this.isInitialized) return;
        await super.initialize();
        this.isInitialized = true;
    }

    public async validate(params: unknown): Promise<boolean> {
        return true;
    }

    public getMetadata(): IBaseManagerMetadata {
        return {
            category: MANAGER_CATEGORY_enum.METRICS,
            operation: 'tool-metrics',
            duration: 0,
            status: 'success',
            agent: { id: '', name: '', role: '', status: '' },
            timestamp: Date.now(),
            component: 'ToolMetricsManager'
        };
    }

    public async createMetrics(toolName: string): Promise<IToolMetrics> {
        const timestamp = Date.now();
        const metrics: IToolMetrics = {
            resourceMetrics: await this.createResourceMetrics(timestamp),
            performanceMetrics: await this.createPerformanceMetrics(timestamp),
            usageMetrics: await this.createUsageMetrics(timestamp),
            timestamp
        };

        this.toolMetrics.set(toolName, metrics);
        return metrics;
    }

    public startCollection(toolName: string, samplingRate?: number): void {
        if (this.collectionIntervals.has(toolName)) {
            this.logWarn(`Metrics collection already running for tool ${toolName}`);
            return;
        }

        const interval = setInterval(
            () => this.collectMetrics(toolName),
            samplingRate || this.DEFAULT_SAMPLING_RATE
        );

        this.collectionIntervals.set(toolName, interval);
        this.logInfo(`Started metrics collection for tool ${toolName}`);
    }

    public stopCollection(toolName: string): void {
        const interval = this.collectionIntervals.get(toolName);
        if (interval) {
            clearInterval(interval);
            this.collectionIntervals.delete(toolName);
            this.logInfo(`Stopped metrics collection for tool ${toolName}`);
        }
    }

    public getMetricsHistory(toolName: string): IToolMetrics[] {
        return this.metricsHistory.get(toolName) || [];
    }

    public clearMetricsHistory(toolName: string): void {
        this.metricsHistory.delete(toolName);
    }

    public async updateMetrics(
        toolName: string,
        executionTime: number
    ): Promise<void> {
        const metrics = this.toolMetrics.get(toolName);
        if (!metrics) return;

        metrics.performanceMetrics.executionMetrics.latency.total += executionTime;
        metrics.performanceMetrics.executionMetrics.latency.average = 
            metrics.performanceMetrics.executionMetrics.latency.total / 
            (metrics.usageMetrics.totalRequests + 1);

        if (executionTime > metrics.performanceMetrics.executionMetrics.latency.max) {
            metrics.performanceMetrics.executionMetrics.latency.max = executionTime;
        }
        if (executionTime < metrics.performanceMetrics.executionMetrics.latency.min || 
            metrics.performanceMetrics.executionMetrics.latency.min === 0) {
            metrics.performanceMetrics.executionMetrics.latency.min = executionTime;
        }

        metrics.usageMetrics.totalRequests++;
        metrics.usageMetrics.requestsPerSecond = 
            metrics.usageMetrics.totalRequests / 
            ((Date.now() - metrics.timestamp) / 1000);

        const validation = ToolMetricsValidation.validateToolMetrics(metrics);
        if (!validation.isValid) {
            this.logWarn(
                `Tool metrics validation warnings: ${validation.warnings?.join(', ')}`,
                { toolName }
            );
        }

        this.toolMetrics.set(toolName, metrics);
    }

    private async collectMetrics(toolName: string): Promise<void> {
        try {
            const metrics = await this.createMetrics(toolName);
            const history = this.metricsHistory.get(toolName) || [];
            history.push(metrics);
            this.metricsHistory.set(toolName, history);

            const validation = ToolMetricsValidation.validateToolMetrics(metrics);
            if (!validation.isValid) {
                this.logError(
                    `Metrics validation failed: ${validation.errors.join(', ')}`,
                    undefined,
                    { toolName }
                );
            }

            await this.monitorMetrics(toolName, metrics);

        } catch (error) {
            this.handleError(error, `Error collecting metrics for tool ${toolName}`);
        }
    }

    private async createResourceMetrics(timestamp: number): Promise<IToolResourceMetrics> {
        return {
            cpuUsage: 0,
            memoryUsage: 0,
            diskIO: {
                read: 0,
                write: 0
            },
            networkUsage: {
                upload: 0,
                download: 0
            },
            timestamp,
            apiRateLimits: {
                current: 0,
                limit: 100,
                resetIn: 3600
            },
            serviceQuotas: {
                usagePercent: 0,
                remaining: 100,
                total: 100
            },
            connectionPool: {
                active: 0,
                idle: 0,
                maxSize: 10
            },
            integrationHealth: {
                availability: 1,
                responseTime: 0,
                connectionStatus: 1
            },
            healthStatus: DefaultToolMetrics.createDefaultHealthStatus(),
            recoveryState: DefaultToolMetrics.createDefaultRecoveryState()
        };
    }

    private async createPerformanceMetrics(timestamp: number): Promise<IToolPerformanceMetrics> {
        const defaultTime = DefaultToolMetrics.createDefaultTimeMetrics();
        const defaultThroughput = DefaultToolMetrics.createDefaultThroughputMetrics();

        return {
            executionTime: defaultTime,
            latency: defaultTime,
            throughput: defaultThroughput,
            responseTime: defaultTime,
            queueLength: 0,
            errorRate: 0,
            successRate: 1,
            errorMetrics: {
                totalErrors: 0,
                errorRate: 0
            },
            resourceUtilization: {
                cpuUsage: 0,
                memoryUsage: 0,
                diskIO: { read: 0, write: 0 },
                networkUsage: { upload: 0, download: 0 },
                timestamp
            },
            timestamp,
            executionMetrics: {
                latency: defaultTime,
                successRate: 1,
                throughput: defaultThroughput
            },
            reliabilityMetrics: {
                errors: {
                    totalErrors: 0,
                    errorRate: 0
                },
                recoveryTime: defaultTime,
                failurePatterns: {
                    types: {},
                    frequency: 0,
                    mtbf: 0
                }
            },
            responseMetrics: {
                time: defaultTime,
                dataVolume: {
                    total: 0,
                    average: 0,
                    peak: 0
                },
                processingRate: defaultThroughput
            }
        };
    }

    private async createUsageMetrics(timestamp: number): Promise<IToolUsageMetrics> {
        return {
            totalRequests: 0,
            activeUsers: 0,
            requestsPerSecond: 0,
            averageResponseSize: 0,
            peakMemoryUsage: 0,
            uptime: 0,
            timestamp,
            rateLimit: {
                current: 0,
                limit: 100,
                remaining: 100,
                resetTime: Date.now() + 3600000
            },
            utilizationMetrics: {
                callFrequency: 0,
                resourceConsumption: {
                    cpu: 0,
                    memory: 0,
                    bandwidth: 0
                },
                peakUsage: {
                    times: [],
                    values: [],
                    duration: []
                }
            },
            accessPatterns: {
                distribution: {},
                frequency: {},
                operationTypes: {}
            },
            dependencies: {
                services: [],
                resources: [],
                versions: {}
            }
        };
    }

    private async monitorMetrics(toolName: string, metrics: IToolMetrics): Promise<void> {
        if (metrics.resourceMetrics.connectionPool.active > metrics.resourceMetrics.connectionPool.maxSize * 0.8) {
            this.logWarn(
                'High connection pool usage detected',
                { toolName }
            );
        }

        if (metrics.performanceMetrics.executionMetrics.successRate < 0.95) {
            this.logWarn(
                'Low success rate detected',
                { toolName }
            );
        }

        if (metrics.usageMetrics.utilizationMetrics.resourceConsumption.memory > 0.9) {
            this.logWarn(
                'High memory usage detected',
                { toolName }
            );
        }
    }
}

export default ToolMetricsManager.getInstance();
