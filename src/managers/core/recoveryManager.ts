/**
 * @file recoveryManager.ts
 * @description Core recovery manager with metrics-aware strategies and validation
 */

import { CoreManager } from './coreManager';
import { LogManager } from './logManager';
import { MetricsManager } from './metricsManager';
import { StatusManager } from './statusManager';
import { ERROR_KINDS } from '../../types/common/errorTypes';
import { ERROR_SEVERITY_enum, MANAGER_CATEGORY_enum } from '../../types/common/enumTypes';
import { createValidationResult } from '@utils/validation/validationUtils';
import { createBaseMetadata } from '../../types/common/baseTypes';
import { MetricDomain, MetricType } from '../../types/metrics/base/metricsManagerTypes';
import { ResourceMetricsValidation } from '../../types/metrics/base/resourceMetrics';
import { PerformanceMetricsValidation } from '../../types/metrics/base/performanceMetrics';

import {
    RetryStrategy,
    CircuitBreakerStrategy,
    GracefulDegradationStrategy,
    AgentRestartStrategy,
    AgentReassignStrategy,
    AgentFallbackModelStrategy,
    RecoveryStrategyType,
    RecoveryPhase,
    RecoveryEventType
} from './recovery';

import type {
    IBaseError,
    IErrorContext
} from '../../types/common/errorTypes';
import type {
    IRecoveryContext,
    IRecoveryStrategy,
    IRecoveryResult,
    IRecoveryMetrics,
    IRecoveryManagerConfig,
    IRecoveryValidationResult,
    IRecoveryEvent,
    IResourceUsage,
    IStrategyMetrics
} from '../../types/common/recoveryTypes';
import type { IBaseEvent, IBaseHandlerMetadata } from '../../types/common/baseTypes';
import type { 
    IMetricEvent,
    IMetricsHandlerResult
} from '../../types/metrics/base/metricsManagerTypes';
import type { IResourceMetrics } from '../../types/metrics/base/resourceMetrics';
import type { IPerformanceMetrics } from '../../types/metrics/base/performanceMetrics';

// ─── Recovery Manager Implementation ────────────────────────────────────────────

export class RecoveryManager extends CoreManager {
    private static instance: RecoveryManager;
    protected readonly logManager: LogManager;
    protected readonly metricsManager: MetricsManager;
    protected readonly statusManager: StatusManager;

    private config: IRecoveryManagerConfig;
    private strategies: Map<RecoveryStrategyType, IRecoveryStrategy>;
    private metrics: IRecoveryMetrics;
    private activeRecoveries: Map<string, IRecoveryContext>;
    private eventListeners: Set<(event: IRecoveryEvent) => void>;

    public readonly category: MANAGER_CATEGORY_enum = MANAGER_CATEGORY_enum.CORE;

    private constructor() {
        super();
        this.logManager = LogManager.getInstance();
        this.metricsManager = MetricsManager.getInstance();
        this.statusManager = StatusManager.getInstance();
        this.strategies = new Map();
        this.activeRecoveries = new Map();
        this.eventListeners = new Set();
        this.metrics = this.initializeMetrics();
        this.config = this.initializeConfig();
        this.registerDomainManager('RecoveryManager', this);
        this.initializeStrategies();
    }

    public static getInstance(): RecoveryManager {
        if (!RecoveryManager.instance) {
            RecoveryManager.instance = new RecoveryManager();
        }
        return RecoveryManager.instance;
    }

    private initializeMetrics(): IRecoveryMetrics {
        const defaultMetrics: IStrategyMetrics = {
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
        };

        const strategyMetrics: Record<RecoveryStrategyType, IStrategyMetrics> = 
            Object.values(RecoveryStrategyType).reduce(
                (acc, strategy) => ({
                    ...acc,
                    [strategy]: { ...defaultMetrics }
                }),
                {} as Record<RecoveryStrategyType, IStrategyMetrics>
            );

        return {
            totalAttempts: 0,
            successfulRecoveries: 0,
            failedRecoveries: 0,
            averageRecoveryTime: 0,
            recoverySuccessRate: 0,
            strategyMetrics,
            timeBasedMetrics: {
                hourly: { attempts: 0, successes: 0, failures: 0, averageResponseTime: 0 },
                daily: { attempts: 0, successes: 0, failures: 0, averageResponseTime: 0 },
                weekly: { attempts: 0, successes: 0, failures: 0, averageResponseTime: 0 }
            }
        };
    }

    private initializeConfig(): IRecoveryManagerConfig {
        return {
            enabled: true,
            defaultStrategy: RecoveryStrategyType.RETRY,
            globalMaxAttempts: 3,
            globalTimeout: 30000,
            metricsEnabled: true,
            autoApprovalEnabled: false,
            validateAfterRecovery: true,
            strategies: {},
            metricCollectionConfig: {
                enabled: true,
                samplingRate: 1000,
                retentionPeriod: 86400000,
                aggregationIntervals: ['1m', '5m', '1h', '1d']
            }
        };
    }

    private initializeStrategies(): void {
        // Initialize default strategies
        this.registerStrategy(RecoveryStrategyType.RETRY, RetryStrategy);
        this.registerStrategy(RecoveryStrategyType.CIRCUIT_BREAKER, CircuitBreakerStrategy);
        this.registerStrategy(RecoveryStrategyType.GRACEFUL_DEGRADATION, GracefulDegradationStrategy);
        
        // Initialize agent-specific strategies
        this.registerStrategy(RecoveryStrategyType.AGENT_RESTART, AgentRestartStrategy);
        this.registerStrategy(RecoveryStrategyType.AGENT_REASSIGN, AgentReassignStrategy);
        this.registerStrategy(RecoveryStrategyType.AGENT_FALLBACK_MODEL, AgentFallbackModelStrategy);
    }

    public async handle(error: IBaseError, context: IErrorContext): Promise<IRecoveryResult> {
        if (!this.config.enabled) {
            return this.createFailedResult(error, context, 'Recovery manager is disabled');
        }

        const strategy = await this.selectStrategy(error, context);
        if (!strategy) {
            return this.createFailedResult(error, context, 'No suitable recovery strategy found');
        }

        const recoveryContext = await this.createRecoveryContext(error, context, strategy);
        this.activeRecoveries.set(recoveryContext.id, recoveryContext);

        try {
            const recoveryEvent: IRecoveryEvent = {
                id: `recovery_${Date.now()}`,
                timestamp: Date.now(),
                type: RecoveryEventType.RECOVERY_INITIATED,
                metadata: createBaseMetadata('RecoveryManager', 'handle'),
                context: recoveryContext
            };
            await this.emitEvent(recoveryEvent);

            const startTime = Date.now();

            // Start metrics collection
            if (this.config.metricsEnabled) {
                const metricEvent: IMetricEvent = {
                    timestamp: startTime,
                    domain: MetricDomain.AGENT,
                    type: MetricType.PERFORMANCE,
                    value: 1,
                    metadata: {
                        context: recoveryContext,
                        phase: 'start'
                    }
                };
                await this.metricsManager.trackMetric(metricEvent);
            }

            // Execute recovery strategy
            const result = await strategy.execute(recoveryContext);

            // Validate recovery if configured
            if (this.config.validateAfterRecovery) {
                const validationResult = await this.validateRecovery(result);
                if (!validationResult.valid) {
                    return this.createFailedResult(error, context, 'Recovery validation failed');
                }
            }

            // Update metrics
            await this.updateMetrics(result, Date.now() - startTime);

            // Cleanup
            await strategy.cleanup(recoveryContext);
            this.activeRecoveries.delete(recoveryContext.id);

            const completionEvent: IRecoveryEvent = {
                id: `recovery_${Date.now()}`,
                timestamp: Date.now(),
                type: result.successful ? RecoveryEventType.RECOVERY_SUCCEEDED : RecoveryEventType.RECOVERY_FAILED,
                metadata: createBaseMetadata('RecoveryManager', 'handle'),
                context: recoveryContext
            };
            await this.emitEvent(completionEvent);

            return result;
        } catch (recoveryError) {
            if (recoveryError instanceof Error) {
                this.logManager.log(
                    `Recovery failed: ${recoveryError.message}`,
                    'error',
                    { context: recoveryContext }
                );
                return this.createFailedResult(error, context, 'Recovery execution failed', recoveryError);
            }
            return this.createFailedResult(error, context, 'Unknown recovery error');
        } finally {
            if (this.config.metricsEnabled) {
                const metricEvent: IMetricEvent = {
                    timestamp: Date.now(),
                    domain: MetricDomain.AGENT,
                    type: MetricType.PERFORMANCE,
                    value: 1,
                    metadata: {
                        context: recoveryContext,
                        phase: 'end'
                    }
                };
                await this.metricsManager.trackMetric(metricEvent);
            }
        }
    }

    private async selectStrategy(error: IBaseError, context: IErrorContext): Promise<IRecoveryStrategy | null> {
        for (const strategy of this.strategies.values()) {
            if (await strategy.validate(error, context)) {
                return strategy;
            }
        }
        return null;
    }

    private async createRecoveryContext(
        error: IBaseError,
        context: IErrorContext,
        strategy: IRecoveryStrategy
    ): Promise<IRecoveryContext> {
        return {
            id: `recovery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            error,
            errorContext: context,
            strategy: strategy.config.type,
            phase: RecoveryPhase.INITIATED,
            startTime: Date.now(),
            attemptCount: 0,
            maxAttempts: Math.min(
                strategy.config.maxAttempts,
                this.config.globalMaxAttempts
            ),
            timeout: Math.min(
                strategy.config.timeout,
                this.config.globalTimeout
            ),
            metadata: {
                component: this.constructor.name,
                operation: 'recovery',
                resourceUsage: await this.getCurrentResourceUsage()
            }
        };
    }

    private async getCurrentResourceUsage(): Promise<IResourceUsage> {
        const defaultResources: IResourceMetrics = {
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
            timestamp: Date.now()
        };

        const baseMetadata = createBaseMetadata(
            this.constructor.name,
            'getCurrentResourceUsage'
        );

        const metricEvent: IMetricEvent = {
            timestamp: Date.now(),
            domain: MetricDomain.AGENT,
            type: MetricType.RESOURCE,
            value: 1,
            metadata: {
                ...baseMetadata,
                resources: defaultResources
            }
        };

        const result = await this.metricsManager.trackMetric(metricEvent);
        const metrics = result.metadata as IBaseHandlerMetadata & { resources?: IResourceMetrics };
        const resources = metrics.resources ?? defaultResources;

        return {
            cpu: resources.cpuUsage,
            memory: resources.memoryUsage,
            io: resources.diskIO.read + resources.diskIO.write,
            networkLatency: resources.networkUsage.upload + resources.networkUsage.download
        };
    }

    private validateResourceUsage(resources: IResourceMetrics): boolean {
        const validationResult = ResourceMetricsValidation.validateResourceMetrics(resources);
        
        if (!validationResult.isValid) {
            this.logManager.log(
                `Resource validation failed: ${validationResult.errors.join(', ')}`,
                'error',
                { context: 'RecoveryManager.validateResourceUsage' }
            );
            return false;
        }

        // Check against thresholds
        const thresholds = {
            maxCpuUsage: 90, // 90%
            maxMemoryUsage: 1e9, // 1GB
            maxDiskIO: 1e8, // 100MB/s
            maxNetworkLatency: 1000 // 1s
        };

        return (
            resources.cpuUsage <= thresholds.maxCpuUsage &&
            resources.memoryUsage <= thresholds.maxMemoryUsage &&
            (resources.diskIO.read + resources.diskIO.write) <= thresholds.maxDiskIO &&
            (resources.networkUsage.upload + resources.networkUsage.download) <= thresholds.maxNetworkLatency
        );
    }

    private validatePerformanceImpact(metrics: IPerformanceMetrics): boolean {
        const validationResult = PerformanceMetricsValidation.validatePerformanceMetrics(metrics);
        
        if (!validationResult.isValid) {
            this.logManager.log(
                `Performance validation failed: ${validationResult.errors.join(', ')}`,
                'error',
                { context: 'RecoveryManager.validatePerformanceImpact' }
            );
            return false;
        }

        // Check against thresholds
        const thresholds = {
            minSuccessRate: 0.9, // 90%
            maxErrorRate: 0.1, // 10%
            maxLatency: 5000, // 5s
            minThroughput: 10 // 10 ops/s
        };

        return (
            metrics.successRate >= thresholds.minSuccessRate &&
            metrics.errorRate <= thresholds.maxErrorRate &&
            metrics.latency.average <= thresholds.maxLatency &&
            metrics.throughput.operationsPerSecond >= thresholds.minThroughput
        );
    }

    private async validateRecovery(result: IRecoveryResult): Promise<IRecoveryValidationResult> {
        const metricEvent: IMetricEvent = {
            timestamp: Date.now(),
            domain: MetricDomain.AGENT,
            type: MetricType.PERFORMANCE,
            value: 1,
            metadata: {
                context: result.context
            }
        };

        const metricsResult: IMetricsHandlerResult = await this.metricsManager.trackMetric(metricEvent);
        const resources = (metricsResult.metadata?.resources as IResourceMetrics) ?? null;
        const performance = (metricsResult.metadata?.performance as IPerformanceMetrics) ?? null;
        
        const checks = [
            {
                name: 'Resource Usage',
                passed: resources ? this.validateResourceUsage(resources) : true,
                severity: 'high' as const
            },
            {
                name: 'Performance Impact',
                passed: performance ? this.validatePerformanceImpact(performance) : true,
                severity: 'medium' as const
            },
            {
                name: 'Recovery Time',
                passed: result.duration <= result.context.timeout,
                severity: 'low' as const
            }
        ];

        return {
            valid: checks.every(check => check.passed),
            context: result.context,
            checks
        };
    }

    private async updateMetrics(result: IRecoveryResult, duration: number): Promise<void> {
        const metrics = this.metrics.strategyMetrics[result.context.strategy];
        
        metrics.attempts++;
        if (result.successful) {
            metrics.successes++;
        } else {
            metrics.failures++;
        }

        metrics.averageTime = (metrics.averageTime * (metrics.attempts - 1) + duration) / metrics.attempts;
        
        // Update global metrics
        this.metrics.totalAttempts++;
        if (result.successful) {
            this.metrics.successfulRecoveries++;
        } else {
            this.metrics.failedRecoveries++;
        }

        this.metrics.recoverySuccessRate = 
            this.metrics.successfulRecoveries / this.metrics.totalAttempts;
        this.metrics.averageRecoveryTime = 
            (this.metrics.averageRecoveryTime * (this.metrics.totalAttempts - 1) + duration) / 
            this.metrics.totalAttempts;

        const metricsEvent: IRecoveryEvent = {
            id: `metrics_${Date.now()}`,
            timestamp: Date.now(),
            type: RecoveryEventType.METRICS_UPDATED,
            metadata: createBaseMetadata('RecoveryManager', 'updateMetrics'),
            context: result.context
        };
        await this.emitEvent(metricsEvent);
    }

    private createFailedResult(
        error: IBaseError,
        context: IErrorContext,
        reason: string,
        recoveryError?: Error
    ): IRecoveryResult {
        return {
            successful: false,
            context: {
                id: `failed_recovery_${Date.now()}`,
                error,
                errorContext: context,
                strategy: this.config.defaultStrategy,
                phase: RecoveryPhase.FAILED,
                startTime: Date.now(),
                attemptCount: 0,
                maxAttempts: this.config.globalMaxAttempts,
                timeout: this.config.globalTimeout,
                metadata: {
                    component: this.constructor.name,
                    operation: 'recovery',
                    failureReason: reason
                }
            },
            duration: 0,
            error: recoveryError,
            metadata: {
                strategy: this.config.defaultStrategy,
                attempts: 0
            }
        };
    }

    protected override async emitEvent<T extends IBaseEvent>(event: T): Promise<void> {
        if (this.isRecoveryEvent(event)) {
            this.eventListeners.forEach(listener => {
                try {
                    listener(event);
                } catch (error) {
                    if (error instanceof Error) {
                        this.logManager.log(
                            `Error in recovery event listener: ${error.message}`,
                            'error',
                            { error }
                        );
                    }
                }
            });
        }
        await super.emitEvent(event);
    }

    private isRecoveryEvent(event: IBaseEvent): event is IRecoveryEvent {
        return (
            'type' in event &&
            'context' in event &&
            Object.values(RecoveryEventType).includes((event as IRecoveryEvent).type)
        );
    }

    public addEventListener(listener: (event: IRecoveryEvent) => void): void {
        this.eventListeners.add(listener);
    }

    public removeEventListener(listener: (event: IRecoveryEvent) => void): void {
        this.eventListeners.delete(listener);
    }

    public registerStrategy(type: RecoveryStrategyType, strategy: IRecoveryStrategy): void {
        this.strategies.set(type, strategy);
    }

    public getMetrics(): IRecoveryMetrics {
        return { ...this.metrics };
    }

    public updateConfig(config: Partial<IRecoveryManagerConfig>): void {
        this.config = {
            ...this.config,
            ...config
        };
    }
}

export default RecoveryManager.getInstance();
