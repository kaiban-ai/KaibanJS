/**
 * @file systemHealthUtils.ts
 * @description System health metrics calculation utilities
 */

import type { ICoreSystemStability } from '../../../../types/metrics/base/systemHealthMetrics';

/**
 * Calculate system stability metrics
 */
export function calculateSystemStability(crashes: number[]): ICoreSystemStability {
    const crashCount = crashes.length;
    const lastIncident = crashes.length > 0 ? Math.max(...crashes) : 0;

    // Calculate mean time between failures
    let meanTimeBetweenFailures = 0;
    if (crashes.length > 1) {
        const sortedCrashes = [...crashes].sort((a, b) => a - b);
        const timeBetweenFailures = sortedCrashes.slice(1).map((time, index) => 
            time - sortedCrashes[index]
        );
        meanTimeBetweenFailures = timeBetweenFailures.reduce((sum, val) => sum + val, 0) / timeBetweenFailures.length;
    }

    return {
        crashCount,
        lastIncident,
        meanTimeBetweenFailures
    };
}

/**
 * Validate system stability metrics
 */
export function validateSystemStability(stability: ICoreSystemStability): boolean {
    return (
        typeof stability.crashCount === 'number' &&
        stability.crashCount >= 0 &&
        typeof stability.lastIncident === 'number' &&
        stability.lastIncident >= 0 &&
        typeof stability.meanTimeBetweenFailures === 'number' &&
        stability.meanTimeBetweenFailures >= 0
    );
}
