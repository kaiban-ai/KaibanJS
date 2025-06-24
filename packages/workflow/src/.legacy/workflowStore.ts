import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Step, StepResult, StepStatus, WatchEvent } from '../types';

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
  logType:
    | 'WorkflowStatusUpdate'
    | 'StepStatusUpdate'
    | 'RunStatusUpdate'
    | 'WatchEvent';
  logDescription: string;
  metadata?: Record<string, unknown>;
  workflowStatus?: CUE_STATUS;
  stepStatus?: StepStatus;
  stepId?: string;
  stepResult?: StepResult;
  runId?: string;
  watchEvent?: WatchEvent;
}

export interface RunState {
  runId: string;
  workflowId: string;
  status: CUE_STATUS;
  logs: WorkflowLog[];
  stepResults: Map<string, StepResult>;
  currentStep?: Step<any, any>;
  executionPath: number[];
  suspendedPaths: Record<string, number[]>;
  watchEvents: WatchEvent[];
  state: Record<string, any>;
}

export interface WorkflowStoreState {
  status: CUE_STATUS;
  logs: WorkflowLog[];
  stepResults: Map<string, StepResult>;
  currentStep?: Step<any, any>;
  executionPath: number[];
  suspendedPaths: Record<string, number[]>;
  runs: Map<string, RunState>;
  currentRunId?: string;
}

export interface WorkflowStoreActions {
  setStatus: (status: CUE_STATUS) => void;
  addLog: (log: WorkflowLog) => void;
  updateStepResult: (stepId: string, result: StepResult) => void;
  setCurrentStep: (step: Step<any, any>) => void;
  updateExecutionPath: (path: number[]) => void;
  updateSuspendedPaths: (paths: Record<string, number[]>) => void;
  reset: () => void;
  createRun: (runId: string, workflowId: string) => void;
  setCurrentRun: (runId: string) => void;
  setRunStatus: (runId: string, status: CUE_STATUS) => void;
  addRunLog: (runId: string, log: WorkflowLog) => void;
  updateRunStepResult: (
    runId: string,
    stepId: string,
    result: StepResult
  ) => void;
  setRunCurrentStep: (runId: string, step: Step<any, any>) => void;
  updateRunExecutionPath: (runId: string, path: number[]) => void;
  updateRunSuspendedPaths: (
    runId: string,
    paths: Record<string, number[]>
  ) => void;
  addRunWatchEvent: (runId: string, event: WatchEvent) => void;
  updateRunState: (runId: string, state: Record<string, any>) => void;
  resetRun: (runId: string) => void;
  removeRun: (runId: string) => void;
  getRunState: (runId: string) => RunState | undefined;
}

export type WorkflowStore = WorkflowStoreState & WorkflowStoreActions;

export const useWorkflowStore = create<WorkflowStore>()(
  devtools(
    (set, get) => ({
      status: CUE_STATUS.INITIAL,
      logs: [],
      stepResults: new Map(),
      currentStep: undefined,
      executionPath: [],
      suspendedPaths: {},
      runs: new Map(),
      currentRunId: undefined,

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

      createRun: (runId: string, workflowId: string) => {
        const newRun: RunState = {
          runId,
          workflowId,
          status: CUE_STATUS.INITIAL,
          logs: [],
          stepResults: new Map(),
          currentStep: undefined,
          executionPath: [],
          suspendedPaths: {},
          watchEvents: [],
          state: {},
        };

        set((state) => ({
          runs: new Map(state.runs).set(runId, newRun),
          currentRunId: runId,
        }));
      },

      setCurrentRun: (runId: string) => {
        set({ currentRunId: runId });
      },

      setRunStatus: (runId: string, status: CUE_STATUS) => {
        set((state) => {
          const run = state.runs.get(runId);
          if (!run) return state;

          const log: WorkflowLog = {
            timestamp: Date.now(),
            logType: 'RunStatusUpdate',
            logDescription: `Run ${runId} status changed to ${status}`,
            workflowStatus: status,
            runId,
          };

          const updatedRun: RunState = {
            ...run,
            status,
            logs: [...run.logs, log],
          };

          return {
            runs: new Map(state.runs).set(runId, updatedRun),
          };
        });
      },

      addRunLog: (runId: string, log: WorkflowLog) => {
        set((state) => {
          const run = state.runs.get(runId);
          if (!run) return state;

          const updatedRun: RunState = {
            ...run,
            logs: [...run.logs, { ...log, runId }],
          };

          return {
            runs: new Map(state.runs).set(runId, updatedRun),
          };
        });
      },

      updateRunStepResult: (
        runId: string,
        stepId: string,
        result: StepResult
      ) => {
        set((state) => {
          const run = state.runs.get(runId);
          if (!run) return state;

          const log: WorkflowLog = {
            timestamp: Date.now(),
            logType: 'StepStatusUpdate',
            logDescription: `Step ${stepId} ${result.status}`,
            stepStatus: result.status,
            stepId,
            stepResult: result,
            runId,
          };

          const updatedRun: RunState = {
            ...run,
            stepResults: new Map(run.stepResults).set(stepId, result),
            logs: [...run.logs, log],
          };

          return {
            runs: new Map(state.runs).set(runId, updatedRun),
          };
        });
      },

      setRunCurrentStep: (runId: string, step: Step<any, any>) => {
        set((state) => {
          const run = state.runs.get(runId);
          if (!run) return state;

          const updatedRun: RunState = {
            ...run,
            currentStep: step,
          };

          return {
            runs: new Map(state.runs).set(runId, updatedRun),
          };
        });
      },

      updateRunExecutionPath: (runId: string, path: number[]) => {
        set((state) => {
          const run = state.runs.get(runId);
          if (!run) return state;

          const updatedRun: RunState = {
            ...run,
            executionPath: path,
          };

          return {
            runs: new Map(state.runs).set(runId, updatedRun),
          };
        });
      },

      updateRunSuspendedPaths: (
        runId: string,
        paths: Record<string, number[]>
      ) => {
        set((state) => {
          const run = state.runs.get(runId);
          if (!run) return state;

          const updatedRun: RunState = {
            ...run,
            suspendedPaths: paths,
          };

          return {
            runs: new Map(state.runs).set(runId, updatedRun),
          };
        });
      },

      addRunWatchEvent: (runId: string, event: WatchEvent) => {
        set((state) => {
          const run = state.runs.get(runId);
          if (!run) return state;

          const log: WorkflowLog = {
            timestamp: Date.now(),
            logType: 'WatchEvent',
            logDescription: `Watch event: ${event.type}`,
            watchEvent: event,
            runId,
          };

          const updatedRun: RunState = {
            ...run,
            watchEvents: [...run.watchEvents, event],
            logs: [...run.logs, log],
          };

          return {
            runs: new Map(state.runs).set(runId, updatedRun),
          };
        });
      },

      updateRunState: (runId: string, newState: Record<string, any>) => {
        set((state) => {
          const run = state.runs.get(runId);
          if (!run) return state;

          const updatedRun: RunState = {
            ...run,
            state: { ...run.state, ...newState },
          };

          return {
            runs: new Map(state.runs).set(runId, updatedRun),
          };
        });
      },

      resetRun: (runId: string) => {
        set((state) => {
          const run = state.runs.get(runId);
          if (!run) return state;

          const updatedRun: RunState = {
            ...run,
            status: CUE_STATUS.INITIAL,
            logs: [],
            stepResults: new Map(),
            currentStep: undefined,
            executionPath: [],
            suspendedPaths: {},
            watchEvents: [],
            state: {},
          };

          return {
            runs: new Map(state.runs).set(runId, updatedRun),
          };
        });
      },

      removeRun: (runId: string) => {
        set((state) => {
          const newRuns = new Map(state.runs);
          newRuns.delete(runId);

          return {
            runs: newRuns,
            currentRunId:
              state.currentRunId === runId ? undefined : state.currentRunId,
          };
        });
      },

      getRunState: (runId: string): RunState | undefined => {
        return get().runs.get(runId);
      },
    }),
    {
      name: 'workflowStore',
    }
  )
);
