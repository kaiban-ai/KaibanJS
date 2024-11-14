/**
 * @file store.ts
 * @path KaibanJS/src/utils/types/workflow/store.ts
 * @description Workflow store types and interfaces
 */

import type { BaseStoreState, StoreConfig } from '../store/base';
import type { WORKFLOW_STATUS_enum, TASK_STATUS_enum } from '../common/enums';
import type { ErrorType } from '../common/errors';
import type { TaskType } from '../task/base';
import type { AgentType } from '../agent/base';
import type { Log } from '../team/logs';
import type { WorkflowStats } from './stats';
import type { WorkflowResult } from './base';
import type { CostDetails } from './costs';

// ─── Workflow Runtime State ──────────────────────────────────────────────────────

export interface WorkflowRuntimeState {
    status: keyof typeof WORKFLOW_STATUS_enum;
    result: WorkflowResult | null;
    startTime?: number;
    endTime?: number;
    duration?: number;
    lastError?: ErrorType;
}

// ─── Workflow Statistics ────────────────────────────────────────────────────────

export interface WorkflowExecutionStats {
    taskStats: {
        total: number;
        completed: number;
        failed: number;
        blocked: number;
    };
    resources: {
        memory: number;
        cpu: number;
        tokens: number;
    };
    costs: {
        current: number;
        projected: number;
        breakdown: CostDetails;
    };
    performance: {
        averageTaskTime: number;
        averageAgentResponse: number;
        throughput: number;
    };
}

// ─── Workflow Progress ─────────────────────────────────────────────────────────

export interface WorkflowProgress {
    percentage: number;
    activeTasks: TaskType[];
    pendingTasks: TaskType[];
    completedTasks: TaskType[];
    blockedTasks: TaskType[];
}

// ─── Workflow Store State ──────────────────────────────────────────────────────

export interface WorkflowState extends BaseStoreState {
    runtime: WorkflowRuntimeState;
    stats: WorkflowExecutionStats;
    progress: WorkflowProgress;
    context: string;
    env: Record<string, unknown>;
}

// ─── Workflow Actions ─────────────────────────────────────────────────────────

export interface WorkflowActionParams<T = unknown> {
    task?: TaskType;
    agent?: AgentType;
    data?: T;
    context?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
}

export interface WorkflowActionResult<T = unknown> {
    success: boolean;
    data?: T;
    error?: ErrorType;
    metadata?: Record<string, unknown>;
    stats?: Partial<WorkflowStats>;
}

export interface WorkflowActions {
    startWorkflow: (inputs?: Record<string, unknown>) => Promise<WorkflowActionResult>;
    pauseWorkflow: (reason?: string) => Promise<WorkflowActionResult>;
    resumeWorkflow: () => Promise<WorkflowActionResult>;
    handleWorkflowComplete: (result: WorkflowResult) => Promise<WorkflowActionResult>;
    handleWorkflowError: (error: ErrorType) => Promise<WorkflowActionResult>;
    handleTaskStatusChange: (
        taskId: string,
        status: keyof typeof TASK_STATUS_enum,
        metadata?: Record<string, unknown>
    ) => Promise<WorkflowActionResult>;
    addWorkflowLog: (log: Log) => void;
    updateWorkflowStats: (stats: Partial<WorkflowStats>) => void;
}

// ─── Configuration Types ───────────────────────────────────────────────────────

export interface WorkflowStoreConfig extends StoreConfig {
    maxConcurrentTasks?: number;
    taskTimeout?: number;
    progressCheckInterval?: number;
    maxTaskRetries?: number;
    costLimits?: {
        warning: number;
        critical: number;
    };
}

export interface WorkflowValidationRules {
    requiredTaskFields?: string[];
    requiredAgentFields?: string[];
    validators?: Array<(state: WorkflowState) => boolean>;
    costThresholds?: {
        warning: number;
        critical: number;
    };
}

// ─── Workflow Execution Context ──────────────────────────────────────────────────

export interface WorkflowExecutionContext {
    totalExecutions: number;
    consecutiveFailures: number;
    totalDuration: number;
    startTime: number;
    lastSuccessTime?: number;
    lastErrorTime?: number;
    lastError?: Error;
  }

// ─── Type Guards ────────────────────────────────────────────────────────────────

export const WorkflowStoreTypeGuards = {
    isWorkflowState: (value: unknown): value is WorkflowState => (
        typeof value === 'object' && value !== null &&
        'runtime' in value && 'stats' in value && 'progress' in value &&
        'context' in value && 'env' in value
    ),

    isWorkflowEvent: (value: unknown): value is WorkflowActionResult => (
        typeof value === 'object' && value !== null &&
        'success' in value &&
        ('data' in value || 'error' in value)
    ),

    hasWorkflowActions: (value: unknown): value is WorkflowActions => (
        typeof value === 'object' && value !== null &&
        'startWorkflow' in value && 'pauseWorkflow' in value &&
        'resumeWorkflow' in value && 'handleWorkflowComplete' in value &&
        'handleWorkflowError' in value
    )
};

