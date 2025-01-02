/**
 * @file errorManager.test.ts
 * @path src/tests/managers/core/errorManager.test.ts
 * @description Tests for error handling and management with metrics integration
 */

import { ErrorManager } from '../../../managers/core/errorManager';
import { createError } from '../../../types/common/errorTypes';
import { ERROR_KINDS } from '../../../types/common/errorTypes';
import { ERROR_SEVERITY_enum } from '../../../types/common/enumTypes';
import { MetricDomain, MetricType } from '../../../types/metrics/base/metricsManagerTypes';
import { createBaseMetadata } from '../../../types/common/baseTypes';

import type { IBaseError } from '../../../types/common/errorTypes';

describe('ErrorManager', () => {
    let errorManager: ErrorManager;
    let mockError: IBaseError;

    beforeEach(() => {
        errorManager = ErrorManager.getInstance();

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

        // Reset metrics tracking
        jest.spyOn(errorManager['metricsManager'], 'trackMetric');
    });

    // ─── Error Handling ────────────────────────────────────────────────────────

    describe('handleError', () => {
        it('should handle error with metrics tracking', async () => {
            const metricsManagerSpy = jest.spyOn(errorManager['metricsManager'], 'trackMetric');

            await errorManager.handleError(mockError, 'TestComponent.testOperation', ERROR_KINDS.NetworkError);

            // Verify metrics tracking
            expect(metricsManagerSpy).toHaveBeenCalledWith(expect.objectContaining({
                domain: MetricDomain.WORKFLOW,
                type: MetricType.PERFORMANCE,
                metadata: expect.objectContaining({
                    errorType: ERROR_KINDS.NetworkError
                })
            }));
        });

        it('should normalize unknown errors', async () => {
            const unknownError = new Error('Unknown error');
            await errorManager.handleError(unknownError, 'TestComponent.testOperation');

            // Verify metrics tracking
            const metricsManagerSpy = jest.spyOn(errorManager['metricsManager'], 'trackMetric');
            expect(metricsManagerSpy).toHaveBeenCalledWith(expect.objectContaining({
                metadata: expect.objectContaining({
                    errorType: ERROR_KINDS.UnknownError
                })
            }));
        });

        it('should handle string errors', async () => {
            const stringError = 'String error message';
            await errorManager.handleError(stringError, 'TestComponent.testOperation');

            // Verify metrics tracking
            const metricsManagerSpy = jest.spyOn(errorManager['metricsManager'], 'trackMetric');
            expect(metricsManagerSpy).toHaveBeenCalledWith(expect.objectContaining({
                metadata: expect.objectContaining({
                    errorType: ERROR_KINDS.UnknownError
                })
            }));
        });
    });

    // ─── Error Metrics ────────────────────────────────────────────────────────

    describe('error metrics', () => {
        it('should track error trends', async () => {
            // Generate multiple errors
            for (let i = 0; i < 3; i++) {
                await errorManager.handleError(mockError, `TestComponent.testOperation.${i}`, ERROR_KINDS.NetworkError);
            }

            const trends = await errorManager.getErrorTrends();
            expect(trends.get(ERROR_KINDS.NetworkError)).toBeDefined();
            expect(trends.get(ERROR_KINDS.NetworkError)?.count).toBeGreaterThan(0);
        });

        it('should track error impacts', async () => {
            await errorManager.handleError(mockError, 'TestComponent.testOperation', ERROR_KINDS.NetworkError);

            const impacts = await errorManager.getErrorImpacts();
            expect(impacts.get(ERROR_KINDS.NetworkError)).toBeDefined();
            expect(impacts.get(ERROR_KINDS.NetworkError)?.severity).toBe('high');
        });

        it('should track error aggregations', async () => {
            // Generate multiple errors
            for (let i = 0; i < 3; i++) {
                await errorManager.handleError(mockError, `TestComponent.testOperation.${i}`, ERROR_KINDS.NetworkError);
            }

            const aggregation = await errorManager.getErrorAggregation();
            expect(aggregation.get(ERROR_KINDS.NetworkError)).toBeDefined();
            expect(aggregation.get(ERROR_KINDS.NetworkError)?.total).toBeGreaterThan(0);
        });
    });

    // ─── Error Recovery Configuration ────────────────────────────────────────────

    describe('error recovery configuration', () => {
        it('should update error recovery config', async () => {
            const newConfig = {
                maxRetries: 5,
                retryDelay: 1000,
                circuitBreakerThreshold: 0.5
            };

            await errorManager.updateErrorRecoveryConfig(newConfig);

            // Generate error to test new config
            await errorManager.handleError(mockError, 'TestComponent.testOperation', ERROR_KINDS.NetworkError);

            // Verify metrics tracking with new config
            const metricsManagerSpy = jest.spyOn(errorManager['metricsManager'], 'trackMetric');
            expect(metricsManagerSpy).toHaveBeenCalledWith(expect.objectContaining({
                metadata: expect.objectContaining({
                    config: expect.objectContaining({
                        maxRetries: 5
                    })
                })
            }));
        });

        it('should validate config updates', async () => {
            const invalidConfig = {
                maxRetries: -1, // Invalid value
                retryDelay: 1000
            };

            // Should log warning about invalid config
            const logManagerSpy = jest.spyOn(errorManager['logManager'], 'log');
            await errorManager.updateErrorRecoveryConfig(invalidConfig);

            expect(logManagerSpy).toHaveBeenCalledWith(
                expect.stringContaining('Invalid config'),
                'warn',
                expect.any(Object)
            );
        });
    });

    // ─── Error Status Integration ────────────────────────────────────────────────

    describe('error status integration', () => {
        it('should update system status on error', async () => {
            const statusManagerSpy = jest.spyOn(errorManager['statusManager'], 'transition');

            await errorManager.handleError(mockError, 'TestComponent.testOperation', ERROR_KINDS.NetworkError);

            expect(statusManagerSpy).toHaveBeenCalledWith(expect.objectContaining({
                entity: 'task',
                targetStatus: expect.stringContaining('ERROR')
            }));
        });

        it('should include performance metrics in status', async () => {
            const statusManagerSpy = jest.spyOn(errorManager['statusManager'], 'transition');

            await errorManager.handleError(mockError, 'TestComponent.testOperation', ERROR_KINDS.NetworkError);

            expect(statusManagerSpy).toHaveBeenCalledWith(expect.objectContaining({
                performanceMetrics: expect.objectContaining({
                    errorRate: expect.any(Number),
                    successRate: expect.any(Number)
                })
            }));
        });
    });
});
