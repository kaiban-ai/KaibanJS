import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Step, StepResult, StepStatus } from '../types';

export enum CUE_STATUS {
  INITIAL = 'INITIAL',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  RESUMED = 'RESUMED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  SUSPENDED = 'SUSPENDED',
}

export interface WorkflowLog {
  timestamp: number;
  logType: 'WorkflowStatusUpdate' | 'StepStatusUpdate';
  logDescription: string;
  metadata?: Record<string, unknown>;
  workflowStatus?: CUE_STATUS;
  stepStatus?: StepStatus;
  stepId?: string;
  stepResult?: StepResult;
}

export interface WorkflowStoreState {
  status: CUE_STATUS;
  logs: WorkflowLog[];
  stepResults: Map<string, StepResult>;
  currentStep?: Step<any, any>;
  executionPath: number[];
  suspendedPaths: Record<string, number[]>;
}

export interface WorkflowStoreActions {
  setStatus: (status: CUE_STATUS) => void;
  addLog: (log: WorkflowLog) => void;
  updateStepResult: (stepId: string, result: StepResult) => void;
  setCurrentStep: (step: Step<any, any>) => void;
  updateExecutionPath: (path: number[]) => void;
  updateSuspendedPaths: (paths: Record<string, number[]>) => void;
  reset: () => void;
}

export type WorkflowStore = WorkflowStoreState & WorkflowStoreActions;

export const useWorkflowStore = create<WorkflowStore>()(
  devtools(
    (set) => ({
      status: CUE_STATUS.INITIAL,
      logs: [],
      stepResults: new Map(),
      currentStep: undefined,
      executionPath: [],
      suspendedPaths: {},

      setStatus: (status: CUE_STATUS) => {
        const log: WorkflowLog = {
          timestamp: Date.now(),
          logType: 'WorkflowStatusUpdate',
          logDescription: `Workflow status changed to ${status}`,
          workflowStatus: status,
        };
        set((state) => ({
          status,
          logs: [...state.logs, log],
        }));
      },

      addLog: (log: WorkflowLog) => {
        set((state) => ({
          logs: [...state.logs, log],
        }));
      },

      updateStepResult: (stepId: string, result: StepResult) => {
        const log: WorkflowLog = {
          timestamp: Date.now(),
          logType: 'StepStatusUpdate',
          logDescription: `Step ${stepId} ${result.status}`,
          stepStatus: result.status,
          stepId,
          stepResult: result,
        };

        set((state) => ({
          stepResults: new Map(state.stepResults).set(stepId, result),
          logs: [...state.logs, log],
        }));
      },

      setCurrentStep: (step: Step<any, any>) => {
        set({ currentStep: step });
      },

      updateExecutionPath: (path: number[]) => {
        set({ executionPath: path });
      },

      updateSuspendedPaths: (paths: Record<string, number[]>) => {
        set({ suspendedPaths: paths });
      },

      reset: () => {
        set({
          status: CUE_STATUS.INITIAL,
          logs: [],
          stepResults: new Map(),
          currentStep: undefined,
          executionPath: [],
          suspendedPaths: {},
        });
      },
    }),
    {
      name: 'workflowStore',
    }
  )
);
