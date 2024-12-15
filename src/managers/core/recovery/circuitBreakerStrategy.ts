/**
 * @file circuitBreakerStrategy.ts
 * @path src/managers/core/recovery/circuitBreakerStrategy.ts
 * @description Circuit breaker pattern implementation for error recovery
 *
 * @module @managers/core/recovery
 */

import { ERROR_SEVERITY_enum } from '../../../types/common/enumTypes';
import { RecoveryStrategyType } from '../../../types/common/recoveryTypes';
import { createBaseMetadata } from '../../../types/common/baseTypes';
import { createErrorContext } from '../../../types/common/errorTypes';

import type { 
    IBaseError,
    IErrorContext,
    IErrorRecoveryHandler
} from '../../../types/common/errorTypes';
import type {
    IRecoveryContext,
    IRecoveryResult,
    IRecoveryMetrics,
    ICircuitBreakerStrategyConfig,
    IRecoveryStrategy,
    IStrategyMetrics,
    IResourceUsage
} from '../../../types/common/recoveryTypes';

// ─── Circuit States ──────────────────────────────────────────────────────────

enum CircuitState {
    CLOSED = 'CLOSED',
    OPEN = 'OPEN',
    HALF_OPEN = 'HALF_OPEN'
}

// ─── Circuit Breaker Implementation ───────────────────────────────────────────

export class CircuitBreakerStrategy implements IRecoveryStrategy {
    public readonly config: ICircuitBreakerStrategyConfig = {
        type: RecoveryStrategyType.CIRCUIT_BREAKER,
        enabled: true,
        maxAttempts: 3,
        timeout: 5000,
        failureThreshold: 5,
        resetTimeout: 60000,
        halfOpenRequests: 1,
        applicableErrors: [],
        applicableSeverities: [
            ERROR_SEVERITY_enum.ERROR,
            ERROR_SEVERITY_enum.CRITICAL
        ],
        requiresApproval: false,
        validateAfterRecovery: true
    };

    private state: CircuitState = CircuitState.CLOSED;
    private failures: number = 0;
    private lastFailureTime: number = 0;
    private halfOpenAttempts: number = 0;

    private defaultResourceUsage: IResourceUsage = {
        cpu: 0,
        memory: 0,
        io: 0,
        networkLatency: 0
    };

    private defaultStrategyMetrics: IStrategyMetrics = {
        attempts: 0,
        successes: 0,
        failures: 0,
        averageTime: 0,
        resourceUsage: { ...this.defaultResourceUsage }
    };

    private metrics: IRecoveryMetrics = {
        totalAttempts: 0,
        successfulRecoveries: 0,
        failedRecoveries: 0,
        averageRecoveryTime: 0,
        recoverySuccessRate: 0,
        strategyMetrics: Object.values(RecoveryStrategyType).reduce(
            (acc, strategy) => ({
                ...acc,
                [strategy]: { ...this.defaultStrategyMetrics }
            }),
            {} as Record<RecoveryStrategyType, IStrategyMetrics>
        ),
        timeBasedMetrics: {
            hourly: { attempts: 0, successes: 0, failures: 0, averageResponseTime: 0 },
            daily: { attempts: 0, successes: 0, failures: 0, averageResponseTime: 0 },
            weekly: { attempts: 0, successes: 0, failures: 0, averageResponseTime: 0 }
        }
    };

    async execute(context: IRecoveryContext): Promise<IRecoveryResult> {
        const startTime = Date.now();

        // Check circuit state
        if (this.state === CircuitState.OPEN) {
            if (this.shouldAttemptReset()) {
                this.state = CircuitState.HALF_OPEN;
                this.halfOpenAttempts = 0;
            } else {
                return this.createFailedResult(context, startTime, 'Circuit is OPEN');
            }
        }

        try {
            // Attempt recovery action
            const recoveryHandler = context.errorContext.error as unknown as IErrorRecoveryHandler;
            if (typeof recoveryHandler?.handle === 'function') {
                const recoveryResult = await recoveryHandler.handle(
                    context.error,
                    context.metadata.component
                );

                if (recoveryResult.success) {
                    this.onSuccess();
                    return {
                        successful: true,
                        context: {
                            ...context,
                            attemptCount: 1
                        },
                        duration: Date.now() - startTime,
                        metadata: {
                            strategy: this.config.type,
                            attempts: 1,
                            circuitState: this.state
                        }
                    };
                }
            }

            this.onFailure();
            return this.createFailedResult(context, startTime, 'Recovery action failed');
        } catch (error) {
            this.onFailure();
            return this.createFailedResult(context, startTime, 'Recovery action threw error');
        }
    }

    validate(error: IBaseError, context: IErrorContext): boolean {
        if (!this.config.enabled) return false;

        // Check if error type is applicable
        if (this.config.applicableErrors.length > 0 && 
            !this.config.applicableErrors.includes(error.type)) {
            return false;
        }

        // Check if error severity is applicable
        const severity = error.severity || ERROR_SEVERITY_enum.ERROR;
        if (this.config.applicableSeverities.length > 0 && 
            !this.config.applicableSeverities.includes(severity)) {
            return false;
        }

        // Check if error has recovery handler
        const recoveryHandler = error as unknown as IErrorRecoveryHandler;
        return typeof recoveryHandler?.handle === 'function';
    }

    async cleanup(context: IRecoveryContext): Promise<void> {
        // Reset half-open state if needed
        if (this.state === CircuitState.HALF_OPEN) {
            this.halfOpenAttempts = 0;
        }
    }

    async reset(): Promise<void> {
        this.state = CircuitState.CLOSED;
        this.failures = 0;
        this.lastFailureTime = 0;
        this.halfOpenAttempts = 0;

        this.metrics = {
            totalAttempts: 0,
            successfulRecoveries: 0,
            failedRecoveries: 0,
            averageRecoveryTime: 0,
            recoverySuccessRate: 0,
            strategyMetrics: Object.values(RecoveryStrategyType).reduce(
                (acc, strategy) => ({
                    ...acc,
                    [strategy]: { ...this.defaultStrategyMetrics }
                }),
                {} as Record<RecoveryStrategyType, IStrategyMetrics>
            ),
            timeBasedMetrics: {
                hourly: { attempts: 0, successes: 0, failures: 0, averageResponseTime: 0 },
                daily: { attempts: 0, successes: 0, failures: 0, averageResponseTime: 0 },
                weekly: { attempts: 0, successes: 0, failures: 0, averageResponseTime: 0 }
            }
        };
    }

    getMetrics(): IRecoveryMetrics {
        return { ...this.metrics };
    }

    updateConfig(config: Partial<ICircuitBreakerStrategyConfig>): void {
        Object.assign(this.config, config);
    }

    private shouldAttemptReset(): boolean {
        return Date.now() - this.lastFailureTime >= this.config.resetTimeout;
    }

    private onSuccess(): void {
        if (this.state === CircuitState.HALF_OPEN) {
            this.halfOpenAttempts++;
            if (this.halfOpenAttempts >= this.config.halfOpenRequests) {
                this.state = CircuitState.CLOSED;
                this.failures = 0;
                this.halfOpenAttempts = 0;
            }
        }
    }

    private onFailure(): void {
        this.failures++;
        this.lastFailureTime = Date.now();

        if (this.state === CircuitState.HALF_OPEN || 
            this.failures >= this.config.failureThreshold) {
            this.state = CircuitState.OPEN;
            this.halfOpenAttempts = 0;
        }
    }

    private createFailedResult(
        context: IRecoveryContext,
        startTime: number,
        reason: string
    ): IRecoveryResult {
        return {
            successful: false,
            context: {
                ...context,
                attemptCount: 1
            },
            duration: Date.now() - startTime,
            metadata: {
                strategy: this.config.type,
                attempts: 1,
                circuitState: this.state,
                failureReason: reason
            }
        };
    }
}

export default new CircuitBreakerStrategy();
