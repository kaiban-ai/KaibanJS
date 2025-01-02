/**
 * @file agentStateTypes.ts
 * @path src/types/agent/agentStateTypes.ts
 * @description Agent state type definitions
 */

import type { IBaseMetrics } from '../metrics/base/baseMetrics';
import type { AGENT_STATUS_enum } from '../common/enumTypes';
import type { ITaskType } from '../task';
import type { IAgentType } from './agentBaseTypes';
import type { IAgentMetrics } from './agentMetricTypes';

/**
 * State category enum
 */
export enum STATE_CATEGORY {
    CORE = 'core',
    ERROR = 'error',
    METRICS = 'metrics',
    VALIDATION = 'validation'
}

/**
 * State history entry interface
 */
export interface IStateHistoryEntry {
    readonly timestamp: Date;
    readonly action: string;
    readonly category: STATE_CATEGORY;
    readonly details: Record<string, unknown>;
}

/**
 * Agent task state interface
 */
export interface IAgentTaskState {
    readonly assignedTasks: ITaskType[];
    readonly completedTasks: ITaskType[];
    readonly failedTasks: ITaskType[];
    readonly blockedTasks: ITaskType[];
    readonly history: IStateHistoryEntry[];
}

/**
 * Agent state interface
 */
export interface IAgentState {
    readonly id: string;
    readonly status: AGENT_STATUS_enum;
    readonly timestamp: number;
    readonly metrics: IBaseMetrics;
    readonly history?: IStateHistoryEntry[];
    readonly lastOperation?: {
        readonly name: string;
        readonly timestamp: number;
        readonly duration: number;
        readonly success: boolean;
    };
    readonly errors?: Array<{
        readonly message: string;
        readonly timestamp: number;
        readonly type: string;
    }>;
}

/**
 * Agent state validation interface
 */
export interface IAgentStateValidation {
    readonly isValid: boolean;
    readonly errors: string[];
    readonly warnings: string[];
    readonly metadata: {
        readonly timestamp: number;
        readonly validatedFields: string[];
    };
}

/**
 * Agent state factory interface
 */
export interface IAgentStateFactory {
    createState(params: Record<string, unknown>): IAgentState;
    validateState(state: IAgentState): IAgentStateValidation;
}

/**
 * Agent state transition interface
 */
export interface IAgentStateTransition {
    readonly fromState: AGENT_STATUS_enum;
    readonly toState: AGENT_STATUS_enum;
    readonly timestamp: number;
    readonly reason?: string;
}

/**
 * Agent state history interface
 */
export interface IAgentStateHistory {
    readonly states: IAgentState[];
    readonly transitions: IAgentStateTransition[];
}

/**
 * Agent execution context interface
 */
export interface IAgentExecutionContext {
    readonly operation: string;
    readonly state: IAgentState;
    readonly taskState: IAgentTaskState;
    readonly validationResult?: IAgentStateValidation;
}

/**
 * Agent state snapshot interface for versioned state management
 */
export interface IAgentStateSnapshot {
    readonly timestamp: number;
    readonly agents: Map<string, IAgentType>;
    readonly activeAgents: Set<string>;
    readonly taskState: Map<string, IAgentTaskState>;
    readonly metrics: Map<string, IAgentMetrics>;
    readonly metadata: Record<string, unknown>;
}

/**
 * Agent state validation result interface
 */
export interface IAgentStateValidationResult extends IAgentStateValidation {
    readonly context?: {
        readonly taskId: string;
        readonly taskStatus: string;
        readonly validationTime: number;
    };
}

/**
 * Agent state metrics interface combining state and metrics information
 */
export interface IAgentStateMetrics extends IAgentState {
    readonly component: string;
    readonly category: string;
    readonly version: string;
    readonly currentState: AGENT_STATUS_enum;
    readonly stateTime: number;
    readonly transitionCount: number;
    readonly failedTransitions: number;
    readonly successfulTransitions: number;
    readonly averageStateDuration: number;
    readonly maxStateDuration: number;
    readonly minStateDuration: number;
    readonly stateHistory: IAgentStateTransition[];
    readonly errorRate: number;
    readonly successRate: number;
    readonly blockedTaskCount: number;
    readonly historyEntryCount: number;
    readonly lastHistoryUpdate: number;
    readonly taskStats: {
        completedCount: number;
        failedCount: number;
        averageDuration: number;
        successRate: number;
        averageIterations: number;
    };
    readonly averageTaskDuration: number;
    readonly maxTaskDuration: number;
    readonly minTaskDuration: number;
}
