/**
 * @file teamMetricsManager.ts
 * @path src/managers/domain/team/teamMetricsManager.ts
 * @description Team metrics management implementation
 */

import { CoreManager } from '../../core/coreManager';
import type { ITeamHandlerMetadata } from '../../../types/team/teamBaseTypes';
import type { ITeamMetrics } from '../../../types/team/teamMetricTypes';
import { WORKFLOW_STATUS_enum, AGENT_STATUS_enum, TASK_STATUS_enum } from '../../../types/common/commonEnums';

export class TeamMetricsManager extends CoreManager {
    private static instance: TeamMetricsManager | null = null;
    private readonly metrics: Map<string, ITeamMetrics>;

    private constructor() {
        super();
        this.registerDomainManager('TeamMetricsManager', this);
        this.metrics = new Map();
    }

    public static getInstance(): TeamMetricsManager {
        if (!TeamMetricsManager.instance) {
            TeamMetricsManager.instance = new TeamMetricsManager();
        }
        return TeamMetricsManager.instance;
    }

    public getMetrics(teamId: string): ITeamMetrics | undefined {
        return this.metrics.get(teamId);
    }

    public setMetrics(teamId: string, metrics: ITeamMetrics): void {
        this.metrics.set(teamId, metrics);
        this.logInfo(`Updated metrics for team ${teamId}`);
    }

    public clearMetrics(teamId: string): void {
        this.metrics.delete(teamId);
        this.logInfo(`Cleared metrics for team ${teamId}`);
    }

    public getTeamPerformance(teamId: string): ITeamHandlerMetadata['performance'] | undefined {
        const metrics = this.getMetrics(teamId);
        if (!metrics) return undefined;

        return {
            executionTime: {
                total: metrics.performance.thinking.reasoningTime.total || 0,
                average: metrics.performance.thinking.reasoningTime.average || 0,
                min: metrics.performance.thinking.reasoningTime.min || 0,
                max: metrics.performance.thinking.reasoningTime.max || 0
            },
            throughput: {
                operationsPerSecond: metrics.performance.executionTime.total / metrics.timestamp || 0,
                dataProcessedPerSecond: metrics.performance.throughput.operationsPerSecond || 0
            },
            errorMetrics: {
                totalErrors: metrics.performance.errorMetrics.totalErrors || 0,
                errorRate: metrics.performance.errorMetrics.errorRate || 0
            },
            resourceUtilization: {
                cpuUsage: metrics.resource.agentAllocation.efficiency || 0,
                memoryUsage: metrics.resource.cognitive.memoryAllocation || 0,
                diskIO: {
                    read: metrics.resource.agents['system']?.diskIO?.read || 0,
                    write: metrics.resource.agents['system']?.diskIO?.write || 0
                },
                networkUsage: {
                    upload: metrics.resource.agents['system']?.networkUsage?.upload || 0,
                    download: metrics.resource.agents['system']?.networkUsage?.download || 0
                },
                timestamp: metrics.timestamp
            },
            timestamp: metrics.timestamp,
            agentUtilization: metrics.usage.utilizationMetrics.agentUtilization.rate || 0,
            taskCompletion: metrics.performance.efficiencyMetrics.taskCompletion.rate || 0
        };
    }
}

export default TeamMetricsManager.getInstance();
