/**
 * @file statusHistoryManager.ts
 * @path src/managers/core/statusHistoryManager.ts
 * @description Status history tracking and analysis implementation
 */

import { CoreManager } from './coreManager';
import {
    createError,
    MANAGER_CATEGORY_enum,
    IStatusChangeEvent,
    IStatusEntity,
    IStatusType,
    IStatusTransitionContext,
    IStatusHistoryEntry,
    IStatusHistoryAnalysis,
    IStatusHistoryQuery,
    StatusDurationRecord,
    IValidationResult
} from '../../types/common';


/**
 * Status history manager that handles tracking, analysis, and reporting of status transitions
 */
export class StatusHistoryManager extends CoreManager {
    private static instance: StatusHistoryManager;
    private readonly history: Map<IStatusEntity, Map<string, IStatusHistoryEntry[]>>;
    private readonly maxHistoryPerEntity: number;

    public readonly category: MANAGER_CATEGORY_enum = MANAGER_CATEGORY_enum.CORE;

    private constructor() {
        super();
        this.history = new Map();
        this.maxHistoryPerEntity = 1000; // Default max history entries per entity
        this.registerDomainManager('StatusHistoryManager', this);
    }

    public static getInstance(): StatusHistoryManager {
        if (!StatusHistoryManager.instance) {
            StatusHistoryManager.instance = new StatusHistoryManager();
        }
        return StatusHistoryManager.instance;
    }

    /**
     * Record a status transition
     */
    public async recordTransition(context: IStatusTransitionContext, event: IStatusChangeEvent): Promise<void> {
        try {
            const { entity, entityId } = context;

            // Initialize entity map if needed
            if (!this.history.has(entity)) {
                this.history.set(entity, new Map());
            }
            const entityMap = this.history.get(entity)!;

            // Initialize entity history if needed
            if (!entityMap.has(entityId)) {
                entityMap.set(entityId, []);
            }
            const entityHistory = entityMap.get(entityId)!;

            // Create history entry with required metrics
            const historyEntry: IStatusHistoryEntry = {
                id: event.id,
                type: event.type,
                timestamp: event.timestamp,
                entity: event.entity,
                entityId: event.entityId,
                from: event.from,
                to: event.to,
                metadata: event.metadata,
                validationResult: event.validationResult,
                duration: context.duration || 0,
                transitionCount: entityHistory.length + 1,
                errorCount: context.errorContext ? 1 : 0,
                performance: {
                    validationTime: context.phase === 'pre-execution' ? context.duration || 0 : 0,
                    executionTime: context.phase === 'execution' ? context.duration || 0 : 0,
                    totalTime: context.duration || 0
                },
                metrics: {
                    cpuUsage: context.resourceMetrics?.cpuUsage || 0,
                    memoryUsage: context.resourceMetrics?.memoryUsage || 0,
                    resourceUtilization: context.resourceMetrics?.resourceUtilization || 0
                }
            };

            // Add entry to history
            entityHistory.push(historyEntry);

            // Trim history if needed
            if (entityHistory.length > this.maxHistoryPerEntity) {
                entityHistory.shift();
            }
        } catch (err) {
            const error = this.normalizeError(err);
            throw createError({
                message: 'Failed to record status transition',
                type: 'StorageError',
                context: {
                    component: this.constructor.name,
                    operation: 'recordTransition',
                    error
                }
            });
        }
    }

    /**
     * Query status history
     */
    public async queryHistory(query: IStatusHistoryQuery): Promise<IStatusHistoryEntry[]> {
        try {
            let results: IStatusHistoryEntry[] = [];

            // If entity is specified, only query that entity
            if (query.entity) {
                const entityMap = this.history.get(query.entity);
                if (entityMap) {
                    // If entityId is specified, only query that entity instance
                    if (query.entityId) {
                        const entityHistory = entityMap.get(query.entityId);
                        if (entityHistory) {
                            results = [...entityHistory];
                        }
                    } else {
                        // Collect all histories for the entity type
                        for (const history of entityMap.values()) {
                            results.push(...history);
                        }
                    }
                }
            } else {
                // Collect all histories
                for (const entityMap of this.history.values()) {
                    for (const history of entityMap.values()) {
                        results.push(...history);
                    }
                }
            }

            // Apply time range filter
            if (query.timeRange) {
                results = results.filter(entry => 
                    entry.timestamp >= query.timeRange!.start &&
                    entry.timestamp <= query.timeRange!.end
                );
            }

            // Apply status filter
            if (query.statuses) {
                results = results.filter(entry =>
                    query.statuses!.includes(entry.from) ||
                    query.statuses!.includes(entry.to)
                );
            }

            // Sort by timestamp
            results.sort((a, b) => b.timestamp - a.timestamp);

            // Apply limit
            if (query.limit) {
                results = results.slice(0, query.limit);
            }

            // Remove metrics if not requested
            if (!query.includeMetrics) {
                results = results.map(({ metrics, ...rest }) => ({
                    ...rest,
                    metrics: {
                        cpuUsage: 0,
                        memoryUsage: 0,
                        resourceUtilization: 0
                    }
                }));
            }

            return results;
        } catch (err) {
            const error = this.normalizeError(err);
            throw createError({
                message: 'Failed to query status history',
                type: 'StorageError',
                context: {
                    component: this.constructor.name,
                    operation: 'queryHistory',
                    error
                }
            });
        }
    }

    /**
     * Analyze status history
     */
    public async analyzeHistory(entity: IStatusEntity, timeRange?: { start: number; end: number }): Promise<IStatusHistoryAnalysis> {
        try {
            // Get history entries for analysis
            const query: IStatusHistoryQuery = {
                entity,
                timeRange,
                includeMetrics: true
            };
            const entries = await this.queryHistory(query);

            if (entries.length === 0) {
                throw new Error(`No history entries found for entity ${entity}`);
            }

            // Calculate basic metrics
            const uniqueStatuses = new Set<IStatusType>();
            const transitionCounts = new Map<string, number>();
            let totalDuration = 0;
            let errorCount = 0;

            for (const entry of entries) {
                uniqueStatuses.add(entry.from).add(entry.to);
                const transitionKey = `${entry.from}->${entry.to}`;
                transitionCounts.set(transitionKey, (transitionCounts.get(transitionKey) || 0) + 1);
                totalDuration += entry.duration;
                errorCount += entry.errorCount;
            }

            // Calculate performance metrics
            const validationTimes = entries.map(e => e.performance.validationTime);
            const executionTimes = entries.map(e => e.performance.executionTime);
            const totalTimes = entries.map(e => e.performance.totalTime);

            // Calculate resource metrics
            const cpuUsages = entries.map(e => e.metrics.cpuUsage);
            const memoryUsages = entries.map(e => e.metrics.memoryUsage);
            const resourceUtilizations = entries.map(e => e.metrics.resourceUtilization);

            // Prepare analysis result
            const analysis: IStatusHistoryAnalysis = {
                entity,
                period: {
                    start: entries[entries.length - 1].timestamp,
                    end: entries[0].timestamp
                },
                summary: {
                    totalTransitions: entries.length,
                    uniqueStatuses: Array.from(uniqueStatuses),
                    averageDuration: totalDuration / entries.length,
                    errorRate: errorCount / entries.length,
                    mostCommonTransitions: Array.from(transitionCounts.entries())
                        .map(([key, count]) => {
                            const [from, to] = key.split('->') as [IStatusType, IStatusType];
                            return { from, to, count };
                        })
                        .sort((a, b) => b.count - a.count)
                        .slice(0, 5),
                    statusDurations: this.calculateStatusDurations(entries)
                },
                performance: {
                    averageValidationTime: this.average(validationTimes),
                    averageExecutionTime: this.average(executionTimes),
                    averageTotalTime: this.average(totalTimes),
                    p95ValidationTime: this.percentile(validationTimes, 95),
                    p95ExecutionTime: this.percentile(executionTimes, 95),
                    p95TotalTime: this.percentile(totalTimes, 95)
                },
                resources: {
                    averageCpuUsage: this.average(cpuUsages),
                    averageMemoryUsage: this.average(memoryUsages),
                    averageResourceUtilization: this.average(resourceUtilizations),
                    peakCpuUsage: Math.max(...cpuUsages),
                    peakMemoryUsage: Math.max(...memoryUsages),
                    peakResourceUtilization: Math.max(...resourceUtilizations)
                },
                patterns: {
                    commonSequences: this.findCommonSequences(entries),
                    cyclicTransitions: this.findCyclicTransitions(entries),
                    anomalies: this.detectAnomalies(entries)
                }
            };

            return analysis;
        } catch (err) {
            const error = this.normalizeError(err);
            throw createError({
                message: 'Failed to analyze status history',
                type: 'ExecutionError',
                context: {
                    component: this.constructor.name,
                    operation: 'analyzeHistory',
                    error
                }
            });
        }
    }

    /**
     * Clear history for an entity
     */
    public clearHistory(entity?: IStatusEntity, entityId?: string): void {
        if (entity) {
            if (entityId) {
                // Clear specific entity instance history
                const entityMap = this.history.get(entity);
                if (entityMap) {
                    entityMap.delete(entityId);
                }
            } else {
                // Clear all history for entity type
                this.history.delete(entity);
            }
        } else {
            // Clear all history
            this.history.clear();
        }
    }

    // Private helper methods

    private calculateStatusDurations(entries: IStatusHistoryEntry[]): StatusDurationRecord {
        const durations: StatusDurationRecord = {};
        let totalTime = 0;

        // Calculate total time in each status
        for (let i = 0; i < entries.length - 1; i++) {
            const status = entries[i].from;
            const duration = entries[i + 1].timestamp - entries[i].timestamp;
            
            if (!durations[status]) {
                durations[status] = { totalTime: 0, percentage: 0 };
            }
            
            if (durations[status]) {
                durations[status]!.totalTime += duration;
                totalTime += duration;
            }
        }

        // Calculate percentages
        Object.keys(durations).forEach(status => {
            const typedStatus = status as IStatusType;
            if (durations[typedStatus]) {
                durations[typedStatus]!.percentage = 
                    (durations[typedStatus]!.totalTime / totalTime) * 100;
            }
        });

        return durations;
    }

    private findCommonSequences(entries: IStatusHistoryEntry[]): Array<{ sequence: IStatusType[]; count: number }> {
        // Implementation for finding common status sequences
        return [];
    }

    private findCyclicTransitions(entries: IStatusHistoryEntry[]): Array<{ cycle: IStatusType[]; count: number }> {
        // Implementation for finding cyclic transitions
        return [];
    }

    private detectAnomalies(entries: IStatusHistoryEntry[]): Array<{
        type: 'duration' | 'sequence' | 'resource';
        description: string;
        timestamp: number;
        context: Record<string, unknown>;
    }> {
        // Implementation for detecting anomalies
        return [];
    }

    private average(numbers: number[]): number {
        return numbers.reduce((a, b) => a + b, 0) / numbers.length;
    }

    private percentile(numbers: number[], p: number): number {
        const sorted = [...numbers].sort((a, b) => a - b);
        const pos = (sorted.length - 1) * p / 100;
        const base = Math.floor(pos);
        const rest = pos - base;
        if (sorted[base + 1] !== undefined) {
            return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
        } else {
            return sorted[base];
        }
    }

    private normalizeError(error: unknown): Error {
        if (error instanceof Error) {
            return error;
        }
        return new Error(typeof error === 'string' ? error : 'Unknown error occurred');
    }
}

