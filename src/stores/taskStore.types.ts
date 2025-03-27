import { Agent, Task } from '..';
import { BaseAgent } from '../agents/baseAgent';
import { TASK_STATUS_enum } from '../utils/enums';
import { WORKFLOW_STATUS_enum } from '../utils/enums';
import { AGENT_STATUS_enum } from '../utils/enums';
import { LLMInvocationError, TaskBlockError } from '../utils/errors';
import { LLMUsageStats } from '../utils/llmCostCalculator';
import { TaskStatusLog } from '../types/logs';
export type TaskStats = {
  startTime: number;
  endTime: number;
  duration: number;
  llmUsageStats: LLMUsageStats;
  iterationCount: number;
};

export type TaskFeedback = {
  content: string;
  status: string;
  timestamp: number;
};

export type TaskResult = string | Record<string, unknown>;

export type NewTaskStatusUpdateLogParams<T extends TaskStatusLog> = {
  agent: BaseAgent | Agent;
  task: Task;
  logDescription: string;
  workflowStatus?: WORKFLOW_STATUS_enum;
  taskStatus?: TASK_STATUS_enum;
  agentStatus?: AGENT_STATUS_enum;
  metadata: T['metadata'];
  logType?: T['logType'];
};

type TaskStoreActions = {
  getTaskStats: (task: Task) => TaskStats;
  handleTaskCompleted: (params: {
    agent: BaseAgent | Agent; // TODO: Check this
    task: Task;
    result: TaskResult | null;
  }) => void;
  handleTaskError: (params: {
    agent: BaseAgent;
    task: Task;
    error: Error;
  }) => void;
  handleTaskBlocked: (params: { task: Task; error: TaskBlockError }) => void;
  handleTaskAborted: (params: {
    task: Task;
    error: LLMInvocationError;
  }) => void;
  handleTaskPaused: (params: { task: Task }) => void;
  handleTaskResumed: (params: { task: Task }) => void;
  handleTaskRevised: (params: { task: Task; feedback: TaskFeedback }) => void;
  handleTaskValidated: (params: { task: Task }) => void;
  prepareTaskStatusUpdateLog: <T extends TaskStatusLog>(
    params: NewTaskStatusUpdateLogParams<T>
  ) => T;
};

export type TaskStoreState = TaskStoreActions;
