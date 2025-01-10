import { CoreManager } from '../../core/coreManager';
import { MANAGER_CATEGORY_enum } from '../../../types/common/enumTypes';
import type { IMetricEvent } from '../../../types/metrics/base/metricTypes';
import { METRIC_DOMAIN_enum, METRIC_TYPE_enum } from '../../../types/metrics/base/metricEnums';
import { MetricsCollector } from '../../core/metrics/MetricsCollector';

export interface ITeamMetricGroup {
    latency: IMetricEvent;
    throughput: IMetricEvent;
    cpu: IMetricEvent;
    memory: IMetricEvent;
}

export class TeamMetricsManager extends CoreManager {
    public readonly category = MANAGER_CATEGORY_enum.METRICS;
    private readonly collector: MetricsCollector;

    private constructor() {
        super();
        this.collector = MetricsCollector.getInstance();
    }

    private static instance: TeamMetricsManager | null = null;

    public static getInstance(): TeamMetricsManager {
        if (!TeamMetricsManager.instance) {
            TeamMetricsManager.instance = new TeamMetricsManager();
        }
        return TeamMetricsManager.instance;
    }

    public async trackExecution(
        teamId: string, 
        duration: number, 
        success: boolean,
        operationsPerSecond?: number
    ): Promise<void> {
        // Status and latency metrics
        await Promise.all([
            this.collector.collect(
                METRIC_DOMAIN_enum.TEAM,
                METRIC_TYPE_enum.LATENCY,
                duration,
                {
                    teamId,
                    component: 'team',
                    operation: 'execution',
                    success
                }
            ),
            // Add throughput if provided
            ...(operationsPerSecond !== undefined ? [
                this.collector.collect(
                    METRIC_DOMAIN_enum.TEAM,
                    METRIC_TYPE_enum.THROUGHPUT,
                    operationsPerSecond,
                    {
                        teamId,
                        component: 'team',
                        operation: 'processing'
                    }
                )
            ] : [])
        ]);
    }

    public async trackResource(teamId: string, resourceType: 'cpu' | 'memory', value: number): Promise<void> {
        const metricType = resourceType === 'cpu' ? METRIC_TYPE_enum.CPU : METRIC_TYPE_enum.MEMORY;

        await this.collector.collect(
            METRIC_DOMAIN_enum.TEAM,
            metricType,
            value,
            {
                teamId,
                component: 'team',
                operation: 'resource'
            }
        );
    }

    public async trackStateTransition(teamId: string, from: string, to: string): Promise<void> {
        await this.collector.collect(
            METRIC_DOMAIN_enum.TEAM,
            METRIC_TYPE_enum.STATE_TRANSITION,
            1,
            {
                teamId,
                component: 'team',
                operation: 'state',
                from,
                to
            }
        );
    }

    public createTeamMetrics(teamId: string): ITeamMetricGroup {
        const timestamp = Date.now();

        return {
            latency: {
                timestamp,
                domain: METRIC_DOMAIN_enum.TEAM,
                type: METRIC_TYPE_enum.LATENCY,
                value: 0,
                metadata: {
                    teamId,
                    component: 'team',
                    operation: 'execution'
                }
            },
            throughput: {
                timestamp,
                domain: METRIC_DOMAIN_enum.TEAM,
                type: METRIC_TYPE_enum.THROUGHPUT,
                value: 0,
                metadata: {
                    teamId,
                    component: 'team',
                    operation: 'processing'
                }
            },
            cpu: {
                timestamp,
                domain: METRIC_DOMAIN_enum.TEAM,
                type: METRIC_TYPE_enum.CPU,
                value: 0,
                metadata: {
                    teamId,
                    component: 'team',
                    operation: 'resource'
                }
            },
            memory: {
                timestamp,
                domain: METRIC_DOMAIN_enum.TEAM,
                type: METRIC_TYPE_enum.MEMORY,
                value: 0,
                metadata: {
                    teamId,
                    component: 'team',
                    operation: 'resource'
                }
            }
        };
    }
}

export default TeamMetricsManager.getInstance();
