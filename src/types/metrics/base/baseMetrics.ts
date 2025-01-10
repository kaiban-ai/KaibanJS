/**
 * @file baseMetrics.ts
 * @description Basic metrics type definitions
 */

export interface IBaseMetrics {
    startTime: number;
    endTime?: number;
    duration?: number;
    success?: boolean;
    error?: Error;
}
