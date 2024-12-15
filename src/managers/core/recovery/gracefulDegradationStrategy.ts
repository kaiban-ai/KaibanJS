/**
 * @file gracefulDegradationStrategy.ts
 * @path src/managers/core/recovery/gracefulDegradationStrategy.ts
 * @description Graceful degradation strategy for handling errors with fallback behavior
 *
 * @module @managers/core/recovery
 */

import { ERROR_SEVERITY_enum } from '../../../types/common/enumTypes';
import { RecoveryStrategyType, RecoveryPhase } from '../../../types/common/recoveryTypes';
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
    IGracefulDegradationConfig,
    IRecoveryStrategy,
    IStrategyMetrics,
    IResourceUsage,
    IDegradationLevel
} from '../../../types/common/recoveryTypes';

// ─── Degradation States ───────────────────────────────────────────────────────

enum DegradationState {
    NORMAL = 'NORMAL',
    DEGRADED = 'DEGRADED',
    MINIMAL = 'MINIMAL',
    CRITICAL = 'CRITICAL'
}

// ─── Default Degradation Levels ────────────────────────────────────────────────

const DEFAULT_DEGRADATION_LEVELS: IDegradationLevel[] = [
    {
        level: 1,
        conditions: ['ERROR_RATE > 0.1', 'RESPONSE_TIME > 1000'],
        actions: ['DISABLE_NON_CRITICAL_FEATURES', 'INCREASE_CACHING']
    },
    {
        level: 2,
        conditions: ['ERROR_RATE > 0.3', 'MEMORY_USAGE > 0.8'],
        actions: ['DISABLE_COMPLEX_OPERATIONS', 'REDUCE_BATCH_SIZE']
    },
    {
        level: 3,
        conditions: ['ERROR_RATE > 0.5', 'CPU_USAGE > 0.9'],
        actions: ['ENABLE_EMERGENCY_MODE', 'REJECT_NON_CRITICAL_REQUESTS']
    }
];

// ─── Graceful Degradation Implementation ─────────────────────────────────────

export class GracefulDegradationStrategy implements IRecoveryStrategy {
    public readonly config: IGracefulDegradationConfig = {
        type: RecoveryStrategyType.GRACEFUL_DEGRADATION,
        enabled: true,
        maxAttempts: 3,
        timeout: 5000,
        fallbackBehavior: 'default',
        degradationLevels: DEFAULT_DEGRADATION_LEVELS,
        applicableErrors: [],
        applicableSeverities: [
            ERROR_SEVERITY_enum.WARNING,
            ERROR_SEVERITY_enum.ERROR,
            ERROR_SEVERITY_enum.CRITICAL
        ],
        requiresApproval: false,
        validateAfterRecovery: true
    };

    private currentState: DegradationState = DegradationState.NORMAL;
    private currentLevel: number = 0;

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

        try {
            // Determine appropriate degradation level
            const newLevel = this.determineDegradationLevel(context);
            if (newLevel !== this.currentLevel) {
                await this.applyDegradationLevel(newLevel, context);
            }

            // Attempt recovery with degraded functionality
            const recoveryHandler = context.errorContext.error as unknown as IErrorRecoveryHandler;
            if (typeof recoveryHandler?.handle === 'function') {
                const recoveryResult = await recoveryHandler.handle(
                    context.error,
                    context.metadata.component
                );

                if (recoveryResult.success) {
                    // If recovery successful, consider reducing degradation level
                    await this.considerUpgrade();
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
                            degradationState: this.currentState,
                            degradationLevel: this.currentLevel
                        }
                    };
                }
            }

            return this.createFailedResult(context, startTime, 'Recovery action failed');
        } catch (error) {
            // On error, increase degradation level if possible
            await this.considerDowngrade();
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
        // Consider upgrading service level if in degraded state
        await this.considerUpgrade();
    }

    async reset(): Promise<void> {
        this.currentState = DegradationState.NORMAL;
        this.currentLevel = 0;

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

    updateConfig(config: Partial<IGracefulDegradationConfig>): void {
        Object.assign(this.config, config);
    }

    private determineDegradationLevel(context: IRecoveryContext): number {
        const metrics = context.metadata.resourceUsage;
        if (!metrics) return this.currentLevel;

        // Evaluate conditions for each level
        for (let i = this.config.degradationLevels.length - 1; i >= 0; i--) {
            const level = this.config.degradationLevels[i];
            if (this.evaluateConditions(level.conditions, metrics)) {
                return i + 1;
            }
        }

        return 0;
    }

    private evaluateConditions(conditions: string[], metrics: IResourceUsage): boolean {
        return conditions.every(condition => {
            const [metric, operator, value] = condition.split(' ');
            const metricValue = this.getMetricValue(metric, metrics);
            const threshold = parseFloat(value);

            switch (operator) {
                case '>':
                    return metricValue > threshold;
                case '<':
                    return metricValue < threshold;
                case '>=':
                    return metricValue >= threshold;
                case '<=':
                    return metricValue <= threshold;
                default:
                    return false;
            }
        });
    }

    private getMetricValue(metric: string, metrics: IResourceUsage): number {
        switch (metric) {
            case 'CPU_USAGE':
                return metrics.cpu;
            case 'MEMORY_USAGE':
                return metrics.memory;
            case 'IO_USAGE':
                return metrics.io;
            case 'NETWORK_LATENCY':
                return metrics.networkLatency || 0;
            default:
                return 0;
        }
    }

    private async applyDegradationLevel(level: number, context: IRecoveryContext): Promise<void> {
        this.currentLevel = level;
        
        if (level === 0) {
            this.currentState = DegradationState.NORMAL;
        } else if (level === 1) {
            this.currentState = DegradationState.DEGRADED;
        } else if (level === 2) {
            this.currentState = DegradationState.MINIMAL;
        } else {
            this.currentState = DegradationState.CRITICAL;
        }

        const degradationLevel = this.config.degradationLevels[level - 1];
        if (degradationLevel) {
            for (const action of degradationLevel.actions) {
                await this.executeAction(action, context);
            }
        }
    }

    private async executeAction(action: string, context: IRecoveryContext): Promise<void> {
        // Implement degradation actions
        switch (action) {
            case 'DISABLE_NON_CRITICAL_FEATURES':
                // Implementation
                break;
            case 'INCREASE_CACHING':
                // Implementation
                break;
            case 'DISABLE_COMPLEX_OPERATIONS':
                // Implementation
                break;
            case 'REDUCE_BATCH_SIZE':
                // Implementation
                break;
            case 'ENABLE_EMERGENCY_MODE':
                // Implementation
                break;
            case 'REJECT_NON_CRITICAL_REQUESTS':
                // Implementation
                break;
        }
    }

    private async considerUpgrade(): Promise<void> {
        if (this.currentLevel > 0) {
            // Check if conditions allow for upgrade
            // This would involve checking system metrics and error rates
            // For now, just decrease the level
            await this.applyDegradationLevel(this.currentLevel - 1, {
                id: '',
                error: {} as IBaseError,
                errorContext: {} as IErrorContext,
                strategy: RecoveryStrategyType.GRACEFUL_DEGRADATION,
                phase: RecoveryPhase.EXECUTING,
                startTime: Date.now(),
                attemptCount: 0,
                maxAttempts: this.config.maxAttempts,
                timeout: this.config.timeout,
                metadata: {
                    component: 'GracefulDegradationStrategy',
                    operation: 'considerUpgrade'
                }
            });
        }
    }

    private async considerDowngrade(): Promise<void> {
        if (this.currentLevel < this.config.degradationLevels.length) {
            await this.applyDegradationLevel(this.currentLevel + 1, {
                id: '',
                error: {} as IBaseError,
                errorContext: {} as IErrorContext,
                strategy: RecoveryStrategyType.GRACEFUL_DEGRADATION,
                phase: RecoveryPhase.EXECUTING,
                startTime: Date.now(),
                attemptCount: 0,
                maxAttempts: this.config.maxAttempts,
                timeout: this.config.timeout,
                metadata: {
                    component: 'GracefulDegradationStrategy',
                    operation: 'considerDowngrade'
                }
            });
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
                degradationState: this.currentState,
                degradationLevel: this.currentLevel,
                failureReason: reason
            }
        };
    }
}

export default new GracefulDegradationStrategy();
