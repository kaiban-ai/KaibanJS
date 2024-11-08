/**
 * @file store.ts
 * @path src/utils/types/workflow/store.ts
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

/**
 * Current runtime state of workflow
 */
export interface WorkflowRuntimeState {
    /** Current workflow status */
    status: keyof typeof WORKFLOW_STATUS_enum;
    /** Current workflow result */
    result: WorkflowResult | null;
    /** Workflow start timestamp */
    startTime?: number;
    /** Workflow end timestamp */
    endTime?: number;
    /** Workflow duration */
    duration?: number;
    /** Last encountered error */
    lastError?: ErrorType;
}

// ─── Workflow Statistics ────────────────────────────────────────────────────────

/**
 * Workflow execution statistics
 */
export interface WorkflowExecutionStats {
    /** Task-related statistics */
    taskStats: {
        total: number;
        completed: number;
        failed: number;
        blocked: number;
    };
    /** Resource utilization */
    resources: {
        memory: number;
        cpu: number;
        tokens: number;
    };
    /** Cost breakdown */
    costs: {
        current: number;
        projected: number;
        breakdown: CostDetails;
    };
    /** Performance metrics */
    performance: {
        averageTaskTime: number;
        averageAgentResponse: number;
        throughput: number;
    };
}

// ─── Workflow Progress ─────────────────────────────────────────────────────────

/**
 * Workflow progress tracking
 */
export interface WorkflowProgress {
    /** Completion percentage */
    percentage: number;
    /** Currently active tasks */
    activeTasks: TaskType[];
    /** Tasks waiting to be processed */
    pendingTasks: TaskType[];
    /** Completed tasks */
    completedTasks: TaskType[];
    /** Blocked tasks */
    blockedTasks: TaskType[];
}

// ─── Workflow Store State ──────────────────────────────────────────────────────

/**
 * Complete workflow store state
 */
export interface WorkflowState extends BaseStoreState {
    /** Runtime state */
    runtime: WorkflowRuntimeState;
    /** Execution statistics */
    stats: WorkflowExecutionStats;
    /** Progress tracking */
    progress: WorkflowProgress;
    /** Additional context */
    context: string;
    /** Environment variables */
    env: Record<string, unknown>;
}

// ─── Workflow Actions ─────────────────────────────────────────────────────────

/**
 * Action parameters for workflow operations
 */
export interface WorkflowActionParams<T = unknown> {
    /** Target task */
    task?: TaskType;
    /** Associated agent */
    agent?: AgentType;
    /** Action data */
    data?: T;
    /** Action context */
    context?: Record<string, unknown>;
    /** Additional metadata */
    metadata?: Record<string, unknown>;
}

/**
 * Result of workflow action execution
 */
export interface WorkflowActionResult<T = unknown> {
    /** Success indicator */
    success: boolean;
    /** Result data */
    data?: T;
    /** Error if action failed */
    error?: ErrorType;
    /** Additional metadata */
    metadata?: Record<string, unknown>;
    /** Workflow statistics */
    stats?: Partial<WorkflowStats>;
}

/**
 * Available workflow actions
 */
export interface WorkflowActions {
    /** Start workflow execution */
    startWorkflow: (inputs?: Record<string, unknown>) => Promise<WorkflowActionResult>;
    /** Pause workflow execution */
    pauseWorkflow: (reason?: string) => Promise<WorkflowActionResult>;
    /** Resume workflow execution */
    resumeWorkflow: () => Promise<WorkflowActionResult>;
    /** Handle workflow completion */
    handleWorkflowComplete: (result: WorkflowResult) => Promise<WorkflowActionResult>;
    /** Handle workflow error */
    handleWorkflowError: (error: ErrorType) => Promise<WorkflowActionResult>;
    /** Handle task status change */
    handleTaskStatusChange: (
        taskId: string,
        status: keyof typeof TASK_STATUS_enum,
        metadata?: Record<string, unknown>
    ) => Promise<WorkflowActionResult>;
    /** Add workflow log */
    addWorkflowLog: (log: Log) => void;
    /** Update workflow statistics */
    updateWorkflowStats: (stats: Partial<WorkflowStats>) => void;
}

// ─── Configuration Types ───────────────────────────────────────────────────────

/**
 * Workflow store configuration
 */
export interface WorkflowStoreConfig extends StoreConfig {
    /** Maximum concurrent tasks */
    maxConcurrentTasks?: number;
    /** Task execution timeout */
    taskTimeout?: number;
    /** Progress check interval */
    progressCheckInterval?: number;
    /** Maximum task retries */
    maxTaskRetries?: number;
    /** Cost thresholds */
    costLimits?: {
        warning: number;
        critical: number;
    };
}

/**
 * Workflow validation rules
 */
export interface WorkflowValidationRules {
    /** Required task fields */
    requiredTaskFields?: string[];
    /** Required agent fields */
    requiredAgentFields?: string[];
    /** Custom validators */
    validators?: Array<(state: WorkflowState) => boolean>;
    /** Cost thresholds */
    costThresholds?: {
        warning: number;
        critical: number;
    };
}

// ─── Type Guards ────────────────────────────────────────────────────────────────

/**
 * Type guards for workflow store
 */
export const WorkflowStoreTypeGuards = {
    /**
     * Check if value is workflow state
     */
    isWorkflowState: (value: unknown): value is WorkflowState => (
        typeof value === 'object' && value !== null &&
        'runtime' in value && 'stats' in value && 'progress' in value &&
        'context' in value && 'env' in value
    ),

    /**
     * Check if value is workflow event
     */
    isWorkflowEvent: (value: unknown): value is WorkflowActionResult => (
        typeof value === 'object' && value !== null &&
        'success' in value &&
        ('data' in value || 'error' in value)
    ),

    /**
     * Check if has workflow actions
     */
    hasWorkflowActions: (value: unknown): value is WorkflowActions => (
        typeof value === 'object' && value !== null &&
        'startWorkflow' in value && 'pauseWorkflow' in value &&
        'resumeWorkflow' in value && 'handleWorkflowComplete' in value &&
        'handleWorkflowError' in value
    )
};