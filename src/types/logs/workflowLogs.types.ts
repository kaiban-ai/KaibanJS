import { TaskResult } from '../../stores/taskStore.types';
import { WORKFLOW_STATUS_enum } from '../../utils/enums';
import { CostResult, LLMUsageStats } from '../../utils/llmCostCalculator';
import { BaseWorkflowLog, Feedback, WorkflowStats } from './common';

// Workflow status update logs
export interface WorkflowInitialLog extends BaseWorkflowLog {
  logType: 'WorkflowStatusUpdate';
  workflowStatus: WORKFLOW_STATUS_enum;
  metadata: {
    message: string;
    inputs?: Record<string, unknown> | null;
  };
}

export interface WorkflowFinishedLog extends BaseWorkflowLog {
  logType: 'WorkflowStatusUpdate';
  workflowStatus: WORKFLOW_STATUS_enum;
  metadata: {
    message?: string;
    result: TaskResult | null;
    teamName: string;
    taskCount: number;
    agentCount: number;
    startTime: number;
    endTime: number;
    duration: number;
    llmUsageStats: LLMUsageStats;
    iterationCount: number;
    costDetails: CostResult;
  };
}

export interface WorkflowResumedLog extends BaseWorkflowLog {
  logType: 'WorkflowStatusUpdate';
  workflowStatus: WORKFLOW_STATUS_enum;
  metadata: {
    message: string;
    resumedAt: string;
    previousStatus: WORKFLOW_STATUS_enum;
  };
}

export interface WorkflowStoppingLog extends BaseWorkflowLog {
  logType: 'WorkflowStatusUpdate';
  workflowStatus: WORKFLOW_STATUS_enum;
  metadata: {
    message: string;
    previousStatus: WORKFLOW_STATUS_enum;
  };
}

export interface WorkflowStoppedLog extends BaseWorkflowLog {
  logType: 'WorkflowStatusUpdate';
  workflowStatus: WORKFLOW_STATUS_enum;
  metadata: {
    message: string;
    previousStatus: WORKFLOW_STATUS_enum;
    tasksReset: number;
  };
}

export interface WorkflowErrorLog extends BaseWorkflowLog {
  logType: 'WorkflowStatusUpdate';
  workflowStatus: WORKFLOW_STATUS_enum;
  metadata: {
    message?: string;
    error: string;
    errorStack?: string;
  } & WorkflowStats;
}

export interface WorkflowOperationErrorLog extends BaseWorkflowLog {
  logType: 'WorkflowStatusUpdate';
  workflowStatus: WORKFLOW_STATUS_enum;
  metadata: {
    message?: string;
    error: string;
    errorStack?: string;
  };
}

export interface WorkflowRunningLog extends BaseWorkflowLog {
  logType: 'WorkflowStatusUpdate';
  workflowStatus: WORKFLOW_STATUS_enum;
  metadata: {
    message?: string;
    inputs?: Record<string, unknown>;
    feedback?: Feedback;
  };
}

export interface WorkflowBlockedLog extends BaseWorkflowLog {
  logType: 'WorkflowStatusUpdate';
  workflowStatus: WORKFLOW_STATUS_enum;
  metadata: {
    message?: string;
    error: string;
  } & WorkflowStats;
}

export interface WorkflowPausedLog extends BaseWorkflowLog {
  logType: 'WorkflowStatusUpdate';
  workflowStatus: WORKFLOW_STATUS_enum;
  metadata: {
    message?: string;
    error?: Error;
  };
}

export interface WorkflowResumeLog extends BaseWorkflowLog {
  logType: 'WorkflowStatusUpdate';
  workflowStatus: WORKFLOW_STATUS_enum;
  metadata: {
    message?: string;
    error?: Error;
  };
}

export type WorkflowStatusLog =
  | WorkflowInitialLog
  | WorkflowFinishedLog
  | WorkflowErrorLog
  | WorkflowOperationErrorLog
  | WorkflowBlockedLog
  | WorkflowStoppedLog
  | WorkflowResumedLog
  | WorkflowRunningLog
  | WorkflowStoppingLog
  | WorkflowPausedLog
  | WorkflowResumeLog;
