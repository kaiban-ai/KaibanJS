/**
 * @file errorValidator.ts
 * @description Validates error contexts, recovery strategies, and metrics integration
 */

import { ERROR_KINDS } from '../../types/common/errorTypes';
import { ERROR_SEVERITY_enum, MANAGER_CATEGORY_enum } from '../../types/common/enumTypes';
import { RecoveryStrategyType } from '../../types/common/recoveryTypes';
import { createBaseMetadata } from '../../types/common/baseTypes';
import { CoreManager } from '../../managers/core/coreManager';
import { MetricDomain, MetricType } from '../../types/metrics/base/metricsManagerTypes';

import type { 
    IErrorContext,
    IErrorKind
} from '../../types/common/errorTypes';
import type { 
    IRecoveryStrategy,
    IRecoveryContext
} from '../../types/common/recoveryTypes';
import type { 
    IErrorMetrics,
    IErrorPattern,
    IErrorImpact
} from '../../types/metrics/base/performanceMetrics';
import type { ISystemHealthMetrics } from '../../types/metrics/base/enhancedMetricsTypes';
import type { IValidationResult } from '../../types/common/validationTypes';

/**
 * Error context validation result
 */
export interface IErrorValidationResult extends IValidationResult {
    context?: IErrorContext;
    recovery?: IRecoveryContext;
    metrics?: IErrorMetrics;
    systemHealth?: ISystemHealthMetrics;
}

/**
 * Error validator class
 */
export class ErrorValidator extends CoreManager {
    private static instance: ErrorValidator | null = null;

    // Required by CoreManager
    public readonly category = MANAGER_CATEGORY_enum.VALIDATION;

    private constructor() {
        super();
        this.registerDomainManager('ErrorValidator', this);
    }

    public static getInstance(): ErrorValidator {
        if (!ErrorValidator.instance) {
            ErrorValidator.instance = new ErrorValidator();
        }
        return ErrorValidator.instance;
    }

    /**
     * Validate error context
     */
    public async validateErrorContext(context: IErrorContext): Promise<IErrorValidationResult> {
        const startTime = Date.now();
        const errors: string[] = [];
        const warnings: string[] = [];

        try {
            // Required fields
            if (!context.component) {
                errors.push('Missing component name');
            }
            if (!context.operation) {
                errors.push('Missing operation name');
            }
            if (!context.timestamp) {
                errors.push('Missing timestamp');
            }
            if (!context.error) {
                errors.push('Missing error object');
            }

            // Validate error severity
            if (context.severity && !Object.values(ERROR_SEVERITY_enum).includes(context.severity as ERROR_SEVERITY_enum)) {
                errors.push(`Invalid error severity: ${context.severity}`);
            }

            // Validate error metrics
            if (context.metrics) {
                const metricsValidation = await this.validateErrorMetrics(context.metrics);
                errors.push(...metricsValidation.errors);
                warnings.push(...metricsValidation.warnings);
            }

            // Validate system health metrics
            if (context.systemHealth) {
                const healthValidation = await this.validateSystemHealthMetrics(context.systemHealth);
                errors.push(...healthValidation.errors);
                warnings.push(...healthValidation.warnings);
            }

            // Track validation metrics
            await this.metricsManager.trackMetric({
                domain: MetricDomain.WORKFLOW,
                type: MetricType.PERFORMANCE,
                value: Date.now() - startTime,
                timestamp: startTime,
                metadata: {
                    component: this.constructor.name,
                    operation: 'validateErrorContext',
                    errors: errors.length,
                    warnings: warnings.length
                }
            });

            const result = {
                isValid: errors.length === 0,
                errors,
                warnings,
                metadata: createBaseMetadata('ErrorValidator', 'validateErrorContext'),
                context
            };

            // Log validation result
            if (result.isValid) {
                this.logInfo('Error context validation successful', { context: result });
            } else {
                this.logWarn('Error context validation failed', { 
                    context: result,
                    errors,
                    warnings
                });
            }

            return result;
        } catch (error) {
            await this.handleError(
                error,
                'Error context validation failed',
                ERROR_KINDS.ValidationError
            );
            throw error;
        }
    }

    /**
     * Validate recovery strategy
     */
    public async validateRecoveryStrategy(strategy: IRecoveryStrategy): Promise<IErrorValidationResult> {
        const startTime = Date.now();
        const errors: string[] = [];
        const warnings: string[] = [];

        try {
            // Required fields
            if (!strategy.config) {
                errors.push('Missing recovery strategy configuration');
                return {
                    isValid: false,
                    errors,
                    warnings,
                    metadata: createBaseMetadata('ErrorValidator', 'validateRecoveryStrategy')
                };
            }

            const config = strategy.config;

            // Validate strategy type
            if (!Object.values(RecoveryStrategyType).includes(config.type)) {
                errors.push(`Invalid recovery strategy type: ${config.type}`);
            }

            // Validate configuration
            if (!config.maxAttempts || config.maxAttempts < 1) {
                errors.push('Invalid maxAttempts value');
            }

            if (config.timeout !== undefined && config.timeout < 0) {
                errors.push('Invalid timeout value');
            }

            // Validate applicable errors
            if (!config.applicableErrors || !Array.isArray(config.applicableErrors)) {
                errors.push('Missing or invalid applicable errors');
            } else {
                config.applicableErrors.forEach(error => {
                    if (!Object.values(ERROR_KINDS).includes(error)) {
                        errors.push(`Invalid error kind: ${error}`);
                    }
                });
            }

            // Validate applicable severities
            if (!config.applicableSeverities || !Array.isArray(config.applicableSeverities)) {
                errors.push('Missing or invalid applicable severities');
            } else {
                config.applicableSeverities.forEach(severity => {
                    if (!Object.values(ERROR_SEVERITY_enum).includes(severity as ERROR_SEVERITY_enum)) {
                        errors.push(`Invalid error severity: ${severity}`);
                    }
                });
            }

            // Track validation metrics
            await this.metricsManager.trackMetric({
                domain: MetricDomain.WORKFLOW,
                type: MetricType.PERFORMANCE,
                value: Date.now() - startTime,
                timestamp: startTime,
                metadata: {
                    component: this.constructor.name,
                    operation: 'validateRecoveryStrategy',
                    strategyType: config.type,
                    errors: errors.length,
                    warnings: warnings.length
                }
            });

            const result = {
                isValid: errors.length === 0,
                errors,
                warnings,
                metadata: createBaseMetadata('ErrorValidator', 'validateRecoveryStrategy')
            };

            // Log validation result
            if (result.isValid) {
                this.logInfo('Recovery strategy validation successful', { 
                    strategyType: config.type,
                    context: result
                });
            } else {
                this.logWarn('Recovery strategy validation failed', {
                    strategyType: config.type,
                    context: result,
                    errors,
                    warnings
                });
            }

            return result;
        } catch (error) {
            await this.handleError(
                error,
                'Recovery strategy validation failed',
                ERROR_KINDS.ValidationError
            );
            throw error;
        }
    }

    /**
     * Validate error metrics
     */
    private async validateErrorMetrics(metrics: IErrorMetrics): Promise<IValidationResult> {
        const startTime = Date.now();
        const errors: string[] = [];
        const warnings: string[] = [];

        try {
            // Validate error rate
            if (metrics.errorRate < 0 || metrics.errorRate > 1) {
                errors.push('Invalid error rate value');
            }

            // Validate error distribution
            if (!metrics.errorDistribution) {
                errors.push('Missing error distribution');
            } else {
                Object.keys(metrics.errorDistribution).forEach(kind => {
                    if (!Object.values(ERROR_KINDS).includes(kind as IErrorKind)) {
                        errors.push(`Invalid error kind in distribution: ${kind}`);
                    }
                });
            }

            // Validate severity distribution
            if (!metrics.severityDistribution) {
                errors.push('Missing severity distribution');
            } else {
                Object.keys(metrics.severityDistribution).forEach(severity => {
                    if (!Object.values(ERROR_SEVERITY_enum).includes(severity as ERROR_SEVERITY_enum)) {
                        errors.push(`Invalid severity in distribution: ${severity}`);
                    }
                });
            }

            // Validate error patterns
            if (metrics.patterns) {
                metrics.patterns.forEach((pattern: IErrorPattern, index: number) => {
                    const patternValidation = this.validateErrorPattern(pattern);
                    errors.push(...patternValidation.errors.map(e => `Pattern ${index}: ${e}`));
                    warnings.push(...patternValidation.warnings.map(w => `Pattern ${index}: ${w}`));
                });
            }

            // Validate impact metrics
            if (metrics.impact) {
                const impactValidation = this.validateErrorImpact(metrics.impact);
                errors.push(...impactValidation.errors);
                warnings.push(...impactValidation.warnings);
            }

            // Track validation metrics
            await this.metricsManager.trackMetric({
                domain: MetricDomain.WORKFLOW,
                type: MetricType.PERFORMANCE,
                value: Date.now() - startTime,
                timestamp: startTime,
                metadata: {
                    component: this.constructor.name,
                    operation: 'validateErrorMetrics',
                    errors: errors.length,
                    warnings: warnings.length
                }
            });

            return {
                isValid: errors.length === 0,
                errors,
                warnings,
                metadata: createBaseMetadata('ErrorValidator', 'validateErrorMetrics')
            };
        } catch (error) {
            await this.handleError(
                error,
                'Error metrics validation failed',
                ERROR_KINDS.ValidationError
            );
            throw error;
        }
    }

    /**
     * Validate error pattern
     */
    private validateErrorPattern(pattern: IErrorPattern): IValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!pattern.errorKind) {
            errors.push('Missing error kind');
        } else if (!Object.values(ERROR_KINDS).includes(pattern.errorKind)) {
            errors.push(`Invalid error kind: ${pattern.errorKind}`);
        }

        if (!pattern.frequency || pattern.frequency < 0) {
            errors.push('Invalid pattern frequency');
        }

        if (!pattern.meanTimeBetweenErrors || pattern.meanTimeBetweenErrors < 0) {
            errors.push('Invalid mean time between errors');
        }

        if (!pattern.recoveryStrategies || !Array.isArray(pattern.recoveryStrategies)) {
            errors.push('Missing recovery strategies');
        } else {
            pattern.recoveryStrategies.forEach(strategy => {
                if (!Object.values(RecoveryStrategyType).includes(strategy)) {
                    errors.push(`Invalid recovery strategy: ${strategy}`);
                }
            });
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            metadata: createBaseMetadata('ErrorValidator', 'validateErrorPattern')
        };
    }

    /**
     * Validate error impact
     */
    private validateErrorImpact(impact: IErrorImpact): IValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!Object.values(ERROR_SEVERITY_enum).includes(impact.severity as ERROR_SEVERITY_enum)) {
            errors.push(`Invalid impact severity: ${impact.severity}`);
        }

        if (impact.businessImpact < 0 || impact.businessImpact > 1) {
            errors.push('Invalid business impact value');
        }
        if (impact.userExperienceImpact < 0 || impact.userExperienceImpact > 1) {
            errors.push('Invalid user experience impact value');
        }
        if (impact.systemStabilityImpact < 0 || impact.systemStabilityImpact > 1) {
            errors.push('Invalid system stability impact value');
        }

        if (!impact.resourceImpact) {
            errors.push('Missing resource impact');
        } else {
            if (impact.resourceImpact.cpu < 0) {
                errors.push('Invalid CPU impact value');
            }
            if (impact.resourceImpact.memory < 0) {
                errors.push('Invalid memory impact value');
            }
            if (impact.resourceImpact.io < 0) {
                errors.push('Invalid IO impact value');
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            metadata: createBaseMetadata('ErrorValidator', 'validateErrorImpact')
        };
    }

    /**
     * Validate system health metrics
     */
    private async validateSystemHealthMetrics(metrics: ISystemHealthMetrics): Promise<IValidationResult> {
        const startTime = Date.now();
        const errors: string[] = [];
        const warnings: string[] = [];

        try {
            if (!metrics.timestamp) {
                errors.push('Missing timestamp');
            }

            // Validate CPU metrics
            if (!metrics.cpu) {
                errors.push('Missing CPU metrics');
            } else {
                if (metrics.cpu.usage < 0 || metrics.cpu.usage > 1) {
                    errors.push('Invalid CPU usage value');
                }
                if (!metrics.cpu.loadAverage || !Array.isArray(metrics.cpu.loadAverage)) {
                    errors.push('Invalid CPU load average');
                }
            }

            // Validate memory metrics
            if (!metrics.memory) {
                errors.push('Missing memory metrics');
            } else {
                if (metrics.memory.used < 0) {
                    errors.push('Invalid memory used value');
                }
                if (metrics.memory.total < metrics.memory.used) {
                    errors.push('Total memory less than used memory');
                }
                if (metrics.memory.free < 0) {
                    errors.push('Invalid free memory value');
                }
            }

            // Validate disk metrics
            if (!metrics.disk) {
                errors.push('Missing disk metrics');
            } else {
                if (metrics.disk.read < 0) {
                    errors.push('Invalid disk read value');
                }
                if (metrics.disk.write < 0) {
                    errors.push('Invalid disk write value');
                }
                if (metrics.disk.free < 0) {
                    errors.push('Invalid free disk space');
                }
                if (metrics.disk.total < metrics.disk.free) {
                    errors.push('Total disk space less than free space');
                }
            }

            // Track validation metrics
            await this.metricsManager.trackMetric({
                domain: MetricDomain.WORKFLOW,
                type: MetricType.PERFORMANCE,
                value: Date.now() - startTime,
                timestamp: startTime,
                metadata: {
                    component: this.constructor.name,
                    operation: 'validateSystemHealthMetrics',
                    errors: errors.length,
                    warnings: warnings.length
                }
            });

            return {
                isValid: errors.length === 0,
                errors,
                warnings,
                metadata: createBaseMetadata('ErrorValidator', 'validateSystemHealthMetrics')
            };
        } catch (error) {
            await this.handleError(
                error,
                'System health metrics validation failed',
                ERROR_KINDS.ValidationError
            );
            throw error;
        }
    }
}

export default ErrorValidator.getInstance();
