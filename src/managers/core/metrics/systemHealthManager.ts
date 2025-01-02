/**
 * @file systemHealthManager.ts
 * @path src/managers/core/metrics/systemHealthManager.ts
 * @description Optimized system health metrics manager integrated with central metrics system
 */

import { CoreManager } from '../coreManager';
import { MetricsManager } from './metricsManager';
import { MemoryManager } from './MemoryManager';
import { MetricsBenchmark } from './MetricsBenchmark';
import { MANAGER_CATEGORY_enum } from '../../../types/common/enumTypes';
import { createError, ERROR_KINDS } from '../../../types/common/errorTypes';
import { MetricDomain, MetricType } from '../../../types/metrics/base/metricsManagerTypes';
import type { 
    ICoreSystemHealthMetrics,
    ICoreSystemStability,
    ICoreSystemDegradation,
    ICoreCPUMetrics,
    ICoreMemoryMetrics,
    ICoreNetworkMetrics,
    ICoreDiskMetrics
} from '../../../types/metrics/base/systemHealthMetrics';

export class SystemHealthManager extends CoreManager {
    private static instance: SystemHealthManager | null = null;
    private readonly metricsManager: MetricsManager;
    private readonly memoryManager: MemoryManager;
    private readonly benchmark: MetricsBenchmark;
    private crashes: number[] = [];
    private startTime: number;

    public readonly category = MANAGER_CATEGORY_enum.METRICS;

    private constructor() {
        super();
        this.startTime = Date.now();
        this.metricsManager = MetricsManager.getInstance();
        this.memoryManager = new MemoryManager();
        this.benchmark = new MetricsBenchmark();
        this.registerDomainManager('SystemHealthManager', this);
    }

    public static getInstance(): SystemHealthManager {
        if (!SystemHealthManager.instance) {
            SystemHealthManager.instance = new SystemHealthManager();
        }
        return SystemHealthManager.instance;
    }

    /**
     * Get current system health metrics
     */
    public async getMetrics(): Promise<ICoreSystemHealthMetrics> {
        this.benchmark.start('getMetrics');
        
        try {
            const cpuMetrics = await this.getCPUMetrics();
            const memoryMetrics = await this.getMemoryMetrics();
            const diskMetrics = await this.getDiskMetrics();
            const networkMetrics = await this.getNetworkMetrics();
            const stability = this.calculateSystemStability();
            const degradation = await this.calculateSystemDegradation();

            // Track metrics
            await this.metricsManager.trackMetric({
                domain: MetricDomain.SYSTEM,
                type: MetricType.SYSTEM_HEALTH,
                value: stability.crashCount === 0 ? 1 : 0,
                timestamp: Date.now(),
                metadata: {
                    cpu: cpuMetrics,
                    memory: memoryMetrics,
                    disk: diskMetrics,
                    network: networkMetrics,
                    stability,
                    degradation
                }
            });

            this.benchmark.end('getMetrics');

            return {
                metrics: {
                    timestamp: Date.now(),
                    cpu: cpuMetrics,
                    memory: memoryMetrics,
                    disk: diskMetrics,
                    network: networkMetrics
                },
                status: {
                    isHealthy: stability.crashCount === 0,
                    isStable: stability.meanTimeBetweenFailures > 3600000, // 1 hour
                    isResponsive: cpuMetrics.loadAverage[0] < 0.8,
                    lastHealthCheck: Date.now(),
                    uptime: process.uptime()
                },
                capacity: {
                    maxConcurrentOperations: 100,
                    currentLoad: cpuMetrics.usage,
                    availableCapacity: 100 - cpuMetrics.usage,
                    scalingFactor: 1.0
                },
                stability,
                thresholds: {
                    cpu: { warning: 80, critical: 90 },
                    memory: { warning: 80, critical: 90 },
                    errorRate: { warning: 0.1, critical: 0.2 },
                    responseTime: { warning: 1000, critical: 2000 }
                },
                degradation
            };
        } catch (error) {
            throw createError({
                message: 'Failed to get system health metrics',
                type: ERROR_KINDS.ExecutionError,
                context: { error }
            });
        }
    }

    /**
     * Record system crash
     */
    public recordCrash(): void {
        this.crashes.push(Date.now());
    }

    /**
     * Reset crash history
     */
    public resetCrashHistory(): void {
        this.crashes = [];
    }

    /**
     * Get CPU metrics
     */
    private async getCPUMetrics(): Promise<ICoreCPUMetrics> {
        const cpuUsage = process.cpuUsage();
        const loadAvg = process.loadavg();

        return {
            usage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to seconds
            loadAverage: loadAvg,
            cores: require('os').cpus().length
        };
    }

    /**
     * Get memory metrics
     */
    private async getMemoryMetrics(): Promise<ICoreMemoryMetrics> {
        const memory = process.memoryUsage();
        const total = require('os').totalmem();

        return {
            used: memory.heapUsed,
            total: total,
            free: total - memory.heapUsed,
            heapUsage: {
                total: memory.heapTotal,
                used: memory.heapUsed,
                external: memory.external,
                arrayBuffers: memory.arrayBuffers || 0
            }
        };
    }

    /**
     * Get disk metrics
     */
    private async getDiskMetrics(): Promise<ICoreDiskMetrics> {
        // In a real implementation, you'd use a library like node-disk-info
        // For now, returning placeholder metrics
        return {
            read: 0,
            write: 0,
            free: 0,
            total: 0
        };
    }

    /**
     * Get network metrics
     */
    private async getNetworkMetrics(): Promise<ICoreNetworkMetrics> {
        // In a real implementation, you'd use system network stats
        // For now, returning placeholder metrics
        return {
            upload: 0,
            download: 0
        };
    }

    /**
     * Calculate system stability metrics
     */
    private calculateSystemStability(): ICoreSystemStability {
        const crashCount = this.crashes.length;
        const lastIncident = this.crashes.length > 0 ? Math.max(...this.crashes) : 0;

        // Calculate mean time between failures
        let meanTimeBetweenFailures = 0;
        if (this.crashes.length > 1) {
            const sortedCrashes = [...this.crashes].sort((a, b) => a - b);
            const timeBetweenFailures = sortedCrashes.slice(1).map((time, index) => 
                time - sortedCrashes[index]
            );
            meanTimeBetweenFailures = timeBetweenFailures.reduce((sum, val) => sum + val, 0) / 
                timeBetweenFailures.length;
        }

        return {
            crashCount,
            lastIncident,
            meanTimeBetweenFailures
        };
    }

    /**
     * Calculate system degradation metrics
     */
    private async calculateSystemDegradation(): Promise<ICoreSystemDegradation> {
        const performance = await this.benchmark.getBenchmarkStats('getMetrics');

        return {
            performance: {
                latencyIncrease: performance?.latencyTrend || 0,
                throughputDecrease: performance?.throughputTrend || 0,
                errorRateIncrease: this.crashes.length > 0 ? 1 : 0
            },
            resources: {
                cpuDegradation: process.cpuUsage().user / 1000000,
                memoryLeak: process.memoryUsage().heapUsed / process.memoryUsage().heapTotal,
                ioBottleneck: 0
            },
            service: {
                availabilityImpact: this.crashes.length > 0 ? 0.1 * this.crashes.length : 0,
                reliabilityImpact: this.crashes.length > 0 ? 0.1 * this.crashes.length : 0,
                qualityImpact: 0
            }
        };
    }
}

export default SystemHealthManager.getInstance();