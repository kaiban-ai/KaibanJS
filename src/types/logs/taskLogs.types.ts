import { Agent, Task } from '../../index';
import { TaskResult } from '../../stores/taskStore.types';
import {
  AGENT_STATUS_enum,
  TASK_STATUS_enum,
  WORKFLOW_STATUS_enum,
  FEEDBACK_STATUS_enum,
} from '../../utils/enums';
import { ThinkingResult } from '../../utils/llm.types';
import { CostResult, LLMUsageStats } from '../../utils/llmCostCalculator';
import { BaseWorkflowLog } from './common';

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
  metadata: {
    message?: string;
  };
}

export interface TaskCompletionLog extends BaseTaskLog {
  logType: 'TaskStatusUpdate';
  taskStatus: TASK_STATUS_enum;
  metadata: {
    message?: string;
    result: TaskResult;
    output?: ThinkingResult;
    llmUsageStats: LLMUsageStats;
    iterationCount: number;
    duration: number;
    costDetails: CostResult;
  };
}

export interface TaskAwaitingValidationLog extends BaseTaskLog {
  logType: 'TaskStatusUpdate';
  taskStatus: TASK_STATUS_enum;
  metadata: {
    message?: string;
    result: TaskResult;
    output?: ThinkingResult;
    llmUsageStats: LLMUsageStats;
    iterationCount: number;
    duration: number;
    costDetails: CostResult;
  };
}

export interface TaskErrorLog extends BaseTaskLog {
  logType: 'TaskStatusUpdate';
  taskStatus: TASK_STATUS_enum;
  metadata: {
    message?: string;
    error: Error;
    costDetails: CostResult;
    llmUsageStats: LLMUsageStats;
  };
}

export interface TaskBlockedLog extends BaseTaskLog {
  logType: 'TaskStatusUpdate';
  taskStatus: TASK_STATUS_enum;
  metadata: {
    message?: string;
    error: Error;
    costDetails: CostResult;
    llmUsageStats: LLMUsageStats;
  };
}

export interface TaskAbortedLog extends BaseTaskLog {
  logType: 'TaskStatusUpdate';
  taskStatus: TASK_STATUS_enum;
  metadata: {
    message?: string;
    error: Error;
    costDetails: CostResult;
    llmUsageStats: LLMUsageStats;
  };
}

export interface TaskPausedLog extends BaseTaskLog {
  logType: 'TaskStatusUpdate';
  taskStatus: TASK_STATUS_enum;
  metadata: {
    message?: string;
    error?: Error;
    costDetails: CostResult;
    llmUsageStats: LLMUsageStats;
  };
}

export interface TaskResumedLog extends BaseTaskLog {
  logType: 'TaskStatusUpdate';
  taskStatus: TASK_STATUS_enum;
  metadata: {
    message?: string;
  };
}

export interface TaskFeedbackLog extends BaseTaskLog {
  logType: 'TaskStatusUpdate';
  taskStatus: TASK_STATUS_enum;
  metadata: {
    message?: string;
    feedback: {
      content: string;
      status: FEEDBACK_STATUS_enum;
      timestamp: number;
    };
  };
}

export interface TaskValidatedLog extends BaseTaskLog {
  logType: 'TaskStatusUpdate';
  taskStatus: TASK_STATUS_enum;
  metadata: {
    message?: string;
  };
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
