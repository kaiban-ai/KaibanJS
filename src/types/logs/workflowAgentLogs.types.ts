import { Task } from '../../';
import { BaseAgent } from '../../agents/baseAgent';
import { WORKFLOW_AGENT_STATUS_enum } from '../../utils/enums';
import { TASK_STATUS_enum, WORKFLOW_STATUS_enum } from '../../utils/enums';

/**
 * Base interface for workflow agent logs
 */
export interface WorkflowAgentLog {
  timestamp: number;
  logDescription: string;
  metadata: Record<string, unknown>;
  logType: 'WorkflowAgentStatusUpdate';
  agent: BaseAgent;
  task: Task;
  agentName: string;
  taskTitle: string;
  agentStatus: WORKFLOW_AGENT_STATUS_enum;
  taskStatus: TASK_STATUS_enum;
  workflowStatus?: WORKFLOW_STATUS_enum;
}

/**
 * Workflow agent started log
 */
export interface WorkflowAgentStartedLog extends WorkflowAgentLog {
  metadata: {
    workflowId: string;
    runId: string;
    inputData?: any;
  };
}

/**
 * Workflow step started log
 */
export interface WorkflowAgentStepStartedLog extends WorkflowAgentLog {
  metadata: {
    workflowId: string;
    runId: string;
    stepId: string;
    stepDescription?: string;
    stepInput?: any;
  };
}

/**
 * Workflow step completed log
 */
export interface WorkflowAgentStepCompletedLog extends WorkflowAgentLog {
  metadata: {
    workflowId: string;
    runId: string;
    stepId: string;
    stepDescription?: string;
    stepOutput?: any;
    stepDuration?: number;
  };
}

/**
 * Workflow step failed log
 */
export interface WorkflowAgentStepFailedLog extends WorkflowAgentLog {
  metadata: {
    workflowId: string;
    runId: string;
    stepId: string;
    stepDescription?: string;
    error: Error;
    stepInput?: any;
  };
}

/**
 * Workflow step suspended log
 */
export interface WorkflowAgentStepSuspendedLog extends WorkflowAgentLog {
  metadata: {
    workflowId: string;
    runId: string;
    stepId: string;
    stepDescription?: string;
    suspendReason?: string;
    suspendData?: any;
  };
}

/**
 * Workflow running log
 */
export interface WorkflowAgentRunningLog extends WorkflowAgentLog {
  metadata: {
    workflowId: string;
    runId: string;
    currentStepId?: string;
    executionPath?: number[];
  };
}

/**
 * Workflow completed log
 */
export interface WorkflowAgentCompletedLog extends WorkflowAgentLog {
  metadata: {
    workflowId: string;
    runId: string;
    result: any;
    totalSteps: number;
    completedSteps: number;
    executionTime: number;
  };
}

/**
 * Workflow failed log
 */
export interface WorkflowAgentFailedLog extends WorkflowAgentLog {
  metadata: {
    workflowId: string;
    runId: string;
    error: Error;
    failedStepId?: string;
    executionPath?: number[];
  };
}

/**
 * Workflow suspended log
 */
export interface WorkflowAgentSuspendedLog extends WorkflowAgentLog {
  metadata: {
    workflowId: string;
    runId: string;
    suspendReason?: string;
    suspendedSteps?: string[];
    executionPath?: number[];
  };
}

/**
 * Workflow error log
 */
export interface WorkflowAgentErrorLog extends WorkflowAgentLog {
  metadata: {
    workflowId: string;
    runId: string;
    error: Error;
    context?: string;
    executionPath?: number[];
  };
}

/**
 * Workflow agent task completed log
 */
export interface WorkflowAgentTaskCompletedLog extends WorkflowAgentLog {
  metadata: {
    workflowId: string;
    runId: string;
    result: any;
    iterations: number;
    maxAgentIterations: number;
    executionTime: number;
  };
}

/**
 * Workflow agent task aborted log
 */
export interface WorkflowAgentTaskAbortedLog extends WorkflowAgentLog {
  metadata: {
    workflowId: string;
    runId: string;
    error: Error;
    reason?: string;
  };
}

/**
 * Workflow agent resumed log
 */
export interface WorkflowAgentResumedLog extends WorkflowAgentLog {
  metadata: {
    workflowId: string;
    runId: string;
  };
}

/**
 * Union type for all workflow agent logs
 */
export type WorkflowAgentStatusLog =
  | WorkflowAgentStartedLog
  | WorkflowAgentStepStartedLog
  | WorkflowAgentStepCompletedLog
  | WorkflowAgentStepFailedLog
  | WorkflowAgentStepSuspendedLog
  | WorkflowAgentRunningLog
  | WorkflowAgentCompletedLog
  | WorkflowAgentFailedLog
  | WorkflowAgentSuspendedLog
  | WorkflowAgentErrorLog
  | WorkflowAgentTaskCompletedLog
  | WorkflowAgentTaskAbortedLog
  | WorkflowAgentResumedLog;

/**
 * Parameters for creating new workflow agent status update logs
 */
export interface NewWorkflowAgentStatusUpdateLogParams<
  T extends WorkflowAgentStatusLog
> {
  agent: BaseAgent;
  task: Task;
  logDescription: string;
  workflowStatus?: WORKFLOW_STATUS_enum;
  taskStatus?: TASK_STATUS_enum;
  agentStatus?: WORKFLOW_AGENT_STATUS_enum;
  metadata: T['metadata'];
  logType?: T['logType'];
}
