import { Task } from '..';
import { BaseAgent } from '../agents/baseAgent';
import { LLMInvocationError, TaskBlockError } from '../utils/errors';
import { LLMUsageStats } from '../utils/llmCostCalculator';

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

type TaskStoreActions = {
  getTaskStats: (task: Task) => TaskStats;
  handleTaskCompleted: (params: {
    agent: BaseAgent;
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
};

export type TaskStoreState = TaskStoreActions;
