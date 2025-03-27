import { Agent, Task } from '../../index';
import { TaskResult } from '../../stores/taskStore.types';
import {
  AGENT_STATUS_enum,
  TASK_STATUS_enum,
  WORKFLOW_STATUS_enum,
} from '../../utils/enums';
import { ThinkingResult } from '../../utils/llm.types';
import { CostResult, LLMUsageStats } from '../../utils/llmCostCalculator';
import { BaseWorkflowLog, Feedback, WorkflowBaseMetadata } from './common';

// Task-specific metadata types
// Task-specific metadata types
export type TaskStartedMetadata = WorkflowBaseMetadata;

export type TaskCompletionMetadata = WorkflowBaseMetadata & {
  result: TaskResult;
  output?: ThinkingResult;
  llmUsageStats: LLMUsageStats;
  iterationCount: number;
  duration: number;
  costDetails: CostResult;
};

export type TaskAwaitingValidationMetadata = WorkflowBaseMetadata & {
  result: TaskResult;
  output?: ThinkingResult;
  llmUsageStats: LLMUsageStats;
  iterationCount: number;
  duration: number;
  costDetails: CostResult;
};

export type TaskErrorMetadata = WorkflowBaseMetadata & {
  error: Error;
  costDetails: CostResult;
  llmUsageStats: LLMUsageStats;
};

export type TaskBlockedMetadata = WorkflowBaseMetadata & {
  error: Error;
  costDetails: CostResult;
  llmUsageStats: LLMUsageStats;
};

export type TaskAbortedMetadata = WorkflowBaseMetadata & {
  error: Error;
  costDetails: CostResult;
  llmUsageStats: LLMUsageStats;
};

export type TaskPausedMetadata = WorkflowBaseMetadata & {
  error?: Error;
  costDetails: CostResult;
  llmUsageStats: LLMUsageStats;
};

export type TaskResumedMetadata = WorkflowBaseMetadata;

export type TaskFeedbackMetadata = WorkflowBaseMetadata & {
  feedback: Feedback;
};

export type TaskValidatedMetadata = WorkflowBaseMetadata;

// Task status update logs
export interface BaseTaskLog extends BaseWorkflowLog {
  task: Task;
  agent: Agent;
  taskStatus?: TASK_STATUS_enum;
  agentStatus?: AGENT_STATUS_enum;
  workflowStatus?: WORKFLOW_STATUS_enum;
}

export interface TaskStartedLog extends BaseTaskLog {
  logType: 'TaskStatusUpdate';
  taskStatus: TASK_STATUS_enum;
  metadata: TaskStartedMetadata;
}

export interface TaskCompletionLog extends BaseTaskLog {
  logType: 'TaskStatusUpdate';
  taskStatus: TASK_STATUS_enum;
  metadata: TaskCompletionMetadata;
}

export interface TaskAwaitingValidationLog extends BaseTaskLog {
  logType: 'TaskStatusUpdate';
  taskStatus: TASK_STATUS_enum;
  metadata: TaskAwaitingValidationMetadata;
}

export interface TaskErrorLog extends BaseTaskLog {
  logType: 'TaskStatusUpdate';
  taskStatus: TASK_STATUS_enum;
  metadata: TaskErrorMetadata;
}

export interface TaskBlockedLog extends BaseTaskLog {
  logType: 'TaskStatusUpdate';
  taskStatus: TASK_STATUS_enum;
  metadata: TaskBlockedMetadata;
}

export interface TaskAbortedLog extends BaseTaskLog {
  logType: 'TaskStatusUpdate';
  taskStatus: TASK_STATUS_enum;
  metadata: TaskAbortedMetadata;
}

export interface TaskPausedLog extends BaseTaskLog {
  logType: 'TaskStatusUpdate';
  taskStatus: TASK_STATUS_enum;
  metadata: TaskPausedMetadata;
}

export interface TaskResumedLog extends BaseTaskLog {
  logType: 'TaskStatusUpdate';
  taskStatus: TASK_STATUS_enum;
  metadata: TaskResumedMetadata;
}

export interface TaskFeedbackLog extends BaseTaskLog {
  logType: 'TaskStatusUpdate';
  taskStatus: TASK_STATUS_enum;
  metadata: TaskFeedbackMetadata;
}

export interface TaskValidatedLog extends BaseTaskLog {
  logType: 'TaskStatusUpdate';
  taskStatus: TASK_STATUS_enum;
  metadata: TaskValidatedMetadata;
}

export type TaskStatusLog =
  | TaskStartedLog
  | TaskCompletionLog
  | TaskAwaitingValidationLog
  | TaskErrorLog
  | TaskBlockedLog
  | TaskAbortedLog
  | TaskPausedLog
  | TaskResumedLog
  | TaskFeedbackLog
  | TaskValidatedLog;
