/**
 * @file loggingTypes.ts
 * @description Consolidated logging type definitions including core logging, storage, and enhanced functionality
 *
 * @module @common
 */

import type { ILogLevel } from './enumTypes';
import type { IBaseHandlerMetadata, IBaseEvent } from './baseTypes';
import type { LOG_EVENT_TYPE } from './enumTypes';
import type { 
    ILog,
    ITaskLogMetadata,
    IWorkflowLogMetadata,
    IAgentLogMetadata,
    IBaseLogMetadata
} from '../team/teamLogsTypes';

// ─── Context Types ───────────────────────────────────────────────────────────

export interface ILogErrorContext {
    type: string;
    message: string;
    stack?: string;
}

export interface ILogRecoveryContext {
    attempts: number;
    successful: boolean;
    duration: number;
    strategy: string;
    resourceUsage: Record<string, number>;
}

export interface ILogMetricsContext {
    cpu?: number;
    memory?: number;
    network?: number;
    responseTime?: number;
    throughput?: number;
    [key: string]: number | undefined;
}

export interface ILogUserContext {
    id: string;
    name?: string;
    role?: string;
}

export interface ILogContext {
    error?: ILogErrorContext;
    recovery?: ILogRecoveryContext;
    metrics?: ILogMetricsContext;
    user?: ILogUserContext;
    correlationId?: string;
    traceId?: string;
    spanId?: string;
    parentSpanId?: string;
    tags?: string[];
    file?: string;
    line?: number;
    function?: string;
    [key: string]: unknown;
}

// ─── Core Logging Types ─────────────────────────────────────────────────────

export interface ILoggerConfig {
    level?: ILogLevel;
    timestamp?: boolean;
    showLevel?: boolean;
    formatter?: (level: string, message: string) => string;
    serializer?: (obj: unknown) => string;
}

export interface ILogFormattingOptions {
    timestamp?: boolean;
    colorize?: boolean;
    padLevels?: boolean;
    levelFormatter?: (level: string) => string;
    messageFormatter?: (message: unknown) => string;
}

export interface ILogDestinationConfig {
    type: 'console' | 'file' | 'remote';
    level?: ILogLevel;
    format?: ILogFormattingOptions;
    options?: Record<string, unknown>;
}

export interface ILogFilterOptions {
    levels?: ILogLevel[];
    excludePatterns?: RegExp[];
    includePatterns?: RegExp[];
    contextFilter?: (context: Record<string, unknown>) => boolean;
}

// ─── Log Event Types ──────────────────────────────────────────────────────

export interface ILogCreatedEvent extends Omit<IBaseEvent, 'metadata'> {
    type: LOG_EVENT_TYPE.LOG_CREATED;
    log: ILog;
    metadata: IBaseLogMetadata;
}

export interface ILogUpdatedEvent extends Omit<IBaseEvent, 'metadata'> {
    type: LOG_EVENT_TYPE.LOG_UPDATED;
    previousLog: ILog;
    newLog: ILog;
    metadata: IBaseLogMetadata;
}

export interface ILogClearedEvent extends Omit<IBaseEvent, 'metadata'> {
    type: LOG_EVENT_TYPE.LOG_CLEARED;
    metadata: IBaseLogMetadata;
}

export interface ITaskLogAddedEvent extends Omit<IBaseEvent, 'metadata'> {
    type: LOG_EVENT_TYPE.TASK_LOG_ADDED;
    log: ILog;
    taskId: string;
    metadata: ITaskLogMetadata;
}

export interface IWorkflowLogAddedEvent extends Omit<IBaseEvent, 'metadata'> {
    type: LOG_EVENT_TYPE.WORKFLOW_LOG_ADDED;
    log: ILog;
    workflowId: string;
    metadata: IWorkflowLogMetadata;
}

export interface IAgentLogAddedEvent extends Omit<IBaseEvent, 'metadata'> {
    type: LOG_EVENT_TYPE.AGENT_LOG_ADDED;
    log: ILog;
    agentId: string;
    metadata: IAgentLogMetadata;
}

export type LogEvent =
    | ILogCreatedEvent
    | ILogUpdatedEvent
    | ILogClearedEvent
    | ITaskLogAddedEvent
    | IWorkflowLogAddedEvent
    | IAgentLogAddedEvent;

export interface ILogEventHandler {
    onLogCreated(event: ILogCreatedEvent): Promise<void>;
    onLogUpdated(event: ILogUpdatedEvent): Promise<void>;
    onLogCleared(event: ILogClearedEvent): Promise<void>;
    onTaskLogAdded(event: ITaskLogAddedEvent): Promise<void>;
    onWorkflowLogAdded(event: IWorkflowLogAddedEvent): Promise<void>;
    onAgentLogAdded(event: IAgentLogAddedEvent): Promise<void>;
}

// ─── Log Entry Types ──────────────────────────────────────────────────────

export interface ILogEntry extends IBaseHandlerMetadata {
    level: ILogLevel;
    correlationId?: string;
    traceId?: string;
    spanId?: string;
    parentSpanId?: string;
    tags: string[];
    source: {
        file?: string;
        line?: number;
        function?: string;
    };
    context: ILogContext;
}

export interface ILogPattern {
    pattern: string;
    frequency: number;
    firstOccurrence: number;
    lastOccurrence: number;
    severity: 'low' | 'medium' | 'high';
    affectedComponents: Set<string>;
    tags: Set<string>;
}

export interface ILogAnomaly {
    timestamp: number;
    pattern: string;
    expectedFrequency: number;
    actualFrequency: number;
    severity: 'low' | 'medium' | 'high';
    affectedComponents: Set<string>;
    context: ILogContext;
}

export interface ILogCorrelation {
    correlationId: string;
    traceId: string;
    startTime: number;
    endTime: number;
    duration: number;
    entries: ILogEntry[];
    components: Set<string>;
    status: 'success' | 'error' | 'warning';
    context: ILogContext;
}

// ─── Error Pattern Types ─────────────────────────────────────────────────────

export interface IErrorPattern extends ILogPattern {
    errorType: string;
    recoveryAttempts: number;
    recoverySuccess: number;
    impactMetrics: {
        severity: 'low' | 'medium' | 'high';
        scope: 'isolated' | 'moderate' | 'widespread';
        duration: number;
    };
    resourceMetrics: {
        cpuUsage: number;
        memoryUsage: number;
        networkUsage: number;
    };
}

export interface IErrorTrend {
    startTime: number;
    endTime: number;
    errorCount: number;
    errorTypes: Map<string, number>;
    recoveryMetrics: {
        attempts: number;
        successful: number;
        averageTime: number;
    };
    performanceImpact: {
        responseTime: number;
        throughput: number;
        errorRate: number;
    };
}

export interface IErrorImpact {
    pattern: string;
    occurrences: number;
    affectedComponents: Set<string>;
    resourceImpact: {
        cpuUsage: number;
        memoryUsage: number;
        networkUsage: number;
    };
    performanceImpact: {
        responseTime: number;
        throughput: number;
        errorRate: number;
    };
    recoveryMetrics: {
        attempts: number;
        successful: number;
        averageTime: number;
    };
    userImpact: {
        severity: 'low' | 'medium' | 'high';
        userCount: number;
        duration: number;
    };
}

export interface IRecoveryEffectiveness {
    totalAttempts: number;
    successfulAttempts: number;
    averageRecoveryTime: number;
    resourceEfficiency: number;
    strategyEffectiveness: Map<string, {
        attempts: number;
        successes: number;
        averageTime: number;
    }>;
}

// ─── Storage Types ───────────────────────────────────────────────────────

export interface ILogStorageIndex {
    readonly name: string;
    readonly fields: string[];
    readonly type: 'btree' | 'hash' | 'bitmap';
    readonly unique: boolean;
    readonly sparse: boolean;
}

export interface ILogStorageSegment {
    readonly id: string;
    readonly startTime: number;
    readonly endTime: number;
    readonly size: number;
    readonly entryCount: number;
    readonly compressionRatio: number;
    readonly indexes: ILogStorageIndex[];
    readonly metadata: {
        readonly component: string;
        readonly level: ILogLevel;
        readonly operation: string;
        readonly patterns: ILogPattern[];
        readonly anomalies: ILogAnomaly[];
        readonly correlations: ILogCorrelation[];
    };
}

export interface ILogStorageQuery {
    readonly timeRange?: {
        readonly start: number;
        readonly end: number;
    };
    readonly components?: string[];
    readonly levels?: ILogLevel[];
    readonly operations?: string[];
    readonly tags?: string[];
    readonly correlationIds?: string[];
    readonly traceIds?: string[];
    readonly patterns?: string[];
    readonly limit?: number;
    readonly offset?: number;
    readonly orderBy?: {
        readonly field: string;
        readonly direction: 'asc' | 'desc';
    };
}

export interface ILogStorageQueryResult {
    readonly entries: ILogEntry[];
    readonly total: number;
    readonly segments: ILogStorageSegment[];
    readonly performance: {
        readonly duration: number;
        readonly scannedSegments: number;
        readonly scannedEntries: number;
        readonly filteredEntries: number;
        readonly indexUsage: {
            readonly name: string;
            readonly hits: number;
            readonly efficiency: number;
        }[];
    };
}

export interface ILogStorageStats {
    readonly totalSize: number;
    readonly totalEntries: number;
    readonly segments: {
        readonly total: number;
        readonly active: number;
        readonly archived: number;
    };
    readonly indexes: {
        readonly total: number;
        readonly size: number;
        readonly usage: {
            readonly name: string;
            readonly size: number;
            readonly entries: number;
            readonly lastUsed: number;
            readonly hitRate: number;
        }[];
    };
    readonly retention: {
        readonly oldestEntry: number;
        readonly newestEntry: number;
        readonly averageAge: number;
        readonly expiringEntries: number;
    };
    readonly performance: {
        readonly averageQueryTime: number;
        readonly averageInsertTime: number;
        readonly averageCompressionRatio: number;
        readonly indexEfficiency: number;
    };
}

// ─── Maintenance Types ────────────────────────────────────────────────────

export interface ILogStorageMaintenance {
    readonly compactSegments?: boolean;
    readonly rebuildIndexes?: boolean;
    readonly removeExpired?: boolean;
    readonly validateIntegrity?: boolean;
    readonly optimizeIndexes?: boolean;
    readonly dryRun?: boolean;
}

export interface ILogStorageMaintenanceResult {
    readonly success: boolean;
    readonly duration: number;
    readonly actions: {
        readonly type: string;
        readonly status: 'success' | 'failed';
        readonly details: string;
        readonly duration: number;
        readonly affected: {
            readonly segments: number;
            readonly entries: number;
            readonly indexes: number;
            readonly size: number;
        };
    }[];
    readonly errors: {
        readonly action: string;
        readonly error: string;
        readonly context: Record<string, unknown>;
    }[];
}

// ─── Configuration Types ──────────────────────────────────────────────────

export interface ILogStorageConfig {
    readonly path: string;
    readonly maxSize: number;
    readonly maxSegments: number;
    readonly segmentSize: number;
    readonly compression: {
        readonly enabled: boolean;
        readonly algorithm: 'gzip' | 'brotli' | 'none';
        readonly level: number;
    };
    readonly indexes: ILogStorageIndex[];
    readonly retention: {
        readonly maxAge: number;
        readonly maxEntries: number;
        readonly policy: 'delete' | 'archive';
    };
    readonly maintenance: {
        readonly schedule: string;
        readonly options: ILogStorageMaintenance;
    };
}

export interface ILogAnalysisConfig {
    patternDetectionThreshold: number;
    anomalyDetectionSensitivity: number;
    correlationTimeWindow: number;
    minPatternFrequency: number;
    maxPatternLength: number;
}

// ─── Aggregation Types ─────────────────────────────────────────────────────

export interface ILogAggregationOptions {
    timeWindow: number;
    groupBy: ('component' | 'level' | 'operation' | 'correlationId')[];
    filters?: {
        components?: string[];
        levels?: ILogLevel[];
        operations?: string[];
        tags?: string[];
        timeRange?: {
            start: number;
            end: number;
        };
    };
}

export interface ILogAggregation {
    timeWindow: number;
    startTime: number;
    endTime: number;
    totalEntries: number;
    groups: Map<string, {
        count: number;
        patterns: ILogPattern[];
        anomalies: ILogAnomaly[];
        correlations: ILogCorrelation[];
    }>;
    summary: {
        byLevel: Map<ILogLevel, number>;
        byComponent: Map<string, number>;
        byOperation: Map<string, number>;
        byTag: Map<string, number>;
    };
}

// ─── Default Configurations ───────────────────────────────────────────────

export const DEFAULT_LOG_STORAGE_CONFIG: ILogStorageConfig = {
    path: './logs',
    maxSize: 1024 * 1024 * 1024, // 1GB
    maxSegments: 100,
    segmentSize: 10 * 1024 * 1024, // 10MB
    compression: {
        enabled: true,
        algorithm: 'gzip',
        level: 6
    },
    indexes: [
        {
            name: 'timestamp',
            fields: ['timestamp'],
            type: 'btree',
            unique: false,
            sparse: false
        },
        {
            name: 'component_level',
            fields: ['component', 'level'],
            type: 'hash',
            unique: false,
            sparse: false
        },
        {
            name: 'correlation',
            fields: ['correlationId', 'traceId'],
            type: 'hash',
            unique: false,
            sparse: true
        }
    ],
    retention: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        maxEntries: 10000000, // 10M entries
        policy: 'archive'
    },
    maintenance: {
        schedule: '0 0 * * *', // Daily at midnight
        options: {
            compactSegments: true,
            rebuildIndexes: false,
            removeExpired: true,
            validateIntegrity: true,
            optimizeIndexes: true,
            dryRun: false
        }
    }
};

export const DEFAULT_LOG_ANALYSIS_CONFIG: ILogAnalysisConfig = {
    patternDetectionThreshold: 0.7,
    anomalyDetectionSensitivity: 2.0,
    correlationTimeWindow: 5 * 60 * 1000, // 5 minutes
    minPatternFrequency: 3,
    maxPatternLength: 100
};

// ─── Type Guards ───────────────────────────────────────────────────────────

export function isLogErrorContext(value: unknown): value is ILogErrorContext {
    if (!value || typeof value !== 'object') return false;
    const ctx = value as Partial<ILogErrorContext>;
    return typeof ctx.type === 'string' && typeof ctx.message === 'string';
}

export function isLogRecoveryContext(value: unknown): value is ILogRecoveryContext {
    if (!value || typeof value !== 'object') return false;
    const ctx = value as Partial<ILogRecoveryContext>;
    return (
        typeof ctx.attempts === 'number' &&
        typeof ctx.successful === 'boolean' &&
        typeof ctx.duration === 'number' &&
        typeof ctx.strategy === 'string' &&
        typeof ctx.resourceUsage === 'object' &&
        ctx.resourceUsage !== null
    );
}

export function isLogMetricsContext(value: unknown): value is ILogMetricsContext {
    if (!value || typeof value !== 'object') return false;
    const ctx = value as Record<string, unknown>;
    return Object.entries(ctx).every(([_, v]) => typeof v === 'number' || v === undefined);
}

export function isLogUserContext(value: unknown): value is ILogUserContext {
    if (!value || typeof value !== 'object') return false;
    const ctx = value as Partial<ILogUserContext>;
    return typeof ctx.id === 'string';
}

export function isLogContext(value: unknown): value is ILogContext {
    if (!value || typeof value !== 'object') return false;
    const ctx = value as Partial<ILogContext>;
    
    // Check required string fields
    if (ctx.correlationId !== undefined && typeof ctx.correlationId !== 'string') return false;
    if (ctx.traceId !== undefined && typeof ctx.traceId !== 'string') return false;
    if (ctx.spanId !== undefined && typeof ctx.spanId !== 'string') return false;
    if (ctx.parentSpanId !== undefined && typeof ctx.parentSpanId !== 'string') return false;
    if (ctx.file !== undefined && typeof ctx.file !== 'string') return false;
    if (ctx.function !== undefined && typeof ctx.function !== 'string') return false;
    
    // Check number fields
    if (ctx.line !== undefined && typeof ctx.line !== 'number') return false;
    
    // Check array fields
    if (ctx.tags !== undefined && !Array.isArray(ctx.tags)) return false;
    if (ctx.tags !== undefined && !ctx.tags.every(tag => typeof tag === 'string')) return false;
    
    // Check complex fields
    if (ctx.error !== undefined && !isLogErrorContext(ctx.error)) return false;
    if (ctx.recovery !== undefined && !isLogRecoveryContext(ctx.recovery)) return false;
    if (ctx.metrics !== undefined && !isLogMetricsContext(ctx.metrics)) return false;
    if (ctx.user !== undefined && !isLogUserContext(ctx.user)) return false;
    
    return true;
}

export function isLogLevel(level: unknown): level is ILogLevel {
    return typeof level === 'string' && 
           ['trace', 'debug', 'info', 'warn', 'error'].includes(level);
}

export function isLoggerConfig(config: unknown): config is ILoggerConfig {
    return typeof config === 'object' && 
           config !== null &&
           (!('level' in config) || typeof config.level === 'string');
}
