/**
 * @file store.ts
 * @path src/utils/types/agent/store.ts
 * @description Agent store types and interfaces for managing agent state and operations
 */

import type { BaseStoreState } from '../store/base';
import type { AGENT_STATUS_enum } from '../common/enums';
import type { AgentType } from './base';
import type { TaskType } from '../task/base';
import type { Output, ParsedOutput, LLMUsageStats } from '../llm/responses';
import type { ThinkingResult } from './handlers';
import type { AgenticLoopResult } from '../llm/instance';

// ─── Agent Runtime State ────────────────────────────────────────────────────────

/**
 * Runtime state for agent operations
 */
export interface AgentRuntimeState {
    /** Currently active agent */
    currentAgent: AgentType | null;
    
    /** Current task being processed */
    currentTask: TaskType | null;
    
    /** Last encountered error */
    lastError: Error | null;
    
    /** Current agent status */
    status: keyof typeof AGENT_STATUS_enum;
}

// ─── Agent Execution Metrics ──────────────────────────────────────────────────

/**
 * Metrics for agent execution
 */
export interface AgentExecutionMetrics {
    /** LLM usage statistics */
    llmUsageStats: LLMUsageStats;
    
    /** Total iterations */
    iterationCount: number;
    
    /** Total API calls */
    totalCalls: number;
    
    /** Error count */
    errorCount: number;
    
    /** Average latency */
    averageLatency: number;
    
    /** Cost details */
    costDetails: {
        inputCost: number;
        outputCost: number;
        totalCost: number;
        currency: string;
        breakdown: {
            promptTokens: { count: number; cost: number };
            completionTokens: { count: number; cost: number };
        };
    };
}

// ─── Agent Execution Context ──────────────────────────────────────────────────

/**
 * Context for agent execution
 */
export interface AgentExecutionContext {
    /** Execution start time */
    startTime: number;
    
    /** Total executions */
    totalExecutions: number;
    
    /** Consecutive failures */
    consecutiveFailures: number;
    
    /** Total execution duration */
    totalDuration: number;
    
    /** Last success timestamp */
    lastSuccessTime?: number;
    
    /** Last error timestamp */
    lastErrorTime?: number;
    
    /** Last error */
    lastError?: Error;
    
    /** Context metadata */
    metadata?: Record<string, unknown>;
}

// ─── Agent Store State ─────────────────────────────────────────────────────────

/**
 * Complete agent store state
 */
export interface AgentStoreState extends BaseStoreState {
    /** Runtime state */
    runtime: AgentRuntimeState;
    
    /** Execution metrics */
    stats: AgentExecutionMetrics;
}

// ─── Agent Store Actions ────────────────────────────────────────────────────────

/**
 * Available agent store actions
 */
export interface AgentStoreActions {
    /**
     * Handle agent status change
     */
    handleAgentStatusChange: (
        agent: AgentType,
        status: keyof typeof AGENT_STATUS_enum
    ) => void;

    /**
     * Handle agent thinking process
     */
    handleAgentThinking: (params: {
        agent: AgentType;
        task: TaskType;
        messages?: any[];
        output?: Output;
    }) => Promise<ThinkingResult>;

    /**
     * Handle iteration start
     */
    handleIterationStart: (params: {
        agent: AgentType;
        task: TaskType;
        iterations: number;
        maxAgentIterations: number;
    }) => void;

    /**
     * Handle iteration end
     */
    handleIterationEnd: (params: {
        agent: AgentType;
        task: TaskType;
        iterations: number;
        maxAgentIterations: number;
    }) => void;

    /**
     * Handle final answer
     */
    handleFinalAnswer: (params: {
        agent: AgentType;
        task: TaskType;
        parsedLLMOutput: ParsedOutput;
    }) => ParsedOutput;

    /**
     * Handle agent output
     */
    handleAgentOutput: (params: {
        agent: AgentType;
        task: TaskType;
        output: Output;
        type: 'thought' | 'observation' | 'finalAnswer' | 'selfQuestion' | 'weird';
    }) => void;
}

// ─── Agent Execution Result ──────────────────────────────────────────────────

/**
 * Result of agent execution
 */
export interface AgentExecutionResult {
    /** Success flag */
    success: boolean;
    
    /** Execution result */
    result?: AgenticLoopResult;
    
    /** Error if failed */
    error?: Error;
    
    /** Execution stats */
    stats?: {
        duration: number;
        iterationCount: number;
        llmUsageStats: LLMUsageStats;
    };
    
    /** Execution context */
    context?: AgentExecutionContext;
}

// ─── Agent Selection Criteria ────────────────────────────────────────────────

/**
 * Criteria for agent selection
 */
export interface AgentSelectionCriteria {
    /** Required role */
    role?: string;
    
    /** Required tools */
    tools?: string[];
    
    /** Required capabilities */
    capabilities?: string[];
    
    /** Preferred models */
    preferredModels?: string[];
    
    /** Cost constraints */
    costConstraints?: {
        maxCostPerTask?: number;
        maxTotalCost?: number;
    };
}

// ─── Type Guards ────────────────────────────────────────────────────────────────

/**
 * Type guards for agent store
 */
export const AgentStoreTypeGuards = {
    /**
     * Check if value is AgentStoreState
     */
    isAgentStoreState: (value: unknown): value is AgentStoreState => {
        return (
            typeof value === 'object' &&
            value !== null &&
            'runtime' in value &&
            'stats' in value
        );
    },

    /**
     * Check if value is AgentExecutionResult
     */
    isAgentExecutionResult: (value: unknown): value is AgentExecutionResult => {
        return (
            typeof value === 'object' &&
            value !== null &&
            'success' in value
        );
    },

    /**
     * Check if value is AgentExecutionContext
     */
    isAgentExecutionContext: (value: unknown): value is AgentExecutionContext => {
        return (
            typeof value === 'object' &&
            value !== null &&
            'startTime' in value &&
            'totalExecutions' in value &&
            'consecutiveFailures' in value &&
            'totalDuration' in value
        );
    },

    /**
     * Check if value has agent store actions
     */
    hasAgentStoreActions: (value: unknown): value is AgentStoreActions => {
        return (
            typeof value === 'object' &&
            value !== null &&
            'handleAgentStatusChange' in value &&
            'handleAgentThinking' in value &&
            'handleAgentOutput' in value
        );
    }
};