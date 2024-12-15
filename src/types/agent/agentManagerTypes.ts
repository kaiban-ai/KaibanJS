/**
 * @file agentManagerTypes.ts
 * @description Type definitions for agent-related managers with enhanced type safety and categorization
 * 
 * @module @types/agent
 */

import { BaseMessage } from '@langchain/core/messages';
import { Tool } from '@langchain/core/tools';
import { IHandlerResult } from '../common/commonHandlerTypes';
import { IAgentType, IReactChampionAgent } from './agentBaseTypes';
import { IExecutionContext } from './agentConfigTypes';
import { ITaskType } from '../task/taskBaseTypes';
import { IErrorType } from '../common/commonErrorTypes';
import { 
    IThinkingResult, 
    IThinkingHandlerResult
} from './agentHandlersTypes';
import { IIterationContext, IIterationHandlerResult } from './agentIterationTypes';
import { ILoopHandlerResult, ILoopResult } from './agentLoopTypes';
import { ILLMUsageMetrics } from '../llm/llmMetricTypes';
import { ILLMValidationResult } from '../llm/llmManagerTypes';
import { IToolHandlerResult } from '../tool/toolHandlerTypes';
import { 
    MANAGER_CATEGORY_enum,
    SERVICE_STATUS_enum,
    SERVICE_EVENT_TYPE_enum
} from '../common/commonEnums';
import {
    IServiceConfig,
    IServiceMetadata,
    IServiceRegistration,
    IServiceDiscoveryQuery,
    IServiceDiscoveryResult,
    IHealthDetails
} from '../common/commonBaseTypes';

// Re-export needed types and enums
export { ILoopResult } from './agentLoopTypes';
export { 
    MANAGER_CATEGORY_enum,
    SERVICE_STATUS_enum,
    SERVICE_EVENT_TYPE_enum
} from '../common/commonEnums';
export {
    IServiceConfig,
    IServiceMetadata,
    IServiceRegistration,
    IServiceDiscoveryQuery,
    IServiceDiscoveryResult
} from '../common/commonBaseTypes';

// ─── Service Registry Types ────────────────────────────────────────────────────

/**
 * Service registration options
 */
export interface IServiceRegistrationOptions {
    validateConfig?: boolean;
    validateDependencies?: boolean;
    initializeOnRegister?: boolean;
    healthCheck?: boolean;
}

/**
 * Service registration result
 */
export interface IServiceRegistrationResult {
    success: boolean;
    registration?: IServiceRegistration;
    errors?: string[];
    warnings?: string[];
}

/**
 * Service version constraint
 */
export interface IServiceVersionConstraint {
    name: string;
    version: string;
    constraint: string; // e.g., ">=1.0.0", "^2.0.0"
}

/**
 * Service dependency resolution result
 */
export interface IServiceDependencyResult {
    resolved: boolean;
    missing: string[];
    optional: string[];
    versionMismatches?: IServiceVersionConstraint[];
}

/**
 * Service health check result
 */
export interface IServiceHealthCheckResult {
    status: SERVICE_STATUS_enum;
    timestamp: number;
    details: IHealthDetails;
}

// ─── Base Manager Types ────────────────────────────────────────────────────────

/**
 * Base manager metadata interface
 */
export interface IBaseManagerMetadata {
    category: MANAGER_CATEGORY_enum;
    operation: string;
    duration: number;
    status: 'success' | 'failure' | 'partial';
    agent: {
        id: string;
        name: string;
        role: string;
        status: string;
    };
    timestamp: number;
    component: string;
}

/**
 * Base manager interface that all managers must implement
 */
export interface IBaseManager<T = unknown> {
    readonly category: MANAGER_CATEGORY_enum;
    initialize(): Promise<void>;
    validate(params: T): Promise<boolean>;
    getMetadata(): IBaseManagerMetadata;
}

// ─── Core Managers ───────────────────────────────────────────────────────────

/**
 * Iteration manager interface for handling agent iterations
 */
export interface IIterationManager extends IBaseManager<IIterationContext> {
    readonly category: MANAGER_CATEGORY_enum.EXECUTION;

    handleIterationStart(params: {
        agent: IAgentType;
        task: ITaskType;
        iterations: number;
        maxAgentIterations: number;
    }): Promise<IIterationHandlerResult<IIterationContext>>;

    handleIterationEnd(params: {
        agent: IAgentType;
        task: ITaskType;
        iterations: number;
        maxAgentIterations: number;
    }): Promise<IIterationHandlerResult<IIterationContext>>;

    handleMaxIterationsError(params: {
        agent: IAgentType;
        task: ITaskType;
        iterations: number;
        maxIterations: number;
        error: IErrorType;
    }): Promise<IIterationHandlerResult<IIterationContext>>;
}

/**
 * Thinking manager interface for handling agent cognitive processes
 */
export interface IThinkingManager extends IBaseManager<IThinkingResult> {
    readonly category: MANAGER_CATEGORY_enum.EXECUTION;

    executeThinking(params: {
        agent: IReactChampionAgent;
        task: ITaskType;
        ExecutableAgent: any;
        feedbackMessage?: string;
    }): Promise<IThinkingHandlerResult<IThinkingResult>>;
}

// ─── Resource Managers ────────────────────────────────────────────────────────

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
 * LLM manager interface for handling language model interactions
 */
export interface ILLMManager extends IBaseManager {
    readonly category: MANAGER_CATEGORY_enum.RESOURCE;

    validateConfig(config: any): Promise<ILLMValidationResult>;
    createInstance(config: any): Promise<IHandlerResult<any>>;
    cleanupInstance(instance: any): Promise<void>;
    getUsageStats(): Promise<ILLMUsageMetrics>;
}

// ─── State Managers ──────────────────────────────────────────────────────────

/**
 * Message manager interface for handling agent messages
 */
export interface IMessageManager extends IBaseManager {
    readonly category: MANAGER_CATEGORY_enum.STATE;

    clear(): Promise<void>;
    getMessageCount(): Promise<number>;
    getMessages(): Promise<BaseMessage[]>;
}

/**
 * State manager interface for handling agent state
 */
export interface IStateManager extends IBaseManager {
    readonly category: MANAGER_CATEGORY_enum.STATE;

    getState(): Promise<IAgentType>;
    setState(state: Partial<IAgentType>): Promise<void>;
    resetState(): Promise<void>;
    validateStateTransition(from: string, to: string): Promise<boolean>;
}

// ─── Execution Managers ───────────────────────────────────────────────────────

/**
 * Agentic loop manager interface for handling execution loops
 */
export interface IAgenticLoopManager extends IBaseManager {
    readonly category: MANAGER_CATEGORY_enum.EXECUTION;

    executeLoop(params: {
        agent: IReactChampionAgent;
        task: ITaskType;
        feedbackMessage?: string;
    }): Promise<ILoopResult>;
}

// ─── Metrics Managers ────────────────────────────────────────────────────────

/**
 * Metrics manager interface for handling agent metrics
 */
export interface IMetricsManager extends IBaseManager {
    readonly category: MANAGER_CATEGORY_enum.METRICS;

    collectMetrics(): Promise<void>;
    updateMetrics(metrics: Record<string, unknown>): Promise<void>;
    getMetricsByCategory(category: string): Promise<Record<string, unknown>>;
    resetMetrics(): Promise<void>;
}

// ─── Manager Factory Types ─────────────────────────────────────────────────────

/**
 * Manager factory interface for creating manager instances
 */
export interface IManagerFactory {
    createIterationManager(): IIterationManager;
    createThinkingManager(): IThinkingManager;
    createToolManager(): IToolManager;
    createLLMManager(): ILLMManager;
    createMessageManager(): IMessageManager;
    createStateManager(): IStateManager;
    createAgenticLoopManager(): IAgenticLoopManager;
    createMetricsManager(): IMetricsManager;
}

/**
 * Manager registry interface for managing manager instances
 */
export interface IManagerRegistry {
    // Basic registration
    registerManager(category: MANAGER_CATEGORY_enum, manager: IBaseManager): void;
    unregisterManager(category: MANAGER_CATEGORY_enum): void;
    getManager<T extends IBaseManager>(category: MANAGER_CATEGORY_enum): T | undefined;
    getAllManagers(): Map<MANAGER_CATEGORY_enum, IBaseManager>;

    // Enhanced service registration
    registerService(
        config: IServiceConfig, 
        manager: IBaseManager,
        options?: IServiceRegistrationOptions
    ): Promise<IServiceRegistrationResult>;
    
    unregisterService(name: string): Promise<void>;
    getService(name: string): Promise<IServiceRegistration | undefined>;
    getAllServices(): Promise<IServiceRegistration[]>;

    // Service discovery
    discoverServices(query: IServiceDiscoveryQuery): Promise<IServiceDiscoveryResult>;
    findServicesByCategory(category: MANAGER_CATEGORY_enum): Promise<IServiceRegistration[]>;
    findServicesByFeature(feature: string): Promise<IServiceRegistration[]>;
    
    // Health monitoring
    checkServiceHealth(name: string): Promise<IServiceHealthCheckResult>;
    getServiceHealth(name: string): Promise<IServiceRegistration['metadata']['health']>;
    monitorService(name: string, intervalMs: number): Promise<void>;
    stopMonitoring(name: string): Promise<void>;
    
    // Version management
    getServiceVersion(name: string): Promise<string>;
    validateServiceVersion(name: string, version: string): Promise<boolean>;
    checkVersionCompatibility(
        service: string,
        dependency: string
    ): Promise<{ compatible: boolean; constraint?: string }>;
    
    // Dependency management
    resolveDependencies(config: IServiceConfig): Promise<IServiceDependencyResult>;
    validateDependencies(name: string): Promise<boolean>;
    getDependencyGraph(name: string): Promise<{
        required: string[];
        optional: string[];
        dependents: string[];
    }>;

    // Event handling
    on(event: SERVICE_EVENT_TYPE_enum, handler: (data: any) => void): void;
    off(event: SERVICE_EVENT_TYPE_enum, handler: (data: any) => void): void;
}
