/**
 * @file errorMetricsManager.ts
 * @description Specialized manager for error-related metrics
 */

import { CoreManager } from '../coreManager';
import { 
    MANAGER_CATEGORY_enum, 
    ERROR_SEVERITY_enum,
    EnumTypeGuards,
    EnumUtils 
} from '../../../types/common/enumTypes';
import { 
    ERROR_KINDS, 
    IErrorKind, 
    IErrorSeverity, 
    IBaseError, 
    IErrorContext, 
    BaseError 
} from '../../../types/common/errorTypes';
import { 
    MetricDomain, 
    MetricType,
    MutableMetrics
} from '../../../types/metrics/base/metricsManagerTypes';
import { RecoveryStrategyType } from '../../../types/common/recoveryTypes';
import type { IMetricEvent } from '../../../types/metrics/base/metricsManagerTypes';
import {
    IEnhancedErrorMetrics,
    IDetailedErrorPattern,
    IRecoveryMetrics,
    IErrorDistributionMetrics,
    IStrategyMetrics,
    IDetailedErrorImpact,
    ITimeBasedMetrics,
    IMetricCount
} from '../../../types/metrics/base/errorMetrics';
import { 
    IErrorPattern,
    IPerformanceMetrics
} from '../../../types/metrics/base/performanceMetrics';
import { IErrorPatternContext } from '../../../types/metrics/base/errorPatternTypes';

export class ErrorMetricsManager extends CoreManager {
    private static instance: ErrorMetricsManager | null = null;
    private errorMetrics: MutableMetrics<IEnhancedErrorMetrics>;

    public readonly category = MANAGER_CATEGORY_enum.METRICS;

    private constructor() {
        super();
        this.errorMetrics = this.initializeErrorMetrics() as MutableMetrics<IEnhancedErrorMetrics>;
        this.registerDomainManager('ErrorMetricsManager', this);
    }

    public static getInstance(): ErrorMetricsManager {
        if (!ErrorMetricsManager.instance) {
            ErrorMetricsManager.instance = new ErrorMetricsManager();
        }
        return ErrorMetricsManager.instance;
    }

    public async getCurrentMetrics(): Promise<IEnhancedErrorMetrics> {
        return { ...this.errorMetrics };
    }

    public async trackError(error: IBaseError, context: IErrorContext): Promise<void> {
        try {
            // Update total error count
            this.errorMetrics.totalErrors += 1;

            // Update error rate
            const now = Date.now();
            const timeWindow = 3600000; // 1 hour in milliseconds
            const recentErrors = this.errorMetrics.trends.hourlyRates?.filter(
                rate => now - rate > timeWindow
            ).length || 0;
            this.errorMetrics.errorRate = recentErrors / timeWindow;

            // Update error distribution
            this.updateErrorDistribution(this.errorMetrics, {
                timestamp: now,
                domain: MetricDomain.LLM,
                type: MetricType.PERFORMANCE,
                value: 1,
                metadata: {
                    errorType: error.type,
                    severity: context.severity || ERROR_SEVERITY_enum.ERROR,
                    component: context.component
                }
            });

            // Get performance metrics from context if available
            const performanceMetrics = context.metrics as IPerformanceMetrics | undefined;

            // Update error impact
            const detailedImpact: IDetailedErrorImpact = {
                severity: context.severity || ERROR_SEVERITY_enum.ERROR,
                businessImpact: context.metrics?.impact?.businessImpact || 0,
                userExperienceImpact: context.metrics?.impact?.userExperienceImpact || 0,
                systemStabilityImpact: context.metrics?.impact?.systemStabilityImpact || 0,
                resourceImpact: {
                    cpu: context.metrics?.impact?.resourceImpact?.cpu || 0,
                    memory: context.metrics?.impact?.resourceImpact?.memory || 0,
                    io: context.metrics?.impact?.resourceImpact?.io || 0
                },
                performance: {
                    latencyIncrease: performanceMetrics?.latency?.average || 0,
                    throughputDecrease: performanceMetrics?.throughput?.operationsPerSecond || 0,
                    errorRateIncrease: this.errorMetrics.errorRate
                },
                resources: {
                    cpuSpike: performanceMetrics?.resourceUtilization?.cpuUsage || 0,
                    memoryLeak: performanceMetrics?.resourceUtilization?.memoryUsage || 0,
                    ioOverhead: performanceMetrics?.resourceUtilization?.diskIO?.write || 0
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

            this.errorMetrics.impact = detailedImpact;

            // Update error patterns if provided
            if (context.pattern && typeof context.pattern === 'object') {
                const patternContext = context.pattern as Partial<IErrorPatternContext>;
                const basePattern: IErrorPattern = {
                    errorKind: error.type,
                    frequency: 1,
                    meanTimeBetweenErrors: 0,
                    recoveryStrategies: [],
                    recoverySuccessRate: 0
                };

                const detailedPattern: IDetailedErrorPattern = {
                    ...basePattern,
                    context: {
                        preconditions: Array.isArray(patternContext.preconditions) ? patternContext.preconditions : [],
                        triggers: Array.isArray(patternContext.triggers) ? patternContext.triggers : [],
                        symptoms: Array.isArray(patternContext.symptoms) ? patternContext.symptoms : []
                    },
                    impact: detailedImpact,
                    trends: {
                        frequency: [1],
                        impact: [1],
                        recovery: [0],
                        timestamps: [now]
                    }
                };
                this.updateErrorPatterns(detailedPattern);
            }

            // Update recovery metrics if provided
            if (context.recovery && typeof context.recovery === 'object') {
                const defaultStrategyDistribution = Object.values(RecoveryStrategyType).reduce((acc, strategy) => {
                    acc[strategy] = 0;
                    return acc;
                }, {} as Record<RecoveryStrategyType, number>);

                const defaultStrategyMetrics = this.initializeStrategyMetrics();
                const defaultTimeBasedMetrics = this.initializeTimeBasedMetrics();

                const recoveryMetrics: IRecoveryMetrics = {
                    meanTimeToRecover: context.metrics?.recovery?.meanTimeToRecover || 0,
                    recoverySuccessRate: context.metrics?.recovery?.recoverySuccessRate || 0,
                    strategyDistribution: defaultStrategyDistribution,
                    failedRecoveries: context.metrics?.recovery?.failedRecoveries || 0,
                    totalAttempts: context.metrics?.recovery?.totalAttempts || 0,
                    successfulRecoveries: context.metrics?.recovery?.successfulRecoveries || 0,
                    strategyMetrics: defaultStrategyMetrics,
                    timeBasedMetrics: defaultTimeBasedMetrics
                };

                // Update strategy metrics if available
                if (context.metrics?.recovery?.strategyMetrics) {
                    Object.entries(context.metrics.recovery.strategyMetrics).forEach(([strategy, metrics]) => {
                        if (metrics && strategy in recoveryMetrics.strategyMetrics) {
                            recoveryMetrics.strategyMetrics[strategy as RecoveryStrategyType] = {
                                ...recoveryMetrics.strategyMetrics[strategy as RecoveryStrategyType],
                                ...metrics
                            };
                        }
                    });
                }

                // Update time-based metrics if available
                if (context.metrics?.recovery?.timeBasedMetrics) {
                    recoveryMetrics.timeBasedMetrics = {
                        hourly: {
                            ...recoveryMetrics.timeBasedMetrics.hourly,
                            ...context.metrics.recovery.timeBasedMetrics.hourly
                        },
                        daily: {
                            ...recoveryMetrics.timeBasedMetrics.daily,
                            ...context.metrics.recovery.timeBasedMetrics.daily
                        },
                        weekly: {
                            ...recoveryMetrics.timeBasedMetrics.weekly,
                            ...context.metrics.recovery.timeBasedMetrics.weekly
                        }
                    };
                }

                this.updateRecoveryMetrics(recoveryMetrics);
            }

            // Update trends
            const hourlyRates = [...(this.errorMetrics.trends.hourlyRates || []), now];
            const dailyRates = [...(this.errorMetrics.trends.dailyRates || []), this.errorMetrics.errorRate];
            const weeklyRates = [...(this.errorMetrics.trends.weeklyRates || []), this.errorMetrics.errorRate];
            const monthlyRates = [...(this.errorMetrics.trends.monthlyRates || []), this.errorMetrics.errorRate];

            this.errorMetrics.trends = {
                hourlyRates,
                dailyRates,
                weeklyRates,
                monthlyRates
            };

            // Update analysis
            if (error.type) {
                this.errorMetrics.analysis.rootCauses[error.type] = 
                    (this.errorMetrics.analysis.rootCauses[error.type] || 0) + 1;
            }
        } catch (err) {
            const error = err instanceof Error ? err : new BaseError({
                message: String(err),
                type: ERROR_KINDS.UnknownError
            });
            this.logError('Failed to track error metrics', error);
            throw error;
        }
    }

    public async checkHealth(): Promise<boolean> {
        try {
            const metrics = await this.getCurrentMetrics();
            
            // Check error rate threshold
            const errorRateThreshold = 0.1; // 10% error rate threshold
            if (metrics.errorRate > errorRateThreshold) {
                return false;
            }

            // Check recovery success rate
            const recoveryRateThreshold = 0.8; // 80% recovery success rate threshold
            if (metrics.recovery.recoverySuccessRate < recoveryRateThreshold) {
                return false;
            }

            // Check service health
            const serviceHealthThreshold = 0.9; // 90% service health threshold
            if (metrics.impact.service.availability < serviceHealthThreshold ||
                metrics.impact.service.reliability < serviceHealthThreshold) {
                return false;
            }

            // Check resource impact
            const resourceImpactThreshold = 0.8; // 80% resource impact threshold
            if (metrics.impact.resources.cpuSpike > resourceImpactThreshold ||
                metrics.impact.resources.memoryLeak > resourceImpactThreshold ||
                metrics.impact.resources.ioOverhead > resourceImpactThreshold) {
                return false;
            }

            return true;
        } catch (err) {
            const error = err instanceof Error ? err : new BaseError({
                message: String(err),
                type: ERROR_KINDS.UnknownError
            });
            this.logError('Health check failed', error);
            return false;
        }
    }

    private initializeMetricCount(): IMetricCount {
        return {
            attempts: 0,
            successes: 0,
            failures: 0,
            averageResponseTime: 0
        };
    }

    private initializeTimeBasedMetrics(): ITimeBasedMetrics {
        return {
            hourly: this.initializeMetricCount(),
            daily: this.initializeMetricCount(),
            weekly: this.initializeMetricCount()
        };
    }

    private initializeStrategyMetrics(): Record<RecoveryStrategyType, IStrategyMetrics> {
        return Object.values(RecoveryStrategyType).reduce((acc, strategy) => {
            acc[strategy] = {
                attempts: 0,
                successes: 0,
                failures: 0,
                averageTime: 0,
                resourceUsage: {
                    cpu: 0,
                    memory: 0,
                    io: 0
                },
                errorPatterns: []
            };
            return acc;
        }, {} as Record<RecoveryStrategyType, IStrategyMetrics>);
    }

    private initializeDistributionMetrics(): IErrorDistributionMetrics {
        const errorKinds = Object.values(ERROR_KINDS).reduce((acc, kind) => {
            acc[kind] = 0;
            return acc;
        }, {} as Record<IErrorKind, number>);

        const severityLevels = Object.values(ERROR_SEVERITY_enum).reduce((acc, severity) => {
            acc[severity as IErrorSeverity] = 0;
            return acc;
        }, {} as Record<IErrorSeverity, number>);

        const recoveryStrategies = Object.values(RecoveryStrategyType).reduce((acc, strategy) => {
            acc[strategy] = 0;
            return acc;
        }, {} as Record<RecoveryStrategyType, number>);

        return {
            byType: errorKinds,
            bySeverity: severityLevels,
            byComponent: {} as Record<string, number>,
            byPhase: {} as Record<string, number>,
            byRecoveryStrategy: recoveryStrategies
        };
    }

    private initializeErrorMetrics(): IEnhancedErrorMetrics {
        const distribution = this.initializeDistributionMetrics();
        const strategyMetrics = this.initializeStrategyMetrics();

        return {
            totalErrors: 0,
            errorRate: 0,
            errorDistribution: distribution.byType,
            severityDistribution: distribution.bySeverity,
            distribution,
            patterns: [],
            impact: {
                severity: ERROR_SEVERITY_enum.INFO,
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
            },
            recovery: {
                meanTimeToRecover: 0,
                recoverySuccessRate: 1,
                strategyDistribution: distribution.byRecoveryStrategy,
                failedRecoveries: 0,
                totalAttempts: 0,
                successfulRecoveries: 0,
                strategyMetrics,
                timeBasedMetrics: this.initializeTimeBasedMetrics()
            },
            prevention: {
                preventedCount: 0,
                preventionRate: 0,
                earlyWarnings: 0
            },
            performance: {
                errorDetection: {
                    total: 0,
                    average: 0,
                    min: 0,
                    max: 0
                },
                errorHandling: {
                    total: 0,
                    average: 0,
                    min: 0,
                    max: 0
                },
                errorRecovery: {
                    total: 0,
                    average: 0,
                    min: 0,
                    max: 0
                },
                throughput: {
                    operationsPerSecond: 0,
                    dataProcessedPerSecond: 0
                }
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
                monthlyRates: [],
                hourlyRates: []
            },
            analysis: {
                rootCauses: {} as Record<string, number>,
                correlations: [],
                predictions: []
            }
        };
    }

    private updateErrorDistribution(metrics: MutableMetrics<IEnhancedErrorMetrics>, event: IMetricEvent): void {
        const metadata = event.metadata as Record<string, unknown>;
        
        // Check and update error type distribution
        if ('errorType' in metadata && typeof metadata.errorType === 'string') {
            const errorType = metadata.errorType as IErrorKind;
            if (Object.values(ERROR_KINDS).includes(errorType)) {
                metrics.distribution.byType[errorType] += 1;
                metrics.errorDistribution[errorType] += 1;
            }
        }

        // Check and update severity distribution
        if ('severity' in metadata && typeof metadata.severity === 'string') {
            const severityValue = metadata.severity;
            if (EnumUtils.isValidEnumValue(ERROR_SEVERITY_enum, severityValue)) {
                const severity = severityValue as keyof typeof ERROR_SEVERITY_enum;
                metrics.distribution.bySeverity[severity] += 1;
                metrics.severityDistribution[severity] += 1;
            }
        }

        // Check and update component distribution
        if ('component' in metadata && typeof metadata.component === 'string') {
            const component = metadata.component;
            metrics.distribution.byComponent[component] = 
                (metrics.distribution.byComponent[component] || 0) + 1;
        }
    }

    private updateErrorPatterns(pattern: IDetailedErrorPattern): void {
        const existingPatternIndex = this.errorMetrics.patterns.findIndex(p => 
            p.context.preconditions.join(',') === pattern.context.preconditions.join(','));
        
        const newPattern = {
            ...pattern,
            trends: {
                frequency: [...(pattern.trends.frequency || [])],
                impact: [...(pattern.trends.impact || [])],
                recovery: [...(pattern.trends.recovery || [])],
                timestamps: [...(pattern.trends.timestamps || [])]
            }
        };

        if (existingPatternIndex !== -1) {
            const patterns = [...this.errorMetrics.patterns];
            patterns[existingPatternIndex] = newPattern;
            this.errorMetrics.patterns = patterns;
        } else {
            this.errorMetrics.patterns = [...this.errorMetrics.patterns, newPattern];
        }
    }

    private updateRecoveryMetrics(newMetrics: IRecoveryMetrics): void {
        // Create a mutable copy of the recovery metrics
        const mutableMetrics = this.errorMetrics as {
            recovery: {
                [K in keyof IRecoveryMetrics]: IRecoveryMetrics[K]
            }
        };

        const currentMetrics = { ...mutableMetrics.recovery };
        const totalAttempts = (currentMetrics.totalAttempts || 0) + (newMetrics.totalAttempts || 0);
        const successfulRecoveries = (currentMetrics.successfulRecoveries || 0) + (newMetrics.successfulRecoveries || 0);
        const failedRecoveries = (currentMetrics.failedRecoveries || 0) + (newMetrics.failedRecoveries || 0);

        // Create a new recovery metrics object
        const updatedMetrics = {
            meanTimeToRecover: totalAttempts > 0 
                ? (currentMetrics.meanTimeToRecover * (currentMetrics.totalAttempts || 0) + newMetrics.meanTimeToRecover) / totalAttempts 
                : 0,
            recoverySuccessRate: totalAttempts > 0 
                ? successfulRecoveries / totalAttempts 
                : 0,
            strategyDistribution: {
                ...currentMetrics.strategyDistribution,
                ...newMetrics.strategyDistribution
            },
            failedRecoveries,
            totalAttempts,
            successfulRecoveries,
            strategyMetrics: {
                ...currentMetrics.strategyMetrics,
                ...newMetrics.strategyMetrics
            },
            timeBasedMetrics: {
                hourly: {
                    attempts: (currentMetrics.timeBasedMetrics?.hourly.attempts || 0) + (newMetrics.timeBasedMetrics.hourly.attempts || 0),
                    successes: (currentMetrics.timeBasedMetrics?.hourly.successes || 0) + (newMetrics.timeBasedMetrics.hourly.successes || 0),
                    failures: (currentMetrics.timeBasedMetrics?.hourly.failures || 0) + (newMetrics.timeBasedMetrics.hourly.failures || 0),
                    averageResponseTime: totalAttempts > 0 
                        ? ((currentMetrics.timeBasedMetrics?.hourly.averageResponseTime || 0) * (currentMetrics.totalAttempts || 0) + 
                            (newMetrics.timeBasedMetrics.hourly.averageResponseTime || 0)) / totalAttempts 
                        : 0
                },
                daily: {
                    attempts: (currentMetrics.timeBasedMetrics?.daily.attempts || 0) + (newMetrics.timeBasedMetrics.daily.attempts || 0),
                    successes: (currentMetrics.timeBasedMetrics?.daily.successes || 0) + (newMetrics.timeBasedMetrics.daily.successes || 0),
                    failures: (currentMetrics.timeBasedMetrics?.daily.failures || 0) + (newMetrics.timeBasedMetrics.daily.failures || 0),
                    averageResponseTime: totalAttempts > 0 
                        ? ((currentMetrics.timeBasedMetrics?.daily.averageResponseTime || 0) * (currentMetrics.totalAttempts || 0) + 
                            (newMetrics.timeBasedMetrics.daily.averageResponseTime || 0)) / totalAttempts 
                        : 0
                },
                weekly: {
                    attempts: (currentMetrics.timeBasedMetrics?.weekly.attempts || 0) + (newMetrics.timeBasedMetrics.weekly.attempts || 0),
                    successes: (currentMetrics.timeBasedMetrics?.weekly.successes || 0) + (newMetrics.timeBasedMetrics.weekly.successes || 0),
                    failures: (currentMetrics.timeBasedMetrics?.weekly.failures || 0) + (newMetrics.timeBasedMetrics.weekly.failures || 0),
                    averageResponseTime: totalAttempts > 0 
                        ? ((currentMetrics.timeBasedMetrics?.weekly.averageResponseTime || 0) * (currentMetrics.totalAttempts || 0) + 
                            (newMetrics.timeBasedMetrics.weekly.averageResponseTime || 0)) / totalAttempts 
                        : 0
                }
            }
        };

        // Update the recovery metrics
        mutableMetrics.recovery = updatedMetrics;
    }
}

export default ErrorMetricsManager.getInstance();
