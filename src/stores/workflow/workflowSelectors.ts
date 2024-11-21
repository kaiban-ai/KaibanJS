/**
 * @file workflowSelectors.ts
 * @path src/stores/workflow/workflowSelectors.ts
 * @description Workflow store selectors for accessing and computing state values
 *
 * @module @workflow
 */

import type { IWorkflowState } from './workflowTypes';
import type { IStepConfig } from '../../types/workflow/workflowStepsTypes';
import type { ITaskType } from '../../types/task';
import type { IErrorType } from '../../types/common/commonErrorTypes';

// ─── Step Selectors ────────────────────────────────────────────────────────────
export const selectCurrentStep = (state: IWorkflowState): IStepConfig | undefined =>
    state.steps[state.currentStepIndex];

export const selectStepById = (state: IWorkflowState, stepId: string): IStepConfig | undefined =>
    state.steps.find((step: IStepConfig) => step.id === stepId);

export const selectStepResult = (state: IWorkflowState, stepId: string) =>
    state.stepResults[stepId];

export const selectCompletedSteps = (state: IWorkflowState): IStepConfig[] =>
    state.steps.filter((step: IStepConfig) => state.stepResults[step.id]);

// ─── Agent Selectors ───────────────────────────────────────────────────────────
export const selectStepAgent = (state: IWorkflowState, stepId: string) =>
    state.assignedAgents[stepId];

export const selectAssignedAgents = (state: IWorkflowState) =>
    state.assignedAgents;

// ─── Task Selectors ────────────────────────────────────────────────────────────
export const selectPendingTasks = (state: IWorkflowState) =>
    state.pendingTasks;

export const selectActiveTasks = (state: IWorkflowState) =>
    state.activeTasks;

export const selectCompletedTasks = (state: IWorkflowState) =>
    state.completedTasks;

// ─── Status Selectors ──────────────────────────────────────────────────────────
export const selectWorkflowStatus = (state: IWorkflowState) =>
    state.status;

export const selectWorkflowErrors = (state: IWorkflowState) =>
    state.errors;

// ─── Performance Selectors ──────────────────────────────────────────────────────
export const selectWorkflowProgress = (state: IWorkflowState): number => {
    const totalSteps = state.steps.length;
    const completedSteps = Object.keys(state.stepResults).length;
    return totalSteps === 0 ? 0 : (completedSteps / totalSteps) * 100;
};

export const selectStepProgress = (state: IWorkflowState, stepId: string): number => {
    const completedTasks = state.completedTasks.filter((task: ITaskType) => 
        task.stepId === stepId
    ).length;
    const totalTasks = [...state.pendingTasks, ...state.activeTasks, ...state.completedTasks]
        .filter((task: ITaskType) => task.stepId === stepId).length;
    return totalTasks === 0 ? 0 : (completedTasks / totalTasks) * 100;
};

// ─── Cost Selectors ────────────────────────────────────────────────────────────
export const selectTotalCost = (state: IWorkflowState) =>
    state.costDetails.totalCost;

export const selectCostBreakdown = (state: IWorkflowState) =>
    state.costDetails.breakdown;

// ─── Composite Selectors ────────────────────────────────────────────────────────
export const selectStepStatus = (state: IWorkflowState, stepId: string): 'pending' | 'active' | 'completed' | 'error' => {
    if (state.errors.some((error: IErrorType) => error.stepId === stepId)) return 'error';
    if (state.stepResults[stepId]) return 'completed';
    if (state.assignedAgents[stepId]) return 'active';
    return 'pending';
};

export const selectNextStep = (state: IWorkflowState): IStepConfig | undefined =>
    state.steps[state.currentStepIndex + 1];

export const selectRemainingSteps = (state: IWorkflowState): IStepConfig[] =>
    state.steps.slice(state.currentStepIndex + 1);
