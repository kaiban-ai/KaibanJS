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
  teamName: string;
  taskCount: number;
  agentCount: number;
  errorStack?: string;
};

export type WorkflowOperationErrorMetadata = WorkflowBaseMetadata & {
  error: Error;
  message?: string;
  errorStack?: string;
};

export type WorkflowBlockedMetadata = WorkflowBaseMetadata & {
  error: Error;
  teamName: string;
  taskCount: number;
  agentCount: number;
};

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

// Task-specific metadata types
export type TaskCompletionMetadata = WorkflowBaseMetadata & {
  result: TaskResult;
  output?: ThinkingResult;
  llmUsageStats: LLMUsageStats;
  iterationCount: number;
  duration: number;
  costDetails: CostResult;
};

export type TaskValidationMetadata = WorkflowBaseMetadata & {
  output: ParsedLLMOutput | ThinkingResult | TaskResult;
  feedback?: Feedback;
};

// Base workflow log interface with required fields and generic metadata
export interface BaseWorkflowLog<T extends WorkflowBaseMetadata> {
  timestamp: number;
  logDescription: string;
  logType: 'WorkflowStatusUpdate' | 'AgentStatusUpdate' | 'TaskStatusUpdate';
  workflowStatus?: WORKFLOW_STATUS_enum;
  metadata: T;
}

export type WorkflowExecutionLog<T extends WorkflowBaseMetadata> =
  BaseWorkflowLog<T> & {
    task: Task;
    agent: Agent;
    taskStatus?: TASK_STATUS_enum;
    agentStatus?: AGENT_STATUS_enum;
  };

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
export type AgentIterationLog = WorkflowExecutionLog<AgentIterationMetadata>;
export type AgentBlockLog = WorkflowExecutionLog<AgentBlockMetadata>;
export type AgentActionLog = WorkflowExecutionLog<AgentActionMetadata>;
export type AgentPausedLog = WorkflowExecutionLog<AgentPausedMetadata>;
export type AgentResumedLog = WorkflowExecutionLog<AgentResumedMetadata>;

// Task status update logs with specific metadata types
export type TaskCompletionLog = WorkflowExecutionLog<TaskCompletionMetadata>;
export type TaskValidationLog = WorkflowExecutionLog<TaskValidationMetadata>;

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
  | AgentBlockLog
  | AgentActionLog
  | AgentPausedLog
  | AgentResumedLog;

export type TaskStatusLog = TaskCompletionLog | TaskValidationLog;

export type WorkflowLog = WorkflowStatusLog | AgentStatusLog | TaskStatusLog;

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
  result: unknown;
  stats: WorkflowStats | null;
}

// /**
//  * Metadata for workflow logs
//  */
// export interface WorkflowLogMetadata {
//   // Timing and performance
//   startTime?: number;
//   endTime?: number;
//   duration?: number;
//   iterations?: number;
//   maxAgentIterations?: number;
//   iterationCount?: number;

//   // LLM and cost related
//   llmUsageStats?: LLMUsageStats;
//   costDetails?: CostResult;

//   // Task and agent related
//   teamName?: string;
//   taskCount?: number;
//   agentCount?: number;

//   // Results and messages
//   message?: string;
//   result?: Record<string, unknown> | string;
//   error?: LLMInvocationError | Error;
//   inputs?: Record<string, unknown>;
//   input?: Record<string, unknown> | string;
//   output?: ParsedLLMOutput | ThinkingResult | Record<string, unknown>;
//   tool?: string;
//   thought?: string;
//   question?: string;

//   // Messages and parsing
//   messages?: Array<{ type: string; content: string }>;
//   outputSchema?: ZodSchema;
//   outputSchemaErrors?: ZodError;
//   parsedLLMOutput?: ParsedLLMOutput;
//   llmOutput?: string;

//   // Feedback related
//   feedback?: {
//     content: string;
//     status: string;
//     timestamp: number;
//   };
// }

// /**
//  * Log type for workflow events
//  */
// export interface WorkflowLog {
//   task?: Task;
//   agent?: Agent;
//   timestamp: number;
//   logDescription: string;
//   workflowStatus?: string;
//   taskStatus?: string;
//   agentStatus?: AGENT_STATUS_enum;
//   metadata?: WorkflowLogMetadata;
//   logType: string;
// }
