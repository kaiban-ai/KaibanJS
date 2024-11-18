/**
 * @file selectors.ts
 * @path src/stores/workflowStore/selectors.ts
 * @description Workflow store selectors
 */

import type { IWorkflowState } from '@/utils/types/workflow/store';
import type { StepConfig } from '@/utils/types/workflow/steps';

// Step selectors
export const selectCurrentStep = (state: IWorkflowState): StepConfig | undefined =>
    state.steps[state.currentStepIndex];

export const selectStepById = (state: IWorkflowState, stepId: string): StepConfig | undefined =>
    state.steps.find(step => step.id === stepId);

export const selectStepResult = (state: IWorkflowState, stepId: string) =>
    state.stepResults[stepId];

export const selectCompletedSteps = (state: IWorkflowState): StepConfig[] =>
    state.steps.filter(step => state.stepResults[step.id]);

// Agent selectors
export const selectStepAgent = (state: IWorkflowState, stepId: string) =>
    state.assignedAgents[stepId];

export const selectAssignedAgents = (state: IWorkflowState) =>
    state.assignedAgents;

// Task selectors
export const selectPendingTasks = (state: IWorkflowState) =>
    state.pendingTasks;

export const selectActiveTasks = (state: IWorkflowState) =>
    state.activeTasks;

export const selectCompletedTasks = (state: IWorkflowState) =>
    state.completedTasks;

// Status selectors
export const selectWorkflowStatus = (state: IWorkflowState) =>
    state.status;

export const selectWorkflowResult = (state: IWorkflowState) =>
    state.result;

export const selectWorkflowErrors = (state: IWorkflowState) =>
    state.errors;

// Performance selectors
export const selectWorkflowProgress = (state: IWorkflowState): number => {
    const totalSteps = state.steps.length;
    const completedSteps = Object.keys(state.stepResults).length;
    return totalSteps === 0 ? 0 : (completedSteps / totalSteps) * 100;
};

export const selectStepProgress = (state: IWorkflowState, stepId: string): number => {
    const completedTasks = state.completedTasks.filter(task => 
        task.metadata?.stepId === stepId
    ).length;
    const totalTasks = [...state.pendingTasks, ...state.activeTasks, ...state.completedTasks]
        .filter(task => task.metadata?.stepId === stepId).length;
    return totalTasks === 0 ? 0 : (completedTasks / totalTasks) * 100;
};

// Cost selectors
export const selectTotalCost = (state: IWorkflowState) =>
    state.costDetails.totalCost;

export const selectCostBreakdown = (state: IWorkflowState) =>
    state.costDetails.breakdown;

// Composite selectors
export const selectStepStatus = (state: IWorkflowState, stepId: string): 'pending' | 'active' | 'completed' | 'error' => {
    if (state.errors.some(error => error.metadata?.stepId === stepId)) return 'error';
    if (state.stepResults[stepId]) return 'completed';
    if (state.assignedAgents[stepId]) return 'active';
    return 'pending';
};

export const selectNextStep = (state: IWorkflowState): StepConfig | undefined =>
    state.steps[state.currentStepIndex + 1];

export const selectRemainingSteps = (state: IWorkflowState): StepConfig[] =>
    state.steps.slice(state.currentStepIndex + 1);