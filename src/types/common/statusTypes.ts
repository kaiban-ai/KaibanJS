/**
 * @file statusTypes.ts
 * @path src/types/common/statusTypes.ts
 * @description Consolidated status type definitions including core status, history tracking, and reporting functionality
 */

import { 
    AGENT_STATUS_enum,
    MESSAGE_STATUS_enum,
    TASK_STATUS_enum,
    WORKFLOW_STATUS_enum,
    FEEDBACK_STATUS_enum,
    LLM_STATUS_enum 
} from './enumTypes';
import { ERROR_KINDS } from './errorTypes';
import type { IValidationResult } from './validationTypes';
import type { IBaseEvent } from './baseTypes';
import type { IPerformanceMetrics } from '../metrics/base/performanceMetrics';
import type { IResourceMetrics } from '../metrics/base/resourceMetrics';
import type { IErrorContext } from './errorTypes';
import type { IStatusChangeMetadata } from './metadataTypes';

// ================ Core Status Types ================

export type IStatusEntity = 'agent' | 'message' | 'task' | 'workflow' | 'feedback' | 'llm';

export type IStatusType = 
    | keyof typeof AGENT_STATUS_enum
    | keyof typeof MESSAGE_STATUS_enum
    | keyof typeof TASK_STATUS_enum
    | keyof typeof WORKFLOW_STATUS_enum
    | keyof typeof FEEDBACK_STATUS_enum
    | keyof typeof LLM_STATUS_enum;

export type IStatusErrorType = keyof typeof ERROR_KINDS;

export interface IEntityMetrics {
    currentStatus: Record<string, IStatusType>;
    errorRate: number;
    transitionRate: number;
    averageDuration: number;
    resourceUtilization: number;
}

export interface IStatusTransitionPattern {
    from: IStatusType;
    to: IStatusType;
    count: number;
    averageDuration: number;
}

export interface IStatusMetricsAnalysis {
    statusFrequency: Record<IStatusType, number>;
    transitionPatterns: IStatusTransitionPattern[];
    errorsByStatus: Record<IStatusType, number>;
}

export interface IStatusError {
    type: IStatusErrorType;
    message: string;
    details?: any;
    timestamp: number;
    component: string;
    operation: string;
    performance: IPerformanceMetrics;
    entity: {
        type: IStatusEntity;
        id: string;
        name: string;
    };
    transition: {
        from: IStatusType;
        to: IStatusType;
        reason: string;
        triggeredBy: string;
    };
    validation: IValidationResult;
    resources: IResourceMetrics;
    context: {
        source: string;
        target: string;
        correlationId: string;
        causationId: string;
        taskId: string;
        taskName: string;
        agentId: string;
        agentName: string;
        workflowId: string;
        messageId: string;
        phase: string;
        duration: number;
    };
}

export interface IStatusChangeEvent extends IBaseEvent {
    entityId: string;
    entity: IStatusEntity;
    from: IStatusType;
    to: IStatusType;
    validationResult: IValidationResult;
    metadata: IStatusChangeMetadata;
}

export interface IStatusTransitionContext {
    entity: IStatusEntity;
    entityId: string;
    currentStatus: IStatusType;
    targetStatus: IStatusType;
    operation: string;
    phase: string;
    startTime: number;
    duration: number;
    metadata: any;
    errorContext?: IErrorContext;
    resourceMetrics?: IResourceMetrics;
    performanceMetrics?: IPerformanceMetrics;
    context?: {
        component?: string;
        phase?: string;
        agentId?: string;
        task?: {
            name?: string;
            type?: string;
            priority?: number;
            progress?: number;
        };
        agent?: {
            name?: string;
            type?: string;
            role?: string;
        };
        provider?: string;
        model?: string;
        message?: {
            type?: string;
            size?: number;
        };
        workflow?: {
            name?: string;
            step?: string;
        };
        feedback?: {
            type?: string;
            source?: string;
        };
    };
}

export interface IStatusManagerConfig {
    entity: IStatusEntity;
    initialStatus?: IStatusType;
    transitions?: IStatusTransitionRule[];
    onChange?: (event: IStatusChangeEvent) => void;
    enableHistory?: boolean;
    maxHistoryLength?: number;
    validationTimeout?: number;
    allowConcurrentTransitions?: boolean;
}

export interface IStatusTransitionRule {
    from: IStatusType | IStatusType[];
    to: IStatusType | IStatusType[];
    validation?: (context: IStatusTransitionContext) => Promise<boolean>;
}

export type IStatusChangeCallback = (event: IStatusChangeEvent) => Promise<void>;

// ================ History Types ================

export interface IStatusHistoryEntry extends IStatusChangeEvent {
    duration: number;
    transitionCount: number;
    errorCount: number;
    performance: {
        validationTime: number;
        executionTime: number;
        totalTime: number;
    };
    metrics: {
        cpuUsage: number;
        memoryUsage: number;
        resourceUtilization: number;
    };
}

export type StatusDurationRecord = Partial<Record<IStatusType, {
    totalTime: number;
    percentage: number;
}>>;

export interface IStatusHistoryAnalysis {
    entity: IStatusEntity;
    period: {
        start: number;
        end: number;
    };
    summary: {
        totalTransitions: number;
        uniqueStatuses: IStatusType[];
        averageDuration: number;
        errorRate: number;
        mostCommonTransitions: IStatusTransitionPattern[];
        statusDurations: StatusDurationRecord;
    };
    performance: {
        averageValidationTime: number;
        averageExecutionTime: number;
        averageTotalTime: number;
        p95ValidationTime: number;
        p95ExecutionTime: number;
        p95TotalTime: number;
    };
    resources: {
        averageCpuUsage: number;
        averageMemoryUsage: number;
        averageResourceUtilization: number;
        peakCpuUsage: number;
        peakMemoryUsage: number;
        peakResourceUtilization: number;
    };
    patterns: {
        commonSequences: Array<{
            sequence: IStatusType[];
            count: number;
        }>;
        cyclicTransitions: Array<{
            cycle: IStatusType[];
            count: number;
        }>;
        anomalies: Array<{
            type: 'duration' | 'sequence' | 'resource';
            description: string;
            timestamp: number;
            context: Record<string, unknown>;
        }>;
    };
}

export interface IStatusHistoryQuery {
    entity?: IStatusEntity;
    entityId?: string;
    timeRange?: {
        start: number;
        end: number;
    };
    statuses?: IStatusType[];
    limit?: number;
    includeMetrics?: boolean;
}

// ================ Reporting Types ================

export interface IStatusTrendAnalysis {
    entity: IStatusEntity;
    period: {
        start: number;
        end: number;
    };
    trends: {
        statusFrequency: Record<IStatusType, number>;
        transitionPatterns: IStatusTransitionPattern[];
        errorRates: {
            overall: number;
            byStatus: Record<IStatusType, number>;
        };
        performance: {
            averageTransitionTime: number;
            slowestTransitions: IStatusTransitionPattern[];
            resourceUtilization: {
                cpu: number;
                memory: number;
                overall: number;
            };
        };
    };
    anomalies: Array<{
        type: 'frequency' | 'duration' | 'error' | 'resource';
        status: IStatusType;
        description: string;
        severity: 'low' | 'medium' | 'high';
        timestamp: number;
    }>;
    recommendations: Array<{
        type: 'optimization' | 'investigation' | 'alert';
        description: string;
        priority: 'low' | 'medium' | 'high';
        context: Record<string, unknown>;
    }>;
}

export interface IStatusImpactAssessment {
    entity: IStatusEntity;
    status: IStatusType;
    timestamp: number;
    directImpact: {
        affectedComponents: string[];
        severity: 'low' | 'medium' | 'high';
        scope: 'isolated' | 'partial' | 'system-wide';
    };
    cascadingEffects: Array<{
        component: string;
        effect: string;
        probability: number;
        mitigation?: string;
    }>;
    resourceImpact: {
        cpu: number;
        memory: number;
        network: number;
        storage: number;
    };
    performanceImpact: {
        latency: number;
        throughput: number;
        errorRate: number;
    };
    recommendations: Array<{
        action: string;
        priority: 'low' | 'medium' | 'high';
        expectedOutcome: string;
    }>;
}

export interface IStatusDashboardMetrics {
    timestamp: number;
    overview: {
        totalEntities: number;
        activeTransitions: number;
        errorCount: number;
        healthScore: number;
    };
    byEntity: Record<IStatusEntity, IEntityMetrics>;
    alerts: Array<{
        level: 'info' | 'warning' | 'error';
        message: string;
        context: Record<string, unknown>;
        timestamp: number;
    }>;
    performance: {
        systemLoad: number;
        memoryUsage: number;
        responseTime: number;
        throughput: number;
    };
}

// ================ Type Guards ================

export const isValidStatusEntity = (value: unknown): value is IStatusEntity => {
    if (typeof value !== 'string') return false;
    return ['agent', 'message', 'task', 'workflow', 'feedback', 'llm'].includes(value);
};

// ================ Utility Functions ================

export const createEmptyStatusFrequency = (entity: IStatusEntity): Record<IStatusType, number> => {
    switch (entity) {
        case 'agent':
            return Object.keys(AGENT_STATUS_enum).reduce((acc, key) => ({
                ...acc,
                [key]: 0
            }), {} as Record<IStatusType, number>);
        case 'message':
            return Object.keys(MESSAGE_STATUS_enum).reduce((acc, key) => ({
                ...acc,
                [key]: 0
            }), {} as Record<IStatusType, number>);
        case 'task':
            return Object.keys(TASK_STATUS_enum).reduce((acc, key) => ({
                ...acc,
                [key]: 0
            }), {} as Record<IStatusType, number>);
        case 'workflow':
            return Object.keys(WORKFLOW_STATUS_enum).reduce((acc, key) => ({
                ...acc,
                [key]: 0
            }), {} as Record<IStatusType, number>);
        case 'feedback':
            return Object.keys(FEEDBACK_STATUS_enum).reduce((acc, key) => ({
                ...acc,
                [key]: 0
            }), {} as Record<IStatusType, number>);
        case 'llm':
            return Object.keys(LLM_STATUS_enum).reduce((acc, key) => ({
                ...acc,
                [key]: 0
            }), {} as Record<IStatusType, number>);
        default:
            return {} as Record<IStatusType, number>;
    }
};

export const DEFAULT_STATUS_RECORDS = {
    createEmptyStatusFrequency,
    metrics: {
        agent: {
            currentStatus: {},
            errorRate: 0,
            transitionRate: 0,
            averageDuration: 0,
            resourceUtilization: 0
        },
        message: {
            currentStatus: {},
            errorRate: 0,
            transitionRate: 0,
            averageDuration: 0,
            resourceUtilization: 0
        },
        task: {
            currentStatus: {},
            errorRate: 0,
            transitionRate: 0,
            averageDuration: 0,
            resourceUtilization: 0
        },
        workflow: {
            currentStatus: {},
            errorRate: 0,
            transitionRate: 0,
            averageDuration: 0,
            resourceUtilization: 0
        },
        feedback: {
            currentStatus: {},
            errorRate: 0,
            transitionRate: 0,
            averageDuration: 0,
            resourceUtilization: 0
        },
        llm: {
            currentStatus: {},
            errorRate: 0,
            transitionRate: 0,
            averageDuration: 0,
            resourceUtilization: 0
        }
    } as Record<IStatusEntity, IEntityMetrics>
};
