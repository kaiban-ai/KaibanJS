import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Step, StepResult, StepStatus, WatchEvent } from '../types';

export enum RUN_STATUS {
  INITIAL = 'INITIAL',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  RESUMED = 'RESUMED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  SUSPENDED = 'SUSPENDED',
}

export interface RunLog {
  timestamp: number;
  type: 'status' | 'step' | 'watch';
  description: string;
  metadata?: Record<string, unknown>;
  status?: RUN_STATUS;
  stepStatus?: StepStatus;
  stepId?: string;
  stepResult?: StepResult;
  watchEvent?: WatchEvent;
}

export interface RunState {
  runId: string;
  workflowId: string;
  status: RUN_STATUS;
  logs: RunLog[];
  stepResults: Map<string, StepResult>;
  currentStep?: Step<any, any>;
  executionPath: number[];
  suspendedPaths: Record<string, number[]>;
  watchEvents: WatchEvent[];
  state: Record<string, any>;
}

export interface RunStoreActions {
  setStatus: (status: RUN_STATUS) => void;
  addLog: (log: Omit<RunLog, 'timestamp'>) => void;
  updateStepResult: (stepId: string, result: StepResult) => void;
  setCurrentStep: (step: Step<any, any>) => void;
  updateExecutionPath: (path: number[]) => void;
  updateSuspendedPaths: (paths: Record<string, number[]>) => void;
  addWatchEvent: (event: WatchEvent) => void;
  updateState: (newState: Record<string, any>) => void;
  reset: () => void;
}

export type RunStore = RunState & RunStoreActions;

export const createRunStore = (runId: string, workflowId: string) =>
  create<RunStore>()(
    devtools(
      (set) => ({
        runId,
        workflowId,
        status: RUN_STATUS.INITIAL,
        logs: [],
        stepResults: new Map(),
        currentStep: undefined,
        executionPath: [],
        suspendedPaths: {},
        watchEvents: [],
        state: {},

        setStatus: (status: RUN_STATUS) => {
          const log: RunLog = {
            timestamp: Date.now(),
            type: 'status',
            description: `Run status changed to ${status}`,
            status,
          };
          set((state) => ({
            status,
            logs: [...state.logs, log],
          }));
        },

        addLog: (log: Omit<RunLog, 'timestamp'>) => {
          const fullLog: RunLog = {
            ...log,
            timestamp: Date.now(),
          };
          set((state) => ({
            logs: [...state.logs, fullLog],
          }));
        },

        updateStepResult: (stepId: string, result: StepResult) => {
          const log: RunLog = {
            timestamp: Date.now(),
            type: 'step',
            description: `Step ${stepId} ${result.status}`,
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

        addWatchEvent: (event: WatchEvent) => {
          const log: RunLog = {
            timestamp: Date.now(),
            type: 'watch',
            description: `Watch event: ${event.type}`,
            watchEvent: event,
          };

          set((state) => ({
            watchEvents: [...state.watchEvents, event],
            logs: [...state.logs, log],
          }));
        },

        updateState: (newState: Record<string, any>) => {
          set((state) => ({
            state: { ...state.state, ...newState },
          }));
        },

        reset: () => {
          set({
            status: RUN_STATUS.INITIAL,
            logs: [],
            stepResults: new Map(),
            currentStep: undefined,
            executionPath: [],
            suspendedPaths: {},
            watchEvents: [],
            state: {},
          });
        },
      }),
      {
        name: `runStore-${runId}`,
      }
    )
  );
