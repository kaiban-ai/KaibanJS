/**
 * @file agentStateTypes.ts
 * @path KaibanJS/src/types/agent/agentStateTypes.ts
 * @description Agent state types and interfaces
 */

import type { IAgentType } from './agentBaseTypes';
import type { ITaskType } from '../task/taskBaseTypes';
import type { ILLMMetrics } from '../llm/llmMetricTypes';
import type { IAgentStateMetrics } from './agentMetricTypes';
import type { IBaseError } from '../common/errorTypes';
import type { IAgentResourceMetrics } from './agentMetricTypes';

// ─── State Categories ─────────────────────────────────────────────────────────

/**
 * Agent state categories for better organization and validation
 */
export enum STATE_CATEGORY {
    CORE = 'core',           // Core state properties
    TIMING = 'timing',       // Time-related state
    ERROR = 'error',         // Error handling state
    ASSIGNMENT = 'assignment', // Task assignment state
    METRICS = 'metrics',     // Metrics and measurements
    HISTORY = 'history'      // Historical state data
}

// ─── Core State Types ─────────────────────────────────────────────────────────

/**
 * Core state properties interface
 */
export interface ICoreState {
    status: string;
    thinking: boolean;
    busy: boolean;
    currentTask?: ITaskType;
    lastOutput?: string;
}

/**
 * Timing state properties interface
 */
export interface ITimingState {
    startTime?: Date;
    endTime?: Date;
    duration?: number;
    lastActiveTime?: Date;
    timeouts: {
        thinking: number;
        execution: number;
        idle: number;
    };
}

/**
 * Error handling state properties interface
 */
export interface IErrorState {
    lastError?: IBaseError;
    errorCount: number;
    retryCount: number;
    maxRetries: number;
    errorHistory: Array<{
        timestamp: Date;
        error: IBaseError;
        context: Record<string, unknown>;
    }>;
}

/**
 * Task assignment state properties interface
 */
export interface IAssignmentState {
    assignedTasks: ITaskType[];
    completedTasks: ITaskType[];
    failedTasks: ITaskType[];
    blockedTasks: ITaskType[];
    iterations: number;
    maxIterations: number;
    taskCapacity: number;
}

// ─── History and Transitions ────────────────────────────────────────────────────

/**
 * State history entry interface
 */
export interface IStateHistoryEntry {
    timestamp: Date;
    action: string;
    category: STATE_CATEGORY;
    details: Record<string, unknown>;
    taskId?: string;
    result?: unknown;
    metadata?: {
        duration?: number;
        success?: boolean;
        error?: IBaseError;
    };
}

/**
 * State transition interface
 */
export interface IStateTransition {
    from: string;
    to: string;
    timestamp: Date;
    reason: string;
    metadata?: Record<string, unknown>;
}

// ─── Unified Agent State ───────────────────────────────────────────────────────

/**
 * Unified agent execution state interface
 */
export interface IAgentExecutionState {
    // Core State
    readonly core: ICoreState;
    
    // Timing State
    readonly timing: ITimingState;
    
    // Error Handling State
    readonly error: IErrorState;
    
    // Assignment State
    readonly assignment: IAssignmentState;
    
    // Metrics and State
    readonly stateMetrics: IAgentStateMetrics;
    readonly llmMetrics: ILLMMetrics;

    // History
    readonly history: IStateHistoryEntry[];
    readonly transitions: IStateTransition[];
}

// ─── State Validation Types ─────────────────────────────────────────────────────

/**
 * State validation rules interface
 */
export interface IStateValidationRules {
    allowedTransitions: Map<string, string[]>;
    requiredFields: Record<STATE_CATEGORY, string[]>;
    constraints: Record<string, {
        type: string;
        validator?: (value: unknown) => boolean;
        message?: string;
    }>;
}

/**
 * State validation result interface
 */
export interface IStateValidationResult {
    isValid: boolean;
    errors: Array<{
        field: string;
        message: string;
        category: STATE_CATEGORY;
    }>;
    warnings: Array<{
        field: string;
        message: string;
        category: STATE_CATEGORY;
    }>;
}

// ─── Type Guards ────────────────────────────────────────────────────────────

export const AgentStateTypeGuards = {
    isAgentExecutionState: (value: unknown): value is IAgentExecutionState => {
        if (typeof value !== 'object' || value === null) return false;
        const state = value as Partial<IAgentExecutionState>;
        
        return (
            typeof state.core === 'object' &&
            typeof state.timing === 'object' &&
            typeof state.error === 'object' &&
            typeof state.assignment === 'object' &&
            typeof state.stateMetrics === 'object' &&
            typeof state.llmMetrics === 'object' &&
            Array.isArray(state.history) &&
            Array.isArray(state.transitions) &&
            state.core !== null &&
            state.timing !== null &&
            state.error !== null &&
            state.assignment !== null &&
            state.stateMetrics !== null &&
            state.llmMetrics !== null
        );
    },

    isCoreState: (value: unknown): value is ICoreState => {
        if (typeof value !== 'object' || value === null) return false;
        const state = value as Partial<ICoreState>;
        return (
            typeof state.status === 'string' &&
            typeof state.thinking === 'boolean' &&
            typeof state.busy === 'boolean'
        );
    },

    isTimingState: (value: unknown): value is ITimingState => {
        if (typeof value !== 'object' || value === null) return false;
        const state = value as Partial<ITimingState>;
        return (
            typeof state.timeouts === 'object' &&
            state.timeouts !== null &&
            typeof state.timeouts.thinking === 'number' &&
            typeof state.timeouts.execution === 'number' &&
            typeof state.timeouts.idle === 'number'
        );
    },

    isErrorState: (value: unknown): value is IErrorState => {
        if (typeof value !== 'object' || value === null) return false;
        const state = value as Partial<IErrorState>;
        return (
            typeof state.errorCount === 'number' &&
            typeof state.retryCount === 'number' &&
            typeof state.maxRetries === 'number' &&
            Array.isArray(state.errorHistory)
        );
    },

    isAssignmentState: (value: unknown): value is IAssignmentState => {
        if (typeof value !== 'object' || value === null) return false;
        const state = value as Partial<IAssignmentState>;
        return (
            Array.isArray(state.assignedTasks) &&
            Array.isArray(state.completedTasks) &&
            Array.isArray(state.failedTasks) &&
            Array.isArray(state.blockedTasks) &&
            typeof state.iterations === 'number' &&
            typeof state.maxIterations === 'number' &&
            typeof state.taskCapacity === 'number'
        );
    },

    isStateHistoryEntry: (value: unknown): value is IStateHistoryEntry => {
        if (typeof value !== 'object' || value === null) return false;
        const entry = value as Partial<IStateHistoryEntry>;
        return (
            entry.timestamp instanceof Date &&
            typeof entry.action === 'string' &&
            typeof entry.category === 'string' &&
            typeof entry.details === 'object' &&
            entry.details !== null
        );
    },

    isStateTransition: (value: unknown): value is IStateTransition => {
        if (typeof value !== 'object' || value === null) return false;
        const transition = value as Partial<IStateTransition>;
        return (
            typeof transition.from === 'string' &&
            typeof transition.to === 'string' &&
            transition.timestamp instanceof Date &&
            typeof transition.reason === 'string'
        );
    }
};
