/**
 * @file toolManagerTypes.ts
 * @path src/types/tool/toolManagerTypes.ts
 * @description Type definitions for tool managers
 * 
 * @module @types/tool
 */

import { Tool } from '@langchain/core/tools';
import { BaseMessage } from '@langchain/core/messages';
import { IHandlerResult, IStandardCostDetails } from '../common/baseTypes';
import { IBaseManager } from '../agent/agentManagerTypes';
import { IAgentType } from '../agent/agentBaseTypes';
import { ITaskType } from '../task/taskBaseTypes';
import { IToolHandlerResult } from './toolHandlerTypes';
import { MANAGER_CATEGORY_enum } from '../common/enumTypes';
import { IMetricsManager } from '../metrics/base/metricsManagerTypes';
import { IToolDependency } from './toolTypes';
import { IToolResourceMetrics, IToolPerformanceMetrics, IToolUsageMetrics } from './toolMetricTypes';
import { IValidationResult } from '../common/validationTypes';

/**
 * Interface for tracking tool initialization state within the tool manager.
 * This is an implementation detail specific to tool initialization tracking.
 */
export interface IToolInitializationState {
    isInitializing: boolean;
    dependencies: Set<string>;
    dependents: Set<string>;
    initializationPromise?: Promise<void>;
    error?: Error;
}

/**
 * Tool manager interface for handling agent tools
 */
export interface IToolManager extends IBaseManager<Tool> {
    readonly category: MANAGER_CATEGORY_enum.RESOURCE;

    executeTool(params: {
        agent: IAgentType;
        task: ITaskType;
        tool: Tool;
        input: Record<string, unknown>;
        messages: BaseMessage[];
    }): Promise<IHandlerResult>;

    validateToolConfig(tool: Tool): Promise<IToolHandlerResult>;
    validateToolDependencies(tools: Tool[]): Promise<IToolHandlerResult>;
    initializeTools(agent: IAgentType): Promise<Tool[]>;
    initializeTool(tool: Tool): Promise<void>;
    cleanupTools(agent: IAgentType): Promise<void>;
    cleanupTool(toolName: string): Promise<void>;
    getToolDependencies(toolName: string): Promise<string[]>;
    isToolInitialized(toolName: string): boolean;
    cancelToolInitialization(toolName: string): Promise<void>;
}

/**
 * Interface for managing tool execution
 */
export interface IToolExecutionManager extends IBaseManager<Tool> {
    readonly category: MANAGER_CATEGORY_enum.EXECUTION;

    initialize(): Promise<void>;

    executeTool(params: {
        agent: IAgentType;
        task: ITaskType;
        tool: Tool;
        input: Record<string, unknown>;
        messages: BaseMessage[];
    }): Promise<IToolHandlerResult>;

    executeToolWithRetry(params: {
        agent: IAgentType;
        task: ITaskType;
        tool: Tool;
        input: Record<string, unknown>;
        messages: BaseMessage[];
        maxRetries?: number;
    }): Promise<IHandlerResult>;

    validateToolExecution(params: {
        tool: Tool;
        input: Record<string, unknown>;
    }): Promise<IToolHandlerResult>;

    handleToolError(params: {
        tool: Tool;
        error: Error;
        context: Record<string, unknown>;
    }): Promise<void>;
}

/**
 * Interface for managing tool registration
 */
export interface IToolRegistrationManager extends IBaseManager<Tool> {
    readonly category: MANAGER_CATEGORY_enum.REGISTRY;

    registerTool(tool: Tool): Promise<void>;
    unregisterTool(toolName: string): Promise<void>;
    getRegisteredTools(): Tool[];
    isToolRegistered(toolName: string): boolean;
    validateToolRegistration(tool: Tool): Promise<IToolHandlerResult>;
    validateToolSchema(tool: Tool): Promise<IToolHandlerResult>;
    validateToolDependencies(tools: Tool[]): Promise<IToolHandlerResult>;
    getToolByName(toolName: string): Tool | undefined;
    getToolsByCategory(category: string): Tool[];
    getToolMetadata(toolName: string): {
        dependencies?: {
            items: Array<{
                dependency: IToolDependency;
            }>;
        };
    } | undefined;
}

/**
 * Enhanced interface for managing tool metrics with advanced monitoring
 */
export interface IToolMetricsManager extends IMetricsManager {
    readonly category: MANAGER_CATEGORY_enum.METRICS;

    // Core initialization and lifecycle
    initialize(): Promise<void>;
    createMetrics(toolName: string): Promise<void>;
    startCollection(toolName: string, samplingRate?: number): void;
    stopCollection(toolName: string): void;
    clearMetricsHistory(toolName: string): void;

    // Basic metrics tracking
    updateMetrics(toolName: string, executionTime: number): Promise<void>;
    trackToolExecution(params: {
        tool: Tool;
        duration: number;
        success: boolean;
        error?: Error;
    }): Promise<void>;

    // Enhanced metrics collection
    collectMetrics(toolId: string, metrics: {
        resources: IToolResourceMetrics;
        performance: IToolPerformanceMetrics;
        usage: IToolUsageMetrics;
    }): Promise<IValidationResult>;

    // Metrics retrieval
    getToolMetrics(toolName: string): Promise<{
        totalExecutions: number;
        successfulExecutions: number;
        failedExecutions: number;
        averageDuration: number;
        lastExecutionTime?: number;
        lastError?: Error;
    }>;

    // Advanced metrics features
    getMetricsHistory(toolId: string): {
        resources: IToolResourceMetrics[];
        performance: IToolPerformanceMetrics[];
        usage: IToolUsageMetrics[];
        timestamp: number;
    } | undefined;

    getMetricsHistorySize(): number;

    // Cost calculation
    calculateCostDetails(
        toolId: string,
        inputSize: number,
        outputSize: number
    ): IStandardCostDetails;

    // Metrics management
    resetToolMetrics(toolName: string): Promise<void>;
}
