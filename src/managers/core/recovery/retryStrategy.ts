/**
 * @file retryStrategy.ts
 * @path src/managers/core/recovery/retryStrategy.ts
 * @description Retry-based recovery strategy implementation
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
    IRetryStrategyConfig,
    IRecoveryStrategy,
    IStrategyMetrics,
    IResourceUsage
} from '../../../types/common/recoveryTypes';

// ─── Retry Strategy Implementation ──────────────────────────────────────────────

export class RetryStrategy implements IRecoveryStrategy {
    public readonly config: IRetryStrategyConfig = {
        type: RecoveryStrategyType.RETRY,
        enabled: true,
        maxAttempts: 3,
        timeout: 5000,
        initialDelay: 1000,
        maxDelay: 10000,
        exponentialBackoff: true,
        applicableErrors: [],
        applicableSeverities: [
            ERROR_SEVERITY_enum.WARNING,
            ERROR_SEVERITY_enum.ERROR
        ],
        requiresApproval: false,
        validateAfterRecovery: true
    };

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
        let currentDelay = this.config.initialDelay;
        let attempt = 0;

        while (attempt < context.maxAttempts) {
            try {
                await this.delay(currentDelay);
                
                // Attempt recovery action
                const recoveryHandler = context.errorContext.error as unknown as IErrorRecoveryHandler;
                if (typeof recoveryHandler?.handle === 'function') {
                    const recoveryResult = await recoveryHandler.handle(
                        context.error,
                        context.metadata.component
                    );
                    
                    if (recoveryResult.success) {
                        return {
                            successful: true,
                            context: {
                                ...context,
                                attemptCount: attempt + 1
                            },
                            duration: Date.now() - startTime,
                            metadata: {
                                strategy: this.config.type,
                                attempts: attempt + 1,
                                finalDelay: currentDelay
                            }
                        };
                    }
                }

                attempt++;
                if (this.config.exponentialBackoff) {
                    currentDelay = Math.min(
                        currentDelay * 2,
                        this.config.maxDelay
                    );
                }
            } catch (error) {
                attempt++;
                if (this.config.exponentialBackoff) {
                    currentDelay = Math.min(
                        currentDelay * 2,
                        this.config.maxDelay
                    );
                }
            }
        }

        return {
            successful: false,
            context: {
                ...context,
                attemptCount: attempt
            },
            duration: Date.now() - startTime,
            metadata: {
                strategy: this.config.type,
                attempts: attempt,
                finalDelay: currentDelay
            }
        };
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
        // No cleanup needed for retry strategy
    }

    async reset(): Promise<void> {
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

    updateConfig(config: Partial<IRetryStrategyConfig>): void {
        Object.assign(this.config, config);
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export default new RetryStrategy();
