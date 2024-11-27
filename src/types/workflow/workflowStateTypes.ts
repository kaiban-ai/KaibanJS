import { IAgentType } from '../agent/agentBaseTypes';
import { ITaskType } from '../task/taskBaseTypes';
import { IStandardCostDetails } from '../common/commonMetricTypes';
import { 
    IWorkflowPerformanceMetrics,
    IWorkflowResourceMetrics,
    IWorkflowUsageMetrics 
} from './workflowMetricTypes';

/**
 * Workflow step configuration
 */
export interface IStepConfig {
    id: string;
    name: string;
    description?: string;
    dependencies: string[];
    requiredAgentType?: string;
    timeout?: number;
    retryCount?: number;
    metadata?: Record<string, unknown>;
}

/**
 * Workflow step result
 */
export interface IStepResult {
    stepId: string;
    startTime: number;
    endTime?: number;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
    agentId?: string;
    result?: unknown;
    error?: Error;
    metrics?: {
        duration: number;
        retries: number;
        resourceUsage: {
            cpu: number;
            memory: number;
        };
    };
}

/**
 * Combined workflow metrics
 */
export interface IWorkflowMetrics {
    performance: IWorkflowPerformanceMetrics;
    resources: IWorkflowResourceMetrics;
    usage: IWorkflowUsageMetrics;
    timestamp: number;
}

/**
 * Workflow state
 */
export interface IWorkflowState {
    id: string;
    name: string;
    workflowId: string;
    status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
    steps: IStepConfig[];
    currentStepIndex: number;
    stepResults: Record<string, IStepResult>;
    assignedAgents: Record<string, IAgentType>;
    pendingTasks: ITaskType[];
    activeTasks: ITaskType[];
    completedTasks: ITaskType[];
    errors: Error[];
    agents: IAgentType[];
    tasks: ITaskType[];
    workflowLogs: Array<{
        timestamp: number;
        level: 'info' | 'warn' | 'error';
        message: string;
        metadata?: Record<string, unknown>;
    }>;
    costDetails: IStandardCostDetails;
    metadata: Record<string, unknown>;
    metrics: IWorkflowMetrics;
}

/**
 * Workflow state snapshot
 */
export interface IWorkflowStateSnapshot {
    timestamp: number;
    version: string;
    state: IWorkflowState;
    metadata: {
        snapshotId: string;
        reason: string;
        triggeredBy: string;
        previousSnapshotId?: string;
    };
}

/**
 * Workflow state update
 */
export interface IWorkflowStateUpdate {
    status?: IWorkflowState['status'];
    currentStepIndex?: number;
    stepResults?: Record<string, IStepResult>;
    assignedAgents?: Record<string, IAgentType>;
    pendingTasks?: ITaskType[];
    activeTasks?: ITaskType[];
    completedTasks?: ITaskType[];
    errors?: Error[];
    agents?: IAgentType[];
    tasks?: ITaskType[];
    workflowLogs?: IWorkflowState['workflowLogs'];
    costDetails?: IStandardCostDetails;
    metadata?: Record<string, unknown>;
    metrics?: IWorkflowMetrics;
}

/**
 * Workflow state validation result
 */
export interface IWorkflowStateValidation {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    metadata: {
        timestamp: number;
        duration: number;
        validatorName: string;
    };
}

/**
 * Workflow state recovery options
 */
export interface IWorkflowStateRecoveryOptions {
    snapshotId?: string;
    timestamp?: number;
    version?: string;
    strategy: 'latest' | 'specific' | 'timestamp' | 'version';
    validation?: {
        skipValidation?: boolean;
        ignoreWarnings?: boolean;
        customValidators?: Array<(state: IWorkflowState) => IWorkflowStateValidation>;
    };
    cleanup?: {
        removeOrphanedTasks?: boolean;
        cleanupIncompleteSteps?: boolean;
        resetFailedSteps?: boolean;
    };
}

/**
 * Workflow state recovery result
 */
export interface IWorkflowStateRecoveryResult {
    success: boolean;
    state?: IWorkflowState;
    snapshot?: IWorkflowStateSnapshot;
    validation?: IWorkflowStateValidation;
    error?: Error;
    metadata: {
        timestamp: number;
        duration: number;
        strategy: IWorkflowStateRecoveryOptions['strategy'];
        snapshotId?: string;
        previousState?: {
            status: IWorkflowState['status'];
            currentStepIndex: number;
            errors: Error[];
        };
    };
}
