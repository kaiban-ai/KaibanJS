/**
 * @file teamMetricsManager.ts
 * @path src/managers/domain/team/teamMetricsManager.ts
 * @description Team metrics management implementation
 */

import { CoreManager } from '../../core/coreManager';
import { MetricsValidator } from '../../validation/metricsValidator';
import type { ITeamHandlerMetadata } from '../../../types/team/teamBaseTypes';
import type { ITeamMetrics, ITeamThroughputMetrics } from '../../../types/team/teamMetricTypes';
import { MANAGER_CATEGORY_enum } from '../../../types/common/enumTypes';
import { createBaseMetadata } from '../../../types/common/baseTypes';

export class TeamMetricsManager extends CoreManager {
    private static instance: TeamMetricsManager | null = null;
    private readonly metrics: Map<string, ITeamMetrics>;
    private readonly metricsValidator: MetricsValidator;

    private constructor() {
        super();
        this.registerDomainManager('TeamMetricsManager', this);
        this.metrics = new Map();
        this.metricsValidator = MetricsValidator.getInstance();
    }

    public static getInstance(): TeamMetricsManager {
        if (!TeamMetricsManager.instance) {
            TeamMetricsManager.instance = new TeamMetricsManager();
        }
        return TeamMetricsManager.instance;
    }

    public readonly category = MANAGER_CATEGORY_enum.METRICS;

    public getMetrics(teamId: string): ITeamMetrics | undefined {
        return this.metrics.get(teamId);
    }

    public async setMetrics(teamId: string, metrics: ITeamMetrics): Promise<void> {
        // Validate metrics before setting
        const validationResult = await this.metricsValidator.validateErrorMetrics(metrics.errors);
        if (!validationResult.isValid) {
            throw new Error(`Invalid team metrics: ${validationResult.errors.join(', ')}`);
        }

        this.metrics.set(teamId, metrics);
        this.logInfo(`Updated metrics for team ${teamId}`, {
            warnings: validationResult.warnings
        });
    }

    public clearMetrics(teamId: string): void {
        this.metrics.delete(teamId);
        this.logInfo(`Cleared metrics for team ${teamId}`);
    }

    public getTeamPerformance(teamId: string): ITeamHandlerMetadata {
        const metrics = this.getMetrics(teamId);
        const baseMetadata = createBaseMetadata(this.constructor.name, 'getTeamPerformance');
        
        if (!metrics) {
            return {
                ...baseMetadata,
                teamId,
                teamName: '',
                agentCount: 0,
                taskCount: 0,
                workflowStatus: '',
                performance: {
                    responseTime: {
                        average: 0,
                        min: 0,
                        max: 0
                    },
                    throughput: {
                        requestsPerSecond: 0,
                        bytesPerSecond: 0
                    },
                    timestamp: Date.now(),
                    agentUtilization: 0,
                    taskCompletion: 0
                }
            };
        }

        const throughput: ITeamThroughputMetrics = metrics.performance.throughput;

        return {
            ...baseMetadata,
            teamId,
            teamName: teamId,
            agentCount: metrics.resources.agentCount,
            taskCount: metrics.resources.taskCount,
            workflowStatus: 'RUNNING',
            performance: {
                responseTime: metrics.performance.responseTime,
                throughput: {
                    requestsPerSecond: throughput.requestsPerSecond,
                    bytesPerSecond: throughput.bytesPerSecond
                },
                timestamp: metrics.timestamp,
                agentUtilization: metrics.usage.resourceUtilization,
                taskCompletion: throughput.taskCompletionRate
            }
        };
    }
}

export default TeamMetricsManager.getInstance();
