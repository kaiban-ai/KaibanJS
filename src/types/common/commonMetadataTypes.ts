/**
 * @file commonMetadataTypes.ts
 * @description Common metadata type definitions
 *
 * @module types/common
 */

import { IValidationResult } from './commonValidationTypes';
import { ILLMUsageStats } from '../llm/llmResponseTypes';
import { ICostDetails } from '../workflow/workflowCostsTypes';

// ─── Base Metadata Types ─────────────────────────────────────────────────────────

/**
 * Base performance metrics interface
 */
export interface IPerformanceMetrics {
    startTime: number;
    endTime: number;
    duration: number;
    memoryUsage: number;
}

/**
 * Base handler metadata interface - All metadata types must extend this
 */
export interface IBaseHandlerMetadata {
    timestamp: number;
    component: string;
    operation: string;
    performance: IPerformanceMetrics;
}

// ─── Domain-Specific Metadata Types ───────────────────────────────────────────────

/**
 * Success metadata
 */
export interface ISuccessMetadata extends IBaseHandlerMetadata {
    validation?: IValidationResult;
    details?: Record<string, unknown>;
}

/**
 * Team metadata - Main metadata type that includes agent and task metadata
 */
export interface ITeamMetadata extends IBaseHandlerMetadata {
    team: {
        name: string;
        agents: Record<string, IAgentMetadata>;
        tasks: Record<string, ITaskMetadata>;
        performance: IPerformanceMetrics;
        llmUsageStats: ILLMUsageStats;
        costDetails: ICostDetails;
        messageCount: number;
        iterationCount: number;
    };
}

/**
 * Workflow metadata - Focused on workflow metrics
 */
export interface IWorkflowMetadata extends IBaseHandlerMetadata {
    workflow: {
        performance: IPerformanceMetrics;
        debugInfo: {
            lastCheckpoint: string;
            warnings: string[];
        };
        priority: number;
        retryCount: number;
        taskCount: number;
        agentCount: number;
        costDetails: ICostDetails;
        llmUsageStats: ILLMUsageStats;
        teamName: string;
        messageCount?: number;
        iterationCount?: number;
    };
}

/**
 * Agent metadata - Partial view of team metadata
 */
export interface IAgentMetadata extends IBaseHandlerMetadata {
    agent: {
        id: string;
        name: string;
        role: string;
        status: string;
        metrics: {
            iterations: number;
            executionTime: number;
            llmUsageStats: ILLMUsageStats;
        };
    };
}

/**
 * Agent creation metadata
 */
export interface IAgentCreationMetadata extends IBaseHandlerMetadata {
    createdAt: number;
    configHash: string;
    version: string;
    validation?: IValidationResult;
}

/**
 * Agent execution metadata
 */
export interface IAgentExecutionMetadata extends IBaseHandlerMetadata {
    iterations: number;
    executionTime: number;
    llmUsageStats: ILLMUsageStats;
}

/**
 * Task metadata - Partial view of team metadata
 */
export interface ITaskMetadata extends IBaseHandlerMetadata {
    task: {
        iterations: number;
        executionTime: number;
        llmUsageStats: ILLMUsageStats;
    };
}

/**
 * Message metadata
 */
export interface IMessageMetadata extends IBaseHandlerMetadata {
    message: {
        processingInfo?: {
            parseTime: number;
            tokenCount: number;
        };
        context?: {
            threadId: string;
            parentMessageId?: string;
            references: string[];
        };
    };
}

/**
 * Response metadata
 */
export interface IResponseMetadata extends IBaseHandlerMetadata {
    response: {
        type: string;
        format: string;
        size: number;
        processingTime: number;
    };
}

/**
 * LLM event metadata
 */
export interface ILLMEventMetadata extends IBaseHandlerMetadata {
    llm: {
        model: string;
        provider: string;
        requestId: string;
        usageStats: ILLMUsageStats;
    };
}

/**
 * Tool execution metadata
 */
export interface IToolExecutionMetadata extends IBaseHandlerMetadata {
    tool: {
        name: string;
        environment: string;
        parameters: Record<string, string>;
        version: string;
    };
}

/**
 * Error metadata - Canonical definition
 * All errors must be handled through CoreManager's service directory
 * to ensure consistent error handling and proper error chain maintenance.
 */
export interface IErrorMetadata extends IBaseHandlerMetadata {
    error: {
        code: string;
        type: string;
        message: string;
        context: Record<string, unknown>;
        severity: 'low' | 'medium' | 'high' | 'critical';
        rootError: Error;  // Required to maintain error chain
        recommendedAction?: string;
        stackTrace?: string;
    };
    debug: {
        lastKnownState?: string;
        recoveryAttempts: number;
    };
    validation?: IValidationResult;
    transition?: {
        from: string;
        to: string;
        entity?: string;
        entityId?: string;
    };
}

// ─── Type Guards ────────────────────────────────────────────────────────────────

export const MetadataTypeGuards = {
    isBaseHandlerMetadata: (value: unknown): value is IBaseHandlerMetadata => {
        if (!value || typeof value !== 'object') return false;
        const metadata = value as Partial<IBaseHandlerMetadata>;
        return !!(
            typeof metadata.timestamp === 'number' &&
            typeof metadata.component === 'string' &&
            typeof metadata.operation === 'string' &&
            metadata.performance &&
            typeof metadata.performance.startTime === 'number' &&
            typeof metadata.performance.endTime === 'number' &&
            typeof metadata.performance.duration === 'number' &&
            typeof metadata.performance.memoryUsage === 'number'
        );
    },

    isTeamMetadata: (value: unknown): value is ITeamMetadata => {
        if (!value || typeof value !== 'object') return false;
        const metadata = value as ITeamMetadata;
        return !!(
            MetadataTypeGuards.isBaseHandlerMetadata(metadata) &&
            metadata.team &&
            typeof metadata.team.name === 'string' &&
            typeof metadata.team.agents === 'object' &&
            typeof metadata.team.tasks === 'object'
        );
    },

    isWorkflowMetadata: (value: unknown): value is IWorkflowMetadata => {
        if (!value || typeof value !== 'object') return false;
        const metadata = value as IWorkflowMetadata;
        return !!(
            MetadataTypeGuards.isBaseHandlerMetadata(metadata) &&
            metadata.workflow &&
            typeof metadata.workflow.priority === 'number' &&
            typeof metadata.workflow.retryCount === 'number' &&
            typeof metadata.workflow.taskCount === 'number' &&
            typeof metadata.workflow.agentCount === 'number' &&
            typeof metadata.workflow.teamName === 'string'
        );
    }
};

// ─── Utility Functions ──────────────────────────────────────────────────────────

export const createBaseMetadata = (
    component: string,
    operation: string
): IBaseHandlerMetadata => ({
    timestamp: Date.now(),
    component,
    operation,
    performance: {
        startTime: Date.now(),
        endTime: 0,
        duration: 0,
        memoryUsage: process.memoryUsage().heapUsed
    }
});
