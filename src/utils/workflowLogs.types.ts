/**
 * Workflow Log Type Definitions.
 *
 * This module defines the types used for workflow logging throughout the application.
 * It provides structured type definitions for various kinds of logs including workflow status,
 * task status, and agent status updates.
 */

import { ZodError, ZodSchema } from 'zod';
import { Agent, Task } from '..';
import {
  AGENT_STATUS_enum,
  TASK_STATUS_enum,
  WORKFLOW_STATUS_enum,
} from './enums';
import { CostResult, LLMUsageStats } from './llmCostCalculator';
import { ParsedLLMOutput, ThinkingResult } from './llm.types';
import { TaskResult } from '../stores/taskStore.types';
import { BaseTool, ToolResult } from '../tools/baseTool';
import { BaseAgent } from '../agents/baseAgent';

// Common types used across different metadata
export type Feedback = {
  content: string;
  status: string;
  timestamp: number;
};

export type LLMOutput = {
  parsedLLMOutput: ParsedLLMOutput;
  llmOutput: string;
  outputSchema?: ZodSchema;
  outputSchemaErrors?: ZodError;
};

// Base metadata type
export type WorkflowBaseMetadata = {
  message?: string;
};

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

// Agent-specific metadata types
export type AgentIterationMetadata = WorkflowBaseMetadata & {
  iterations: number;
  maxAgentIterations: number;
};

export type AgentBlockMetadata = WorkflowBaseMetadata & {
  isAgentDecision: boolean;
  blockReason: string;
  blockedBy: string;
};

export type AgentStartThinkingMetadata = WorkflowBaseMetadata & {
  messages: Array<{
    type: string;
    content: string;
  }>;
};

export type AgentEndThinkingMetadata = WorkflowBaseMetadata & {
  output: ThinkingResult;
};

export type AgentThoughtMetadata = WorkflowBaseMetadata & {
  output: ParsedLLMOutput;
};

export type AgentObservationMetadata = WorkflowBaseMetadata & {
  output: ParsedLLMOutput;
};

export type AgentWeirdLLMOutputMetadata = WorkflowBaseMetadata & {
  output: ParsedLLMOutput;
};

export type AgentFinalAnswerMetadata = WorkflowBaseMetadata & {
  output: ParsedLLMOutput;
};

export type AgentThinkingErrorMetadata = WorkflowBaseMetadata & {
  error: Error;
};

export type AgentLoopErrorMetadata = WorkflowBaseMetadata & {
  error: Error;
  iterations: number;
  maxAgentIterations: number;
};

export type AgentIssuesParsingLLMOutputMetadata = WorkflowBaseMetadata & {
  output: ThinkingResult;
  error: Error;
};

export type AgentToolStartMetadata = WorkflowBaseMetadata & {
  tool: BaseTool;
  input?: string | Record<string, unknown>;
};

export type AgentToolEndMetadata = WorkflowBaseMetadata & {
  output: ToolResult;
};

export type AgentToolDoesNotExistMetadata = WorkflowBaseMetadata & {
  toolName: string;
};

export type AgentToolErrorMetadata = WorkflowBaseMetadata & {
  error: Error;
  tool: string;
};

export type AgentActionMetadata = WorkflowBaseMetadata & {
  output: ThinkingResult;
  tool: BaseTool;
  toolName: string;
  thought: string;
};

export type AgentPausedMetadata = WorkflowBaseMetadata & {
  error?: Error;
};

export type AgentResumedMetadata = WorkflowBaseMetadata & {
  error?: Error;
};

export type AgentTaskAbortedMetadata = WorkflowBaseMetadata & {
  error: Error;
};

export type AgentTaskCompletedMetadata = WorkflowBaseMetadata & {
  result: TaskResult;
  iterations: number;
  maxAgentIterations: number;
};

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

// Base log interfaces
export interface BaseWorkflowLog {
  timestamp: number;
  logDescription: string;
  logType: 'WorkflowStatusUpdate' | 'AgentStatusUpdate' | 'TaskStatusUpdate';
  workflowStatus?: WORKFLOW_STATUS_enum;
}

export interface BaseAgentLog extends BaseWorkflowLog {
  task: Task;
  agent: BaseAgent;
  taskStatus: TASK_STATUS_enum;
  agentStatus: AGENT_STATUS_enum;
}

export interface BaseTaskLog extends BaseWorkflowLog {
  task: Task;
  agent: Agent;
  taskStatus?: TASK_STATUS_enum;
  agentStatus?: AGENT_STATUS_enum;
}

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

// Agent status update logs
export interface AgentIterationLog extends BaseAgentLog {
  logType: 'AgentStatusUpdate';
  agentStatus: AGENT_STATUS_enum;
  metadata: AgentIterationMetadata;
}

export interface AgentBlockLog extends BaseAgentLog {
  logType: 'AgentStatusUpdate';
  agentStatus: AGENT_STATUS_enum;
  metadata: AgentBlockMetadata;
}

export interface AgentActionLog extends BaseAgentLog {
  logType: 'AgentStatusUpdate';
  agentStatus: AGENT_STATUS_enum;
  metadata: AgentActionMetadata;
}

export interface AgentStartThinkingLog extends BaseAgentLog {
  logType: 'AgentStatusUpdate';
  agentStatus: AGENT_STATUS_enum;
  metadata: AgentStartThinkingMetadata;
}

export interface AgentEndThinkingLog extends BaseAgentLog {
  logType: 'AgentStatusUpdate';
  agentStatus: AGENT_STATUS_enum;
  metadata: AgentEndThinkingMetadata;
}

export interface AgentFinalAnswerLog extends BaseAgentLog {
  logType: 'AgentStatusUpdate';
  agentStatus: AGENT_STATUS_enum;
  metadata: AgentFinalAnswerMetadata;
}

export interface AgentThoughtLog extends BaseAgentLog {
  logType: 'AgentStatusUpdate';
  agentStatus: AGENT_STATUS_enum;
  metadata: AgentThoughtMetadata;
}

export interface AgentObservationLog extends BaseAgentLog {
  logType: 'AgentStatusUpdate';
  agentStatus: AGENT_STATUS_enum;
  metadata: AgentObservationMetadata;
}

export interface AgentWeirdLLMOutputLog extends BaseAgentLog {
  logType: 'AgentStatusUpdate';
  agentStatus: AGENT_STATUS_enum;
  metadata: AgentWeirdLLMOutputMetadata;
}

export interface AgentThinkingErrorLog extends BaseAgentLog {
  logType: 'AgentStatusUpdate';
  agentStatus: AGENT_STATUS_enum;
  metadata: AgentThinkingErrorMetadata;
}

export interface AgentLoopErrorLog extends BaseAgentLog {
  logType: 'AgentStatusUpdate';
  agentStatus: AGENT_STATUS_enum;
  metadata: AgentLoopErrorMetadata;
}

export interface AgentIssuesParsingLLMOutputLog extends BaseAgentLog {
  logType: 'AgentStatusUpdate';
  agentStatus: AGENT_STATUS_enum;
  metadata: AgentIssuesParsingLLMOutputMetadata;
}

export interface AgentToolStartLog extends BaseAgentLog {
  logType: 'AgentStatusUpdate';
  agentStatus: AGENT_STATUS_enum;
  metadata: AgentToolStartMetadata;
}

export interface AgentToolEndLog extends BaseAgentLog {
  logType: 'AgentStatusUpdate';
  agentStatus: AGENT_STATUS_enum;
  metadata: AgentToolEndMetadata;
}

export interface AgentToolErrorLog extends BaseAgentLog {
  logType: 'AgentStatusUpdate';
  agentStatus: AGENT_STATUS_enum;
  metadata: AgentToolErrorMetadata;
}

export interface AgentToolDoesNotExistLog extends BaseAgentLog {
  logType: 'AgentStatusUpdate';
  agentStatus: AGENT_STATUS_enum;
  metadata: AgentToolDoesNotExistMetadata;
}

export interface AgentPausedLog extends BaseAgentLog {
  logType: 'AgentStatusUpdate';
  agentStatus: AGENT_STATUS_enum;
  metadata: AgentPausedMetadata;
}

export interface AgentResumedLog extends BaseAgentLog {
  logType: 'AgentStatusUpdate';
  agentStatus: AGENT_STATUS_enum;
  metadata: AgentResumedMetadata;
}

export interface AgentTaskAbortedLog extends BaseAgentLog {
  logType: 'AgentStatusUpdate';
  agentStatus: AGENT_STATUS_enum;
  metadata: AgentTaskAbortedMetadata;
}

export interface AgentTaskCompletedLog extends BaseAgentLog {
  logType: 'AgentStatusUpdate';
  agentStatus: AGENT_STATUS_enum;
  metadata: AgentTaskCompletedMetadata;
}

// Task status update logs
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

// Union types for all workflow logs
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

export type AgentStatusLog =
  | AgentIterationLog
  | AgentStartThinkingLog
  | AgentEndThinkingLog
  | AgentFinalAnswerLog
  | AgentThoughtLog
  | AgentObservationLog
  | AgentWeirdLLMOutputLog
  | AgentThinkingErrorLog
  | AgentToolDoesNotExistLog
  | AgentToolErrorLog
  | AgentToolStartLog
  | AgentToolEndLog
  | AgentBlockLog
  | AgentActionLog
  | AgentPausedLog
  | AgentResumedLog
  | AgentTaskAbortedLog
  | AgentTaskCompletedLog;

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

export type WorkflowLog = WorkflowStatusLog | AgentStatusLog | TaskStatusLog;

export type WorkflowLogMetadata = WorkflowBaseMetadata;

/**
 * Interface for workflow statistics
 */
export interface WorkflowStats {
  startTime: number;
  endTime: number;
  duration: number;
  llmUsageStats: {
    inputTokens: number;
    outputTokens: number;
    callsCount: number;
    callsErrorCount: number;
    parsingErrors: number;
  };
  iterationCount: number;
  costDetails: {
    costInputTokens: number;
    costOutputTokens: number;
    totalCost: number;
  };
  teamName: string;
  taskCount: number;
  agentCount: number;
}

/**
 * Interface for workflow result
 */
export interface WorkflowResult {
  status: string;
  result: TaskResult | null;
  stats: WorkflowStats | null;
}
