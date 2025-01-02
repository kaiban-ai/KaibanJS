/**
 * @file errorMetrics.test.ts
 * @path src/tests/performance/errorMetrics.test.ts
 * @description Performance tests for error handling and metrics
 */

import { ErrorManager } from '../../managers/core/errorManager';
import { createError, BaseError } from '../../types/common/errorTypes';
import { ERROR_KINDS } from '../../types/common/errorTypes';
import { ERROR_SEVERITY_enum } from '../../types/common/enumTypes';
import { createBaseMetadata } from '../../types/common/baseTypes';
import { MetricDomain, MetricType } from '../../types/metrics/base/metricsManagerTypes';

describe('Error Metrics Performance', () => {
    let errorManager: ErrorManager;
    let mockError: BaseError;
    const SAMPLE_SIZE = 100;
    const TIMEOUT = 5000; // 5 seconds

    beforeEach(() => {
        errorManager = ErrorManager.getInstance();

        const baseMetadata = createBaseMetadata('TestComponent', 'testOperation');
        const errorParams = {
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
        };
        mockError = createError(errorParams);

        // Reset metrics before each test
        jest.spyOn(errorManager['metricsManager'], 'trackMetric');
    }, TIMEOUT);

    // ─── Error Response Time ────────────────────────────────────────────────

    describe('error response time', () => {
        it('should measure error handling response time', async () => {
            const startTime = Date.now();
            const results: number[] = [];

            // Run multiple samples
            for (let i = 0; i < SAMPLE_SIZE; i++) {
                const sampleStart = Date.now();
                await errorManager.handleError(mockError, 'testOperation', ERROR_KINDS.NetworkError);
                results.push(Date.now() - sampleStart);
            }

            // Calculate statistics
            const totalTime = Date.now() - startTime;
            const avgResponseTime = results.reduce((a, b) => a + b, 0) / results.length;

            // Verify metrics tracking through metricsManager
            expect(errorManager['metricsManager'].trackMetric).toHaveBeenCalledWith(expect.objectContaining({
                domain: MetricDomain.AGENT,
                type: MetricType.ERROR,
                metadata: expect.objectContaining({
                    type: ERROR_KINDS.NetworkError,
                    severity: ERROR_SEVERITY_enum.ERROR
                })
            }));

            // Verify performance
            expect(avgResponseTime).toBeLessThan(100); // Average response under 100ms
            expect(totalTime).toBeLessThan(TIMEOUT); // Total time under timeout
        });
    });

    // ─── System Health Metrics ────────────────────────────────────────────────

    describe('system health metrics', () => {
        it('should track system health metrics during error handling', async () => {
            const metricsManagerSpy = jest.spyOn(errorManager['metricsManager'], 'trackMetric');

            // Run error handling operation
            await errorManager.handleError(mockError, 'testOperation', ERROR_KINDS.NetworkError);

            // Verify system health metrics tracking
            expect(metricsManagerSpy).toHaveBeenCalledWith(expect.objectContaining({
                domain: MetricDomain.AGENT,
                type: MetricType.SYSTEM_HEALTH,
                metadata: expect.objectContaining({
                    resources: expect.any(Object)
                })
            }));

            // Verify error metrics tracking
            expect(errorManager['metricsManager'].trackMetric).toHaveBeenCalledWith(expect.objectContaining({
                domain: MetricDomain.AGENT,
                type: MetricType.ERROR,
                metadata: expect.objectContaining({
                    type: ERROR_KINDS.NetworkError,
                    severity: ERROR_SEVERITY_enum.ERROR
                })
            }));
        });

        it('should validate performance impact', async () => {
            const metricsManagerSpy = jest.spyOn(errorManager['metricsManager'], 'trackMetric');

            // Run error handling operation
            await errorManager.handleError(mockError, 'testOperation', ERROR_KINDS.NetworkError);

            // Verify performance metrics tracking
            expect(metricsManagerSpy).toHaveBeenCalledWith(expect.objectContaining({
                domain: MetricDomain.AGENT,
                type: MetricType.PERFORMANCE,
                metadata: expect.objectContaining({
                    performance: expect.any(Object)
                })
            }));

            // Verify error metrics tracking
            expect(errorManager['metricsManager'].trackMetric).toHaveBeenCalledWith(expect.objectContaining({
                domain: MetricDomain.AGENT,
                type: MetricType.ERROR,
                metadata: expect.objectContaining({
                    message: mockError.message,
                    timestamp: expect.any(Number)
                })
            }));
        });
    });

    // ─── Concurrent Operations ────────────────────────────────────────────────

    describe('concurrent operations', () => {
        it('should handle concurrent error operations', async () => {
            const startTime = Date.now();

            // Run concurrent operations
            const operations = Array(SAMPLE_SIZE).fill(null).map((_, i) =>
                errorManager.handleError(mockError, `testOperation.${i}`, ERROR_KINDS.NetworkError)
            );

            await Promise.all(operations);

            // Verify performance
            const totalTime = Date.now() - startTime;
            expect(totalTime).toBeLessThan(TIMEOUT);

            // Verify metrics tracking through metricsManager
            expect(errorManager['metricsManager'].trackMetric).toHaveBeenCalledTimes(SAMPLE_SIZE);
            expect(errorManager['metricsManager'].trackMetric).toHaveBeenLastCalledWith(expect.objectContaining({
                domain: MetricDomain.AGENT,
                type: MetricType.ERROR,
                metadata: expect.objectContaining({
                    type: ERROR_KINDS.NetworkError,
                    severity: ERROR_SEVERITY_enum.ERROR
                })
            }));
        });
    });
});
