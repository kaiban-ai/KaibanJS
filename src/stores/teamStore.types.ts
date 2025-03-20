import { Task, Agent } from '..';
import { WORKFLOW_STATUS_enum, TASK_STATUS_enum } from '../utils/enums';
import { TaskStoreState } from './taskStore.types';
import { AgentStoreState } from './agentStore.types';
import { WorkflowLoopState } from './workflowLoopStore.types';
import { StoreApi } from 'zustand';
import { UseBoundStore } from 'zustand';
import {
  WorkflowLog,
  WorkflowResult,
  WorkflowStats,
} from '../utils/workflowLogs.types';

export interface TeamStoreState {
  teamWorkflowStatus: WORKFLOW_STATUS_enum;
  workflowResult: WorkflowResult | null;
  name: string;
  agents: Agent[];
  tasks: Task[];
  workflowLogs: WorkflowLog[];
  inputs: Record<string, any>;
  workflowContext: string;
  env: Record<string, any>;
  logLevel?: string;
  memory: boolean;
  insights: string;
  flowType?: string;
  workflowExecutionStrategy: string;
  workflowController: Record<string, any>;
  maxConcurrency: number;
}

export interface TeamStoreActions {
  setInputs: (inputs: Record<string, any>) => void;
  setName: (name: string) => void;
  setEnv: (env: Record<string, any>) => void;
  addAgents: (agents: Agent[]) => void;
  addTasks: (tasks: Task[]) => void;
  updateTaskStatus: (taskId: string, status: TASK_STATUS_enum) => void;
  setWorkflowExecutionStrategy: (strategy: string) => void;
  startWorkflow: (inputs?: Record<string, any>) => Promise<void>;
  resetWorkflowStateAction: () => void;
  finishWorkflowAction: () => void;
  setTeamWorkflowStatus: (status: WORKFLOW_STATUS_enum) => void;
  handleWorkflowError: (error: Error) => void;
  handleWorkflowBlocked: (error: Error) => void;
  handleWorkflowAborted: (error: Error) => void;
  workOnTask: (agent: Agent, task: Task, context: string) => Promise<void>;
  workOnTaskResume: (agent: Agent, task: Task) => Promise<void>;
  deriveContextFromLogs: (logs: WorkflowLog[], currentTaskId: string) => string;
  provideFeedback: (taskId: string, feedbackContent: string) => Promise<void>;
  validateTask: (taskId: string) => Promise<void | null>;
  clearAll: () => void;
  getWorkflowStats: () => WorkflowStats;
  getTaskResults: () => Record<string, any>;
}

export type CombinedStoresState = TaskStoreState &
  AgentStoreState &
  WorkflowLoopState &
  TeamStoreState &
  TeamStoreActions;

export type TeamStore = UseBoundStore<StoreApi<CombinedStoresState>>;
