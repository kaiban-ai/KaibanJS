/**
 * @file agentManagerTypes.ts
 * @description Type definitions for agent-related managers with enhanced type safety and categorization
 * 
 * @module @types/agent
 */

import { BaseMessage } from '@langchain/core/messages';
import { Tool } from '@langchain/core/tools';
import { 
    IHandlerResult, 
    IBaseHandlerMetadata 
} from '../common/baseTypes';
import { IAgentType, IReactChampionAgent } from './agentBaseTypes';
import { IAgentConfig } from './agentConfigTypes';
import { ITaskType } from '../task/taskBaseTypes';
import { IErrorType } from '../common/errorTypes';
import { 
    IThinkingResult, 
    IThinkingHandlerResult
} from './agentHandlersTypes';
import { IIterationContext, IIterationHandlerResult } from './agentIterationTypes';
import { 
    ILoopHandlerResult,
    ILoopResult 
} from './agentExecutionFlow';
import { ILLMUsageMetrics } from '../llm/llmMetricTypes';
import { ILLMValidationResult } from '../llm/llmValidationTypes';
import { IToolHandlerResult } from '../tool/toolHandlerTypes';
import { 
    MANAGER_CATEGORY_enum,
    SERVICE_STATUS_enum,
    SERVICE_EVENT_TYPE_enum,
    AGENT_STATUS_enum
} from '../common/enumTypes';

// Re-export enums
export { 
    MANAGER_CATEGORY_enum,
    SERVICE_STATUS_enum,
    SERVICE_EVENT_TYPE_enum,
    AGENT_STATUS_enum
} from '../common/enumTypes';

// ─── Service Types ────────────────────────────────────────────────────────────

/**
 * Service configuration interface
 */
export interface IServiceConfig {
    name: string;
    version: string;
    description?: string;
    dependencies?: string[];
    optionalDependencies?: string[];
    features?: string[];
    settings?: Record<string, unknown>;
}

/**
 * Service metadata interface
 */
export interface IServiceMetadata {
    id: string;
    name: string;
    version: string;
    status: SERVICE_STATUS_enum;
    features: string[];
    dependencies: string[];
    health: {
        status: SERVICE_STATUS_enum;
        lastCheck: number;
        details: IHealthDetails;
    };
    metrics: {
        uptime: number;
        requestCount: number;
        errorCount: number;
        lastActivity: number;
    };
}

/**
 * Service registration interface
 */
export interface IServiceRegistration {
    config: IServiceConfig;
    metadata: IServiceMetadata;
    instance: unknown;
}

/**
 * Service discovery query interface
 */
export interface IServiceDiscoveryQuery {
    name?: string;
    version?: string;
    feature?: string;
    status?: SERVICE_STATUS_enum;
    dependency?: string;
}

/**
 * Service discovery result interface
 */
export interface IServiceDiscoveryResult {
    services: IServiceRegistration[];
    total: number;
    timestamp: number;
}

/**
 * Health check details interface
 */
export interface IHealthDetails {
    status: SERVICE_STATUS_enum;
    message?: string;
    timestamp: number;
    checks: {
        [key: string]: {
            status: SERVICE_STATUS_enum;
            message?: string;
            lastCheck: number;
        };
    };
    metrics: {
        uptime: number;
        memory: {
            used: number;
            total: number;
        };
        cpu: {
            usage: number;
            load: number;
        };
    };
}

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
 * Extends IBaseHandlerMetadata to maintain consistency with the handler pattern
 */
export interface IBaseManagerMetadata extends IBaseHandlerMetadata {
    category: MANAGER_CATEGORY_enum;
    operation: string;
    duration: number;
    status: 'success' | 'failure' | 'partial';
    agent: {
        id: string;
        name: string;
        role: string;
        status: AGENT_STATUS_enum;
        metrics?: {
            iterations?: number;
            executionTime?: number;
            llmMetrics?: string;
        };
    };
}

/**
 * Base manager interface that all managers must implement
 * Uses IHandlerResult for consistent result handling across the system
 */
export interface IBaseManager<T = unknown> {
    readonly category: MANAGER_CATEGORY_enum;
    initialize(): Promise<void>;
    validate(params: T): Promise<boolean>;
    getMetadata(): IBaseManagerMetadata;
}

// ─── Core Managers ───────────────────────────────────────────────────────────

/**
 * Agent manager interface for handling agent lifecycle and operations
 */
export interface IAgentManager extends IBaseManager {
    initialize(metadata?: IBaseManagerMetadata): Promise<void>;
    getAgentById(id: string): IAgentType | undefined;
    createAgent(config: IAgentConfig): Promise<IAgentType>;
    removeAgent(id: string): Promise<void>;
    updateAgent(id: string, config: Partial<IAgentConfig>): Promise<IAgentType>;
    getAllAgents(): IAgentType[];
    getActiveAgents(): IAgentType[];
}

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

// ... rest of the file remains unchanged ...

export default IAgentManager;
