/**
 * @file agent.ts
 * @path src/utils/types/store/agent.ts
 * @description Agent store types and interfaces for agent state management
 */

import type { BaseStoreState } from './base';
import type { BaseMessage } from "@langchain/core/messages";
import type { Tool } from "langchain/tools";
import type { AGENT_STATUS_enum, TASK_STATUS_enum } from '../common/enums';
import type { ErrorType } from '../common/errors';
import type { ParsedOutput } from '../llm';
import type { ThinkingResult } from '../agent/handlers';
import type { AgenticLoopResult } from '../llm';
import type { 
    AgentType,
    TaskType,
    Output,
    LLMUsageStats,
} from '@/utils/types';

/**
 * Agent runtime state
 */
export interface AgentRuntimeState {
    /** Current active agent */
    currentAgent: AgentType | null;
    
    /** Current task being processed */
    currentTask: TaskType | null;
    
    /** Last encountered error */
    lastError: Error | null;
    
    /** Current agent status */
    status: keyof typeof AGENT_STATUS_enum;
}

/**
 * Agent execution metrics
 */
export interface AgentExecutionMetrics {
    /** LLM usage stats */
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

/**
 * Agent execution context
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

/**
 * Agent store state interface
 */
export interface AgentStoreState extends BaseStoreState {
    /** Runtime state */
    runtime: AgentRuntimeState;
    
    /** Execution metrics */
    stats: AgentExecutionMetrics;
}

/**
 * Agent thinking parameters
 */
export interface AgentThinkingParams {
    /** Agent instance */
    agent: AgentType;
    
    /** Current task */
    task: TaskType;
    
    /** Message history */
    messages?: BaseMessage[];
    
    /** LLM output */
    output?: Output;
}

/**
 * Agent iteration parameters
 */
export interface AgentIterationParams {
    /** Agent instance */
    agent: AgentType;
    
    /** Current task */
    task: TaskType;
    
    /** Current iteration */
    iterations: number;
    
    /** Maximum iterations */
    maxAgentIterations: number;
}

/**
 * Tool execution parameters
 */
export interface ToolExecutionParams {
    /** Agent instance */
    agent: AgentType;
    
    /** Current task */
    task: TaskType;
    
    /** Tool to execute */
    tool: Tool;
    
    /** Tool input */
    input: string;
    
    /** Tool result */
    result?: string;
    
    /** Execution error */
    error?: Error;
    
    /** Execution context */
    context?: Record<string, unknown>;
}

/**
 * Agent store actions interface
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
     * Handle agent thinking
     */
    handleAgentThinking: (
        params: AgentThinkingParams
    ) => Promise<ThinkingResult>;

    /**
     * Handle iteration start
     */
    handleIterationStart: (
        params: AgentIterationParams
    ) => void;

    /**
     * Handle iteration end
     */
    handleIterationEnd: (
        params: AgentIterationParams
    ) => void;

    /**
     * Handle tool execution
     */
    handleToolExecution: (
        params: ToolExecutionParams
    ) => Promise<string>;

    /**
     * Handle tool error
     */
    handleToolError: (
        params: ToolExecutionParams
    ) => string;

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

/**
 * Agent execution result
 */
export interface AgentExecutionResult {
    /** Success flag */
    success: boolean;
    
    /** Execution result */
    result?: AgenticLoopResult;
    
    /** Error if failed */
    error?: ErrorType;
    
    /** Execution stats */
    stats?: {
        duration: number;
        iterationCount: number;
        llmUsageStats: LLMUsageStats;
    };
    
    /** Execution context */
    context?: AgentExecutionContext;
}

/**
 * Agent selection criteria
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

/**
 * Type guards for agent store types
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
            'stats' in value &&
            AgentStoreTypeGuards.isAgentStoreState(value)
        );
    },

    /**
     * Check if value is AgentExecutionResult
     */
    isAgentExecutionResult: (value: unknown): value is AgentExecutionResult => {
        if (typeof value !== 'object' || value === null) return false;
        const result = value as Partial<AgentExecutionResult>;
        return typeof result.success === 'boolean';
    },

    /**
     * Check if value is AgentExecutionContext
     */
    isAgentExecutionContext: (value: unknown): value is AgentExecutionContext => {
        if (typeof value !== 'object' || value === null) return false;
        const context = value as Partial<AgentExecutionContext>;
        return (
            typeof context.startTime === 'number' &&
            typeof context.totalExecutions === 'number' &&
            typeof context.consecutiveFailures === 'number' &&
            typeof context.totalDuration === 'number'
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
            'handleToolExecution' in value
        );
    }
};