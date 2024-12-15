/**
 * @file errorRecoveryManager.ts
 * @path src/managers/core/errorRecoveryManager.ts
 * @description Error recovery strategy implementation including retry mechanisms,
 * circuit breakers, and error analysis
 */

import { CoreManager } from './coreManager';
import { createError } from '../../types/common/commonErrorTypes';
import { DEFAULT_ERROR_RECOVERY_CONFIG } from '../../types/common/errorRecoveryTypes';
import { MetricsManager } from './metricsManager';
import { MANAGER_CATEGORY_enum } from '../../types/common/commonEnums';

import type { 
    IErrorRecoveryConfig,
    IErrorTrendData,
    IErrorImpact,
    IErrorRecoveryResult,
    IErrorAggregation,
    IErrorRecoveryHandler
} from '../../types/common/errorRecoveryTypes';
import type { IBaseError, IErrorKind } from '../../types/common/commonErrorTypes';

export class ErrorRecoveryManager extends CoreManager implements IErrorRecoveryHandler {
    private static instance: ErrorRecoveryManager;
    protected readonly metricsManager: MetricsManager;
    private config: IErrorRecoveryConfig;
    private errorAggregation: IErrorAggregation;

    private constructor() {
        super();
        this.metricsManager = MetricsManager.getInstance();
        this.config = DEFAULT_ERROR_RECOVERY_CONFIG;
        this.errorAggregation = this.initializeErrorAggregation();
        this.registerDomainManager('ErrorRecoveryManager', this);
    }

    public static getInstance(): ErrorRecoveryManager {
        if (!ErrorRecoveryManager.instance) {
            ErrorRecoveryManager.instance = new ErrorRecoveryManager();
        }
        return ErrorRecoveryManager.instance;
    }

    public readonly category: MANAGER_CATEGORY_enum = MANAGER_CATEGORY_enum.CORE;

    // ─── IErrorRecoveryHandler Implementation ───────────────────────────────────

    public canHandle(error: IBaseError): boolean {
        return this.isRetryableError(error) || this.shouldApplyCircuitBreaker(error);
    }

    public async handle(error: IBaseError, context: string): Promise<IErrorRecoveryResult> {
        const startTime = Date.now();
        let attempts = 0;
        let lastError: IBaseError | undefined;

        try {
            // Check circuit breaker first
            if (this.shouldApplyCircuitBreaker(error)) {
                return this.handleCircuitBreaker(error, context);
            }

            // Try retry mechanism if applicable
            if (this.isRetryableError(error)) {
                return await this.handleRetry(error, context);
            }

            // Fall back to default error handling
            if (this.config.fallbackHandler) {
                await this.config.fallbackHandler(error);
                return {
                    success: true,
                    strategy: 'fallback',
                    attempts: 1,
                    duration: Date.now() - startTime
                };
            }

            // No recovery strategy available
            return {
                success: false,
                strategy: 'none',
                attempts: 1,
                duration: Date.now() - startTime,
                error
            };
        } catch (recoveryError) {
            this.logError('Error recovery failed', recoveryError as Error, {
                component: this.constructor.name,
                operation: 'handle',
                error: recoveryError
            });
            return {
                success: false,
                strategy: 'none',
                attempts,
                duration: Date.now() - startTime,
                error: lastError || error
            };
        } finally {
            this.updateErrorAggregation(error, context);
        }
    }

    public getConfig(): IErrorRecoveryConfig {
        return this.config;
    }

    public updateConfig(config: Partial<IErrorRecoveryConfig>): void {
        this.config = {
            ...this.config,
            ...config
        };
    }

    // ─── Error Recovery Methods ───────────────────────────────────────────────

    private async handleRetry(error: IBaseError, context: string): Promise<IErrorRecoveryResult> {
        const startTime = Date.now();
        let attempts = 0;
        let lastError: IBaseError | undefined;

        const { maxRetries, initialDelay, backoffFactor } = this.config.retry!;

        while (attempts < maxRetries) {
            try {
                attempts++;
                const delay = initialDelay * Math.pow(backoffFactor, attempts - 1);
                await this.sleep(delay);

                // Attempt recovery
                if (this.config.fallbackHandler) {
                    await this.config.fallbackHandler(error);
                    return {
                        success: true,
                        strategy: 'retry',
                        attempts,
                        duration: Date.now() - startTime
                    };
                }
            } catch (retryError) {
                lastError = retryError as IBaseError;
                this.logWarn(`Retry attempt ${attempts} failed: ${(retryError as Error).message}`, {
                    component: this.constructor.name,
                    operation: 'handleRetry',
                    error: retryError
                });
            }
        }

        return {
            success: false,
            strategy: 'retry',
            attempts,
            duration: Date.now() - startTime,
            error: lastError || error
        };
    }

    private async handleCircuitBreaker(error: IBaseError, context: string): Promise<IErrorRecoveryResult> {
        const startTime = Date.now();
        const { failureThreshold, resetTimeout } = this.config.circuitBreaker!;
        const key = this.getCircuitBreakerKey(error);

        // Update failure count
        const failures = (this.config.circuitBreaker!.failures.get(key) || 0) + 1;
        this.config.circuitBreaker!.failures.set(key, failures);
        this.config.circuitBreaker!.lastFailure.set(key, Date.now());

        // Check if circuit should be opened
        if (failures >= failureThreshold) {
            const lastFailureTime = this.config.circuitBreaker!.lastFailure.get(key) || 0;
            const timeSinceLastFailure = Date.now() - lastFailureTime;

            if (timeSinceLastFailure < resetTimeout) {
                return {
                    success: false,
                    strategy: 'circuitBreaker',
                    attempts: 1,
                    duration: Date.now() - startTime,
                    error: createError({
                        message: 'Circuit breaker open',
                        type: 'CircuitBreakerError',
                        context: {
                            originalError: error,
                            failures,
                            resetIn: resetTimeout - timeSinceLastFailure
                        }
                    })
                };
            }

            // Reset circuit breaker after timeout
            this.config.circuitBreaker!.failures.set(key, 0);
            this.config.circuitBreaker!.lastFailure.delete(key);
        }

        return {
            success: true,
            strategy: 'circuitBreaker',
            attempts: 1,
            duration: Date.now() - startTime
        };
    }

    // ─── Error Analysis Methods ───────────────────────────────────────────────

    public getErrorTrends(): Map<IErrorKind, IErrorTrendData> {
        return this.errorAggregation.trends;
    }

    public getErrorImpacts(): Map<IErrorKind, IErrorImpact> {
        return this.errorAggregation.impacts;
    }

    public getErrorAggregation(): IErrorAggregation {
        return this.errorAggregation;
    }

    // ─── Private Helper Methods ───────────────────────────────────────────────

    private initializeErrorAggregation(): IErrorAggregation {
        return {
            totalErrors: 0,
            errorsByType: new Map(),
            errorsByComponent: new Map(),
            trends: new Map(),
            impacts: new Map(),
            timestamp: Date.now()
        };
    }

    private updateErrorAggregation(error: IBaseError, context: string): void {
        this.errorAggregation.totalErrors++;
        
        // Update error counts
        const typeCount = (this.errorAggregation.errorsByType.get(error.type) || 0) + 1;
        this.errorAggregation.errorsByType.set(error.type, typeCount);

        const component = error.context?.component || 'unknown';
        const componentCount = (this.errorAggregation.errorsByComponent.get(component) || 0) + 1;
        this.errorAggregation.errorsByComponent.set(component, componentCount);

        // Update trends
        this.updateErrorTrends(error);

        // Update impacts
        this.updateErrorImpacts(error);
    }

    private updateErrorTrends(error: IBaseError): void {
        const now = Date.now();
        const trend = this.errorAggregation.trends.get(error.type) || {
            errorType: error.type,
            count: 0,
            firstOccurrence: now,
            lastOccurrence: now,
            frequency: 0,
            impactLevel: 'low',
            affectedComponents: new Set()
        };

        trend.count++;
        trend.lastOccurrence = now;
        trend.frequency = trend.count / ((now - trend.firstOccurrence) / 60000); // errors per minute
        trend.affectedComponents.add(error.context?.component || 'unknown');

        // Update impact level based on frequency and scope
        if (trend.frequency > 10 || trend.affectedComponents.size > 3) {
            trend.impactLevel = 'high';
        } else if (trend.frequency > 5 || trend.affectedComponents.size > 1) {
            trend.impactLevel = 'medium';
        }

        this.errorAggregation.trends.set(error.type, trend);
    }

    private async updateErrorImpacts(error: IBaseError): Promise<void> {
        const impact = this.errorAggregation.impacts.get(error.type) || {
            severity: 'low',
            scope: 'isolated',
            userImpact: false,
            resourceImpact: {
                cpu: 0,
                memory: 0,
                io: 0
            },
            recoveryTime: 0
        };

        // Update impact assessment based on error context and metrics
        const metrics = await this.metricsManager.getInitialResourceMetrics();
        impact.resourceImpact = {
            cpu: metrics.cpuUsage || 0,
            memory: metrics.memoryUsage || 0,
            io: metrics.diskIO?.read || 0 + metrics.diskIO?.write || 0
        };

        // Determine severity based on resource impact and error frequency
        const trend = this.errorAggregation.trends.get(error.type);
        if (trend) {
            if (trend.frequency > 10 || impact.resourceImpact.cpu > 80) {
                impact.severity = 'high';
                impact.scope = 'system';
            } else if (trend.frequency > 5 || impact.resourceImpact.cpu > 50) {
                impact.severity = 'medium';
                impact.scope = 'component';
            }
        }

        // Estimate recovery time based on severity
        impact.recoveryTime = this.estimateRecoveryTime(impact.severity);

        this.errorAggregation.impacts.set(error.type, impact);
    }

    private isRetryableError(error: IBaseError): boolean {
        // Define which error types are retryable
        const retryableTypes = ['NetworkError', 'TimeoutError', 'RateLimitError'];
        return retryableTypes.includes(error.type);
    }

    private shouldApplyCircuitBreaker(error: IBaseError): boolean {
        const key = this.getCircuitBreakerKey(error);
        const failures = this.config.circuitBreaker!.failures.get(key) || 0;
        return failures >= (this.config.circuitBreaker!.failureThreshold || 5);
    }

    private getCircuitBreakerKey(error: IBaseError): string {
        return `${error.type}:${error.context?.component || 'unknown'}`;
    }

    private estimateRecoveryTime(severity: 'low' | 'medium' | 'high'): number {
        switch (severity) {
            case 'high':
                return 300000; // 5 minutes
            case 'medium':
                return 60000; // 1 minute
            default:
                return 5000; // 5 seconds
        }
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export default ErrorRecoveryManager.getInstance();
