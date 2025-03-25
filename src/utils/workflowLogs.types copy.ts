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
import { ToolResult } from '../tools/baseTool';

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
  inputs: Record<string, unknown>;
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
  error: Error;
  errorStack?: string;
} & WorkflowStats;

export type WorkflowOperationErrorMetadata = WorkflowBaseMetadata & {
  error: Error;
  message?: string;
  errorStack?: string;
};

export type WorkflowBlockedMetadata = WorkflowBaseMetadata & {
  error: Error;
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
  tool: string;
  input?: string | Record<string, unknown>;
};

export type AgentToolEndMetadata = WorkflowBaseMetadata & {
  output: ToolResult;
  tool: string;
};

export type AgentToolErrorMetadata = WorkflowBaseMetadata & {
  error: Error;
  tool: string;
};

export type AgentActionMetadata = WorkflowBaseMetadata & {
  output: ThinkingResult;
  tool: string;
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

export type AgentBaseMetadata =
  | AgentIterationMetadata
  | AgentBlockMetadata
  | AgentStartThinkingMetadata
  | AgentEndThinkingMetadata
  | AgentThoughtMetadata
  | AgentObservationMetadata
  | AgentWeirdLLMOutputMetadata
  | AgentFinalAnswerMetadata
  | AgentThinkingErrorMetadata
  | AgentLoopErrorMetadata
  | AgentIssuesParsingLLMOutputMetadata
  | AgentToolStartMetadata
  | AgentToolEndMetadata
  | AgentToolErrorMetadata
  | AgentActionMetadata
  | AgentPausedMetadata
  | AgentResumedMetadata
  | AgentTaskAbortedMetadata;

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

export type AgentTaskBlockedMetadata = WorkflowBaseMetadata & {
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

export type TaskBaseMetadata =
  | TaskStartedMetadata
  | TaskCompletionMetadata
  | TaskAwaitingValidationMetadata
  | TaskErrorMetadata
  | TaskBlockedMetadata
  | TaskAbortedMetadata
  | TaskPausedMetadata
  | TaskResumedMetadata
  | TaskFeedbackMetadata
  | TaskValidatedMetadata;

// Base workflow log interface with required fields and generic metadata
export interface BaseWorkflowLog<T extends WorkflowBaseMetadata> {
  timestamp: number;
  logDescription: string;
  logType: 'WorkflowStatusUpdate' | 'AgentStatusUpdate' | 'TaskStatusUpdate';
  workflowStatus?: WORKFLOW_STATUS_enum;
  metadata: T;
}

export type BaseAgentLog<T extends WorkflowBaseMetadata> =
  BaseWorkflowLog<T> & {
    task: Task;
    agent: Agent;
    taskStatus?: TASK_STATUS_enum;
    agentStatus?: AGENT_STATUS_enum;
  };

export type BaseTaskLog<T extends WorkflowBaseMetadata> = BaseAgentLog<T>;

// Workflow status update logs with specific metadata types
export type WorkflowInitialLog = BaseWorkflowLog<WorkflowInitialMetadata>;
export type WorkflowFinishedLog = BaseWorkflowLog<WorkflowFinishedMetadata>;
export type WorkflowResumedLog = BaseWorkflowLog<WorkflowResumedMetadata>;
export type WorkflowStoppingLog = BaseWorkflowLog<WorkflowStoppingMetadata>;
export type WorkflowStoppedLog = BaseWorkflowLog<WorkflowStoppedMetadata>;
export type WorkflowErrorLog = BaseWorkflowLog<WorkflowErrorMetadata>;
export type WorkflowOperationErrorLog =
  BaseWorkflowLog<WorkflowOperationErrorMetadata>;
export type WorkflowRunningLog = BaseWorkflowLog<WorkflowRunningMetadata>;
export type WorkflowBlockedLog = BaseWorkflowLog<WorkflowBlockedMetadata>;
export type WorkflowPausedLog = BaseWorkflowLog<WorkflowPausedMetadata>;
export type WorkflowResumeLog = BaseWorkflowLog<WorkflowResumeMetadata>;

// Agent status update logs with specific metadata types
export type AgentIterationLog = BaseAgentLog<AgentIterationMetadata>;
export type AgentBlockLog = BaseAgentLog<AgentBlockMetadata>;
export type AgentActionLog = BaseAgentLog<AgentActionMetadata>;
export type AgentStartThinkingLog = BaseAgentLog<AgentStartThinkingMetadata>;
export type AgentEndThinkingLog = BaseAgentLog<AgentEndThinkingMetadata>;
export type AgentFinalAnswerLog = BaseAgentLog<AgentFinalAnswerMetadata>;
export type AgentThoughtLog = BaseAgentLog<AgentThoughtMetadata>;
export type AgentObservationLog = BaseAgentLog<AgentObservationMetadata>;
export type AgentWeirdLLMOutputLog = BaseAgentLog<AgentWeirdLLMOutputMetadata>;
export type AgentThinkingErrorLog = BaseAgentLog<AgentThinkingErrorMetadata>;
export type AgentLoopErrorLog = BaseAgentLog<AgentLoopErrorMetadata>;
export type AgentIssuesParsingLLMOutputLog =
  BaseAgentLog<AgentIssuesParsingLLMOutputMetadata>;
export type AgentToolStartLog = BaseAgentLog<AgentToolStartMetadata>;
export type AgentToolEndLog = BaseAgentLog<AgentToolEndMetadata>;
export type AgentToolErrorLog = BaseAgentLog<AgentToolErrorMetadata>;
export type AgentPausedLog = BaseAgentLog<AgentPausedMetadata>;
export type AgentResumedLog = BaseAgentLog<AgentResumedMetadata>;
export type AgentTaskAbortedLog = BaseAgentLog<AgentTaskAbortedMetadata>;
export type AgentTaskBlockedLog = BaseAgentLog<AgentTaskBlockedMetadata>;

// Task status update logs with specific metadata types
export type TaskStartedLog = BaseTaskLog<TaskStartedMetadata>;
export type TaskCompletionLog = BaseTaskLog<TaskCompletionMetadata>;
export type TaskAwaitingValidationLog =
  BaseTaskLog<TaskAwaitingValidationMetadata>;
export type TaskErrorLog = BaseTaskLog<TaskErrorMetadata>;
export type TaskBlockedLog = BaseTaskLog<TaskBlockedMetadata>;
export type TaskAbortedLog = BaseTaskLog<TaskAbortedMetadata>;
export type TaskPausedLog = BaseTaskLog<TaskPausedMetadata>;
export type TaskResumedLog = BaseTaskLog<TaskResumedMetadata>;
export type TaskFeedbackLog = BaseTaskLog<TaskFeedbackMetadata>;
export type TaskValidatedLog = BaseTaskLog<TaskValidatedMetadata>;

// Union type for all workflow logs
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

// Update AgentStatusLog type
export type AgentStatusLog =
  | AgentIterationLog
  | AgentStartThinkingLog
  | AgentEndThinkingLog
  | AgentFinalAnswerLog
  | AgentThoughtLog
  | AgentObservationLog
  | AgentWeirdLLMOutputLog
  | AgentThinkingErrorLog
  | AgentBlockLog
  | AgentActionLog
  | AgentPausedLog
  | AgentResumedLog
  | AgentTaskAbortedLog;

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

export type WorkflowLogMetadata =
  | WorkflowBaseMetadata
  | AgentBaseMetadata
  | TaskBaseMetadata;

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
