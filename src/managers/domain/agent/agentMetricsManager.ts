/**
 * @file agentMetricsManager.ts
 * @path KaibanJS/src/managers/domain/agent/agentMetricsManager.ts
 * @description Dedicated manager for agent metrics collection, validation, and monitoring
 */

// Core imports
import { CoreManager } from '../../core/coreManager';
import { MetricsManager } from '../../core/metricsManager';

// Common imports
import { createValidationResult, createValidationMetadata } from '../../../types/common/validationTypes';
import { MANAGER_CATEGORY_enum, ERROR_SEVERITY_enum } from '../../../types/common/enumTypes';

// Agent domain imports
import { MetricsValidation } from '../../../types/agent/agentMetricTypes';
import type {
    IAgentResourceMetrics,
    IAgentPerformanceMetrics,
    IAgentUsageMetrics,
    ICognitiveResourceMetrics,
    IThinkingOperationMetrics,
    IAgentStateMetrics
} from '../../../types/agent/agentMetricTypes';
import type { IBaseManager, IBaseManagerMetadata } from '../../../types/agent/agentManagerTypes';

// Metrics domain imports
import { MetricDomain, MetricType } from '../../../types/metrics/base/metricsManagerTypes';
import type { 
    IMetricEvent, 
    IMetricsManager,
    IMetricFilter,
    IAggregationQuery,
    IAggregatedMetric,
    IRolledUpMetrics,
    IMetricsHandlerResult
} from '../../../types/metrics/base/metricsManagerTypes';
import type { ITimeMetrics, IThroughputMetrics, IErrorMetrics } from '../../../types/metrics';
import type { IMetricHistory, ISystemHealthMetrics } from '../../../types/metrics/base/enhancedMetricsTypes';

// Common type imports
import type { IValidationResult } from '../../../types/common/validationTypes';

// Additional imports
import type { IResourceMetrics } from '../../../types/metrics/base/resourceMetrics';
import type { IPerformanceMetrics } from '../../../types/metrics/base/performanceMetrics';

// Update imports for error types
import { ERROR_KINDS, type IErrorKind } from '../../../types/common/errorTypes';
import { RecoveryStrategyType, RecoveryPhase } from '../../../types/common/recoveryTypes';
import type { 
    IEnhancedErrorMetrics, 
    IErrorDistributionMetrics, 
    IDetailedErrorPattern, 
    IDetailedErrorImpact, 
    IRecoveryMetrics,
    IStrategyMetrics 
} from '../../../types/metrics/base/errorMetrics';

/**
 * Interfaces
 */
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
export class AgentMetricsManager extends CoreManager implements IBaseManager, IMetricsManager {
    private static instance: AgentMetricsManager;
    protected readonly metricsManager: MetricsManager;
    private readonly metricsHistory: Map<string, IMetricHistory> = new Map();
    private readonly collectionIntervals: Map<string, NodeJS.Timeout> = new Map();
    private readonly DEFAULT_SAMPLING_RATE = 1000; // 1 second
    public readonly category = MANAGER_CATEGORY_enum.METRICS;

    protected constructor() {
        super();
        this.metricsManager = MetricsManager.getInstance();
        this.registerDomainManager('AgentMetricsManager', this);
    }

    public static override getInstance(): AgentMetricsManager {
        if (!AgentMetricsManager.instance) {
            AgentMetricsManager.instance = new AgentMetricsManager();
        }
        return AgentMetricsManager.instance;
    }

    // New interface methods
    public async getInitialResourceMetrics(): Promise<IResourceMetrics> {
        return this.metricsManager.getInitialResourceMetrics();
    }

    public async getInitialPerformanceMetrics(): Promise<IPerformanceMetrics> {
        return this.metricsManager.getInitialPerformanceMetrics();
    }

    // ─── IMetricsManager Implementation ────────────────────────────────────────

    public async trackMetric(event: IMetricEvent): Promise<IMetricsHandlerResult<void>> {
        // Add correlation metadata
        const correlationId = Date.now().toString();
        const enhancedEvent: IMetricEvent = {
            ...event,
            metadata: {
                ...event.metadata,
                correlationId,
                source: this.constructor.name,
                target: 'metrics'
            }
        };

        // Track in history
        const runId = event.metadata.agentId as string;
        if (!this.metricsHistory.has(runId)) {
            this.metricsHistory.set(runId, {
                runId,
                events: []
            });
        }

        // Create basic system health metrics
        const systemHealth: ISystemHealthMetrics = {
            timestamp: Date.now(),
            cpu: {
                usage: process.cpuUsage().user / 1000000,
                loadAverage: [0, 0, 0]
            },
            memory: {
                used: process.memoryUsage().heapUsed,
                total: 0,
                free: 0
            },
            disk: {
                read: 0,
                write: 0,
                free: 0,
                total: 0
            },
            network: {
                upload: 0,
                download: 0
            },
            processMetrics: {
                uptime: process.uptime(),
                memoryUsage: process.memoryUsage(),
                cpuUsage: process.cpuUsage()
            }
        };

        this.metricsHistory.get(runId)!.events.push({
            ...enhancedEvent,
            systemHealth,
            trends: undefined // Could add trend analysis here if needed
        });

        return this.metricsManager.trackMetric(enhancedEvent);
    }

    public async getMetrics(filter: IMetricFilter): Promise<IMetricsHandlerResult<IMetricEvent[]>> {
        return this.metricsManager.getMetrics(filter);
    }

    public async aggregateMetrics(query: IAggregationQuery): Promise<IMetricsHandlerResult<IAggregatedMetric>> {
        return this.metricsManager.aggregateMetrics(query);
    }

    public async rollupMetrics(query: IAggregationQuery): Promise<IMetricsHandlerResult<IRolledUpMetrics>> {
        return this.metricsManager.rollupMetrics(query);
    }

    // ─── IBaseManager Implementation ────────────────────────────────────────────

    public async initialize(): Promise<void> {
        // No initialization needed for metrics manager
    }

    public async validate(params: unknown): Promise<boolean> {
        return true; // Basic validation always passes for metrics manager
    }

    public getMetadata(): IBaseManagerMetadata {
        return {
            category: MANAGER_CATEGORY_enum.METRICS,
            operation: 'metrics',
            duration: 0,
            status: 'success',
            agent: {
                id: '',
                name: '',
                role: '',
                status: ''
            },
            timestamp: Date.now(),
            component: 'AgentMetricsManager'
        };
    }

    // ─── Agent-Specific Methods ────────────────────────────────────────────────

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
        const cognitive: ICognitiveResourceMetrics = {
            memoryAllocation: process.memoryUsage().heapUsed,
            cognitiveLoad: 0.5,
            processingCapacity: 0.8,
            contextUtilization: 0.4,
            usage: 0,
            limit: 100,
            available: 100,
            timestamp: Date.now(),
            component: 'AgentMetricsManager',
            category: 'metrics',
            version: '1.0.0'
        };

        const baseMetrics = await this.metricsManager.getInitialResourceMetrics();

        return {
            cognitive,
            usage: 0,
            limit: 100,
            available: 100,
            cpuUsage: baseMetrics.cpuUsage,
            memoryUsage: baseMetrics.memoryUsage,
            diskIO: baseMetrics.diskIO,
            networkUsage: baseMetrics.networkUsage,
            timestamp: Date.now(),
            component: 'AgentMetricsManager',
            category: 'metrics',
            version: '1.0.0'
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

        // Create error distribution metrics
        const distribution: IErrorDistributionMetrics = {
            byType: Object.entries(ERROR_KINDS).reduce<Record<IErrorKind, number>>(
                (acc, [_, kind]) => {
                    acc[kind as IErrorKind] = 0;
                    return acc;
                },
                {} as Record<IErrorKind, number>
            ),
            bySeverity: {
                [ERROR_SEVERITY_enum.DEBUG]: 0,
                [ERROR_SEVERITY_enum.INFO]: 0,
                [ERROR_SEVERITY_enum.WARNING]: 0,
                [ERROR_SEVERITY_enum.ERROR]: 0,
                [ERROR_SEVERITY_enum.CRITICAL]: 0
            },
            byComponent: {},
            byPhase: {},
            byRecoveryStrategy: Object.values(RecoveryStrategyType).reduce(
                (acc, strategy) => ({ ...acc, [strategy]: 0 }),
                {} as Record<RecoveryStrategyType, number>
            )
        };

        // Create detailed error impact
        const impact: IDetailedErrorImpact = {
            severity: ERROR_SEVERITY_enum.ERROR,
            businessImpact: 0,
            userExperienceImpact: 0,
            systemStabilityImpact: 0,
            resourceImpact: {
                cpu: 0,
                memory: 0,
                io: 0
            },
            performance: {
                latencyIncrease: 0,
                throughputDecrease: 0,
                errorRateIncrease: 0
            },
            resources: {
                cpuSpike: 0,
                memoryLeak: 0,
                ioOverhead: 0
            },
            service: {
                availability: 1,
                reliability: 1,
                userSatisfaction: 1
            },
            cost: {
                operational: 0,
                recovery: 0
            }
        };

        // Create recovery metrics
        const recovery: IRecoveryMetrics = {
            meanTimeToRecover: 0,
            recoverySuccessRate: 1,
            strategyDistribution: Object.values(RecoveryStrategyType).reduce(
                (acc, strategy) => ({ ...acc, [strategy]: 0 }),
                {} as Record<RecoveryStrategyType, number>
            ),
            failedRecoveries: 0,
            totalAttempts: 0,
            successfulRecoveries: 0,
            strategyMetrics: Object.values(RecoveryStrategyType).reduce(
                (acc, strategy) => ({
                    ...acc,
                    [strategy]: {
                        attempts: 0,
                        successes: 0,
                        failures: 0,
                        averageTime: 0,
                        resourceUsage: {
                            cpu: 0,
                            memory: 0,
                            io: 0,
                            networkLatency: 0
                        }
                    }
                }),
                {} as Record<RecoveryStrategyType, IStrategyMetrics>
            ),
            timeBasedMetrics: {
                hourly: {
                    attempts: 0,
                    successes: 0,
                    failures: 0,
                    averageResponseTime: 0
                },
                daily: {
                    attempts: 0,
                    successes: 0,
                    failures: 0,
                    averageResponseTime: 0
                },
                weekly: {
                    attempts: 0,
                    successes: 0,
                    failures: 0,
                    averageResponseTime: 0
                }
            }
        };

        const errorMetrics: IEnhancedErrorMetrics = {
            totalErrors: 0,
            errorRate: 0,
            errorDistribution: distribution.byType,
            severityDistribution: distribution.bySeverity,
            distribution,
            patterns: [],
            impact,
            recovery,
            prevention: {
                preventedCount: 0,
                preventionRate: 0,
                earlyWarnings: 0
            },
            performance: {
                errorDetection: timeMetrics,
                errorHandling: timeMetrics,
                errorRecovery: timeMetrics,
                throughput: throughputMetrics
            },
            resources: {
                errorHandling: {
                    cpuUsage: 0,
                    memoryUsage: 0,
                    diskIO: { read: 0, write: 0 },
                    networkUsage: { upload: 0, download: 0 },
                    timestamp: Date.now()
                },
                recovery: {
                    cpuUsage: 0,
                    memoryUsage: 0,
                    diskIO: { read: 0, write: 0 },
                    networkUsage: { upload: 0, download: 0 },
                    timestamp: Date.now()
                }
            },
            trends: {
                dailyRates: [],
                weeklyRates: [],
                monthlyRates: []
            },
            analysis: {
                rootCauses: {},
                correlations: [],
                predictions: []
            }
        };

        const thinking: IThinkingOperationMetrics = {
            reasoningTime: timeMetrics,
            planningTime: timeMetrics,
            learningTime: timeMetrics,
            decisionConfidence: 0.8,
            learningEfficiency: 0.7,
            duration: 0,
            success: true,
            errorCount: 0,
            timestamp: Date.now(),
            component: 'AgentMetricsManager',
            category: 'metrics',
            version: '1.0.0'
        };

        return {
            thinking,
            taskSuccessRate: 0.9,
            goalAchievementRate: 0.85,
            duration: 0,
            success: true,
            errorCount: 0,
            timestamp: Date.now(),
            component: 'AgentMetricsManager',
            category: 'metrics',
            version: '1.0.0'
        };
    }

    /**
     * Create usage metrics
     */
    private async createUsageMetrics(): Promise<IAgentUsageMetrics> {
        const state: IAgentStateMetrics = {
            currentState: 'active',
            stateTime: 0,
            transitionCount: 0,
            failedTransitions: 0,
            blockedTaskCount: 0,
            historyEntryCount: 0,
            lastHistoryUpdate: Date.now(),
            taskStats: {
                completedCount: 0,
                failedCount: 0,
                averageDuration: 0,
                successRate: 1,
                averageIterations: 0
            },
            timestamp: Date.now(),
            component: 'AgentMetricsManager',
            category: 'metrics',
            version: '1.0.0'
        };

        return {
            state,
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
            costs: {
                inputCost: 0,
                outputCost: 0,
                totalCost: 0,
                currency: 'USD',
                breakdown: {
                    promptTokens: { count: 0, cost: 0 },
                    completionTokens: { count: 0, cost: 0 }
                }
            },
            timestamp: Date.now()
        };
    }

    /**
     * Start metrics collection for an agent
     */
    public startCollection(agentId: string, options: IMetricsCollectionOptions = {}): void {
        if (this.collectionIntervals.has(agentId)) {
            this.logWarn(`Metrics collection already running for agent ${agentId}`);
            return;
        }

        const interval = setInterval(
            () => this.collectMetrics(agentId, options),
            options.samplingRate || this.DEFAULT_SAMPLING_RATE
        );

        this.collectionIntervals.set(agentId, interval);
        this.logInfo(`Started metrics collection for agent ${agentId}`);
    }

    /**
     * Stop metrics collection for an agent
     */
    public stopCollection(agentId: string): void {
        const interval = this.collectionIntervals.get(agentId);
        if (interval) {
            clearInterval(interval);
            this.collectionIntervals.delete(agentId);
            this.logInfo(`Stopped metrics collection for agent ${agentId}`);
        }
    }

    /**
     * Get metrics history for an agent
     */
    public getMetricsHistory(agentId: string): IMetricHistory | undefined {
        return this.metricsHistory.get(agentId);
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
            const snapshot = await this.getCurrentMetrics(agentId);

            // Track metrics
            await this.trackMetric({
                domain: MetricDomain.AGENT,
                type: MetricType.RESOURCE,
                value: snapshot.resources.cpuUsage,
                timestamp: snapshot.timestamp,
                metadata: {
                    agentId,
                    resources: snapshot.resources,
                    performance: snapshot.performance,
                    usage: snapshot.usage
                }
            });

            // Validate metrics
            const validationResult = await this.validateMetricsSnapshot(snapshot);
            if (!validationResult.isValid) {
                this.logError(
                    `Metrics validation failed: ${validationResult.errors.join(', ')}`,
                    undefined,
                    { agentId }
                );
            }

            // Monitor for anomalies
            await this.monitorMetrics(agentId, snapshot);

        } catch (error) {
            this.handleError(error, `Error collecting metrics for agent ${agentId}`);
        }
    }

    /**
     * Monitor metrics for anomalies
     */
    private async monitorMetrics(agentId: string, snapshot: IMetricsSnapshot): Promise<void> {
        // Monitor cognitive load
        if (snapshot.resources.cognitive.cognitiveLoad > 0.9) {
            this.logWarn(
                `High cognitive load detected: ${snapshot.resources.cognitive.cognitiveLoad}`,
                { agentId }
            );
        }

        // Monitor memory usage
        if (snapshot.resources.memoryUsage > 1e9) { // 1GB
            this.logWarn(
                `High memory usage detected: ${snapshot.resources.memoryUsage} bytes`,
                { agentId }
            );
        }

        // Monitor performance degradation
        if (snapshot.performance.thinking.learningEfficiency < 0.5) {
            this.logWarn(
                `Low learning efficiency detected: ${snapshot.performance.thinking.learningEfficiency}`,
                { agentId }
            );
        }

        // Monitor blocked tasks
        if (snapshot.usage.state.blockedTaskCount > 0) {
            this.logWarn(
                `Blocked tasks detected: ${snapshot.usage.state.blockedTaskCount}`,
                { agentId }
            );
        }
    }

    /**
     * Validate a metrics snapshot
     */
    private async validateMetricsSnapshot(snapshot: IMetricsSnapshot): Promise<IValidationResult> {
        const startTime = Date.now();
        
        // Validate resource metrics
        const resourceResult = MetricsValidation.validateAgentResourceMetrics(snapshot.resources);
        const performanceResult = MetricsValidation.validateAgentPerformanceMetrics(snapshot.performance);
        const usageResult = MetricsValidation.validateAgentUsageMetrics(snapshot.usage);

        // Combine validation results
        const errors = [
            ...resourceResult.errors,
            ...performanceResult.errors,
            ...usageResult.errors
        ];

        const warnings = [
            ...(resourceResult.warnings || []),
            ...(performanceResult.warnings || []),
            ...(usageResult.warnings || [])
        ];

        // Additional validation for new state properties
        if (snapshot.usage.state.blockedTaskCount < 0) {
            errors.push('Blocked task count cannot be negative');
        }
        if (snapshot.usage.state.historyEntryCount < 0) {
            errors.push('History entry count cannot be negative');
        }
        if (snapshot.usage.state.lastHistoryUpdate > Date.now()) {
            warnings.push('Last history update timestamp is in the future');
        }

        return createValidationResult({
            isValid: errors.length === 0,
            errors,
            warnings,
            metadata: createValidationMetadata({
                component: 'AgentMetricsValidator',
                validatedFields: ['agentId', 'resources', 'performance', 'usage', 'state']
            })
        });
    }
}

export default AgentMetricsManager.getInstance();
