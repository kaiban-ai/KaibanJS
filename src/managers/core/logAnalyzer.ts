/**
 * @file logAnalyzer.ts
 * @path src/managers/core/logAnalyzer.ts
 * @description Log analysis implementation with pattern detection, anomaly detection,
 * and log correlation capabilities
 *
 * @module @core
 */

import { CoreManager } from './coreManager';
import { createError } from '../../types/common/errorTypes';
import { DEFAULT_LOG_ANALYSIS_CONFIG } from '../../types/common/loggingTypes';
import { MANAGER_CATEGORY_enum, ILogLevel } from '../../types/common/enumTypes';

import type {
    ILogEntry,
    ILogPattern,
    ILogAnomaly,
    ILogCorrelation,
    ILogAnalysisConfig,
    ILogAggregation,
    ILogAggregationOptions,
    IErrorPattern,
    IErrorTrend,
    IErrorImpact,
    IRecoveryEffectiveness
} from '../../types/common/loggingTypes';

export class LogAnalyzer extends CoreManager {
    private static instance: LogAnalyzer;
    private readonly config: ILogAnalysisConfig;
    private readonly patterns: Map<string, ILogPattern>;
    private readonly anomalies: Map<string, ILogAnomaly[]>;
    private readonly correlations: Map<string, ILogCorrelation>;

    public readonly category: MANAGER_CATEGORY_enum = MANAGER_CATEGORY_enum.CORE;

    private constructor() {
        super();
        this.config = DEFAULT_LOG_ANALYSIS_CONFIG;
        this.patterns = new Map();
        this.anomalies = new Map();
        this.correlations = new Map();
        this.registerDomainManager('LogAnalyzer', this);
    }

    public static getInstance(): LogAnalyzer {
        if (!LogAnalyzer.instance) {
            LogAnalyzer.instance = new LogAnalyzer();
        }
        return LogAnalyzer.instance;
    }

    public updateConfig(config: Partial<ILogAnalysisConfig>): void {
        Object.assign(this.config, config);
    }

    public async analyzeLogs(entries: ILogEntry[]): Promise<{
        patterns: ILogPattern[];
        anomalies: ILogAnomaly[];
        correlations: ILogCorrelation[];
    }> {
        try {
            const patterns = await this.detectPatterns(entries);
            const anomalies = await this.detectAnomalies(entries, patterns);
            const correlations = await this.correlateLogs(entries);

            return {
                patterns: Array.from(patterns.values()),
                anomalies: anomalies,
                correlations: Array.from(correlations.values())
            };
        } catch (err) {
            const error = this.normalizeError(err);
            throw createError({
                message: error.message,
                type: 'ExecutionError',
                context: {
                    component: this.constructor.name,
                    operation: 'analyzeLogs',
                    error
                }
            });
        }
    }

    public async aggregateLogs(entries: ILogEntry[], options: ILogAggregationOptions): Promise<ILogAggregation> {
        try {
            const startTime = options.filters?.timeRange?.start || Math.min(...entries.map(e => e.timestamp));
            const endTime = options.filters?.timeRange?.end || Math.max(...entries.map(e => e.timestamp));
            const filteredEntries = this.filterEntries(entries, options);
            const groups = new Map<string, {
                count: number;
                patterns: ILogPattern[];
                anomalies: ILogAnomaly[];
                correlations: ILogCorrelation[];
            }>();

            const summary = {
                byLevel: new Map<ILogLevel, number>(),
                byComponent: new Map<string, number>(),
                byOperation: new Map<string, number>(),
                byTag: new Map<string, number>()
            };

            for (const entry of filteredEntries) {
                this.updateSummaries(entry, summary);
                const groupKey = this.createGroupKey(entry, options.groupBy);
                
                if (!groups.has(groupKey)) {
                    groups.set(groupKey, {
                        count: 0,
                        patterns: [],
                        anomalies: [],
                        correlations: []
                    });
                }

                const group = groups.get(groupKey)!;
                group.count++;
            }

            for (const [key, group] of groups) {
                const groupEntries = filteredEntries.filter(entry => 
                    this.createGroupKey(entry, options.groupBy) === key
                );

                const analysis = await this.analyzeLogs(groupEntries);
                group.patterns = analysis.patterns;
                group.anomalies = analysis.anomalies;
                group.correlations = analysis.correlations;
            }

            return {
                timeWindow: options.timeWindow,
                startTime,
                endTime,
                totalEntries: filteredEntries.length,
                groups,
                summary
            };
        } catch (err) {
            const error = this.normalizeError(err);
            throw createError({
                message: error.message,
                type: 'ExecutionError',
                context: {
                    component: this.constructor.name,
                    operation: 'aggregateLogs',
                    error
                }
            });
        }
    }

    private async detectPatterns(entries: ILogEntry[]): Promise<Map<string, ILogPattern>> {
        const patterns = new Map<string, ILogPattern>();

        for (const entry of entries) {
            const messagePattern = this.extractPattern(entry.message as string);
            
            if (!patterns.has(messagePattern)) {
                patterns.set(messagePattern, {
                    pattern: messagePattern,
                    frequency: 0,
                    firstOccurrence: entry.timestamp,
                    lastOccurrence: entry.timestamp,
                    severity: 'low',
                    affectedComponents: new Set([entry.component]),
                    tags: new Set(entry.tags)
                });
            }

            const pattern = patterns.get(messagePattern)!;
            pattern.frequency++;
            pattern.lastOccurrence = entry.timestamp;
            pattern.affectedComponents.add(entry.component);
            entry.tags.forEach(tag => pattern.tags.add(tag));

            if (pattern.frequency > 10 || pattern.affectedComponents.size > 3) {
                pattern.severity = 'high';
            } else if (pattern.frequency > 5 || pattern.affectedComponents.size > 1) {
                pattern.severity = 'medium';
            }
        }

        return new Map(
            Array.from(patterns.entries()).filter(
                ([_, p]) => p.frequency >= this.config.minPatternFrequency
            )
        );
    }

    private async detectAnomalies(entries: ILogEntry[], patterns: Map<string, ILogPattern>): Promise<ILogAnomaly[]> {
        const anomalies: ILogAnomaly[] = [];
        const timeWindows = this.splitIntoTimeWindows(entries, this.config.correlationTimeWindow);

        for (const window of timeWindows) {
            for (const [pattern, baseline] of patterns) {
                const windowFrequency = window.filter(
                    e => this.extractPattern(e.message as string) === pattern
                ).length;

                const expectedFrequency = baseline.frequency / 
                    ((baseline.lastOccurrence - baseline.firstOccurrence) / this.config.correlationTimeWindow);

                if (Math.abs(windowFrequency - expectedFrequency) > 
                    expectedFrequency * this.config.anomalyDetectionSensitivity) {
                    anomalies.push({
                        timestamp: window[0].timestamp,
                        pattern,
                        expectedFrequency,
                        actualFrequency: windowFrequency,
                        severity: this.determineAnomalySeverity(windowFrequency, expectedFrequency),
                        affectedComponents: new Set(window.map(e => e.component)),
                        context: {
                            timeWindow: this.config.correlationTimeWindow,
                            baseline: baseline
                        }
                    });
                }
            }
        }

        return anomalies;
    }

    private async correlateLogs(entries: ILogEntry[]): Promise<Map<string, ILogCorrelation>> {
        const correlations = new Map<string, ILogCorrelation>();
        const correlationGroups = new Map<string, ILogEntry[]>();
        
        for (const entry of entries) {
            if (entry.correlationId) {
                if (!correlationGroups.has(entry.correlationId)) {
                    correlationGroups.set(entry.correlationId, []);
                }
                correlationGroups.get(entry.correlationId)!.push(entry);
            }
        }

        for (const [correlationId, groupEntries] of correlationGroups) {
            const sortedEntries = groupEntries.sort((a, b) => a.timestamp - b.timestamp);
            const startTime = sortedEntries[0].timestamp;
            const endTime = sortedEntries[sortedEntries.length - 1].timestamp;

            correlations.set(correlationId, {
                correlationId,
                traceId: sortedEntries[0].traceId || correlationId,
                startTime,
                endTime,
                duration: endTime - startTime,
                entries: sortedEntries,
                components: new Set(sortedEntries.map(e => e.component)),
                status: this.determineCorrelationStatus(sortedEntries),
                context: this.buildCorrelationContext(sortedEntries)
            });
        }

        return correlations;
    }

    private extractPattern(message: string): string {
        return message
            .replace(/\b\d+\b/g, '{number}')
            .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/g, '{uuid}')
            .replace(/\b([a-zA-Z]+:\/\/)?[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g, '{url}')
            .replace(/\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g, '{email}')
            .substring(0, this.config.maxPatternLength);
    }

    private splitIntoTimeWindows(entries: ILogEntry[], windowSize: number): ILogEntry[][] {
        const windows: ILogEntry[][] = [];
        const sortedEntries = entries.sort((a, b) => a.timestamp - b.timestamp);
        let currentWindow: ILogEntry[] = [];
        let windowStart = sortedEntries[0]?.timestamp || 0;

        for (const entry of sortedEntries) {
            if (entry.timestamp - windowStart > windowSize) {
                if (currentWindow.length > 0) {
                    windows.push(currentWindow);
                }
                currentWindow = [];
                windowStart = entry.timestamp;
            }
            currentWindow.push(entry);
        }

        if (currentWindow.length > 0) {
            windows.push(currentWindow);
        }

        return windows;
    }

    private determineAnomalySeverity(actual: number, expected: number): 'low' | 'medium' | 'high' {
        const ratio = Math.abs(actual - expected) / expected;
        if (ratio > 5) return 'high';
        if (ratio > 2) return 'medium';
        return 'low';
    }

    private determineCorrelationStatus(entries: ILogEntry[]): 'success' | 'error' | 'warning' {
        if (entries.some(e => e.level === 'error')) return 'error';
        if (entries.some(e => e.level === 'warn')) return 'warning';
        return 'success';
    }

    private buildCorrelationContext(entries: ILogEntry[]): Record<string, unknown> {
        return {
            entryCount: entries.length,
            componentCount: new Set(entries.map(e => e.component)).size,
            tags: Array.from(new Set(entries.flatMap(e => e.tags))),
            levels: Array.from(new Set(entries.map(e => e.level))),
            operations: Array.from(new Set(entries.map(e => e.operation)))
        };
    }

    private filterEntries(entries: ILogEntry[], options: ILogAggregationOptions): ILogEntry[] {
        return entries.filter(entry => {
            if (options.filters?.timeRange) {
                if (entry.timestamp < options.filters.timeRange.start ||
                    entry.timestamp > options.filters.timeRange.end) {
                    return false;
                }
            }

            if (options.filters?.components && 
                !options.filters.components.includes(entry.component)) {
                return false;
            }

            if (options.filters?.levels && 
                !options.filters.levels.includes(entry.level)) {
                return false;
            }

            if (options.filters?.operations && 
                !options.filters.operations.includes(entry.operation)) {
                return false;
            }

            if (options.filters?.tags && 
                !entry.tags.some(tag => options.filters!.tags!.includes(tag))) {
                return false;
            }

            return true;
        });
    }

    private createGroupKey(entry: ILogEntry, groupBy: ('component' | 'level' | 'operation' | 'correlationId')[]): string {
        return groupBy.map(field => {
            switch (field) {
                case 'component':
                    return entry.component;
                case 'level':
                    return entry.level;
                case 'operation':
                    return entry.operation;
                case 'correlationId':
                    return entry.correlationId || 'none';
                default:
                    return 'unknown';
            }
        }).join(':');
    }

    private updateSummaries(entry: ILogEntry, summary: {
        byLevel: Map<ILogLevel, number>;
        byComponent: Map<string, number>;
        byOperation: Map<string, number>;
        byTag: Map<string, number>;
    }): void {
        summary.byLevel.set(entry.level, (summary.byLevel.get(entry.level) || 0) + 1);
        summary.byComponent.set(entry.component, (summary.byComponent.get(entry.component) || 0) + 1);
        summary.byOperation.set(entry.operation, (summary.byOperation.get(entry.operation) || 0) + 1);
        
        for (const tag of entry.tags) {
            summary.byTag.set(tag, (summary.byTag.get(tag) || 0) + 1);
        }
    }

    private normalizeError(error: unknown): Error {
        if (error instanceof Error) {
            return error;
        }
        return new Error(typeof error === 'string' ? error : 'Unknown error occurred');
    }

// ─── Error Analysis Methods ──────────────────────────────────────────────

    /**
     * Convert log patterns to error patterns
     */
    public convertToErrorPatterns(patterns: ILogPattern[], entries: ILogEntry[]): IErrorPattern[] {
        return patterns.map(pattern => ({
            ...pattern,
            errorType: this.determineErrorType(entries, pattern),
            recoveryAttempts: this.countRecoveryAttempts(entries, pattern),
            recoverySuccess: this.calculateRecoverySuccess(entries, pattern),
            impactMetrics: this.calculateErrorImpact(entries, pattern),
            resourceMetrics: this.aggregateResourceMetrics(entries, pattern)
        }));
    }

    /**
     * Analyze error trends
     */
    public analyzeErrorTrends(entries: ILogEntry[]): IErrorTrend[] {
        const windows = this.splitIntoTimeWindows(entries, 3600000); // 1 hour windows

        return windows.map(window => ({
            startTime: window[0].timestamp,
            endTime: window[window.length - 1].timestamp,
            errorCount: window.length,
            errorTypes: this.aggregateErrorTypes(window),
            recoveryMetrics: this.calculateRecoveryMetrics(window),
            performanceImpact: this.calculatePerformanceImpact(window)
        }));
    }

    /**
     * Assess error impact
     */
    public assessErrorImpact(errorPattern: string, entries: ILogEntry[]): IErrorImpact {
        return {
            pattern: errorPattern,
            occurrences: entries.length,
            affectedComponents: this.getAffectedComponents(entries),
            resourceImpact: this.calculateResourceImpact(entries),
            performanceImpact: this.calculatePerformanceImpact(entries),
            recoveryMetrics: this.calculateRecoveryMetrics(entries),
            userImpact: this.assessUserImpact(entries)
        };
    }

    /**
     * Track recovery effectiveness
     */
    public trackRecoveryEffectiveness(entries: ILogEntry[]): IRecoveryEffectiveness {
        const recoveryAttempts = this.findRecoveryAttempts(entries);
        
        return {
            totalAttempts: recoveryAttempts.length,
            successfulAttempts: recoveryAttempts.filter(attempt => attempt.successful).length,
            averageRecoveryTime: this.calculateAverageRecoveryTime(recoveryAttempts),
            resourceEfficiency: this.calculateResourceEfficiency(recoveryAttempts),
            strategyEffectiveness: this.analyzeStrategyEffectiveness(recoveryAttempts)
        };
    }

    // ─── Error Analysis Helper Methods ───────────────────────────────────────

    private determineErrorType(entries: ILogEntry[], pattern: ILogPattern): string {
        const patternEntries = entries.filter(entry =>
            this.extractPattern(entry.message as string) === pattern.pattern
        );

        const errorTypes = patternEntries
            .map(entry => entry.context?.error?.type)
            .filter((type): type is string => typeof type === 'string');

        if (errorTypes.length === 0) return 'unknown';

        const typeCounts = new Map<string, number>();
        errorTypes.forEach(type => {
            typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
        });

        return Array.from(typeCounts.entries())
            .sort((a, b) => b[1] - a[1])[0][0];
    }

    private countRecoveryAttempts(entries: ILogEntry[], pattern: ILogPattern): number {
        return entries.filter(entry => 
            entry.context?.recovery?.attempts !== undefined &&
            this.extractPattern(entry.message as string) === pattern.pattern
        ).length;
    }

    private calculateRecoverySuccess(entries: ILogEntry[], pattern: ILogPattern): number {
        const recoveryEntries = entries.filter(entry => 
            entry.context?.recovery?.attempts !== undefined &&
            this.extractPattern(entry.message as string) === pattern.pattern
        );

        if (recoveryEntries.length === 0) return 0;

        const successfulRecoveries = recoveryEntries.filter(entry =>
            entry.context?.recovery?.successful === true
        );

        return successfulRecoveries.length / recoveryEntries.length;
    }

    private calculateErrorImpact(entries: ILogEntry[], pattern: ILogPattern): {
        severity: 'low' | 'medium' | 'high';
        scope: 'isolated' | 'moderate' | 'widespread';
        duration: number;
    } {
        const patternEntries = entries.filter(entry =>
            this.extractPattern(entry.message as string) === pattern.pattern
        );

        return {
            severity: this.determineAnomalySeverity(patternEntries.length, entries.length / 10),
            scope: this.determineScope(patternEntries),
            duration: this.calculateDuration(patternEntries)
        };
    }

    private aggregateResourceMetrics(entries: ILogEntry[], pattern: ILogPattern): {
        cpuUsage: number;
        memoryUsage: number;
        networkUsage: number;
    } {
        const patternEntries = entries.filter(entry =>
            this.extractPattern(entry.message as string) === pattern.pattern
        );

        return {
            cpuUsage: this.averageMetric(patternEntries, 'cpu'),
            memoryUsage: this.averageMetric(patternEntries, 'memory'),
            networkUsage: this.averageMetric(patternEntries, 'network')
        };
    }

    private aggregateErrorTypes(window: ILogEntry[]): Map<string, number> {
        const errorTypes = new Map<string, number>();
        for (const entry of window) {
            const errorType = entry.context?.error?.type || 'unknown';
            errorTypes.set(errorType, (errorTypes.get(errorType) || 0) + 1);
        }
        return errorTypes;
    }

    private calculateRecoveryMetrics(entries: ILogEntry[]): {
        attempts: number;
        successful: number;
        averageTime: number;
    } {
        const recoveryAttempts = entries.filter(entry => 
            entry.context?.recovery?.attempts !== undefined
        );

        const successful = recoveryAttempts.filter(entry =>
            entry.context?.recovery?.successful === true
        );

        const totalTime = recoveryAttempts.reduce((sum, entry) =>
            sum + (entry.context?.recovery?.duration || 0), 0
        );

        return {
            attempts: recoveryAttempts.length,
            successful: successful.length,
            averageTime: recoveryAttempts.length > 0 ? totalTime / recoveryAttempts.length : 0
        };
    }

    private calculatePerformanceImpact(entries: ILogEntry[]): {
        responseTime: number;
        throughput: number;
        errorRate: number;
    } {
        return {
            responseTime: this.averageMetric(entries, 'responseTime'),
            throughput: this.averageMetric(entries, 'throughput'),
            errorRate: entries.filter(e => e.level === 'error').length / entries.length
        };
    }

    private getAffectedComponents(entries: ILogEntry[]): Set<string> {
        return new Set(entries.map(e => e.component));
    }

    private calculateResourceImpact(entries: ILogEntry[]): {
        cpuUsage: number;
        memoryUsage: number;
        networkUsage: number;
    } {
        return {
            cpuUsage: this.averageMetric(entries, 'cpu'),
            memoryUsage: this.averageMetric(entries, 'memory'),
            networkUsage: this.averageMetric(entries, 'network')
        };
    }

    private assessUserImpact(entries: ILogEntry[]): {
        severity: 'low' | 'medium' | 'high';
        userCount: number;
        duration: number;
    } {
        const affectedUsers = new Set(
            entries
                .map(entry => entry.context?.user?.id)
                .filter((id): id is string => typeof id === 'string')
        );

        return {
            severity: this.determineAnomalySeverity(entries.length, entries.length / 10),
            userCount: affectedUsers.size,
            duration: this.calculateDuration(entries)
        };
    }

    private findRecoveryAttempts(entries: ILogEntry[]): Array<{
        successful: boolean;
        recoveryTime: number;
        strategy: string;
    }> {
        return entries
            .filter(entry => entry.context?.recovery !== undefined)
            .map(entry => ({
                successful: entry.context?.recovery?.successful === true,
                recoveryTime: entry.context?.recovery?.duration || 0,
                strategy: entry.context?.recovery?.strategy || 'unknown'
            }));
    }

    private calculateAverageRecoveryTime(attempts: Array<{
        successful: boolean;
        recoveryTime: number;
        strategy: string;
    }>): number {
        if (attempts.length === 0) return 0;
        const totalTime = attempts.reduce((sum, attempt) => sum + attempt.recoveryTime, 0);
        return totalTime / attempts.length;
    }

    private calculateResourceEfficiency(attempts: Array<{
        successful: boolean;
        recoveryTime: number;
        strategy: string;
    }>): number {
        if (attempts.length === 0) return 0;
        const successfulAttempts = attempts.filter(attempt => attempt.successful);
        const averageTime = this.calculateAverageRecoveryTime(attempts);
        return successfulAttempts.length / attempts.length * (1 / (1 + averageTime / 1000));
    }

    private analyzeStrategyEffectiveness(attempts: Array<{
        successful: boolean;
        recoveryTime: number;
        strategy: string;
    }>): Map<string, {
        attempts: number;
        successes: number;
        averageTime: number;
    }> {
        const strategyMap = new Map<string, {
            attempts: number;
            successes: number;
            totalTime: number;
        }>();

        for (const attempt of attempts) {
            if (!strategyMap.has(attempt.strategy)) {
                strategyMap.set(attempt.strategy, {
                    attempts: 0,
                    successes: 0,
                    totalTime: 0
                });
            }

            const stats = strategyMap.get(attempt.strategy)!;
            stats.attempts++;
            if (attempt.successful) stats.successes++;
            stats.totalTime += attempt.recoveryTime;
        }

        return new Map(
            Array.from(strategyMap.entries()).map(([strategy, stats]) => [
                strategy,
                {
                    attempts: stats.attempts,
                    successes: stats.successes,
                    averageTime: stats.attempts > 0 ? stats.totalTime / stats.attempts : 0
                }
            ])
        );
    }

    private determineScope(entries: ILogEntry[]): 'isolated' | 'moderate' | 'widespread' {
        const affectedComponents = new Set(entries.map(e => e.component));
        if (affectedComponents.size > 5) return 'widespread';
        if (affectedComponents.size > 2) return 'moderate';
        return 'isolated';
    }

    private calculateDuration(entries: ILogEntry[]): number {
        if (entries.length === 0) return 0;
        const timestamps = entries.map(e => e.timestamp);
        return Math.max(...timestamps) - Math.min(...timestamps);
    }

    private averageMetric(entries: ILogEntry[], metricName: string): number {
        const metrics = entries
            .map(entry => entry.context?.metrics?.[metricName])
            .filter((value): value is number => typeof value === 'number');

        if (metrics.length === 0) return 0;
        return metrics.reduce((sum, value) => sum + value, 0) / metrics.length;
    }
}

export default LogAnalyzer.getInstance();