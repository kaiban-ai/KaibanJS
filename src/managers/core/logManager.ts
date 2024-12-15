/**
* @file logManager.ts
* @path src/managers/core/logManager.ts
* @description Core logging functionality implementation with centralized logging,
* storage, analysis, and correlation capabilities
*
* @module @core
*/

// ─── External Imports ─────────────────────────────────────────────────────────

import { CoreManager } from './coreManager';
import { LogStorageManager } from './logStorageManager';
import { LogAnalyzer } from './logAnalyzer';
import { LogEventEmitter } from './logEventEmitter';
import { MANAGER_CATEGORY_enum } from '../../types/common/enumTypes';
import { createError } from '../../types/common/errorTypes';
import { createBaseMetadata } from '../../types/common/baseTypes';

// ─── Type Imports ─────────────────────────────────────────────────────────────

import type { ILogLevel } from '../../types/common/enumTypes';
import type { 
    ILogEntry,
    ILogPattern,
    ILogAnomaly,
    ILogCorrelation,
    ILogAggregation,
    ILogAggregationOptions,
    ILogStorageQuery,
    ILogStorageQueryResult,
    ILogStorageStats,
    IErrorPattern,
    IErrorTrend,
    IErrorImpact,
    IRecoveryEffectiveness
} from '../../types/common/loggingTypes';

// ─── Log Manager Class ─────────────────────────────────────────────────────────

export class LogManager extends CoreManager {
    private static instance: LogManager;
    private readonly inMemoryLogs: Map<string, ILogEntry[]>;
    private readonly storageManager: LogStorageManager;
    private readonly analyzer: LogAnalyzer;
    private readonly eventEmitter: LogEventEmitter;
    private logLevel: ILogLevel;

    public readonly category: MANAGER_CATEGORY_enum = MANAGER_CATEGORY_enum.CORE;

    private constructor() {
        super();
        this.inMemoryLogs = new Map();
        this.storageManager = LogStorageManager.getInstance();
        this.analyzer = LogAnalyzer.getInstance();
        this.eventEmitter = LogEventEmitter.getInstance();
        this.logLevel = 'info';
        this.registerDomainManager('LogManager', this);
    }

    public static getInstance(): LogManager {
        if (!LogManager.instance) {
            LogManager.instance = new LogManager();
        }
        return LogManager.instance;
    }

    // ─── Core Logging Methods ────────────────────────────────────────────────

    public setLogLevel(level: ILogLevel): void {
        this.logLevel = level;
    }

    public log(message: string, level: ILogLevel = 'info', context?: Record<string, unknown>): void {
        if (this.shouldLog(level)) {
            this.storeAndEmitLog(this.constructor.name, level, message, context);
        }
    }

    public debug(message: string, context?: Record<string, unknown>): void {
        if (this.shouldLog('debug')) {
            this.log(message, 'debug', context);
        }
    }

    public info(message: string, context?: Record<string, unknown>): void {
        if (this.shouldLog('info')) {
            this.log(message, 'info', context);
        }
    }

    public warn(message: string, context?: Record<string, unknown>): void {
        if (this.shouldLog('warn')) {
            this.log(message, 'warn', context);
        }
    }

    public error(message: string, error?: Error, context?: Record<string, unknown>): void {
        if (this.shouldLog('error')) {
            this.log(message, 'error', {
                ...context,
                error: error ? {
                    type: error.name,
                    message: error.message,
                    stack: error.stack
                } : undefined
            });
        }
    }

    // ─── Query and Analysis Methods ─────────────────────────────────────────

    public async queryLogs(query: ILogStorageQuery): Promise<ILogStorageQueryResult> {
        try {
            return await this.storageManager.query(query);
        } catch (err) {
            throw createError({
                message: 'Failed to query logs',
                type: 'StorageError',
                context: {
                    component: this.constructor.name,
                    operation: 'queryLogs',
                    error: this.normalizeError(err)
                }
            });
        }
    }

    public async analyzeLogs(entries: ILogEntry[]): Promise<{
        patterns: ILogPattern[];
        anomalies: ILogAnomaly[];
        correlations: ILogCorrelation[];
    }> {
        try {
            return await this.analyzer.analyzeLogs(entries);
        } catch (err) {
            throw createError({
                message: 'Failed to analyze logs',
                type: 'ExecutionError',
                context: {
                    component: this.constructor.name,
                    operation: 'analyzeLogs',
                    error: this.normalizeError(err)
                }
            });
        }
    }

    public async aggregateLogs(entries: ILogEntry[], options: ILogAggregationOptions): Promise<ILogAggregation> {
        try {
            return await this.analyzer.aggregateLogs(entries, options);
        } catch (err) {
            throw createError({
                message: 'Failed to aggregate logs',
                type: 'ExecutionError',
                context: {
                    component: this.constructor.name,
                    operation: 'aggregateLogs',
                    error: this.normalizeError(err)
                }
            });
        }
    }

    public async getStorageStats(): Promise<ILogStorageStats> {
        try {
            return await this.storageManager.getStats();
        } catch (err) {
            throw createError({
                message: 'Failed to get storage statistics',
                type: 'StorageError',
                context: {
                    component: this.constructor.name,
                    operation: 'getStorageStats',
                    error: this.normalizeError(err)
                }
            });
        }
    }

    // ─── Error Analysis Methods ──────────────────────────────────────────────

    public async analyzeErrorPatterns(timeRange: { start: number; end: number }): Promise<IErrorPattern[]> {
        try {
            const query: ILogStorageQuery = {
                timeRange,
                levels: ['error'],
                orderBy: {
                    field: 'timestamp',
                    direction: 'asc'
                }
            };

            const errorLogs = await this.queryLogs(query);
            const analysis = await this.analyzer.analyzeLogs(errorLogs.entries);
            return this.analyzer.convertToErrorPatterns(analysis.patterns, errorLogs.entries);
        } catch (err) {
            throw createError({
                message: 'Failed to analyze error patterns',
                type: 'ExecutionError',
                context: {
                    component: this.constructor.name,
                    operation: 'analyzeErrorPatterns',
                    error: this.normalizeError(err)
                }
            });
        }
    }

    public async analyzeErrorTrends(timeRange: { start: number; end: number }): Promise<IErrorTrend[]> {
        try {
            const query: ILogStorageQuery = {
                timeRange,
                levels: ['error']
            };

            const errorLogs = await this.queryLogs(query);
            return this.analyzer.analyzeErrorTrends(errorLogs.entries);
        } catch (err) {
            throw createError({
                message: 'Failed to analyze error trends',
                type: 'ExecutionError',
                context: {
                    component: this.constructor.name,
                    operation: 'analyzeErrorTrends',
                    error: this.normalizeError(err)
                }
            });
        }
    }

    public async assessErrorImpact(errorPattern: string): Promise<IErrorImpact> {
        try {
            const query: ILogStorageQuery = {
                levels: ['error'],
                patterns: [errorPattern]
            };

            const errorLogs = await this.queryLogs(query);
            return this.analyzer.assessErrorImpact(errorPattern, errorLogs.entries);
        } catch (err) {
            throw createError({
                message: 'Failed to assess error impact',
                type: 'ExecutionError',
                context: {
                    component: this.constructor.name,
                    operation: 'assessErrorImpact',
                    error: this.normalizeError(err)
                }
            });
        }
    }

    public async trackRecoveryEffectiveness(timeRange: { start: number; end: number }): Promise<IRecoveryEffectiveness> {
        try {
            const query: ILogStorageQuery = {
                timeRange,
                levels: ['error']
            };

            const errorLogs = await this.queryLogs(query);
            return this.analyzer.trackRecoveryEffectiveness(errorLogs.entries);
        } catch (err) {
            throw createError({
                message: 'Failed to track recovery effectiveness',
                type: 'ExecutionError',
                context: {
                    component: this.constructor.name,
                    operation: 'trackRecoveryEffectiveness',
                    error: this.normalizeError(err)
                }
            });
        }
    }

    // ─── Private Helper Methods ─────────────────────────────────────────────

    private shouldLog(level: ILogLevel): boolean {
        const levels: ILogLevel[] = ['error', 'warn', 'info', 'debug'];
        const currentLevelIndex = levels.indexOf(this.logLevel);
        const messageLevelIndex = levels.indexOf(level);
        return messageLevelIndex <= currentLevelIndex;
    }

    private createLogEntry(params: {
        component: string;
        level: ILogLevel;
        message: string;
        context?: Record<string, unknown>;
    }): ILogEntry {
        const baseMetadata = createBaseMetadata(params.component, 'log');
        return {
            ...baseMetadata,
            level: params.level,
            message: params.message,
            correlationId: params.context?.correlationId as string,
            traceId: params.context?.traceId as string,
            spanId: params.context?.spanId as string,
            parentSpanId: params.context?.parentSpanId as string,
            tags: (params.context?.tags as string[]) || [],
            source: {
                file: params.context?.file as string,
                line: params.context?.line as number,
                function: params.context?.function as string
            },
            context: params.context || {}
        };
    }

    private async storeAndEmitLog(
        component: string,
        level: ILogLevel,
        message: string,
        context?: Record<string, unknown>
    ): Promise<void> {
        try {
            const logEntry = this.createLogEntry({
                component,
                level,
                message,
                context
            });

            // Store in memory
            const componentLogs = this.inMemoryLogs.get(component) || [];
            componentLogs.push(logEntry);
            this.inMemoryLogs.set(component, componentLogs);

            // Store persistently
            await this.storageManager.store([logEntry]);

            // Emit event
            await this.eventEmitter.emitLogCreated({
                id: logEntry.id,
                timestamp: logEntry.timestamp,
                level: logEntry.level,
                message: logEntry.message,
                agentName: component,
                taskId: context?.taskId as string || 'unknown',
                meta: context
            });

            // Console output
            this.consoleLog(level, `[${component}] ${message}`, context);
        } catch (err) {
            throw createError({
                message: 'Failed to store and emit log',
                type: 'StorageError',
                context: {
                    component: this.constructor.name,
                    operation: 'storeAndEmitLog',
                    error: this.normalizeError(err)
                }
            });
        }
    }

    private consoleLog(level: ILogLevel, message: string, context?: Record<string, unknown>): void {
        const timestamp = new Date().toISOString();
        const contextStr = context ? ` ${JSON.stringify(context)}` : '';
        const emoji = this.getLogLevelEmoji(level);
        
        switch (level) {
            case 'debug':
                console.debug(`${timestamp} ${emoji} [${level.toUpperCase()}] ${message}${contextStr}`);
                break;
            case 'info':
                console.log(`${timestamp} ${emoji} [${level.toUpperCase()}] ${message}${contextStr}`);
                break;
            case 'warn':
                console.warn(`${timestamp} ${emoji} [${level.toUpperCase()}] ${message}${contextStr}`);
                break;
            case 'error':
                console.error(`${timestamp} ${emoji} [${level.toUpperCase()}] ${message}${contextStr}`);
                break;
        }
    }

    private getLogLevelEmoji(level: ILogLevel): string {
        switch (level) {
            case 'debug':
                return '🔍';
            case 'info':
                return 'ℹ️';
            case 'warn':
                return '⚠️';
            case 'error':
                return '🔴';
        }
    }

    private normalizeError(error: unknown): Error {
        if (error instanceof Error) {
            return error;
        }
        return new Error(typeof error === 'string' ? error : 'Unknown error occurred');
    }
}

export default LogManager.getInstance();
