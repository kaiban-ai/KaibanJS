/**
 * @file workflowStoreTypes.ts
 * @path KaibanJS/src/types/workflow/workflowStoreTypes.ts
 * @description Type definitions for workflow store and state management
 *
 * @module types/workflow
 */

import { WORKFLOW_STATUS_enum, TASK_STATUS_enum } from '../common/commonEnums';
import { IErrorType } from '../common/commonErrorTypes';
import type { IAgentType } from '../agent/agentBaseTypes';
import type { ITaskType } from '../task/taskBaseTypes';
import type { IStepResult, IStepConfig } from './workflowStepsTypes';
import type { 
    IResourceMetrics, 
    IUsageMetrics, 
    IPerformanceMetrics,
    IStandardCostDetails
} from '../common/commonMetricTypes';
import {
    IWorkflowError,
    IWorkflowSuccess,
    IWorkflowBlocked,
    IWorkflowErrored,
    IWorkflowResult,
    IWorkflowTypeGuards
} from './workflowBaseTypes';

// Re-export for convenience
export {
    IWorkflowError,
    IWorkflowSuccess,
    IWorkflowBlocked,
    IWorkflowErrored,
    IWorkflowResult,
    IWorkflowTypeGuards
};

// ─── Store Types ────────────────────────────────────────────────────────────
export interface IWorkflowState {
    // Core properties
    id: string;
    name: string;
    workflowId: string;
    status: keyof typeof WORKFLOW_STATUS_enum;
    
    // Step management
    steps: IStepConfig[];
    currentStepIndex: number;
    stepResults: Record<string, IStepResult>;
    
    // Agent management
    agents: IAgentType[];
    assignedAgents: Record<string, IAgentType>;
    
    // Task management
    tasks: ITaskType[];
    pendingTasks: ITaskType[];
    activeTasks: ITaskType[];
    completedTasks: ITaskType[];
    
    // Error handling
    errors: IErrorType[];
    
    // Logging and metrics
    workflowLogs: string[];
    metrics: {
        resources: IResourceMetrics;
        usage: IUsageMetrics;
        performance: IPerformanceMetrics;
        costDetails: IStandardCostDetails;
    };
    costDetails: IStandardCostDetails;
    metadata: {
        created: Date;
        started?: Date;
        completed?: Date;
        description?: string;
        tags?: string[];
    };
}

export interface IWorkflowStoreConfig {
    name: string;
    workflowId: string;
    steps: IStepConfig[];
    middleware?: {
        devtools?: boolean;
    };
}

export interface IWorkflowStore extends IWorkflowState {
    // Base methods
    getState: () => IWorkflowState;
    setState: (state: Partial<IWorkflowState>) => void;
    subscribe: () => () => void;
    destroy: () => void;

    // Step actions
    startStep: (stepId: string, agent: IAgentType) => Promise<void>;
    completeStep: (stepId: string, result: IStepResult) => void;
    failStep: (stepId: string, error: IErrorType) => void;
    skipStep: (stepId: string) => void;

    // Control actions
    startWorkflow: () => Promise<void>;
    pauseWorkflow: () => void;
    resumeWorkflow: () => void;
    stopWorkflow: () => void;
    resetWorkflow: () => void;

    // Agent actions
    assignAgent: (stepId: string, agent: IAgentType) => void;
    unassignAgent: (stepId: string) => void;

    // Task actions
    addTask: (task: ITaskType) => void;
    removeTask: (taskId: string) => void;
    updateTaskStatus: (taskId: string, status: keyof typeof TASK_STATUS_enum) => void;
}

// ─── Handler Types ─────────────────────────────────────────────────────────────
export interface IWorkflowHandlerParams {
    task?: ITaskType;
    error?: IErrorType;
    context?: {
        phase?: string;
        attemptNumber?: number;
        lastSuccessfulOperation?: string;
        recoveryPossible?: boolean;
    };
}
