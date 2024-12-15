/**
 * @file workflowSyncTypes.ts
 * @description Types for workflow synchronization and advanced routing
 */

import type { IWorkflowState } from './workflowStateTypes';
import type { IChainStepConfig } from './workflowTypes';

/**
 * Workflow synchronization lock
 */
export interface IWorkflowLock {
    readonly id: string;
    readonly workflowId: string;
    readonly resourceId: string;
    readonly acquiredAt: number;
    readonly expiresAt: number;
    readonly type: 'exclusive' | 'shared';
}

/**
 * Workflow synchronization metrics
 */
export interface IWorkflowSyncMetrics {
    readonly lockContentionCount: number;
    readonly averageWaitTime: number;
    readonly maxWaitTime: number;
    readonly resourceUtilization: {
        readonly [resourceId: string]: number;
    };
    readonly timestamp: number;
}

/**
 * Advanced routing condition
 */
export interface IRoutingCondition {
    readonly type: 'value' | 'error' | 'resource' | 'custom';
    readonly field?: string;
    readonly operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'matches';
    readonly value: any;
    readonly priority?: number;
}

/**
 * Routing rule
 */
export interface IRoutingRule {
    readonly id: string;
    readonly conditions: IRoutingCondition[];
    readonly targetStepId: string;
    readonly priority: number;
    readonly metadata?: Record<string, any>;
}

/**
 * Routing path
 */
export interface IRoutingPath {
    readonly id: string;
    readonly sourceStepId: string;
    readonly targetStepId: string;
    readonly rules: IRoutingRule[];
    readonly type: 'sequential' | 'parallel' | 'conditional';
    readonly metadata?: Record<string, any>;
}

/**
 * Routing result
 */
export interface IRoutingResult {
    readonly pathId: string;
    readonly sourceStepId: string;
    readonly targetStepId: string;
    readonly matchedRules: string[];
    readonly timestamp: number;
    readonly metadata?: Record<string, any>;
}

/**
 * Extended step configuration with routing
 */
export interface IRoutableStepConfig extends IChainStepConfig {
    readonly incomingPaths?: IRoutingPath[];
    readonly outgoingPaths?: IRoutingPath[];
    readonly routingRules?: IRoutingRule[];
}

/**
 * Workflow synchronization options
 */
export interface IWorkflowSyncOptions {
    readonly lockTimeout: number;
    readonly maxRetries: number;
    readonly retryDelay: number;
    readonly resourcePriorities: {
        readonly [resourceId: string]: number;
    };
}

/**
 * Workflow synchronization state
 */
export interface IWorkflowSyncState {
    readonly activeLocks: IWorkflowLock[];
    readonly pendingLocks: IWorkflowLock[];
    readonly metrics: IWorkflowSyncMetrics;
    readonly timestamp: number;
}

/**
 * Extended workflow state with synchronization
 */
export interface ISynchronizedWorkflowState extends IWorkflowState {
    readonly syncState: IWorkflowSyncState;
    readonly routingHistory: IRoutingResult[];
}
