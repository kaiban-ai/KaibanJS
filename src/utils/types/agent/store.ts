/**
 * @file store.ts
 * @path KaibanJS/src/utils/types/agent/store.ts 
 * @description Agent store types and interfaces for managing agent operations
 */

import type { AGENT_STATUS_enum } from '../common/enums';
import type { AgentType } from './base';
import type { TaskType } from '../task/base';
import type { Output, ParsedOutput, LLMUsageStats } from '../llm/responses';
import type { CostDetails } from '../workflow/costs';
import type { BaseStoreState } from '../store/base';
import type { ThinkingExecutionResult } from './handlers';
import type { AgenticLoopResult } from '../llm/instance';

// ─── Agent Runtime State ────────────────────────────────────────────────────────

export interface AgentRuntimeState {
    currentAgent: AgentType | null;
    currentTask: TaskType | null;
    lastError: Error | null;
    status: keyof typeof AGENT_STATUS_enum;
}

// ─── Agent Execution Metrics ──────────────────────────────────────────────────

export interface AgentExecutionMetrics {
    llmUsageStats: LLMUsageStats;
    iterationCount: number;
    totalCalls: number;
    errorCount: number;
    averageLatency: number;
    costDetails: CostDetails;
}

// ─── Agent Execution Context ──────────────────────────────────────────────────

export interface AgentExecutionContext {
    startTime: number;
    totalExecutions: number;
    consecutiveFailures: number;
    totalDuration: number;
    lastSuccessTime?: number;
    lastErrorTime?: number;
    lastError?: Error;
    metadata?: Record<string, unknown>;
}

// ─── Agent Store State ─────────────────────────────────────────────────────────

export interface AgentStoreState extends BaseStoreState {
    runtime: AgentRuntimeState;
    stats: AgentExecutionMetrics;
}

// ─── Agent Store Actions ────────────────────────────────────────────────────────

export interface AgentStoreActions {
    handleAgentStatusChange: (
        agent: AgentType,
        status: keyof typeof AGENT_STATUS_enum
    ) => void;

    handleAgentThinking: (params: {
        agent: AgentType;
        task: TaskType;
        messages?: any[];
        output?: Output;
    }) => Promise<ThinkingExecutionResult>;

    handleIterationStart: (params: {
        agent: AgentType;
        task: TaskType;
        iterations: number;
        maxAgentIterations: number;
    }) => void;

    handleIterationEnd: (params: {
        agent: AgentType;
        task: TaskType;
        iterations: number;
        maxAgentIterations: number;
    }) => void;

    handleFinalAnswer: (params: {
        agent: AgentType;
        task: TaskType;
        parsedLLMOutput: ParsedOutput;
    }) => ParsedOutput;

    handleAgentOutput: (params: {
        agent: AgentType;
        task: TaskType;
        output: Output;
        type: 'thought' | 'observation' | 'finalAnswer' | 'selfQuestion' | 'weird';
    }) => void;
}

// ─── Agent Execution Result ──────────────────────────────────────────────────

export interface AgentExecutionResult {
    success: boolean;
    result?: AgenticLoopResult;
    error?: Error;
    stats?: {
        duration: number;
        iterationCount: number;
        llmUsageStats: LLMUsageStats;
    };
    context?: AgentExecutionContext;
}

// ─── Agent Selection Criteria ────────────────────────────────────────────────

export interface AgentSelectionCriteria {
    role?: string;
    tools?: string[];
    capabilities?: string[];
    preferredModels?: string[];
    costConstraints?: {
        maxCostPerTask?: number;
        maxTotalCost?: number;
    };
}

// ─── Type Guards ────────────────────────────────────────────────────────────────

export const AgentStoreTypeGuards = {
    isAgentStoreState: (value: unknown): value is AgentStoreState => {
        return (
            typeof value === 'object' &&
            value !== null &&
            'runtime' in value &&
            'stats' in value
        );
    },

    isAgentExecutionResult: (value: unknown): value is AgentExecutionResult => {
        return (
            typeof value === 'object' &&
            value !== null &&
            'success' in value
        );
    },

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