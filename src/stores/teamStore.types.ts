import { StoreApi, UseBoundStore } from 'zustand';
import { Agent, Task } from '..';
import { BaseAgent, Env, LLMConfig } from '../agents/baseAgent';
import {
  AGENT_STATUS_enum,
  TASK_STATUS_enum,
  WORKFLOW_STATUS_enum,
} from '../utils/enums';
import { WorkflowLog, WorkflowStats } from '../utils/workflowLogs.types';
import { AgentStoreState } from './agentStore.types';
import { TaskResult, TaskStoreState } from './taskStore.types';
import { WorkflowLoopState } from './workflowLoopStore.types';

// Add these type definitions at the top of the file, after the imports
export type CleanedLLMConfig = Partial<LLMConfig> | Record<string, never>;

export type CleanedAgent = Omit<Partial<Agent>, 'agentInstance'> & {
  id: string;
  env: string;
  llmConfig: CleanedLLMConfig;
  agentInstance: Partial<BaseAgent>;
};

export type CleanedFeedback = {
  content: string;
  status: string;
  timestamp: string;
};

export type CleanedTask = Partial<
  Omit<Task, 'agent' | 'feedbackHistory' | 'duration'>
> & {
  id: string;
  agent: CleanedAgent | null;
  duration: string;
  endTime: string;
  startTime: string;
  feedbackHistory: CleanedFeedback[];
  allowParallelExecution?: boolean;
  referenceId?: string;
};

export type CleanedMetadata = {
  duration: string;
  endTime: string;
  startTime: string;
  feedback?: Partial<CleanedFeedback>;
  [key: string]:
    | string
    | Partial<CleanedFeedback>
    | Record<string, unknown>
    | undefined;
};

export type CleanedWorkflowLog = Omit<WorkflowLog, 'timestamp' | 'metadata'> & {
  timestamp: string;
  metadata: CleanedMetadata;
  agent?: CleanedAgent | null;
  task?: CleanedTask | null;
};

export type CleanedTeamState = {
  teamWorkflowStatus: string;
  workflowResult: TaskResult | null;
  name: string;
  agents: CleanedAgent[];
  tasks: CleanedTask[];
  workflowLogs: CleanedWorkflowLog[];
  inputs: Record<string, unknown>;
  workflowContext: string;
  logLevel?: string;
};

export interface TeamStoreState {
  teamWorkflowStatus: WORKFLOW_STATUS_enum;
  workflowResult: TaskResult | null;
  name: string;
  agents: Agent[];
  tasks: Task[];
  workflowLogs: WorkflowLog[];
  inputs: Record<string, unknown>;
  workflowContext: string;
  env: Env;
  logLevel?: string;
  memory: boolean;
  insights: string;
  flowType?: string;
  workflowExecutionStrategy: string;
  workflowController: Record<string, unknown>;
  maxConcurrency: number;
}

export interface TeamStoreActions {
  setInputs: (inputs: Record<string, unknown>) => void;
  setName: (name: string) => void;
  setEnv: (env: Env) => void;
  addAgents: (agents: Agent[]) => void;
  addTasks: (tasks: Task[]) => void;
  updateTaskStatus: (taskId: string, status: TASK_STATUS_enum) => void;
  setWorkflowExecutionStrategy: (strategy: string) => void;
  startWorkflow: (inputs?: Record<string, unknown>) => Promise<void>;
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
  getTaskResults: () => Record<string, unknown>;
  prepareNewLog: <T extends WorkflowLog>(params: NewLogParams<T>) => T;
}

export type NewLogParams<T extends WorkflowLog> = {
  task?: Task;
  agent?: Agent | BaseAgent;
  logDescription: string;
  workflowStatus?: WORKFLOW_STATUS_enum;
  taskStatus?: TASK_STATUS_enum;
  agentStatus?: AGENT_STATUS_enum;
  logType: T['logType'];
  metadata?: T['metadata'];
};

export type CombinedStoresState = TaskStoreState &
  AgentStoreState &
  WorkflowLoopState &
  TeamStoreState &
  TeamStoreActions;

export type TeamStore = UseBoundStore<StoreApi<CombinedStoresState>>;
