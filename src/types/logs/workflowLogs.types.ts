import { TaskResult } from '../../stores/taskStore.types';
import { WORKFLOW_STATUS_enum } from '../../utils/enums';
import { CostResult, LLMUsageStats } from '../../utils/llmCostCalculator';
import {
  BaseWorkflowLog,
  Feedback,
  WorkflowBaseMetadata,
  WorkflowStats,
} from './common';

// Workflow-specific metadata types
export type WorkflowInitialMetadata = WorkflowBaseMetadata & {
  message: string;
  inputs?: Record<string, unknown> | null;
};

export type WorkflowFinishedMetadata = WorkflowBaseMetadata & {
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

export type WorkflowErrorMetadata = WorkflowBaseMetadata & {
  error: string;
  errorStack?: string;
} & WorkflowStats;

export type WorkflowOperationErrorMetadata = WorkflowBaseMetadata & {
  error: string;
  message?: string;
  errorStack?: string;
};

export type WorkflowBlockedMetadata = WorkflowBaseMetadata & {
  error: string;
} & WorkflowStats;

export type WorkflowStoppingMetadata = WorkflowBaseMetadata & {
  message: string;
  previousStatus: WORKFLOW_STATUS_enum;
};

export type WorkflowStoppedMetadata = WorkflowBaseMetadata & {
  message: string;
  previousStatus: WORKFLOW_STATUS_enum;
  tasksReset: number;
};

export type WorkflowResumedMetadata = WorkflowBaseMetadata & {
  message: string;
  resumedAt: string;
  previousStatus: WORKFLOW_STATUS_enum;
};

export type WorkflowRunningMetadata = WorkflowBaseMetadata & {
  message?: string;
  inputs?: Record<string, unknown>;
  feedback?: Feedback;
};

export type WorkflowPausedMetadata = WorkflowBaseMetadata & {
  error?: Error;
};

export type WorkflowResumeMetadata = WorkflowBaseMetadata & {
  error?: Error;
};

// Workflow status update logs
export interface WorkflowInitialLog extends BaseWorkflowLog {
  logType: 'WorkflowStatusUpdate';
  workflowStatus: WORKFLOW_STATUS_enum;
  metadata: WorkflowInitialMetadata;
}

export interface WorkflowFinishedLog extends BaseWorkflowLog {
  logType: 'WorkflowStatusUpdate';
  workflowStatus: WORKFLOW_STATUS_enum;
  metadata: WorkflowFinishedMetadata;
}

export interface WorkflowResumedLog extends BaseWorkflowLog {
  logType: 'WorkflowStatusUpdate';
  workflowStatus: WORKFLOW_STATUS_enum;
  metadata: WorkflowResumedMetadata;
}

export interface WorkflowStoppingLog extends BaseWorkflowLog {
  logType: 'WorkflowStatusUpdate';
  workflowStatus: WORKFLOW_STATUS_enum;
  metadata: WorkflowStoppingMetadata;
}

export interface WorkflowStoppedLog extends BaseWorkflowLog {
  logType: 'WorkflowStatusUpdate';
  workflowStatus: WORKFLOW_STATUS_enum;
  metadata: WorkflowStoppedMetadata;
}

export interface WorkflowErrorLog extends BaseWorkflowLog {
  logType: 'WorkflowStatusUpdate';
  workflowStatus: WORKFLOW_STATUS_enum;
  metadata: WorkflowErrorMetadata;
}

export interface WorkflowOperationErrorLog extends BaseWorkflowLog {
  logType: 'WorkflowStatusUpdate';
  workflowStatus: WORKFLOW_STATUS_enum;
  metadata: WorkflowOperationErrorMetadata;
}

export interface WorkflowRunningLog extends BaseWorkflowLog {
  logType: 'WorkflowStatusUpdate';
  workflowStatus: WORKFLOW_STATUS_enum;
  metadata: WorkflowRunningMetadata;
}

export interface WorkflowBlockedLog extends BaseWorkflowLog {
  logType: 'WorkflowStatusUpdate';
  workflowStatus: WORKFLOW_STATUS_enum;
  metadata: WorkflowBlockedMetadata;
}

export interface WorkflowPausedLog extends BaseWorkflowLog {
  logType: 'WorkflowStatusUpdate';
  workflowStatus: WORKFLOW_STATUS_enum;
  metadata: WorkflowPausedMetadata;
}

export interface WorkflowResumeLog extends BaseWorkflowLog {
  logType: 'WorkflowStatusUpdate';
  workflowStatus: WORKFLOW_STATUS_enum;
  metadata: WorkflowResumeMetadata;
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
