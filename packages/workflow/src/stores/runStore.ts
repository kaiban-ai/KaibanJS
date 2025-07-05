import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  RuntimeContext,
  Step,
  StepFlowEntry,
  StepResult,
  StepStatus,
} from '../types';

export enum RUN_STATUS {
  INITIAL = 'INITIAL',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  RESUMED = 'RESUMED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  SUSPENDED = 'SUSPENDED',
}
export enum WorkflowEventType {
  WorkflowStatusUpdate = 'WorkflowStatusUpdate',
  StepStatusUpdate = 'StepStatusUpdate',
}

export interface WorkflowEvent {
  type: WorkflowEventType;
  timestamp: number;
  runId: string;
  workflowId: string;
  description: string;
  payload: {
    workflowState?: {
      status: RUN_STATUS;
      result?: any;
      error?: any;
    };
    stepId?: string;
    stepStatus?: StepStatus;
    stepResult?: StepResult;
  };
  metadata?: {
    suspendReason?: string;
    resumeData?: any;
    executionPath?: number[];
  };
}

export interface RunLog {
  timestamp: number;
  type: 'status' | 'step';
  description: string;
  metadata?: Record<string, unknown>;
  status?: RUN_STATUS;
  stepStatus?: StepStatus;
  stepId?: string;
  stepResult?: StepResult;
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
  events: WorkflowEvent[];
  steps: Record<string, any>;
  executionGraph: StepFlowEntry[];
  executionContext: RuntimeContext;
  result?: any;
  error?: any;
}

export interface RunStoreActions {
  setStatus: (status: RUN_STATUS) => void;
  addLog: (log: Omit<RunLog, 'timestamp'>) => void;
  updateStepResult: (stepId: string, result: StepResult) => void;
  setCurrentStep: (step: Step<any, any>) => void;
  updateExecutionPath: (path: number[]) => void;
  updateSuspendedPaths: (paths: Record<string, number[]>) => void;
  updateState: (newState: Record<string, any>) => void;
  updateExecutionGraph: (graph: StepFlowEntry[]) => void;
  updateExecutionContext: (context: RuntimeContext) => void;
  emitWorkflowStatusUpdate: (
    status: Partial<Omit<WorkflowEvent, 'timestamp' | 'runId' | 'workflowId'>>
  ) => void;
  emitStepStatusUpdate: (
    status: Partial<Omit<WorkflowEvent, 'timestamp' | 'runId' | 'workflowId'>>
  ) => void;
  reset: () => void;
}

export type RunStore = RunState & RunStoreActions;

export const createRunStore = (
  runId: string,
  workflowId: string,
  executionGraph: StepFlowEntry[]
) =>
  create<RunStore>()(
    devtools(
      (set, get) => ({
        runId,
        workflowId,
        status: RUN_STATUS.INITIAL,
        logs: [],
        stepResults: new Map(),
        currentStep: undefined,
        executionPath: [],
        suspendedPaths: {},
        steps: {},
        result: null,
        error: null,
        events: [],
        executionGraph,
        executionContext: {
          get: () => {},
          set: () => {},
          has: () => false,
          delete: () => {},
          clear: () => {},
        },
        emitWorkflowStatusUpdate: (
          event: Partial<
            Omit<WorkflowEvent, 'timestamp' | 'runId' | 'workflowId'>
          >
        ) => {
          const workflowEvent: WorkflowEvent = {
            type: event.type!,
            description: event.description!,
            timestamp: Date.now(),
            runId,
            workflowId,
            payload: {
              ...event.payload,
            },
            metadata: event.metadata,
          };

          set((state) => ({
            status: event.payload?.workflowState?.status,
            result: event.payload?.workflowState?.result || null,
            error: event.payload?.workflowState?.error || null,
            events: [
              ...state.events,
              {
                ...workflowEvent,
              },
            ],
          }));
        },
        emitStepStatusUpdate: (
          event: Partial<
            Omit<WorkflowEvent, 'timestamp' | 'runId' | 'workflowId'>
          >
        ) => {
          const workflowEvent: WorkflowEvent = {
            type: event.type!,
            description: event.description!,
            timestamp: Date.now(),
            runId,
            workflowId,
            payload: {
              ...event.payload,
              workflowState: {
                status: get().status,
                result: get().result,
                error: get().error,
              },
            },
            metadata: event.metadata,
          };

          set((state) => ({
            events: [
              ...state.events,
              {
                ...workflowEvent,
              },
            ],
          }));
        },
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

        updateExecutionGraph: (graph: StepFlowEntry[]) => {
          set({ executionGraph: graph });
        },

        updateExecutionContext: (context: RuntimeContext) => {
          set({ executionContext: context });
        },

        updateState: (newState: Record<string, any>) => {
          set((state) => ({ ...state, ...newState }));
        },

        reset: () => {
          set({
            status: RUN_STATUS.INITIAL,
            logs: [],
            stepResults: new Map(),
            currentStep: undefined,
            executionPath: [],
            suspendedPaths: {},
            executionGraph: [],
            executionContext: {
              get: () => {},
              set: () => {},
              has: () => false,
              delete: () => {},
              clear: () => {},
            },
          });
        },
      }),
      {
        name: `runStore-${runId}`,
      }
    )
  );
