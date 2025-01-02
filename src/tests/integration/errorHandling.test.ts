/**
 * @file errorHandling.test.ts
 * @description Integration tests for error handling and metrics
 */

import { ErrorManager } from '../../managers/core/errorManager';
import { ErrorValidator } from '../../managers/validation/errorValidator';
import { MetricsValidator } from '../../managers/validation/metricsValidator';
import { createError } from '../../types/common/errorTypes';
import { ERROR_KINDS } from '../../types/common/errorTypes';
import { ERROR_SEVERITY_enum } from '../../types/common/enumTypes';
import { createBaseMetadata } from '../../types/common/baseTypes';
import { MetricDomain, MetricType } from '../../types/metrics/base/metricsManagerTypes';
import { createValidationResult } from '../../types/common/validationTypes';

import type { IBaseError } from '../../types/common/errorTypes';
import type { IErrorContext } from '../../types/common/errorTypes';
import type { 
    IMetricEvent, 
    IMetricFilter,
    IMetricsHandlerResult,
    IAgentMetrics
} from '../../types/metrics/base/metricsManagerTypes';
import type { IValidationResult } from '../../types/common/validationTypes';

describe('Error Handling Integration', () => {
    let errorManager: ErrorManager;
    let errorValidator: ErrorValidator;
    let metricsValidator: MetricsValidator;
    let mockError: IBaseError;
    let mockContext: IErrorContext;

    beforeEach(() => {
        errorManager = ErrorManager.getInstance();
        errorValidator = ErrorValidator.getInstance();
        metricsValidator = MetricsValidator.getInstance();

        const baseMetadata = createBaseMetadata('TestComponent', 'testOperation');
        mockError = createError({
            message: 'Test error',
            type: ERROR_KINDS.NetworkError,
            severity: ERROR_SEVERITY_enum.ERROR,
            metadata: {
                ...baseMetadata,
                error: {
                    code: 'TEST_ERROR',
                    message: 'Test error',
                    timestamp: Date.now(),
                    stack: ''
                }
            }
        });

        mockContext = {
            component: 'TestComponent',
            operation: 'testOperation',
            error: mockError,
            recoverable: true,
            retryCount: 0,
            failureReason: 'Network error',
            recommendedAction: 'Retry operation'
        };
    });

    // ─── Error Flow ────────────────────────────────────────────────────────────

    describe('error handling flow', () => {
        it('should handle error with metrics tracking', async () => {
            // Validate error context
            const validationResult = await errorValidator.validateErrorContext(mockContext);
            expect(validationResult.isValid).toBe(true);

            // Handle error
            await errorManager.handleError(mockError, 'TestComponent.testOperation', ERROR_KINDS.NetworkError);

            // Verify metrics tracking
            const metricsManagerSpy = jest.spyOn(errorManager['metricsManager'], 'trackMetric');
            expect(metricsManagerSpy).toHaveBeenCalledWith(expect.objectContaining({
                domain: MetricDomain.WORKFLOW,
                type: MetricType.ERROR,
                metadata: expect.objectContaining({
                    errorType: ERROR_KINDS.NetworkError,
                    severity: ERROR_SEVERITY_enum.ERROR
                })
            }));
        });

        it('should validate metrics before tracking', async () => {
            const metric: IMetricEvent = {
                timestamp: Date.now(),
                domain: MetricDomain.WORKFLOW,
                type: MetricType.ERROR,
                value: 1,
                metadata: {
                    errorType: ERROR_KINDS.NetworkError,
                    component: 'TestComponent',
                    severity: ERROR_SEVERITY_enum.ERROR
                }
            };

            // Validate metric
            const validationResult = await metricsValidator.validate(metric);
            const expectedResult: IValidationResult = createValidationResult({
                isValid: true,
                errors: [],
                warnings: [],
                metadata: {
                    component: 'MetricsValidator',
                    operation: 'validate'
                }
            });
            expect(validationResult).toEqual(expectedResult);

            // Track error metric
            await errorManager['metricsManager'].trackMetric(metric);

            // Verify error metrics
            const filter: IMetricFilter = {
                domain: MetricDomain.WORKFLOW,
                type: MetricType.ERROR,
                timeRange: 'hour',
                timeFrame: {
                    start: Date.now() - 1000,
                    end: Date.now()
                }
            };
            const metrics = await errorManager['metricsManager'].get(filter);
            expect(metrics.data).toBeDefined();
        });
    });

    // ─── Error Patterns ────────────────────────────────────────────────────

    describe('error patterns', () => {
        it('should track error distribution', async () => {
            // Generate multiple errors
            for (let i = 0; i < 3; i++) {
                await errorManager.handleError(mockError, `TestComponent.testOperation.${i}`, ERROR_KINDS.NetworkError);
            }

            const metrics: IMetricsHandlerResult<IAgentMetrics> = await errorManager['metricsManager'].get({
                domain: MetricDomain.WORKFLOW,
                type: MetricType.ERROR,
                timeRange: 'hour'
            });
            expect(metrics.data).toBeDefined();
            expect(metrics.data.errors.type).toBe(ERROR_KINDS.NetworkError);
        });

        it('should analyze error impact', async () => {
            await errorManager.handleError(mockError, 'TestComponent.testOperation', ERROR_KINDS.NetworkError);

            const metrics: IMetricsHandlerResult<IAgentMetrics> = await errorManager['metricsManager'].get({
                domain: MetricDomain.WORKFLOW,
                type: MetricType.ERROR,
                timeRange: 'hour'
            });
            expect(metrics.data).toBeDefined();
            expect(metrics.data.errors.type).toBe(ERROR_KINDS.NetworkError);
            expect(metrics.data.errors.severity).toBe(ERROR_SEVERITY_enum.ERROR);
        });

        it('should track error metrics with system health', async () => {
            const errorMetric: IMetricEvent = {
                timestamp: Date.now(),
                domain: MetricDomain.WORKFLOW,
                type: MetricType.ERROR,
                value: 1,
                metadata: {
                    errorType: ERROR_KINDS.NetworkError,
                    severity: ERROR_SEVERITY_enum.ERROR,
                    systemHealth: {
                        cpu: 0.5,
                        memory: 0.6,
                        latency: 100
                    }
                }
            };

            // Validate metric
            const validationResult = await metricsValidator.validate(errorMetric);
            const expectedResult: IValidationResult = createValidationResult({
                isValid: true,
                errors: [],
                warnings: [],
                metadata: {
                    component: 'MetricsValidator',
                    operation: 'validate'
                }
            });
            expect(validationResult).toEqual(expectedResult);

            // Track error metric
            await errorManager['metricsManager'].trackMetric(errorMetric);

            // Verify error metrics
            const filter: IMetricFilter = {
                domain: MetricDomain.WORKFLOW,
                type: MetricType.ERROR,
                timeRange: 'hour',
                timeFrame: {
                    start: Date.now() - 1000,
                    end: Date.now()
                }
            };
            const metrics = await errorManager['metricsManager'].get(filter);
            expect(metrics.data).toBeDefined();
        });
    });
});
