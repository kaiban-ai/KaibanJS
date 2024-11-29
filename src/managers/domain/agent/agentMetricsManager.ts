/**
 * @file agentMetricsManager.ts
 * @path KaibanJS/src/managers/domain/agent/agentMetricsManager.ts
 * @description Dedicated manager for agent metrics collection, validation, and monitoring
 */

import CoreManager from '../../core/coreManager';
import { createValidationResult } from '../../../types/common/commonValidationTypes';

import {
    AgentMetricsValidation
} from '../../../types/agent/agentMetricTypes';

import type {
    IAgentResourceMetrics,
    IAgentPerformanceMetrics,
    IAgentUsageMetrics
} from '../../../types/agent/agentMetricTypes';

import type { ITimeMetrics, IThroughputMetrics, IErrorMetrics } from '../../../types/metrics';
import type { IValidationResult } from '../../../types/common/commonValidationTypes';

interface IMetricsCollectionOptions {
    detailed?: boolean;
    includeHistory?: boolean;
    samplingRate?: number;
}

interface IMetricsSnapshot {
    agentId: string;
    timestamp: number;
    resources: IAgentResourceMetrics;
    performance: IAgentPerformanceMetrics;
    usage: IAgentUsageMetrics;
}

/**
 * Manages agent metrics collection, validation, and monitoring
 */
export class AgentMetricsManager extends CoreManager {
    private static instance: AgentMetricsManager;
    private metricsHistory: Map<string, IMetricsSnapshot[]> = new Map();
    private collectionIntervals: Map<string, NodeJS.Timeout> = new Map();
    private readonly DEFAULT_SAMPLING_RATE = 1000; // 1 second

    protected constructor() {
        super();
        this.registerDomainManager('AgentMetricsManager', this);
    }

    public static getInstance(): AgentMetricsManager {
        if (!AgentMetricsManager.instance) {
            AgentMetricsManager.instance = new AgentMetricsManager();
        }
        return AgentMetricsManager.instance;
    }

    /**
     * Get current metrics for an agent
     */
    public async getCurrentMetrics(agentId: string): Promise<IMetricsSnapshot> {
        return {
            agentId,
            timestamp: Date.now(),
            resources: await this.createResourceMetrics(),
            performance: await this.createPerformanceMetrics(),
            usage: await this.createUsageMetrics()
        };
    }

    /**
     * Create resource metrics
     */
    private async createResourceMetrics(): Promise<IAgentResourceMetrics> {
        return {
            cognitive: {
                memoryAllocation: process.memoryUsage().heapUsed,
                cognitiveLoad: 0.5,
                processingCapacity: 0.8,
                contextUtilization: 0.4
            },
            cpuUsage: await this.getCPUUsage(),
            memoryUsage: process.memoryUsage().heapUsed,
            diskIO: await this.getDiskIO(),
            networkUsage: await this.getNetworkUsage(),
            timestamp: Date.now()
        };
    }

    /**
     * Create performance metrics
     */
    private async createPerformanceMetrics(): Promise<IAgentPerformanceMetrics> {
        const timeMetrics: ITimeMetrics = {
            total: 0,
            average: 0,
            min: 0,
            max: 0
        };

        const throughputMetrics: IThroughputMetrics = {
            operationsPerSecond: 0,
            dataProcessedPerSecond: 0
        };

        const errorMetrics: IErrorMetrics = {
            totalErrors: 0,
            errorRate: 0
        };

        return {
            thinking: {
                reasoningTime: timeMetrics,
                planningTime: timeMetrics,
                learningTime: timeMetrics,
                decisionConfidence: 0.8,
                learningEfficiency: 0.7
            },
            taskSuccessRate: 0.9,
            goalAchievementRate: 0.85,
            executionTime: timeMetrics,
            latency: timeMetrics,
            throughput: throughputMetrics,
            responseTime: timeMetrics,
            queueLength: 0,
            errorRate: 0,
            successRate: 1,
            errorMetrics,
            resourceUtilization: await this.createResourceMetrics(),
            timestamp: Date.now()
        };
    }

    /**
     * Create usage metrics
     */
    private async createUsageMetrics(): Promise<IAgentUsageMetrics> {
        return {
            state: {
                currentState: 'active',
                stateTime: 0,
                transitionCount: 0,
                failedTransitions: 0,
                blockedTaskCount: 0,
                historyEntryCount: 0,
                lastHistoryUpdate: Date.now()
            },
            toolUsageFrequency: {},
            taskCompletionCount: 0,
            averageTaskTime: 0,
            totalRequests: 0,
            activeUsers: 1,
            requestsPerSecond: 0,
            averageResponseSize: 0,
            peakMemoryUsage: process.memoryUsage().heapUsed,
            uptime: process.uptime(),
            rateLimit: {
                current: 0,
                limit: 100,
                remaining: 100,
                resetTime: Date.now() + 3600000
            },
            timestamp: Date.now()
        };
    }

    /**
     * Start metrics collection for an agent
     */
    public startCollection(agentId: string, options: IMetricsCollectionOptions = {}): void {
        if (this.collectionIntervals.has(agentId)) {
            this.log(`Metrics collection already running for agent ${agentId}`, 'AgentMetricsManager', agentId, 'warn');
            return;
        }

        const interval = setInterval(
            () => this.collectMetrics(agentId, options),
            options.samplingRate || this.DEFAULT_SAMPLING_RATE
        );

        this.collectionIntervals.set(agentId, interval);
        this.log(`Started metrics collection for agent ${agentId}`, 'AgentMetricsManager', agentId, 'info');
    }

    /**
     * Stop metrics collection for an agent
     */
    public stopCollection(agentId: string): void {
        const interval = this.collectionIntervals.get(agentId);
        if (interval) {
            clearInterval(interval);
            this.collectionIntervals.delete(agentId);
            this.log(`Stopped metrics collection for agent ${agentId}`, 'AgentMetricsManager', agentId, 'info');
        }
    }

    /**
     * Get metrics history for an agent
     */
    public getMetricsHistory(agentId: string): IMetricsSnapshot[] {
        return this.metricsHistory.get(agentId) || [];
    }

    /**
     * Clear metrics history for an agent
     */
    public clearMetricsHistory(agentId: string): void {
        this.metricsHistory.delete(agentId);
    }

    /**
     * Collect current metrics for an agent
     */
    private async collectMetrics(agentId: string, options: IMetricsCollectionOptions): Promise<void> {
        try {
            const snapshot = await this.createMetricsSnapshot(agentId);
            
            if (options.includeHistory) {
                const history = this.metricsHistory.get(agentId) || [];
                history.push(snapshot);
                this.metricsHistory.set(agentId, history);
            }

            // Validate metrics
            const validationResult = await this.validateMetricsSnapshot(snapshot);
            if (!validationResult.isValid) {
                this.log(
                    `Metrics validation failed: ${validationResult.errors.join(', ')}`,
                    'AgentMetricsManager',
                    agentId,
                    'error'
                );
            }

            // Monitor for anomalies
            await this.monitorMetrics(agentId, snapshot);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.log(
                `Error collecting metrics: ${errorMessage}`,
                'AgentMetricsManager',
                agentId,
                'error',
                error instanceof Error ? error : new Error(errorMessage)
            );
        }
    }

    /**
     * Create a snapshot of current metrics
     */
    private async createMetricsSnapshot(agentId: string): Promise<IMetricsSnapshot> {
        return await this.getCurrentMetrics(agentId);
    }

    /**
     * Get current CPU usage
     */
    private async getCPUUsage(): Promise<number> {
        // TODO: Implement CPU usage monitoring
        return 0;
    }

    /**
     * Get current disk I/O statistics
     */
    private async getDiskIO(): Promise<{ read: number; write: number }> {
        // TODO: Implement disk I/O monitoring
        return { read: 0, write: 0 };
    }

    /**
     * Get current network usage statistics
     */
    private async getNetworkUsage(): Promise<{ upload: number; download: number }> {
        // TODO: Implement network usage monitoring
        return { upload: 0, download: 0 };
    }

    /**
     * Monitor metrics for anomalies
     */
    private async monitorMetrics(agentId: string, snapshot: IMetricsSnapshot): Promise<void> {
        // Monitor cognitive load
        if (snapshot.resources.cognitive.cognitiveLoad > 0.9) {
            this.log(
                `High cognitive load detected: ${snapshot.resources.cognitive.cognitiveLoad}`,
                'AgentMetricsManager',
                agentId,
                'warn'
            );
        }

        // Monitor memory usage
        if (snapshot.resources.memoryUsage > 1e9) { // 1GB
            this.log(
                `High memory usage detected: ${snapshot.resources.memoryUsage} bytes`,
                'AgentMetricsManager',
                agentId,
                'warn'
            );
        }

        // Monitor error rates
        if (snapshot.performance.errorRate > 0.1) {
            this.log(
                `High error rate detected: ${snapshot.performance.errorRate}`,
                'AgentMetricsManager',
                agentId,
                'warn'
            );
        }

        // Monitor performance degradation
        if (snapshot.performance.thinking.learningEfficiency < 0.5) {
            this.log(
                `Low learning efficiency detected: ${snapshot.performance.thinking.learningEfficiency}`,
                'AgentMetricsManager',
                agentId,
                'warn'
            );
        }

        // Monitor blocked tasks
        if (snapshot.usage.state.blockedTaskCount > 0) {
            this.log(
                `Blocked tasks detected: ${snapshot.usage.state.blockedTaskCount}`,
                'AgentMetricsManager',
                agentId,
                'warn'
            );
        }
    }

    /**
     * Validate a metrics snapshot
     */
    private async validateMetricsSnapshot(snapshot: IMetricsSnapshot): Promise<IValidationResult> {
        const startTime = Date.now();
        
        const result = createValidationResult({
            isValid: true,
            errors: [],
            warnings: [],
            metadata: {
                component: 'AgentMetricsValidator',
                validatedFields: ['agentId', 'resources', 'performance', 'usage', 'state'],
                validationDuration: 0,
                timestamp: startTime
            }
        });
        
        // Validate resource metrics
        const resourceResult = AgentMetricsValidation.validateAgentResourceMetrics(snapshot.resources);
        result.errors.push(...resourceResult.errors);
        result.warnings.push(...resourceResult.warnings);

        // Validate performance metrics
        const performanceResult = AgentMetricsValidation.validateAgentPerformanceMetrics(snapshot.performance);
        result.errors.push(...performanceResult.errors);
        result.warnings.push(...performanceResult.warnings);

        // Validate usage metrics
        const usageResult = AgentMetricsValidation.validateAgentUsageMetrics(snapshot.usage);
        result.errors.push(...usageResult.errors);
        result.warnings.push(...usageResult.warnings);

        // Additional validation for new state properties
        if (snapshot.usage.state.blockedTaskCount < 0) {
            result.errors.push('Blocked task count cannot be negative');
        }
        if (snapshot.usage.state.historyEntryCount < 0) {
            result.errors.push('History entry count cannot be negative');
        }
        if (snapshot.usage.state.lastHistoryUpdate > Date.now()) {
            result.warnings.push('Last history update timestamp is in the future');
        }

        // Update validation metadata
        result.isValid = result.errors.length === 0;
        result.metadata.validationDuration = Date.now() - startTime;

        return result;
    }
}

export default AgentMetricsManager.getInstance();
