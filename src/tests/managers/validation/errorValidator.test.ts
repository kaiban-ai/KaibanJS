/**
 * @file errorValidator.test.ts
 * @path src/tests/managers/validation/errorValidator.test.ts
 * @description Tests for error context and metrics validation
 */

import { ErrorValidator } from '../../../managers/validation/errorValidator';
import { createBaseMetadata } from '../../../types/common/baseTypes';
import { MetricDomain, MetricType } from '../../../types/metrics/base/metricsManagerTypes';
import { ERROR_SEVERITY_enum } from '../../../types/common/enumTypes';
import { ERROR_KINDS } from '../../../types/common/errorTypes';
import { RecoveryStrategyType } from '../../../managers/core/recovery';

import type { 
    IErrorContext,
    IBaseError,
    IErrorKind 
} from '../../../types/common/errorTypes';
import type { ISystemHealthMetrics } from '../../../types/metrics/base/enhancedMetricsTypes';
import type { IErrorMetrics } from '../../../types/metrics/base/performanceMetrics';

describe('ErrorValidator', () => {
    let validator: ErrorValidator;
    let mockContext: IErrorContext;
    let mockMetrics: IErrorMetrics;
    let mockHealth: ISystemHealthMetrics;

    beforeEach(() => {
        validator = ErrorValidator.getInstance();
        
        const baseError: IBaseError = {
            name: 'TestError',
            message: 'Test error',
            type: ERROR_KINDS.ValidationError,
            metadata: {
                ...createBaseMetadata('TestComponent', 'testOperation'),
                error: {
                    code: 'TEST_ERROR',
                    message: 'Test error',
                    timestamp: Date.now(),
                    stack: ''
                }
            }
        };

        mockContext = {
            component: 'TestComponent',
            operation: 'testOperation',
            timestamp: Date.now(),
            error: baseError,
            severity: ERROR_SEVERITY_enum.ERROR,
            metadata: createBaseMetadata('TestComponent', 'testOperation'),
            recoverable: true,
            retryCount: 0,
            failureReason: 'Test failure',
            recommendedAction: 'Retry operation'
        };

        const errorDist: Record<IErrorKind, number> = {
            [ERROR_KINDS.ValidationError]: 0.5,
            [ERROR_KINDS.ExecutionError]: 0,
            [ERROR_KINDS.InitializationError]: 0,
            [ERROR_KINDS.StateError]: 0,
            [ERROR_KINDS.CognitiveError]: 0,
            [ERROR_KINDS.NetworkError]: 0.5,
            [ERROR_KINDS.ResourceError]: 0,
            [ERROR_KINDS.ConfigurationError]: 0,
            [ERROR_KINDS.AuthenticationError]: 0,
            [ERROR_KINDS.PermissionError]: 0,
            [ERROR_KINDS.NotFoundError]: 0,
            [ERROR_KINDS.TimeoutError]: 0,
            [ERROR_KINDS.RateLimitError]: 0,
            [ERROR_KINDS.SystemError]: 0,
            [ERROR_KINDS.TaskError]: 0,
            [ERROR_KINDS.AgentError]: 0,
            [ERROR_KINDS.LockError]: 0,
            [ERROR_KINDS.StorageError]: 0,
            [ERROR_KINDS.CircuitBreakerError]: 0,
            [ERROR_KINDS.UnknownError]: 0
        };

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

        mockMetrics = {
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

        mockHealth = {
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

    // ─── Error Context Validation ────────────────────────────────────────────────

    describe('validateErrorContext', () => {
        it('should validate valid error context', async () => {
            const result = await validator.validateErrorContext(mockContext);
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should reject context without required fields', async () => {
            const invalidContext = { ...mockContext };
            invalidContext.component = '';
            
            const result = await validator.validateErrorContext(invalidContext);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Missing component name');
        });

        it('should validate error severity', async () => {
            const invalidContext = {
                ...mockContext,
                severity: 'INVALID' as ERROR_SEVERITY_enum
            };
            const result = await validator.validateErrorContext(invalidContext);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Invalid error severity: INVALID');
        });

        it('should validate metrics if present', async () => {
            const contextWithMetrics = {
                ...mockContext,
                metrics: mockMetrics
            };
            const result = await validator.validateErrorContext(contextWithMetrics);
            expect(result.isValid).toBe(true);
            expect(result.warnings).toHaveLength(0);
        });
    });

    // ─── Error Metrics Validation ────────────────────────────────────────────────

    describe('validateErrorMetrics', () => {
        it('should validate valid error metrics', async () => {
            const result = await validator.validateErrorContext({
                ...mockContext,
                metrics: mockMetrics
            });
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should reject invalid error rate', async () => {
            const invalidMetrics = {
                ...mockMetrics,
                errorRate: 1.5
            };
            const result = await validator.validateErrorContext({
                ...mockContext,
                metrics: invalidMetrics
            });
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Invalid error rate value');
        });

        it('should validate error distribution sum', async () => {
            const invalidDist = { ...mockMetrics.errorDistribution };
            invalidDist[ERROR_KINDS.ValidationError] = 0.7;
            const result = await validator.validateErrorContext({
                ...mockContext,
                metrics: { ...mockMetrics, errorDistribution: invalidDist }
            });
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Error distribution must sum to 1');
        });

        it('should validate error patterns', async () => {
            const invalidPatterns = [{
                errorKind: 'INVALID_ERROR' as IErrorKind,
                frequency: -1,
                meanTimeBetweenErrors: 1000,
                recoveryStrategies: [RecoveryStrategyType.RETRY],
                recoverySuccessRate: 0.8
            }];
            const result = await validator.validateErrorContext({
                ...mockContext,
                metrics: { ...mockMetrics, patterns: invalidPatterns }
            });
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Invalid error kind in pattern 0: INVALID_ERROR');
        });
    });

    // ─── System Health Validation ────────────────────────────────────────────────

    describe('validateSystemHealth', () => {
        it('should validate valid system health metrics', async () => {
            const result = await validator.validateErrorContext({
                ...mockContext,
                systemHealth: mockHealth
            });
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should reject invalid CPU usage', async () => {
            const invalidHealth = {
                ...mockHealth,
                cpu: { ...mockHealth.cpu, usage: 1.5 }
            };
            const result = await validator.validateErrorContext({
                ...mockContext,
                systemHealth: invalidHealth
            });
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Invalid CPU usage value');
        });

        it('should validate memory constraints', async () => {
            const invalidHealth = {
                ...mockHealth,
                memory: { ...mockHealth.memory, used: mockHealth.memory.total + 1 }
            };
            const result = await validator.validateErrorContext({
                ...mockContext,
                systemHealth: invalidHealth
            });
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Used memory exceeds total memory');
        });

        it('should validate disk space constraints', async () => {
            const invalidHealth = {
                ...mockHealth,
                disk: { ...mockHealth.disk, free: mockHealth.disk.total + 1 }
            };
            const result = await validator.validateErrorContext({
                ...mockContext,
                systemHealth: invalidHealth
            });
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Free disk space exceeds total disk space');
        });
    });

    // ─── Metrics Integration ────────────────────────────────────────────────────

    describe('metrics integration', () => {
        it('should track validation metrics', async () => {
            const spy = jest.spyOn(validator['metricsManager'], 'trackMetric');
            await validator.validateErrorContext(mockContext);
            
            expect(spy).toHaveBeenCalledWith(expect.objectContaining({
                domain: MetricDomain.WORKFLOW,
                type: MetricType.PERFORMANCE
            }));
        });

        it('should include validation results in metrics', async () => {
            const result = await validator.validateErrorContext({
                ...mockContext,
                severity: 'INVALID' as ERROR_SEVERITY_enum
            });

            expect(result.metadata).toEqual(expect.objectContaining({
                component: 'ErrorValidator',
                operation: 'validateErrorContext',
                errors: expect.any(Array)
            }));
        });
    });
});
