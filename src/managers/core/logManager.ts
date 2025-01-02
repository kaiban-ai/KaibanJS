/**
 * @file logManager.ts
 * @description Core logging functionality implementation
 */

import { CoreManager } from './coreManager';
import { LogStorageManager } from './logStorageManager';
import { LogAnalyzer } from './logAnalyzer';
import { BaseEventEmitter } from './eventEmitter';
import { MANAGER_CATEGORY_enum, LOG_EVENT_TYPE } from '../../types/common/enumTypes';
import { ERROR_KINDS } from '../../types/common/errorTypes';
import { createBaseMetadata } from '../../types/common/baseTypes';

import type { ILogLevel } from '../../types/common/enumTypes';
import type { 
    ILogEntry,
    ILogStorageQuery,
    ILogStorageQueryResult,
    ILogStorageStats,
    ILogPattern,
    ILogAnomaly,
    ILogCorrelation,
    ILogAggregation,
    ILogAggregationOptions,
    ILogCreatedEvent,
    ILogContext,
    ILogErrorContext,
    ILogMetricsContext,
    ILogUserContext
} from '../../types/common/loggingTypes';
import type { ErrorManager } from './errorManager';
import type { IPerformanceMetrics } from '../../types/metrics/base/performanceMetrics';
import type { IBaseLogMetadata, ILog } from '../../types/team/teamLogsTypes';

/**
 * Core logging functionality implementation
 */
export class LogManager extends CoreManager {
    private static instance: LogManager;
    private readonly inMemoryLogs: Map<string, Array<ILog & Partial<ILogEntry>>>; // Updated type to handle both interfaces
    private readonly storageManager: LogStorageManager;
    private readonly analyzer: LogAnalyzer;
    protected readonly eventEmitter: BaseEventEmitter;
    private logLevel: ILogLevel;

    public readonly category: MANAGER_CATEGORY_enum = MANAGER_CATEGORY_enum.CORE;

    private constructor() {
        super();
        this.inMemoryLogs = new Map();
        this.storageManager = LogStorageManager.getInstance();
        this.analyzer = LogAnalyzer.getInstance();
        this.eventEmitter = BaseEventEmitter.getInstance();
        this.logLevel = 'info';
        this.registerDomainManager('LogManager', this);
    }

    public static getInstance(): LogManager {
        if (!LogManager.instance) {
            LogManager.instance = new LogManager();
        }
        return LogManager.instance;
    }

    public setLogLevel(level: ILogLevel): void {
        this.logLevel = level;
    }

    private shouldLog(level: ILogLevel): boolean {
        const levels: ILogLevel[] = ['error', 'warn', 'info', 'debug'];
        const currentLevelIndex = levels.indexOf(this.logLevel);
        const messageLevelIndex = levels.indexOf(level);
        return messageLevelIndex <= currentLevelIndex;
    }

    public async log(message: string, level: ILogLevel = 'info', context?: Record<string, unknown>): Promise<void> {
        if (this.shouldLog(level)) {
            await this.storeAndEmitLog(this.constructor.name, level, message, context);
        }
    }

    public async debug(message: string, context?: Record<string, unknown>): Promise<void> {
        if (this.shouldLog('debug')) {
            await this.log(message, 'debug', context);
        }
    }

    public async info(message: string, context?: Record<string, unknown>): Promise<void> {
        if (this.shouldLog('info')) {
            await this.log(message, 'info', context);
        }
    }

    public async warn(message: string, context?: Record<string, unknown>): Promise<void> {
        if (this.shouldLog('warn')) {
            await this.log(message, 'warn', context);
        }
    }

    public async error(message: string, error?: Error, context?: Record<string, unknown>): Promise<void> {
        if (this.shouldLog('error')) {
            await this.log(message, 'error', {
                ...context,
                error: error ? {
                    type: error.name,
                    message: error.message,
                    stack: error.stack
                } : undefined
            });
        }
    }

    public async queryLogs(query: ILogStorageQuery): Promise<ILogStorageQueryResult> {
        try {
            return await this.storageManager.query(query);
        } catch (err) {
            const errorManager = await this.getDomainManager<ErrorManager>('ErrorManager');
            await errorManager.handleError(err, 'queryLogs', ERROR_KINDS.ResourceError);
            throw err;
        }
    }

    public async getStorageStats(): Promise<ILogStorageStats> {
        try {
            return await this.storageManager.getStats();
        } catch (err) {
            const errorManager = await this.getDomainManager<ErrorManager>('ErrorManager');
            await errorManager.handleError(err, 'getStorageStats', ERROR_KINDS.ResourceError);
            throw err;
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
            const errorManager = await this.getDomainManager<ErrorManager>('ErrorManager');
            await errorManager.handleError(err, 'analyzeLogs', ERROR_KINDS.ExecutionError);
            throw err;
        }
    }

    public async aggregateLogs(entries: ILogEntry[], options: ILogAggregationOptions): Promise<ILogAggregation> {
        try {
            return await this.analyzer.aggregateLogs(entries, options);
        } catch (err) {
            const errorManager = await this.getDomainManager<ErrorManager>('ErrorManager');
            await errorManager.handleError(err, 'aggregateLogs', ERROR_KINDS.ExecutionError);
            throw err;
        }
    }

    private async storeAndEmitLog(
        component: string,
        level: ILogLevel,
        message: string,
        context?: Record<string, unknown>
    ): Promise<void> {
        try {
            const timestamp = Date.now();

            // Helper function to safely get string value
            const getStringValue = (value: unknown): string | undefined => {
                if (typeof value === 'string') {
                    return value;
                }
                if (value != null) {
                    return String(value);
                }
                return undefined;
            };

            // Helper function to safely get number value
            const getNumberValue = (value: unknown): number | undefined => {
                if (typeof value === 'number') {
                    return value;
                }
                return undefined;
            };

            // Helper function to validate metrics context
            const isMetricsContext = (value: unknown): value is ILogMetricsContext => {
                if (!value || typeof value !== 'object') return false;
                const metrics = value as Record<string, unknown>;
                return Object.entries(metrics).every(([_, v]) => typeof v === 'number' || v === undefined);
            };

            // Create performance metrics
            const performanceMetrics: IPerformanceMetrics = {
                component,
                category: 'performance',
                version: '1.0.0',
                timestamp,
                responseTime: {
                    average: 0,
                    min: 0,
                    max: 0,
                    total: 0
                },
                throughput: {
                    requestsPerSecond: 0,
                    bytesPerSecond: 0,
                    operationsPerSecond: 0,
                    dataProcessedPerSecond: 0
                }
            };

            // Create base log metadata
            const metadata: IBaseLogMetadata = {
                ...createBaseMetadata(component, 'log'),
                timestamp,
                component,
                operation: 'log',
                status: 'success',
                duration: 0,
                agent: {
                    id: '',
                    name: component,
                    role: '',
                    status: ''
                },
                performance: performanceMetrics
            };

            // Create log context with type-safe field handling
            const logContext: ILogContext = {
                // Base fields with type validation
                correlationId: typeof context?.correlationId === 'string' ? context.correlationId : undefined,
                traceId: typeof context?.traceId === 'string' ? context.traceId : undefined,
                spanId: typeof context?.spanId === 'string' ? context.spanId : undefined,
                parentSpanId: typeof context?.parentSpanId === 'string' ? context.parentSpanId : undefined,
                file: getStringValue(context?.file),
                line: getNumberValue(context?.line),
                function: getStringValue(context?.function),
                tags: Array.isArray(context?.tags) ? context.tags.filter(tag => typeof tag === 'string') : [],

                // Complex fields with type validation
                error: context?.error && typeof context.error === 'object' && 'type' in context.error && 'message' in context.error ? 
                    context.error as ILogErrorContext : undefined,
                metrics: isMetricsContext(context?.metrics) ? context.metrics : undefined,
                user: context?.user && typeof context.user === 'object' && 'id' in context.user ? 
                    context.user as ILogUserContext : undefined,

                // Additional fields from context
                ...context
            };

            // Create log entry that matches both ILog and ILogEntry interfaces
            const logEntry: ILog & ILogEntry = {
                // IBaseHandlerMetadata fields
                timestamp,
                component,
                operation: 'log',
                status: 'success',
                duration: 0,
                agent: {
                    id: '',
                    name: component,
                    role: '',
                    status: ''
                },
                category: 'logging',
                performance: performanceMetrics,
                metrics: logContext.metrics ? {
                    timestamp,
                    component,
                    category: 'metrics',
                    version: '1.0.0',
                    ...logContext.metrics
                } : {
                    timestamp,
                    component,
                    category: 'metrics',
                    version: '1.0.0'
                }, // Transform metrics to match IBaseMetrics

                // ILogEntry specific fields
                id: `log-${timestamp}-${Math.random().toString(36).substr(2, 9)}`,
                level,
                correlationId: logContext.correlationId,
                traceId: logContext.traceId,
                spanId: logContext.spanId,
                parentSpanId: logContext.parentSpanId,
                tags: logContext.tags || [],
                source: {
                    file: logContext.file,
                    line: logContext.line,
                    function: logContext.function
                },
                context: logContext,

                // ILog specific fields
                message,
                metadata
            };

            // Store in memory
            const componentLogs = this.inMemoryLogs.get(component) || [];
            componentLogs.push(logEntry);
            this.inMemoryLogs.set(component, componentLogs);

            // Store persistently
            await this.storageManager.store([logEntry]);

            // Create and emit event that matches ILogCreatedEvent
            const event: ILogCreatedEvent = {
                id: `event-${timestamp}-${Math.random().toString(36).substr(2, 9)}`,
                timestamp,
                type: LOG_EVENT_TYPE.LOG_CREATED,
                metadata,
                log: logEntry
            };

            await this.eventEmitter.emit<ILogCreatedEvent>(event);

            // Console output for development
            this.consoleLog(level, `[${component}] ${message}`, context);
        } catch (err) {
            const errorManager = await this.getDomainManager<ErrorManager>('ErrorManager');
            await errorManager.handleError(err, 'storeAndEmitLog', ERROR_KINDS.ResourceError);
            throw err;
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
}

export default LogManager.getInstance();
