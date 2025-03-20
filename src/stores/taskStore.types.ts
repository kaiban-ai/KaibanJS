import { Task } from '..';
import { LLMUsageStats } from '../utils/llmCostCalculator';

type TaskStats = {
  startTime: number;
  endTime: number;
  duration: number;
  llmUsageStats: LLMUsageStats;
  iterationCount: number;
};

type TaskStoreActions = {
  getTaskStats: (task: Task) => TaskStats;
  handleTaskCompleted: (params: {
    agent: any;
    task: Task;
    result: any;
  }) => void;
  handleTaskError: (params: { task: Task; error: Error }) => void;
  handleTaskBlocked: (params: { task: Task; error: Error }) => void;
  handleTaskAborted: (params: { task: Task; error: Error }) => void;
  handleTaskPaused: (params: { task: Task; error?: Error }) => void;
  handleTaskResumed: (params: { task: Task }) => void;
};

export type TaskStoreState = TaskStoreActions;
