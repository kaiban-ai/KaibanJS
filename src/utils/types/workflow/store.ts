/**
 * @file store.ts
 * @path src/utils/types/workflow/store.ts
 * @description Workflow store types and interfaces
 */

import type { IBaseStoreState, IBaseStoreMethods } from '../store/base';
import type { AgentType } from '../agent/base';
import type { TaskType } from '../task/base';
import type { WorkflowResult } from './base';
import type { WORKFLOW_STATUS_enum } from '../common/enums';
import type { CostDetails } from './costs';
import type { StepConfig, StepResult } from './steps';

export interface IWorkflowState extends IBaseStoreState {
    workflowId: string;
    status: keyof typeof WORKFLOW_STATUS_enum;
    steps: StepConfig[];
    currentStepIndex: number;
    stepResults: Record<string, StepResult>;
    assignedAgents: Record<string, AgentType>;
    pendingTasks: TaskType[];
    activeTasks: TaskType[];
    completedTasks: TaskType[];
    errors: Error[];
    costDetails: CostDetails;
    result?: WorkflowResult;
    metadata: {
        created: Date;
        started?: Date;
        completed?: Date;
        description?: string;
        tags?: string[];
    };
}

export interface IWorkflowStepActions {
    startStep: (stepId: string, agent: AgentType) => Promise<void>;
    completeStep: (stepId: string, result: StepResult) => void;
    failStep: (stepId: string, error: Error) => void;
    skipStep: (stepId: string) => void;
}

export interface IWorkflowControlActions {
    startWorkflow: () => Promise<void>;
    pauseWorkflow: () => void;
    resumeWorkflow: () => void;
    stopWorkflow: () => void;
    resetWorkflow: () => void;
}

export interface IWorkflowAgentActions {
    assignAgent: (stepId: string, agent: AgentType) => void;
    unassignAgent: (stepId: string) => void;
}

export interface IWorkflowTaskActions {
    addTask: (task: TaskType) => void;
    removeTask: (taskId: string) => void;
    updateTaskStatus: (taskId: string, status: string) => void;
}

export interface IWorkflowStoreActions extends
    IWorkflowStepActions,
    IWorkflowControlActions,
    IWorkflowAgentActions,
    IWorkflowTaskActions {}

export interface IWorkflowStoreMethods extends 
    IBaseStoreMethods<IWorkflowState>,
    IWorkflowStoreActions {}

export interface IWorkflowStoreConfig {
    name: string;
    workflowId: string;
    steps: StepConfig[];
    middleware?: {
        devtools?: boolean;
        subscribeWithSelector?: boolean;
        persistence?: boolean;
    };
}

// Type Guards
export const WorkflowStoreTypeGuards = {
    isWorkflowState: (value: unknown): value is IWorkflowState => {
        if (typeof value !== 'object' || value === null) return false;
        const state = value as Partial<IWorkflowState>;
        return (
            typeof state.workflowId === 'string' &&
            typeof state.status === 'string' &&
            Array.isArray(state.steps) &&
            typeof state.currentStepIndex === 'number' &&
            typeof state.stepResults === 'object' &&
            typeof state.assignedAgents === 'object' &&
            Array.isArray(state.pendingTasks) &&
            Array.isArray(state.activeTasks) &&
            Array.isArray(state.completedTasks) &&
            Array.isArray(state.errors)
        );
    }
};