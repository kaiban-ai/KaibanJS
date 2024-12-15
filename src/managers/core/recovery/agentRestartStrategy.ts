/**
 * @file agentRestartStrategy.ts
 * @path src/managers/core/recovery/agentRestartStrategy.ts
 * @description Agent restart strategy for handling agent-specific errors
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
    IErrorRecoveryHandler,
    IErrorRecoveryResult
} from '../../../types/common/errorTypes';
import type {
    IRecoveryContext,
    IRecoveryResult,
    IRecoveryMetrics,
    IAgentRecoveryConfig,
    IRecoveryStrategy,
    IStrategyMetrics,
    IResourceUsage
} from '../../../types/common/recoveryTypes';

// ─── Agent Restart Implementation ────────────────────────────────────────────

export class AgentRestartStrategy implements IRecoveryStrategy {
    public readonly config: IAgentRecoveryConfig = {
        type: RecoveryStrategyType.AGENT_RESTART,
        enabled: true,
        maxAttempts: 3,
        timeout: 5000,
        preserveState: true,
        applicableErrors: [],
        applicableSeverities: [
            ERROR_SEVERITY_enum.ERROR,
            ERROR_SEVERITY_enum.CRITICAL
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
        let attempt = 0;
        let state = null;

        try {
            // Save agent state if configured
            if (this.config.preserveState) {
                const saveResult = await this.handleOperation(
                    context.error,
                    `${context.metadata.component}:saveState`
                );
                if (saveResult.success) {
                    state = saveResult.metrics;
                }
            }

            while (attempt < context.maxAttempts) {
                try {
                    // Attempt agent restart
                    const restartResult = await this.handleOperation(
                        context.error,
                        `${context.metadata.component}:restart`
                    );

                    if (!restartResult.success) {
                        attempt++;
                        continue;
                    }

                    // Restore state if available
                    if (state && this.config.preserveState) {
                        const restoreResult = await this.handleOperation(
                            context.error,
                            `${context.metadata.component}:restoreState`
                        );
                        if (!restoreResult.success) {
                            attempt++;
                            continue;
                        }
                    }

                    // Verify agent health
                    const healthResult = await this.handleOperation(
                        context.error,
                        `${context.metadata.component}:healthCheck`
                    );

                    if (healthResult.success) {
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
                                statePreserved: Boolean(state)
                            }
                        };
                    }

                    attempt++;
                } catch (error) {
                    attempt++;
                    if (attempt >= context.maxAttempts) {
                        throw error;
                    }
                }
            }

            return this.createFailedResult(context, startTime, 'Max restart attempts exceeded');
        } catch (error) {
            return this.createFailedResult(
                context,
                startTime,
                'Agent restart failed',
                error as Error
            );
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
        // Clean up any temporary state or resources
        await this.handleOperation(
            context.error,
            `${context.metadata.component}:cleanup`
        );
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

    updateConfig(config: Partial<IAgentRecoveryConfig>): void {
        Object.assign(this.config, config);
    }

    private async handleOperation(
        error: IBaseError,
        context: string
    ): Promise<IErrorRecoveryResult> {
        const recoveryHandler = error as unknown as IErrorRecoveryHandler;
        if (typeof recoveryHandler?.handle === 'function') {
            return await recoveryHandler.handle(error, context);
        }
        return {
            success: false,
            strategy: 'none',
            attempts: 0,
            duration: 0
        };
    }

    private createFailedResult(
        context: IRecoveryContext,
        startTime: number,
        reason: string,
        error?: Error
    ): IRecoveryResult {
        return {
            successful: false,
            context: {
                ...context,
                attemptCount: context.maxAttempts
            },
            duration: Date.now() - startTime,
            error,
            metadata: {
                strategy: this.config.type,
                attempts: context.maxAttempts,
                failureReason: reason
            }
        };
    }
}

export default new AgentRestartStrategy();
