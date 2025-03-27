import { ZodError, ZodSchema } from 'zod';
import { ParsedLLMOutput } from '../../utils/llm.types';
import { CostResult, LLMUsageStats } from '../../utils/llmCostCalculator';

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

// Common metadata with cost information
export type CostMetadata = WorkflowBaseMetadata & {
  costDetails: CostResult;
  llmUsageStats: LLMUsageStats;
};

// Common stats interface
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

// Common result interface
export interface WorkflowResult {
  status: string;
  result: unknown | null;
  stats: WorkflowStats | null;
}

export interface BaseWorkflowLog {
  timestamp: number;
  logDescription: string;
  logType: 'WorkflowStatusUpdate' | 'AgentStatusUpdate' | 'TaskStatusUpdate';
}

export type WorkflowLogMetadata = WorkflowBaseMetadata;
