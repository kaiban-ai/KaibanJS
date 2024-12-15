/**
 * @file statusReportManager.ts
 * @path src/managers/core/statusReportManager.ts
 * @description Status reporting and analysis implementation for real-time monitoring and trend analysis
 */

import { CoreManager } from './coreManager';
import { createError } from '../../types/common/commonErrorTypes';
import { MANAGER_CATEGORY_enum } from '../../types/common/commonEnums';
import { StatusHistoryManager } from './statusHistoryManager';

import type {
    IStatusEntity,
    IStatusType,
    IStatusChangeEvent
} from '../../types/common/commonStatusTypes';

import type { IStatusHistoryEntry } from '../../types/common/statusHistoryTypes';

import {
    IStatusTrendAnalysis,
    IStatusImpactAssessment,
    IStatusDashboardMetrics,
    DEFAULT_STATUS_RECORDS
} from '../../types/common/statusReportTypes';

/**
 * Status report manager that handles real-time monitoring, trend analysis,
 * and impact assessment of status transitions
 */
export class StatusReportManager extends CoreManager {
    private static instance: StatusReportManager;
    private readonly historyManager: StatusHistoryManager;
    private readonly dashboardMetrics: Map<IStatusEntity, IStatusDashboardMetrics>;
    private readonly updateInterval: number;
    private updateTimer?: NodeJS.Timer;

    public readonly category: MANAGER_CATEGORY_enum = MANAGER_CATEGORY_enum.CORE;

    private constructor() {
        super();
        this.historyManager = StatusHistoryManager.getInstance();
        this.dashboardMetrics = new Map();
        this.updateInterval = 5000; // 5 seconds
        this.registerDomainManager('StatusReportManager', this);
        this.startMetricsUpdate();
    }

    public static getInstance(): StatusReportManager {
        if (!StatusReportManager.instance) {
            StatusReportManager.instance = new StatusReportManager();
        }
        return StatusReportManager.instance;
    }

    /**
     * Get real-time dashboard metrics
     */
    public async getDashboardMetrics(entity?: IStatusEntity): Promise<IStatusDashboardMetrics | Record<IStatusEntity, IStatusDashboardMetrics>> {
        try {
            if (entity) {
                return this.dashboardMetrics.get(entity) || this.createEmptyDashboardMetrics(entity);
            }
            
            const allMetrics: Record<IStatusEntity, IStatusDashboardMetrics> = {
                agent: this.dashboardMetrics.get('agent') || this.createEmptyDashboardMetrics('agent'),
                message: this.dashboardMetrics.get('message') || this.createEmptyDashboardMetrics('message'),
                task: this.dashboardMetrics.get('task') || this.createEmptyDashboardMetrics('task'),
                workflow: this.dashboardMetrics.get('workflow') || this.createEmptyDashboardMetrics('workflow'),
                feedback: this.dashboardMetrics.get('feedback') || this.createEmptyDashboardMetrics('feedback'),
                llm: this.dashboardMetrics.get('llm') || this.createEmptyDashboardMetrics('llm')
            };
            return allMetrics;
        } catch (err) {
            const error = this.normalizeError(err);
            throw createError({
                message: 'Failed to get dashboard metrics',
                type: 'ExecutionError',
                context: {
                    component: this.constructor.name,
                    operation: 'getDashboardMetrics',
                    error
                }
            });
        }
    }

    /**
     * Analyze status trends
     */
    public async analyzeTrends(
        entity: IStatusEntity,
        timeRange: { start: number; end: number }
    ): Promise<IStatusTrendAnalysis> {
        try {
            const history = await this.historyManager.queryHistory({
                entity,
                timeRange,
                includeMetrics: true
            });

            if (history.length === 0) {
                throw new Error(`No history data available for entity ${entity}`);
            }

            // Calculate status frequency
            const statusFrequency = DEFAULT_STATUS_RECORDS.createEmptyStatusFrequency(entity);
            const transitionCounts = new Map<string, { count: number; totalDuration: number }>();
            const errorsByStatus = DEFAULT_STATUS_RECORDS.createEmptyStatusFrequency(entity);
            let totalErrors = 0;

            for (const entry of history) {
                // Status frequency
                statusFrequency[entry.from] = (statusFrequency[entry.from] || 0) + 1;

                // Transition patterns
                const transitionKey = `${entry.from}->${entry.to}`;
                const existing = transitionCounts.get(transitionKey) || { count: 0, totalDuration: 0 };
                transitionCounts.set(transitionKey, {
                    count: existing.count + 1,
                    totalDuration: existing.totalDuration + entry.duration
                });

                // Error rates
                if (entry.errorCount > 0) {
                    errorsByStatus[entry.from] = (errorsByStatus[entry.from] || 0) + 1;
                    totalErrors++;
                }
            }

            // Calculate transition patterns
            const transitionPatterns = Array.from(transitionCounts.entries())
                .map(([key, data]) => {
                    const [from, to] = key.split('->') as [IStatusType, IStatusType];
                    return {
                        from,
                        to,
                        count: data.count,
                        averageDuration: data.totalDuration / data.count
                    };
                })
                .sort((a, b) => b.count - a.count);

            // Calculate performance metrics
            const performanceMetrics = this.calculatePerformanceMetrics(history);

            // Detect anomalies
            const anomalies = this.detectTrendAnomalies(history, {
                statusFrequency,
                transitionPatterns,
                errorsByStatus
            });

            // Generate recommendations
            const recommendations = this.generateRecommendations(anomalies, performanceMetrics);

            return {
                entity,
                period: timeRange,
                trends: {
                    statusFrequency,
                    transitionPatterns,
                    errorRates: {
                        overall: totalErrors / history.length,
                        byStatus: errorsByStatus
                    },
                    performance: performanceMetrics
                },
                anomalies,
                recommendations
            };
        } catch (err) {
            const error = this.normalizeError(err);
            throw createError({
                message: 'Failed to analyze status trends',
                type: 'ExecutionError',
                context: {
                    component: this.constructor.name,
                    operation: 'analyzeTrends',
                    error
                }
            });
        }
    }

    /**
     * Assess status impact
     */
    public async assessImpact(entity: IStatusEntity, status: IStatusType): Promise<IStatusImpactAssessment> {
        try {
            const history = await this.historyManager.queryHistory({
                entity,
                statuses: [status],
                includeMetrics: true
            });

            // Analyze direct impact
            const directImpact = this.analyzeDependencies(entity, status);

            // Analyze cascading effects
            const cascadingEffects = this.analyzeCascadingEffects(entity, status, history);

            // Calculate resource impact
            const resourceImpact = this.calculateResourceImpact(history);

            // Calculate performance impact
            const performanceImpact = this.calculatePerformanceImpact(history);

            // Generate recommendations
            const recommendations = this.generateImpactRecommendations(
                directImpact,
                cascadingEffects,
                resourceImpact,
                performanceImpact
            );

            return {
                entity,
                status,
                timestamp: Date.now(),
                directImpact,
                cascadingEffects,
                resourceImpact,
                performanceImpact,
                recommendations
            };
        } catch (err) {
            const error = this.normalizeError(err);
            throw createError({
                message: 'Failed to assess status impact',
                type: 'ExecutionError',
                context: {
                    component: this.constructor.name,
                    operation: 'assessImpact',
                    error
                }
            });
        }
    }

    /**
     * Handle status change event
     */
    public async handleStatusChange(event: IStatusChangeEvent): Promise<void> {
        try {
            await this.updateDashboardMetrics(event);
        } catch (err) {
            const error = this.normalizeError(err);
            throw createError({
                message: 'Failed to handle status change',
                type: 'ExecutionError',
                context: {
                    component: this.constructor.name,
                    operation: 'handleStatusChange',
                    error
                }
            });
        }
    }

    // Private helper methods

    private startMetricsUpdate(): void {
        this.updateTimer = setInterval(() => {
            this.updateAllMetrics().catch(error => {
                this.logError('Failed to update metrics', error);
            });
        }, this.updateInterval);
    }

    private async updateAllMetrics(): Promise<void> {
        for (const entity of this.dashboardMetrics.keys()) {
            await this.updateEntityMetrics(entity);
        }
    }

    private async updateEntityMetrics(entity: IStatusEntity): Promise<void> {
        const history = await this.historyManager.queryHistory({
            entity,
            includeMetrics: true,
            limit: 100 // Last 100 entries for real-time metrics
        });

        const metrics = this.calculateDashboardMetrics(entity, history);
        this.dashboardMetrics.set(entity, metrics);
    }

    private async updateDashboardMetrics(event: IStatusChangeEvent): Promise<void> {
        const currentMetrics = this.dashboardMetrics.get(event.entity) || this.createEmptyDashboardMetrics(event.entity);
        
        // Update current status
        currentMetrics.byEntity[event.entity].currentStatus[event.entityId] = event.to;

        // Update transition rate
        currentMetrics.byEntity[event.entity].transitionRate++;

        // Update timestamp
        currentMetrics.timestamp = Date.now();

        this.dashboardMetrics.set(event.entity, currentMetrics);
    }

    private createEmptyDashboardMetrics(entity: IStatusEntity): IStatusDashboardMetrics {
        return {
            timestamp: Date.now(),
            overview: {
                totalEntities: 0,
                activeTransitions: 0,
                errorCount: 0,
                healthScore: 100
            },
            byEntity: {
                ...DEFAULT_STATUS_RECORDS.metrics
            },
            alerts: [],
            performance: {
                systemLoad: 0,
                memoryUsage: 0,
                responseTime: 0,
                throughput: 0
            }
        };
    }

    private calculateDashboardMetrics(entity: IStatusEntity, history: IStatusHistoryEntry[]): IStatusDashboardMetrics {
        // Implementation
        return this.createEmptyDashboardMetrics(entity);
    }

    private calculatePerformanceMetrics(history: IStatusHistoryEntry[]): IStatusTrendAnalysis['trends']['performance'] {
        // Implementation
        return {
            averageTransitionTime: 0,
            slowestTransitions: [],
            resourceUtilization: {
                cpu: 0,
                memory: 0,
                overall: 0
            }
        };
    }

    private detectTrendAnomalies(
        history: IStatusHistoryEntry[],
        metrics: {
            statusFrequency: Record<IStatusType, number>;
            transitionPatterns: Array<{
                from: IStatusType;
                to: IStatusType;
                count: number;
                averageDuration: number;
            }>;
            errorsByStatus: Record<IStatusType, number>;
        }
    ): IStatusTrendAnalysis['anomalies'] {
        // Implementation
        return [];
    }

    private generateRecommendations(
        anomalies: IStatusTrendAnalysis['anomalies'],
        performance: IStatusTrendAnalysis['trends']['performance']
    ): IStatusTrendAnalysis['recommendations'] {
        // Implementation
        return [];
    }

    private analyzeDependencies(entity: IStatusEntity, status: IStatusType): IStatusImpactAssessment['directImpact'] {
        // Implementation
        return {
            affectedComponents: [],
            severity: 'low',
            scope: 'isolated'
        };
    }

    private analyzeCascadingEffects(
        entity: IStatusEntity,
        status: IStatusType,
        history: IStatusHistoryEntry[]
    ): IStatusImpactAssessment['cascadingEffects'] {
        // Implementation
        return [];
    }

    private calculateResourceImpact(history: IStatusHistoryEntry[]): IStatusImpactAssessment['resourceImpact'] {
        // Implementation
        return {
            cpu: 0,
            memory: 0,
            network: 0,
            storage: 0
        };
    }

    private calculatePerformanceImpact(history: IStatusHistoryEntry[]): IStatusImpactAssessment['performanceImpact'] {
        // Implementation
        return {
            latency: 0,
            throughput: 0,
            errorRate: 0
        };
    }

    private generateImpactRecommendations(
        directImpact: IStatusImpactAssessment['directImpact'],
        cascadingEffects: IStatusImpactAssessment['cascadingEffects'],
        resourceImpact: IStatusImpactAssessment['resourceImpact'],
        performanceImpact: IStatusImpactAssessment['performanceImpact']
    ): IStatusImpactAssessment['recommendations'] {
        // Implementation
        return [];
    }

    private normalizeError(error: unknown): Error {
        if (error instanceof Error) {
            return error;
        }
        return new Error(typeof error === 'string' ? error : 'Unknown error occurred');
    }
}

export default StatusReportManager.getInstance();
