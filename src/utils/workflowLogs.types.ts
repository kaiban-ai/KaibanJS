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

// Specific metadata types for different workflow statuses
export type BaseMetadata = {
  message?: string;
};

export type InitialMetadata = BaseMetadata & {
  message: string;
  inputs: Record<string, unknown>;
};

export type FinishedMetadata = BaseMetadata & {
  result: string | Record<string, unknown>;
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

export type ErrorMetadata = BaseMetadata & {
  error: Error;
  teamName: string;
  taskCount: number;
  agentCount: number;
  errorStack?: string;
};

export type OperationErrorMetadata = BaseMetadata & {
  error: Error;
  message?: string;
  errorStack?: string;
};

export type BlockedMetadata = BaseMetadata & {
  error: Error;
  teamName: string;
  taskCount: number;
  agentCount: number;
};

export type StoppingMetadata = BaseMetadata & {
  message: string;
  previousStatus: WORKFLOW_STATUS_enum;
};

export type StoppedMetadata = BaseMetadata & {
  message: string;
  previousStatus: WORKFLOW_STATUS_enum;
  tasksReset: number;
};

export type ResumedMetadata = BaseMetadata & {
  message: string;
  resumedAt: string;
  previousStatus: WORKFLOW_STATUS_enum;
};

export type RunningMetadata = BaseMetadata & {
  message?: string;
  inputs?: Record<string, unknown>;
  feedback?: Feedback;
};

// Agent-specific metadata types
export type AgentIterationMetadata = BaseMetadata & {
  iterations: number;
  maxAgentIterations: number;
};

export type AgentBlockMetadata = BaseMetadata & {
  isAgentDecision: boolean;
  blockReason: string;
  blockedBy: string;
};

export type AgentActionMetadata = BaseMetadata & {
  output: ParsedLLMOutput | ThinkingResult | Record<string, unknown>;
  tool: string;
  toolName: string;
  thought: string;
};

// Task-specific metadata types
export type TaskCompletionMetadata = BaseMetadata & {
  result: string | Record<string, unknown>;
  output?: ParsedLLMOutput | ThinkingResult | Record<string, unknown>;
  llmUsageStats: LLMUsageStats;
  iterationCount: number;
  duration: number;
  costDetails: CostResult;
};

export type TaskValidationMetadata = BaseMetadata & {
  output: ParsedLLMOutput | ThinkingResult | Record<string, unknown>;
  feedback?: Feedback;
};

// Base workflow log interface with required fields and generic metadata
export interface BaseWorkflowLog<T extends BaseMetadata> {
  timestamp: number;
  logDescription: string;
  logType: 'WorkflowStatusUpdate' | 'AgentStatusUpdate' | 'TaskStatusUpdate';
  workflowStatus?: WORKFLOW_STATUS_enum;
  metadata: T;
}

export type WorkflowExecutionLog<T extends BaseMetadata> =
  BaseWorkflowLog<T> & {
    task: Task;
    agent: Agent;
    taskStatus?: TASK_STATUS_enum;
    agentStatus?: AGENT_STATUS_enum;
  };

// Workflow status update logs with specific metadata types
export type WorkflowInitialLog = BaseWorkflowLog<InitialMetadata>;
export type WorkflowFinishedLog = BaseWorkflowLog<FinishedMetadata>;
export type WorkflowResumedLog = BaseWorkflowLog<ResumedMetadata>;
export type WorkflowStoppingLog = BaseWorkflowLog<StoppingMetadata>;
export type WorkflowStoppedLog = BaseWorkflowLog<StoppedMetadata>;
export type WorkflowErrorLog = BaseWorkflowLog<ErrorMetadata>;
export type WorkflowOperationErrorLog = BaseWorkflowLog<OperationErrorMetadata>;
export type WorkflowRunningLog = BaseWorkflowLog<RunningMetadata>;
export type WorkflowBlockedLog = BaseWorkflowLog<BlockedMetadata>;

// Agent status update logs with specific metadata types
export type AgentIterationLog = WorkflowExecutionLog<AgentIterationMetadata>;
export type AgentBlockLog = WorkflowExecutionLog<AgentBlockMetadata>;
export type AgentActionLog = WorkflowExecutionLog<AgentActionMetadata>;

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
  | WorkflowStoppingLog;

export type PausedMetadata = BaseMetadata & {
  error?: Error;
};

export type ResumeMetadata = BaseMetadata & {
  error?: Error;
};

// Agent-specific metadata types
export type AgentPausedLog = WorkflowExecutionLog<PausedMetadata>;
export type AgentResumedLog = WorkflowExecutionLog<ResumeMetadata>;

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
  result: any;
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
