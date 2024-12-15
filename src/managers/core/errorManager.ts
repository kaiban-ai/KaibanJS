/**
 * @file errorManager.ts
 * @path src/managers/core/errorManager.ts
 * @description Core error handling and management with enhanced recovery strategies
 */

import { CoreManager } from './coreManager';
import { LogManager } from './logManager';
import { ErrorRecoveryManager } from './errorRecoveryManager';
import { StatusManager } from './statusManager';
import { MetricsManager } from './metricsManager';
import { MANAGER_CATEGORY_enum, TASK_STATUS_enum, ERROR_SEVERITY_enum } from '../../types/common/enumTypes';
import { 
    createError,
    ERROR_KINDS,
    type IErrorKind,
    type IErrorSeverity,
    type IBaseError,
    type IErrorRecoveryResult,
    type IErrorContext
} from '../../types/common/errorTypes';
import { createBaseMetadata } from '../../types/common/baseTypes';
import { createValidationResult } from '@utils/validation/validationUtils';
import { RecoveryStrategyType, RecoveryPhase } from '../../types/common/recoveryTypes';

// Type imports
import type { ILLMUsageMetrics } from '../../types/llm/llmMetricTypes';
import type { IBaseHandlerMetadata } from '../../types/common/baseTypes';
import type { IValidationResult } from '../../types/common/validationTypes';
import type { 
    IPerformanceMetrics,
    ITimeMetrics
} from '../../types/metrics/base/performanceMetrics';
import type { 
    IEnhancedErrorMetrics,
    IErrorDistributionMetrics,
    IRecoveryMetrics,
    IDetailedErrorImpact
} from '../../types/metrics/base/errorMetrics';
import type { IResourceMetrics } from '../../types/metrics/base/resourceMetrics';
import { ErrorMetricsValidation } from '../../types/metrics/base/errorMetrics';
import { MetricDomain, MetricType } from '../../types/metrics/base/metricsManagerTypes';

// ─── Internal Types ────────────────────────────────────────────────────────

type MutableMetrics<T> = {
    -readonly [P in keyof T]: T[P] extends object ? MutableMetrics<T[P]> : T[P];
};

// ─── Error Manager Implementation ────────────────────────────────────────────

export class ErrorManager extends CoreManager {
    private static instance: ErrorManager;
    protected readonly logManager: LogManager;
    protected readonly errorRecoveryManager: ErrorRecoveryManager;
    protected readonly statusManager: StatusManager;
    protected readonly metricsManager: MetricsManager;

    private metrics: {
        error: MutableMetrics<IEnhancedErrorMetrics>;
        distribution: MutableMetrics<IErrorDistributionMetrics>;
        recovery: MutableMetrics<IRecoveryMetrics>;
    };

    public readonly category: MANAGER_CATEGORY_enum = MANAGER_CATEGORY_enum.CORE;

    private constructor() {
        super();
        this.logManager = LogManager.getInstance();
        this.errorRecoveryManager = ErrorRecoveryManager.getInstance();
        this.statusManager = StatusManager.getInstance();
        this.metricsManager = MetricsManager.getInstance();
        this.metrics = this.initializeMetrics();
        this.registerDomainManager('ErrorManager', this);
    }

    private initializeMetrics() {
        const defaultTimeMetrics: ITimeMetrics = {
            total: 0,
            average: 0,
            min: 0,
            max: 0
        };

        const defaultThroughputMetrics = {
            operationsPerSecond: 0,
            dataProcessedPerSecond: 0
        };

        const defaultResourceMetrics: IResourceMetrics = {
            cpuUsage: 0,
            memoryUsage: 0,
            diskIO: { read: 0, write: 0 },
            networkUsage: { upload: 0, download: 0 },
            timestamp: Date.now()
        };

        // Initialize error distribution with all error kinds
        const errorDistribution: Record<IErrorKind, number> = Object.values(ERROR_KINDS).reduce(
            (acc, kind) => ({ ...acc, [kind]: 0 }),
            {} as Record<IErrorKind, number>
        );

        // Initialize severity distribution with ERROR_SEVERITY_enum values
        const severityDistribution: Record<IErrorSeverity, number> = {
            [ERROR_SEVERITY_enum.DEBUG]: 0,
            [ERROR_SEVERITY_enum.INFO]: 0,
            [ERROR_SEVERITY_enum.WARNING]: 0,
            [ERROR_SEVERITY_enum.ERROR]: 0,
            [ERROR_SEVERITY_enum.CRITICAL]: 0
        };

        // Initialize recovery strategy distribution
        const strategyDistribution: Record<RecoveryStrategyType, number> = Object.values(RecoveryStrategyType).reduce(
            (acc, strategy) => ({ ...acc, [strategy]: 0 }),
            {} as Record<RecoveryStrategyType, number>
        );

        // Initialize byStrategy with RecoveryStrategyType values
        const defaultByStrategy: Record<RecoveryStrategyType, {
            attempts: number;
            successes: number;
            failures: number;
            averageTime: number;
            resourceUsage: IResourceMetrics;
        }> = Object.values(RecoveryStrategyType).reduce(
            (acc, strategy) => ({
                ...acc,
                [strategy]: {
                    attempts: 0,
                    successes: 0,
                    failures: 0,
                    averageTime: 0,
                    resourceUsage: { ...defaultResourceMetrics }
                }
            }),
            {} as Record<RecoveryStrategyType, {
                attempts: number;
                successes: number;
                failures: number;
                averageTime: number;
                resourceUsage: IResourceMetrics;
            }>
        );

        // Initialize byPhase with RecoveryPhase values
        const defaultByPhase: Record<RecoveryPhase, {
            count: number;
            duration: ITimeMetrics;
            successRate: number;
        }> = Object.values(RecoveryPhase).reduce(
            (acc, phase) => ({
                ...acc,
                [phase]: {
                    count: 0,
                    duration: { ...defaultTimeMetrics },
                    successRate: 0
                }
            }),
            {} as Record<RecoveryPhase, {
                count: number;
                duration: ITimeMetrics;
                successRate: number;
            }>
        );

        // Define default detailed error impact
        const defaultImpact: IDetailedErrorImpact = {
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

        const metrics = {
            error: {
                // Base error metrics
                totalErrors: 0,
                errorRate: 0,
                // Required by IErrorMetrics
                errorDistribution,
                severityDistribution,
                // Enhanced metrics
                distribution: {
                    byType: { ...errorDistribution },
                    bySeverity: { ...severityDistribution },
                    byComponent: {},
                    byPhase: {},
                    byRecoveryStrategy: { ...strategyDistribution }
                },
                patterns: [],
                impact: defaultImpact,
                recovery: {
                    totalAttempts: 0,
                    successfulRecoveries: 0,
                    meanTimeToRecover: 0,
                    recoverySuccessRate: 0,
                    strategyDistribution,
                    failedRecoveries: 0,
                    byStrategy: defaultByStrategy,
                    byPhase: defaultByPhase,
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
                },
                performance: {
                    errorDetection: defaultTimeMetrics,
                    errorHandling: defaultTimeMetrics,
                    errorRecovery: defaultTimeMetrics,
                    throughput: defaultThroughputMetrics
                },
                resources: {
                    errorHandling: { ...defaultResourceMetrics },
                    recovery: { ...defaultResourceMetrics }
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
            },
            distribution: {
                byType: { ...errorDistribution },
                bySeverity: { ...severityDistribution },
                byComponent: {},
                byPhase: {},
                byRecoveryStrategy: { ...strategyDistribution }
            },
            recovery: {
                totalAttempts: 0,
                successfulRecoveries: 0,
                meanTimeToRecover: 0,
                recoverySuccessRate: 0,
                strategyDistribution,
                failedRecoveries: 0,
                byStrategy: defaultByStrategy,
                byPhase: defaultByPhase,
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
            }
        };

        return {
            error: metrics.error as unknown as MutableMetrics<IEnhancedErrorMetrics>,
            distribution: metrics.distribution as unknown as MutableMetrics<IErrorDistributionMetrics>,
            recovery: metrics.recovery as unknown as MutableMetrics<IRecoveryMetrics>
        };
    }

    public static getInstance(): ErrorManager {
        if (!ErrorManager.instance) {
            ErrorManager.instance = new ErrorManager();
        }
        return ErrorManager.instance;
    }

    public override async handleError(error: unknown, errorContext: string, errorType: IErrorKind = ERROR_KINDS.SystemError): Promise<void> {
        try {
            const baseError = this.normalizeError(error);
            const baseMetadata = createBaseMetadata(this.constructor.name, 'handleError');
            
            // Validate error before processing
            const validationResult = await this.validateError(baseError);
            if (!validationResult.isValid) {
                this.logManager.log(
                    `Error validation failed: ${validationResult.errors.join(', ')}`,
                    'error',
                    baseMetadata
                );
                // Continue processing but with warnings
            }

            // Update error metrics
            await this.updateErrorMetrics(baseError, errorType, errorContext);

            // Create performance and resource metrics for status transition
            const performanceMetrics: IPerformanceMetrics = {
                executionTime: { total: 0, average: 0, min: 0, max: 0 },
                latency: { total: 0, average: 0, min: 0, max: 0 },
                throughput: { operationsPerSecond: 0, dataProcessedPerSecond: 0 },
                responseTime: { total: 0, average: 0, min: 0, max: 0 },
                queueLength: 0,
                errorRate: this.metrics.error.errorRate,
                successRate: 1 - this.metrics.error.errorRate,
                errorMetrics: this.metrics.error,
                resourceUtilization: this.metrics.error.resources.errorHandling,
                timestamp: Date.now()
            };

            // Update system status
            await this.statusManager.transition({
                entity: 'task',
                entityId: errorType,
                currentStatus: TASK_STATUS_enum.PENDING,
                targetStatus: TASK_STATUS_enum.ERROR,
                operation: 'handleError',
                phase: 'execution',
                startTime: Date.now(),
                duration: 0,
                resourceMetrics: this.metrics.error.resources.errorHandling,
                performanceMetrics,
                metadata: {
                    context: errorContext,
                    severity: baseError.severity || ERROR_SEVERITY_enum.ERROR,
                    timestamp: Date.now()
                }
            });

            // Create error metadata with explicit context usage
            const errorMetadata: IBaseHandlerMetadata = {
                ...baseMetadata,
                message: baseError.message,
                metadata: {
                    type: errorType,
                    errorContext,
                    originalError: error instanceof Error ? error : undefined,
                    timestamp: Date.now(),
                    metrics: this.metrics.error
                }
            };

            // Log the error with enhanced context
            this.logManager.log(
                `${errorType} in ${errorContext}: ${baseError.message}`,
                'error',
                errorMetadata
            );

            // Attempt error recovery if possible
            if (this.errorRecoveryManager.canHandle(baseError)) {
                const recoveryResult = await this.errorRecoveryManager.handle(baseError, errorContext);
                await this.handleRecoveryResult(recoveryResult, baseError, errorContext);
            }

            // Track error metrics
            await this.metricsManager.trackMetric({
                domain: MetricDomain.WORKFLOW,
                type: MetricType.PERFORMANCE,
                value: 1,
                timestamp: Date.now(),
                metadata: {
                    errorType,
                    errorContext,
                    metrics: this.metrics.error
                }
            });
        } catch (handlingError) {
            this.logManager.log(
                'Error handling error',
                'error',
                {
                    error: handlingError,
                    timestamp: Date.now()
                }
            );
            throw handlingError;
        }
    }

    private async validateError(error: unknown): Promise<IValidationResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!this.isBaseError(error)) {
            errors.push('Invalid error structure');
            return createValidationResult(false, errors);
        }

        // Validate error metrics if present
        if ((error as IBaseError).metrics) {
            const metricsValidation = ErrorMetricsValidation.validateEnhancedErrorMetrics(
                (error as IBaseError).metrics
            );
            errors.push(...metricsValidation.errors);
            warnings.push(...metricsValidation.warnings);
        }

        // Validate error context
        if (!(error as IBaseError).context) {
            warnings.push('Error context is missing');
        }

        return createValidationResult(errors.length === 0, errors, warnings);
    }

    private async updateErrorMetrics(
        error: IBaseError,
        errorType: IErrorKind,
        context: string
    ): Promise<void> {
        // Update error distribution
        if (!this.metrics.distribution.byType[errorType]) {
            this.metrics.distribution.byType[errorType] = 0;
        }
        this.metrics.distribution.byType[errorType]++;

        // Update recovery metrics if recovery was attempted
        const recovery = error.context?.recovery as { success?: boolean } | undefined;
        if (recovery) {
            this.metrics.recovery.totalAttempts++;
            if (recovery.success) {
                this.metrics.recovery.successfulRecoveries++;
            } else {
                this.metrics.recovery.failedRecoveries++;
            }
            this.metrics.recovery.recoverySuccessRate = 
                this.metrics.recovery.successfulRecoveries / this.metrics.recovery.totalAttempts;
        }

        // Validate updated metrics
        const validationResult = ErrorMetricsValidation.validateEnhancedErrorMetrics(this.metrics.error);
        if (!validationResult.isValid) {
            this.logManager.log(
                `Error metrics validation failed: ${validationResult.errors.join(', ')}`,
                'warn',
                { context: 'updateErrorMetrics' }
            );
        }
    }

    private async handleRecoveryResult(
        result: IErrorRecoveryResult,
        originalError: IBaseError,
        context: string
    ): Promise<void> {
        const logContext = {
            component: this.constructor.name,
            operation: 'handleRecoveryResult',
            recoveryStrategy: result.strategy,
            attempts: result.attempts,
            duration: result.duration,
            originalError,
            errorContext: context,
            metrics: this.metrics.error
        };

        if (result.success) {
            this.logManager.log(
                `Successfully recovered from error using ${result.strategy} strategy`,
                'info',
                logContext
            );

            // Update recovery metrics
            this.metrics.recovery.successfulRecoveries++;
            this.metrics.recovery.recoverySuccessRate = 
                this.metrics.recovery.successfulRecoveries / this.metrics.recovery.totalAttempts;
        } else {
            this.logManager.log(
                `Failed to recover from error after ${result.attempts} attempts using ${result.strategy} strategy`,
                'error',
                {
                    ...logContext,
                    recoveryError: result.error
                }
            );

            // Update recovery metrics
            this.metrics.recovery.failedRecoveries++;

            // If recovery failed, throw the original or recovery error
            throw result.error || originalError;
        }

        // Validate updated metrics
        const validationResult = ErrorMetricsValidation.validateRecoveryMetrics(this.metrics.recovery);
        if (!validationResult.isValid) {
            this.logManager.log(
                `Recovery metrics validation failed: ${validationResult.errors.join(', ')}`,
                'warn',
                { context: 'handleRecoveryResult' }
            );
        }
    }

    private normalizeError(error: unknown): IBaseError {
        if (this.isBaseError(error)) {
            return error;
        }

        if (error instanceof Error) {
            return createError({
                message: error.message,
                type: ERROR_KINDS.UnknownError,
                context: {
                    originalError: error
                }
            });
        }

        return createError({
            message: String(error),
            type: ERROR_KINDS.UnknownError,
            context: { originalError: error }
        });
    }

    private isBaseError(error: unknown): error is IBaseError {
        if (typeof error !== 'object' || error === null) return false;
        const e = error as Partial<IBaseError>;
        return !!(
            typeof e.name === 'string' &&
            typeof e.message === 'string' &&
            typeof e.type === 'string'
        );
    }

    /**
     * Get error trends and analysis with enhanced metrics
     */
    public async getErrorTrends() {
        const trends = await this.errorRecoveryManager.getErrorTrends();
        const metricsValidation = ErrorMetricsValidation.validateEnhancedErrorMetrics(trends);
        
        if (!metricsValidation.isValid) {
            this.logManager.log(
                `Error trends validation failed: ${metricsValidation.errors.join(', ')}`,
                'warn',
                { context: 'getErrorTrends' }
            );
        }

        return trends;
    }

    /**
     * Get error impacts assessment with enhanced metrics
     */
    public async getErrorImpacts() {
        const impacts = await this.errorRecoveryManager.getErrorImpacts();
        const metricsValidation = ErrorMetricsValidation.validateDetailedErrorImpact(impacts);
        
        if (!metricsValidation.isValid) {
            this.logManager.log(
                `Error impacts validation failed: ${metricsValidation.errors.join(', ')}`,
                'warn',
                { context: 'getErrorImpacts' }
            );
        }

        return impacts;
    }

    /**
     * Get aggregated error metrics with enhanced validation
     */
    public async getErrorAggregation() {
        const aggregation = await this.errorRecoveryManager.getErrorAggregation();
        const metricsValidation = ErrorMetricsValidation.validateEnhancedErrorMetrics(aggregation);
        
        if (!metricsValidation.isValid) {
            this.logManager.log(
                `Error aggregation validation failed: ${metricsValidation.errors.join(', ')}`,
                'warn',
                { context: 'getErrorAggregation' }
            );
        }

        return aggregation;
    }

    /**
     * Update error recovery configuration with validation
     */
    public async updateErrorRecoveryConfig(config: Parameters<typeof this.errorRecoveryManager.updateConfig>[0]) {
        await this.errorRecoveryManager.updateConfig(config);
        
        // Validate updated metrics after config change
        const metricsValidation = ErrorMetricsValidation.validateEnhancedErrorMetrics(this.metrics.error);
        if (!metricsValidation.isValid) {
            this.logManager.log(
                `Error metrics validation failed after config update: ${metricsValidation.errors.join(', ')}`,
                'warn',
                { context: 'updateErrorRecoveryConfig' }
            );
        }
    }
}

export default ErrorManager.getInstance();
