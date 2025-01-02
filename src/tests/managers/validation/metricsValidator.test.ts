/**
 * @file metricsValidator.test.ts
 * @path src/tests/managers/validation/metricsValidator.test.ts
 * @description Tests for metrics validation with error and system health metrics
 */

import { MetricsValidator } from '../../../managers/validation/metricsValidator';
import { MetricDomain, MetricType } from '../../../types/metrics/base/metricsManagerTypes';
import { ERROR_KINDS } from '../../../types/common/errorTypes';
import { ERROR_SEVERITY_enum } from '../../../types/common/enumTypes';
import { RecoveryStrategyType } from '../../../managers/core/recovery';

import type { IErrorMetrics } from '../../../types/metrics/base/performanceMetrics';
import type { ISystemHealthMetrics } from '../../../types/metrics/base/enhancedMetricsTypes';

describe('MetricsValidator', () => {
    let validator: MetricsValidator;
    let mockErrorMetrics: IErrorMetrics;
    let mockSystemHealth: ISystemHealthMetrics;

    beforeEach(() => {
        validator = MetricsValidator.getInstance();

        const errorDist = Object.values(ERROR_KINDS).reduce(
            (acc, kind) => ({ ...acc, [kind]: 0 }),
            {} as Record<typeof ERROR_KINDS[keyof typeof ERROR_KINDS], number>
        );
        errorDist[ERROR_KINDS.ValidationError] = 0.5;
        errorDist[ERROR_KINDS.NetworkError] = 0.5;

        const severityDist: Record<ERROR_SEVERITY_enum, number> = {
            [ERROR_SEVERITY_enum.DEBUG]: 0,
            [ERROR_SEVERITY_enum.INFO]: 0,
            [ERROR_SEVERITY_enum.WARNING]: 0.3,
            [ERROR_SEVERITY_enum.ERROR]: 0.7,
            [ERROR_SEVERITY_enum.CRITICAL]: 0
        };

        const strategyDist: Record<RecoveryStrategyType, number> = {
            [RecoveryStrategyType.RETRY]: 0.5,
            [RecoveryStrategyType.FALLBACK]: 0.1,
            [RecoveryStrategyType.CIRCUIT_BREAKER]: 0.1,
            [RecoveryStrategyType.GRACEFUL_DEGRADATION]: 0.1,
            [RecoveryStrategyType.HUMAN_INTERVENTION]: 0,
            [RecoveryStrategyType.STATE_RESET]: 0,
            [RecoveryStrategyType.ROLLBACK]: 0,
            [RecoveryStrategyType.AGENT_RESTART]: 0.1,
            [RecoveryStrategyType.AGENT_REASSIGN]: 0.1,
            [RecoveryStrategyType.AGENT_FALLBACK_MODEL]: 0
        };

        mockErrorMetrics = {
            totalErrors: 10,
            errorRate: 0.1,
            errorDistribution: errorDist,
            severityDistribution: severityDist,
            patterns: [{
                errorKind: ERROR_KINDS.ValidationError,
                frequency: 5,
                meanTimeBetweenErrors: 1000,
                recoveryStrategies: [RecoveryStrategyType.RETRY],
                recoverySuccessRate: 0.8
            }],
            impact: {
                severity: ERROR_SEVERITY_enum.ERROR,
                businessImpact: 0.5,
                userExperienceImpact: 0.3,
                systemStabilityImpact: 0.4,
                resourceImpact: {
                    cpu: 0.2,
                    memory: 0.3,
                    io: 0.1
                }
            },
            recovery: {
                meanTimeToRecover: 1000,
                recoverySuccessRate: 0.8,
                strategyDistribution: strategyDist,
                failedRecoveries: 1
            },
            prevention: {
                preventedCount: 0,
                preventionRate: 0,
                earlyWarnings: 0
            },
            trends: {
                dailyRates: [],
                weeklyRates: [],
                monthlyRates: []
            }
        };

        mockSystemHealth = {
            timestamp: Date.now(),
            cpu: {
                usage: 0.5,
                temperature: 50,
                loadAverage: [0.5, 0.6, 0.7]
            },
            memory: {
                used: 1000,
                total: 2000,
                free: 1000
            },
            disk: {
                read: 100,
                write: 200,
                free: 5000,
                total: 10000
            },
            network: {
                upload: 50,
                download: 100
            },
            processMetrics: {
                uptime: 3600,
                memoryUsage: process.memoryUsage(),
                cpuUsage: process.cpuUsage()
            }
        };
    });

    // ─── Error Metrics Validation ────────────────────────────────────────────────

    describe('validateErrorMetrics', () => {
        it('should validate valid error metrics', async () => {
            const result = await validator.validateErrorMetrics(mockErrorMetrics);
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should reject invalid error rate', async () => {
            const invalidMetrics = {
                ...mockErrorMetrics,
                errorRate: 1.5
            };
            const result = await validator.validateErrorMetrics(invalidMetrics);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain(expect.stringContaining('error rate'));
        });

        it('should validate error distribution sum', async () => {
            const invalidDist = { ...mockErrorMetrics.errorDistribution };
            invalidDist[ERROR_KINDS.ValidationError] = 0.7;
            const result = await validator.validateErrorMetrics({
                ...mockErrorMetrics,
                errorDistribution: invalidDist
            });
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Error distribution must sum to 1');
        });

        it('should validate severity distribution sum', async () => {
            const invalidDist = { ...mockErrorMetrics.severityDistribution };
            invalidDist[ERROR_SEVERITY_enum.ERROR] = 0.8;
            const result = await validator.validateErrorMetrics({
                ...mockErrorMetrics,
                severityDistribution: invalidDist
            });
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Severity distribution must sum to 1');
        });

        it('should validate error patterns', async () => {
            const invalidPatterns = [{
                errorKind: ERROR_KINDS.UnknownError,
                frequency: -1,
                meanTimeBetweenErrors: 1000,
                recoveryStrategies: [RecoveryStrategyType.RETRY],
                recoverySuccessRate: 0.8
            }];
            const result = await validator.validateErrorMetrics({
                ...mockErrorMetrics,
                patterns: invalidPatterns
            });
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain(expect.stringContaining('Invalid frequency'));
        });
    });

    // ─── System Health Validation ────────────────────────────────────────────────

    describe('validateSystemHealth', () => {
        it('should validate valid system health metrics', async () => {
            const result = await validator.validateSystemHealth(mockSystemHealth);
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should warn about high CPU usage', async () => {
            const result = await validator.validateSystemHealth({
                ...mockSystemHealth,
                cpu: { ...mockSystemHealth.cpu, usage: 0.95 }
            });
            expect(result.isValid).toBe(true);
            expect(result.warnings).toContain('High CPU usage detected');
        });

        it('should warn about high CPU temperature', async () => {
            const result = await validator.validateSystemHealth({
                ...mockSystemHealth,
                cpu: { ...mockSystemHealth.cpu, temperature: 85 }
            });
            expect(result.isValid).toBe(true);
            expect(result.warnings).toContain('High CPU temperature detected');
        });

        it('should warn about low memory', async () => {
            const result = await validator.validateSystemHealth({
                ...mockSystemHealth,
                memory: {
                    used: 1900,
                    total: 2000,
                    free: 100
                }
            });
            expect(result.isValid).toBe(true);
            expect(result.warnings).toContain('Low available memory');
        });

        it('should reject invalid memory usage', async () => {
            const result = await validator.validateSystemHealth({
                ...mockSystemHealth,
                memory: {
                    used: 3000,
                    total: 2000,
                    free: 1000
                }
            });
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Used memory exceeds total memory');
        });

        it('should warn about low disk space', async () => {
            const result = await validator.validateSystemHealth({
                ...mockSystemHealth,
                disk: {
                    ...mockSystemHealth.disk,
                    free: 500,
                    total: 10000
                }
            });
            expect(result.isValid).toBe(true);
            expect(result.warnings).toContain('Low available disk space');
        });

        it('should reject invalid disk space', async () => {
            const result = await validator.validateSystemHealth({
                ...mockSystemHealth,
                disk: {
                    ...mockSystemHealth.disk,
                    free: 15000,
                    total: 10000
                }
            });
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Free disk space exceeds total disk space');
        });

        it('should warn about high heap usage', async () => {
            const mockMemoryUsage = {
                heapUsed: 900,
                heapTotal: 1000,
                rss: 2000,
                external: 100,
                arrayBuffers: 50
            };

            const result = await validator.validateSystemHealth({
                ...mockSystemHealth,
                processMetrics: {
                    ...mockSystemHealth.processMetrics,
                    memoryUsage: mockMemoryUsage
                }
            });
            expect(result.isValid).toBe(true);
            expect(result.warnings).toContain('High heap memory usage');
        });
    });

    // ─── Metrics Integration ────────────────────────────────────────────────────

    describe('metrics integration', () => {
        it('should track error metrics validation', async () => {
            const spy = jest.spyOn(validator['metricsManager'], 'trackMetric');
            await validator.validateErrorMetrics(mockErrorMetrics);
            
            expect(spy).toHaveBeenCalledWith(expect.objectContaining({
                domain: MetricDomain.WORKFLOW,
                type: MetricType.PERFORMANCE,
                metadata: expect.objectContaining({
                    component: 'MetricsValidator',
                    operation: 'validateErrorMetrics'
                })
            }));
        });

        it('should track system health validation', async () => {
            const spy = jest.spyOn(validator['metricsManager'], 'trackMetric');
            await validator.validateSystemHealth(mockSystemHealth);
            
            expect(spy).toHaveBeenCalledWith(expect.objectContaining({
                domain: MetricDomain.WORKFLOW,
                type: MetricType.PERFORMANCE,
                metadata: expect.objectContaining({
                    component: 'MetricsValidator',
                    operation: 'validateSystemHealth'
                })
            }));
        });

        it('should include validation results in metrics', async () => {
            const result = await validator.validateSystemHealth({
                ...mockSystemHealth,
                memory: {
                    used: 3000,
                    total: 2000,
                    free: 1000
                }
            });

            expect(result.metadata).toEqual(expect.objectContaining({
                component: 'MetricsValidator',
                operation: 'validateSystemHealth'
            }));
        });
    });
});
