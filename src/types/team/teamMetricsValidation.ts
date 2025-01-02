/**
 * @file teamMetricsValidation.ts
 * @path src/types/team/teamMetricsValidation.ts
 * @description Team metrics validation type definitions and functions
 *
 * @module @team
 */

import { createValidationResult, type IValidationResult } from '../common/validationTypes';
import { type ITeamMetrics, type IHistoricalTeamMetrics, TeamMetricsTypeGuards } from './teamMetricTypes';
import { type ITimeWindow, type ITimeWindowConfig } from './teamTimeWindowTypes';

/**
 * Team metrics validation result with additional context
 */
export interface ITeamMetricsValidationResult extends IValidationResult {
    metrics?: ITeamMetrics | IHistoricalTeamMetrics;
    timeWindow?: ITimeWindow;
    timeWindowConfig?: ITimeWindowConfig;
    context?: {
        component: string;
        operation: string;
        timestamp: number;
    };
}

/**
 * Team metrics validation options
 */
export interface ITeamMetricsValidationOptions {
    strict?: boolean;
    allowPartial?: boolean;
    validateTimeWindows?: boolean;
    validateEfficiencyRanges?: boolean;
    validateDistributions?: boolean;
}

/**
 * Team metrics validation functions
 */
export const TeamMetricsValidation = {
    validateTeamMetrics(metrics: unknown, options?: ITeamMetricsValidationOptions): ITeamMetricsValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Check basic structure
        if (!TeamMetricsTypeGuards.isTeamMetrics(metrics)) {
            return {
                ...createValidationResult({
                    isValid: false,
                    errors: ['Invalid team metrics structure']
                })
            };
        }

        // Validate resource metrics
        if (metrics.resources.cpuUsage < 0 || metrics.resources.cpuUsage > 100) {
            errors.push('CPU usage must be between 0 and 100');
        }

        if (metrics.resources.memoryUsage < 0) {
            errors.push('Memory usage cannot be negative');
        }

        if (metrics.resources.agentCount < 0) {
            errors.push('Agent count cannot be negative');
        }

        if (metrics.resources.taskCount < 0) {
            errors.push('Task count cannot be negative');
        }

        if (metrics.resources.workflowCount < 0) {
            errors.push('Workflow count cannot be negative');
        }

        // Validate performance metrics
        const throughput = metrics.performance.throughput;
        if (throughput.taskCompletionRate < 0 || throughput.taskCompletionRate > 1) {
            errors.push('Task completion rate must be between 0 and 1');
        }

        if (throughput.workflowSuccessRate < 0 || throughput.workflowSuccessRate > 1) {
            errors.push('Workflow success rate must be between 0 and 1');
        }

        if (throughput.agentUtilization < 0 || throughput.agentUtilization > 1) {
            errors.push('Agent utilization must be between 0 and 1');
        }

        // Validate usage metrics
        if (metrics.usage.activeAgents > metrics.resources.agentCount) {
            errors.push('Active agents cannot exceed total agent count');
        }

        if (metrics.usage.activeTasks > metrics.resources.taskCount) {
            errors.push('Active tasks cannot exceed total task count');
        }

        if (metrics.usage.activeWorkflows > metrics.resources.workflowCount) {
            errors.push('Active workflows cannot exceed total workflow count');
        }

        if (metrics.usage.resourceUtilization < 0 || metrics.usage.resourceUtilization > 1) {
            errors.push('Resource utilization must be between 0 and 1');
        }

        // Validate timestamps
        if (metrics.timestamp > Date.now()) {
            warnings.push('Metrics timestamp is in the future');
        }

        // Additional validations based on options
        if (options?.validateEfficiencyRanges) {
            if (metrics.performance.throughput.requestsPerSecond > 1000) {
                warnings.push('Unusually high requests per second');
            }

            if (metrics.usage.resourceUtilization < 0.1) {
                warnings.push('Very low resource utilization');
            }

            if (metrics.usage.resourceUtilization > 0.9) {
                warnings.push('Very high resource utilization');
            }
        }

        const result = createValidationResult({
            isValid: errors.length === 0,
            errors,
            warnings
        });

        return {
            ...result,
            metrics
        };
    },

    validateHistoricalTeamMetrics(metrics: unknown, options?: ITeamMetricsValidationOptions): ITeamMetricsValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Check basic structure
        if (!TeamMetricsTypeGuards.isHistoricalTeamMetrics(metrics)) {
            return {
                ...createValidationResult({
                    isValid: false,
                    errors: ['Invalid historical team metrics structure']
                })
            };
        }

        // Validate current metrics
        const currentValidation = this.validateTeamMetrics(metrics.current, options);
        errors.push(...currentValidation.errors);
        warnings.push(...currentValidation.warnings);

        // Validate history entries
        metrics.history.forEach((entry, index) => {
            const entryValidation = this.validateTeamMetrics(entry, options);
            entryValidation.errors.forEach(error => {
                errors.push(`History entry ${index}: ${error}`);
            });
            entryValidation.warnings.forEach(warning => {
                warnings.push(`History entry ${index}: ${warning}`);
            });
        });

        // Validate time windows if requested
        if (options?.validateTimeWindows) {
            if (metrics.timeWindow.retention < 0) {
                errors.push('Time window retention cannot be negative');
            }

            if (metrics.timeWindow.resolution <= 0) {
                errors.push('Time window resolution must be positive');
            }

            if (metrics.timeWindow.maxDataPoints <= 0) {
                errors.push('Time window max data points must be positive');
            }

            // Validate time window configuration
            const timeWindowTypes = ['realtime', 'hourly', 'daily', 'weekly', 'monthly'] as const;
            timeWindowTypes.forEach(type => {
                const window = metrics.timeWindowConfig[type];
                if (window.retention < 0) {
                    errors.push(`${type} time window retention cannot be negative`);
                }
                if (window.resolution <= 0) {
                    errors.push(`${type} time window resolution must be positive`);
                }
                if (window.maxDataPoints <= 0) {
                    errors.push(`${type} time window max data points must be positive`);
                }
            });
        }

        const result = createValidationResult({
            isValid: errors.length === 0,
            errors,
            warnings
        });

        return {
            ...result,
            metrics,
            timeWindow: metrics.timeWindow,
            timeWindowConfig: metrics.timeWindowConfig
        };
    }
};
