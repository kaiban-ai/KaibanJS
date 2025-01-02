/**
 * @file errorMetrics.ts
 * @path src/types/metrics/base/errorMetrics.ts
 * @description Simplified error metrics for essential error tracking
 */

import type { IErrorKind } from '../../common/errorTypes';
import type { ERROR_SEVERITY_enum } from '../../common/enumTypes';

/**
 * Basic error metrics interface focused on essential error tracking
 */
export interface IErrorMetrics {
    readonly count: number;
    readonly type: IErrorKind;
    readonly severity: keyof typeof ERROR_SEVERITY_enum;
    readonly timestamp: number;
    readonly message: string;
}

/**
 * Type guards for error metrics
 */
export const ErrorMetricsTypeGuards = {
    isErrorMetrics(value: unknown): value is IErrorMetrics {
        if (!value || typeof value !== 'object') return false;
        const metrics = value as Partial<IErrorMetrics>;

        return !!(
            typeof metrics.count === 'number' &&
            typeof metrics.type === 'string' &&
            typeof metrics.severity === 'string' &&
            typeof metrics.timestamp === 'number' &&
            typeof metrics.message === 'string'
        );
    }
};
