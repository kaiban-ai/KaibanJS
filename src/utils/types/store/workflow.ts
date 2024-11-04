/**
 * @file workflow.ts
 * @path src/utils/types/store/workflow.ts
 * @description Workflow store types and interfaces for workflow state management
 */

import { type BaseStoreState, type StoreEvent, type StoreConfig, type StoreEventType, StoreTypeGuards } from './base';
import type { WORKFLOW_STATUS_enum, TASK_STATUS_enum } from '../common/enums';
import type { ErrorType } from '../common/errors';
import type { TaskType } from '../task';
import type { AgentType } from '../agent';
import type { Log } from '../team';
import type { WorkflowStats, WorkflowResult, WorkflowTypeGuards } from '../workflow';
import type { CostDetails } from '../workflow';

/**
 * Workflow runtime state
 */
export interface WorkflowRuntimeState {
    /** Current workflow status */
    status: keyof typeof WORKFLOW_STATUS_enum;
    
    /** Workflow result data */
    result: WorkflowResult | null;
    
    /** Start timestamp */
    startTime?: number;
    
    /** End timestamp */
    endTime?: number;
    
    /** Duration in milliseconds */
    duration?: number;
    
    /** Last error encountered */
    lastError?: ErrorType;
}

/**
 * Workflow execution stats
 */
export interface WorkflowExecutionStats {
    /** Task stats */
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
    
    /** Cost tracking */
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

/**
 * Workflow progress tracking
 */
export interface WorkflowProgress {
    /** Overall progress percentage */
    percentage: number;
    
    /** Currently active tasks */
    activeTasks: TaskType[];
    
    /** Tasks awaiting execution */
    pendingTasks: TaskType[];
    
    /** Completed tasks */
    completedTasks: TaskType[];
    
    /** Blocked or errored tasks */
    blockedTasks: TaskType[];
}

/**
 * Workflow state interface
 */
export interface WorkflowState extends BaseStoreState {
    /** Workflow runtime state */
    runtime: WorkflowRuntimeState;
    
    /** Execution statistics */
    stats: WorkflowExecutionStats;
    
    /** Progress tracking */
    progress: WorkflowProgress;
    
    /** Workflow context */
    context: string;
    
    /** Environment variables */
    env: Record<string, unknown>;
}

/**
 * Workflow event types that extend basic store events
 */
export type WorkflowEventType = StoreEventType |
    'workflow.start' |
    'workflow.pause' |
    'workflow.resume' |
    'workflow.complete' |
    'workflow.error' |
    'task.start' |
    'task.complete' |
    'task.error' |
    'task.block' |
    'agent.start' |
    'agent.complete' |
    'agent.error';

/**
 * Workflow event interface
 */
export interface WorkflowEvent extends Omit<StoreEvent, 'type' | 'data'> {
    /** Event type */
    type: WorkflowEventType;
    
    /** Event data */
    data: {
        task?: TaskType;
        agent?: AgentType;
        error?: ErrorType;
        stats?: Partial<WorkflowStats>;
        result?: WorkflowResult;
    };
}

/**
 * Workflow action parameters
 */
export interface WorkflowActionParams<T = unknown> {
    /** Target task */
    task?: TaskType;
    
    /** Executing agent */
    agent?: AgentType;
    
    /** Action data */
    data?: T;
    
    /** Action context */
    context?: Record<string, unknown>;
    
    /** Action metadata */
    metadata?: Record<string, unknown>;
}

/**
 * Workflow action result
 */
export interface WorkflowActionResult<T = unknown> {
    /** Success flag */
    success: boolean;
    
    /** Result data */
    data?: T;
    
    /** Error if failed */
    error?: ErrorType;
    
    /** Result metadata */
    metadata?: Record<string, unknown>;
    
    /** Execution stats */
    stats?: Partial<WorkflowStats>;
}

/**
 * Workflow store actions interface
 */
export interface WorkflowActions {
    /**
     * Start workflow execution
     */
    startWorkflow: (
        inputs?: Record<string, unknown>
    ) => Promise<WorkflowActionResult>;

    /**
     * Pause workflow execution
     */
    pauseWorkflow: (
        reason?: string
    ) => Promise<WorkflowActionResult>;

    /**
     * Resume workflow execution
     */
    resumeWorkflow: () => Promise<WorkflowActionResult>;

    /**
     * Handle workflow completion
     */
    handleWorkflowComplete: (
        result: WorkflowResult
    ) => Promise<WorkflowActionResult>;

    /**
     * Handle workflow error
     */
    handleWorkflowError: (
        error: ErrorType
    ) => Promise<WorkflowActionResult>;

    /**
     * Handle task status change
     */
    handleTaskStatusChange: (
        taskId: string,
        status: keyof typeof TASK_STATUS_enum,
        metadata?: Record<string, unknown>
    ) => Promise<WorkflowActionResult>;

    /**
     * Add workflow log
     */
    addWorkflowLog: (log: Log) => void;

    /**
     * Update workflow stats
     */
    updateWorkflowStats: (
        stats: Partial<WorkflowStats>
    ) => void;
}

/**
 * Workflow store configuration
 */
export interface WorkflowStoreConfig extends StoreConfig {
    /** Maximum concurrent tasks */
    maxConcurrentTasks?: number;
    
    /** Task timeout in milliseconds */
    taskTimeout?: number;
    
    /** Progress check interval */
    progressCheckInterval?: number;
    
    /** Maximum retries per task */
    maxTaskRetries?: number;
    
    /** Cost limits */
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

/**
 * Type guards for workflow store
 */
export const WorkflowStoreTypeGuards = {
    /**
     * Check if value is WorkflowState
     */
    isWorkflowState: (value: unknown): value is WorkflowState => {
        return (
            typeof value === 'object' &&
            value !== null &&
            'runtime' in value &&
            'stats' in value &&
            'progress' in value &&
            'context' in value &&
            'env' in value &&
            StoreTypeGuards.isBaseStoreState(value)
        );
    },

    /**
     * Check if value is WorkflowEvent
     */
    isWorkflowEvent: (value: unknown): value is WorkflowEvent => {
        if (typeof value !== 'object' || value === null) return false;
        const event = value as Partial<WorkflowEvent>;
        return (
            typeof event.type === 'string' &&
            (event.type.startsWith('workflow.') ||
             event.type.startsWith('task.') ||
             event.type.startsWith('agent.')) &&
            typeof event.timestamp === 'number' &&
            typeof event.data === 'object'
        );
    },

    /**
     * Check if value has workflow actions
     */
    hasWorkflowActions: (value: unknown): value is WorkflowActions => {
        return (
            typeof value === 'object' &&
            value !== null &&
            'startWorkflow' in value &&
            'pauseWorkflow' in value &&
            'resumeWorkflow' in value &&
            'handleWorkflowComplete' in value &&
            'handleWorkflowError' in value
        );
    }
};