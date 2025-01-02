/**
 * @file statusReportManager.ts
 * @path src/managers/core/statusReportManager.ts
 * @description Status reporting and analysis implementation for real-time monitoring and trend analysis
 */

import { CoreManager } from './coreManager';
import { createError } from '../../types/common/errorTypes';
import { MANAGER_CATEGORY_enum } from '../../types/common/enumTypes';
import { StatusEventEmitter } from './status/statusEventEmitter';
import { MetricDomain, MetricType } from '../../types/metrics';
import { TransitionUtils } from './transitionRules';
import { DEFAULT_STATUS_RECORDS } from '../../types/common/statusTypes';

import type {
    IStatusEntity,
    IStatusType,
    IStatusChangeEvent,
    IStatusTrendAnalysis,
    IStatusImpactAssessment,
    IStatusDashboardMetrics,
    IEntityMetrics,
    IStatusTransitionPattern,
    IStatusMetricsAnalysis
} from '../../types/common/statusTypes';

import type { 
    IMetricEvent,
    IPerformanceMetrics
} from '../../types/metrics';

import type { IAgentMetrics } from '../../types/metrics/base/metricsManagerTypes';
import type { IErrorContext } from '../../types/common/errorTypes';
import type { ICoreSystemHealthMetrics } from '../../types/metrics';


/**
 * Status report manager that handles real-time monitoring, trend analysis,
 * and impact assessment of status transitions
 */
export class StatusReportManager extends CoreManager {
    private static instance: StatusReportManager;
    private readonly statusEventEmitter: StatusEventEmitter;
    private readonly dashboardMetrics: Map<IStatusEntity, IStatusDashboardMetrics>;
    private readonly updateInterval: number;
    private readonly updateTimer: ReturnType<typeof setInterval>;

    public readonly category: MANAGER_CATEGORY_enum = MANAGER_CATEGORY_enum.CORE;

    private constructor() {
        super();
        this.statusEventEmitter = StatusEventEmitter.getInstance();
        this.dashboardMetrics = new Map();
        this.updateInterval = 5000; // 5 seconds
        this.registerDomainManager('StatusReportManager', this);
        this.updateTimer = this.startMetricsUpdate();
    }

    public static getInstance(): StatusReportManager {
        if (!StatusReportManager.instance) {
            StatusReportManager.instance = new StatusReportManager();
        }
        return StatusReportManager.instance;
    }

    public async cleanup(): Promise<void> {
        clearInterval(this.updateTimer);
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
            // Get metrics from MetricsManager for the time range
            const metrics = await this.getMetricsManager().get({
                timeRange: 'all',
                domain: MetricDomain.SYSTEM,
                type: MetricType.PERFORMANCE,
                timeFrame: timeRange,
                metadata: { entity }
            });

            if (!metrics.success || !metrics.data) {
                throw new Error('Failed to retrieve metrics data');
            }

            const performanceMetrics = metrics.data.performance;
            // Get initial status for frequency tracking
            const statusFrequency = TransitionUtils.getAvailableTransitions(entity, 'INITIAL' as IStatusType).reduce((acc, status) => {
                acc[status] = 0;
                return acc;
            }, {} as Record<IStatusType, number>);
            const errorsByStatus = { ...statusFrequency };

            // Calculate transition patterns from metrics
            const transitionPatterns = this.calculateTransitionPatterns(metrics.data);

            // Create metrics analysis object
            const metricsAnalysis: IStatusMetricsAnalysis = {
                statusFrequency,
                transitionPatterns,
                errorsByStatus
            };

            // Detect anomalies
            const anomalies = this.detectTrendAnomalies(metricsAnalysis);

            // Generate recommendations
            const recommendations = this.generateRecommendations(anomalies, performanceMetrics);

            return {
                entity,
                period: timeRange,
                trends: {
                    statusFrequency,
                    transitionPatterns,
                    errorRates: {
                        overall: metrics.data.errors.count / transitionPatterns.length,
                        byStatus: errorsByStatus
                    },
                    performance: {
                        averageTransitionTime: performanceMetrics.responseTime.average,
                        slowestTransitions: [],
                        resourceUtilization: {
                            cpu: 0,
                            memory: 0,
                            overall: 0
                        }
                    }
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
            // Get system metrics
            const metrics = await this.getMetricsManager().get({
                timeRange: 'hour',
                domain: MetricDomain.SYSTEM,
                type: MetricType.PERFORMANCE
            });

            if (!metrics.success || !metrics.data) {
                throw new Error('Failed to retrieve metrics data');
            }

            const performanceMetrics = metrics.data.performance;
            const errorContext = await this.createErrorContext('assessImpact') as IErrorContext & { systemHealth: ICoreSystemHealthMetrics };

            // Analyze direct impact
            const directImpact = this.analyzeDependencies(entity, status);

            // Analyze cascading effects
            const cascadingEffects = this.analyzeCascadingEffects(entity, status, metrics.data);

            // Calculate resource impact using system health metrics
            const resourceImpact = {
                cpu: errorContext.systemHealth.metrics.cpu.usage,
                memory: errorContext.systemHealth.metrics.memory.used / errorContext.systemHealth.metrics.memory.total,
                network: errorContext.systemHealth.metrics.network.upload + errorContext.systemHealth.metrics.network.download,
                storage: (errorContext.systemHealth.metrics.disk.total - errorContext.systemHealth.metrics.disk.free) / errorContext.systemHealth.metrics.disk.total
            };

            // Calculate performance impact using performance metrics
            const performanceImpact = {
                latency: performanceMetrics.responseTime.average,
                throughput: performanceMetrics.throughput.requestsPerSecond,
                errorRate: metrics.data.errors.count / metrics.data.usage.totalRequests
            };

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

            // Log status change
            this.logInfo(`Status changed from ${event.from} to ${event.to}`, {
                entityId: event.entityId,
                entity: event.entity
            });

            // Track status change metric
            const metricEvent: IMetricEvent = {
                timestamp: Date.now(),
                domain: MetricDomain.SYSTEM,
                type: MetricType.PERFORMANCE,
                value: 1,
                metadata: {
                    component: 'StatusReportManager',
                    operation: 'statusChange',
                    entity: event.entity,
                    from: event.from,
                    to: event.to
                }
            };

            await this.getMetricsManager().trackMetric(metricEvent);

            // Emit status change event
            await this.statusEventEmitter.emitTransition({
                entity: event.entity,
                entityId: event.entityId,
                currentStatus: event.from,
                targetStatus: event.to,
                operation: 'status_change',
                phase: 'execution',
                startTime: Date.now(),
                duration: 0,
                metadata: event.metadata,
                context: {}
            });
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

    private startMetricsUpdate(): ReturnType<typeof setInterval> {
        return setInterval(() => {
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
        const metrics = await this.getMetricsManager().get({
            timeRange: 'hour',
            domain: MetricDomain.SYSTEM,
            type: MetricType.PERFORMANCE,
            metadata: { entity }
        });

        if (metrics.success && metrics.data) {
            const dashboardMetrics = this.calculateDashboardMetrics(entity, metrics.data);
            this.dashboardMetrics.set(entity, dashboardMetrics);
        }
    }

    private async updateDashboardMetrics(event: IStatusChangeEvent): Promise<void> {
        const currentMetrics = this.dashboardMetrics.get(event.entity) || this.createEmptyDashboardMetrics(event.entity);
        const entityMetrics = currentMetrics.byEntity[event.entity];
        
        // Update current status
        entityMetrics.currentStatus[event.entityId] = event.to;

        // Update transition rate
        entityMetrics.transitionRate++;

        // Update timestamp
        currentMetrics.timestamp = Date.now();

        this.dashboardMetrics.set(event.entity, currentMetrics);
    }

    private createEmptyDashboardMetrics(_entity: IStatusEntity): IStatusDashboardMetrics {
        // Create a deep copy of the default metrics with proper type casting
        const byEntity = Object.entries(DEFAULT_STATUS_RECORDS.metrics).reduce<Record<IStatusEntity, IEntityMetrics>>((acc, [key, value]) => ({
            ...acc,
            [key]: {
                ...value,
                currentStatus: { ...value.currentStatus }
            }
        }), {} as Record<IStatusEntity, IEntityMetrics>);

        return {
            timestamp: Date.now(),
            overview: {
                totalEntities: 0,
                activeTransitions: 0,
                errorCount: 0,
                healthScore: 100
            },
            byEntity,
            alerts: [],
            performance: {
                systemLoad: 0,
                memoryUsage: 0,
                responseTime: 0,
                throughput: 0
            }
        };
    }

    private calculateDashboardMetrics(entity: IStatusEntity, metrics: IAgentMetrics): IStatusDashboardMetrics {
        const dashboard = this.createEmptyDashboardMetrics(entity);
        
        // Update performance metrics
        dashboard.performance = {
            systemLoad: metrics.performance.responseTime.average,
            memoryUsage: metrics.usage.peakMemoryUsage,
            responseTime: metrics.performance.responseTime.average,
            throughput: metrics.performance.throughput.requestsPerSecond
        };

        // Update overview
        dashboard.overview = {
            totalEntities: metrics.usage.activeUsers,
            activeTransitions: metrics.usage.requestsPerSecond,
            errorCount: metrics.errors.count,
            healthScore: this.calculateHealthScore(metrics)
        };

        return dashboard;
    }

    private calculateHealthScore(metrics: IAgentMetrics): number {
        const errorPenalty = metrics.errors.count * 5;
        const performancePenalty = Math.max(0, metrics.performance.responseTime.average - 1000) / 100;
        const resourcePenalty = Math.max(0, metrics.usage.peakMemoryUsage - 80) / 2;

        return Math.max(0, 100 - errorPenalty - performancePenalty - resourcePenalty);
    }

    private calculateTransitionPatterns(metrics: IAgentMetrics): IStatusTransitionPattern[] {
        // Extract transitions from metrics
        const transitions: IStatusTransitionPattern[] = metrics.performance.responseTime.average > 0 ? [{
            from: 'INITIAL' as IStatusType,
            to: 'RUNNING' as IStatusType,
            count: 1,
            averageDuration: metrics.performance.responseTime.average
        }] : [];
        return transitions;
    }

    private detectTrendAnomalies(metrics: {
        statusFrequency: Record<IStatusType, number>;
        transitionPatterns: IStatusTransitionPattern[];
        errorsByStatus: Record<IStatusType, number>;
    }): IStatusTrendAnalysis['anomalies'] {
        // Detect anomalies based on metrics
        const anomalies: IStatusTrendAnalysis['anomalies'] = [];
        
        // Check for high error rates
        Object.entries(metrics.errorsByStatus).forEach(([status, count]) => {
            if (count > 0) {
                anomalies.push({
                    type: 'error',
                    status: status as IStatusType,
                    description: `High error rate detected for status ${status}`,
                    severity: 'high',
                    timestamp: Date.now()
                });
            }
        });

        return anomalies;
    }

    private generateRecommendations(
        anomalies: IStatusTrendAnalysis['anomalies'],
        performance: IPerformanceMetrics
    ): IStatusTrendAnalysis['recommendations'] {
        // Generate recommendations based on anomalies and performance
        const recommendations: IStatusTrendAnalysis['recommendations'] = [];

        // Check for performance issues
        if (performance.responseTime.average > 1000) {
            recommendations.push({
                type: 'optimization',
                description: 'High response times detected. Consider optimizing performance.',
                priority: 'high',
                context: {
                    metric: 'responseTime',
                    value: performance.responseTime.average,
                    threshold: 1000
                }
            });
        }

        // Add recommendations based on anomalies
        anomalies.forEach(anomaly => {
            if (anomaly.severity === 'high') {
                recommendations.push({
                    type: 'alert',
                    description: `Critical anomaly detected: ${anomaly.description}`,
                    priority: 'high',
                    context: {
                        anomalyType: anomaly.type,
                        status: anomaly.status,
                        timestamp: anomaly.timestamp
                    }
                });
            }
        });

        return recommendations;
    }

    private analyzeDependencies(entity: IStatusEntity, status: IStatusType): IStatusImpactAssessment['directImpact'] {
        // Analyze dependencies based on entity and status
        return {
            affectedComponents: [`${entity}_${status}`],
            severity: status.includes('ERROR') ? 'high' : 'low',
            scope: status.includes('ERROR') ? 'system-wide' : 'isolated'
        };
    }

    private analyzeCascadingEffects(
        entity: IStatusEntity,
        status: IStatusType,
        metrics: IAgentMetrics
    ): IStatusImpactAssessment['cascadingEffects'] {
        // Analyze cascading effects based on entity, status, and metrics
        const effects: IStatusImpactAssessment['cascadingEffects'] = [];

        if (metrics.errors.count > 0) {
            effects.push({
                component: entity,
                effect: `Error propagation from ${status}`,
                probability: 0.8,
                mitigation: 'Implement error recovery strategy'
            });
        }

        if (metrics.performance.responseTime.average > 1000) {
            effects.push({
                component: 'system',
                effect: 'Performance degradation',
                probability: 0.6,
                mitigation: 'Scale resources'
            });
        }

        return effects;
    }

    private generateImpactRecommendations(
        directImpact: IStatusImpactAssessment['directImpact'],
        cascadingEffects: IStatusImpactAssessment['cascadingEffects'],
        resourceImpact: IStatusImpactAssessment['resourceImpact'],
        performanceImpact: IStatusImpactAssessment['performanceImpact']
    ): IStatusImpactAssessment['recommendations'] {
        // Generate recommendations based on impacts
        const recommendations: IStatusImpactAssessment['recommendations'] = [];

        // Check direct impact
        if (directImpact.severity === 'high') {
            recommendations.push({
                action: 'Mitigate high severity impact',
                priority: 'high',
                expectedOutcome: 'Reduced system impact'
            });
        }

        // Check cascading effects
        if (cascadingEffects.length > 0) {
            recommendations.push({
                action: 'Implement mitigation strategies',
                priority: 'medium',
                expectedOutcome: 'Prevent effect propagation'
            });
        }

        // Check resource impact
        if (resourceImpact.cpu > 0.8 || resourceImpact.memory > 0.8) {
            recommendations.push({
                action: 'Scale resources',
                priority: 'high',
                expectedOutcome: 'Improved resource utilization'
            });
        }

        // Check performance impact
        if (performanceImpact.errorRate > 0.1) {
            recommendations.push({
                action: 'Implement error handling',
                priority: 'high',
                expectedOutcome: 'Reduced error rate'
            });
        }

        return recommendations;
    }

    private normalizeError(error: unknown): Error {
        if (error instanceof Error) {
            return error;
        }
        return new Error(typeof error === 'string' ? error : 'Unknown error occurred');
    }
}

export default StatusReportManager.getInstance();
