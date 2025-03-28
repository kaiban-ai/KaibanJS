import { LLMResult } from '@langchain/core/outputs';
import { ZodError, ZodSchema } from 'zod';
import { ToolResult } from '../tools/baseTool';
/** Supported LLM providers */
export type LLMProvider = string;
export type ModelCode = string;

/**
 * Parsed output from the LLM
 */
export interface ParsedLLMOutput {
  // Action related
  action?: string;
  actionInput?: Record<string, unknown> | string | null;

  // Final answer related
  finalAnswer?: Record<string, unknown> | string;
  isValidOutput?: boolean;
  outputSchema?: ZodSchema | null;
  outputSchemaErrors?: ZodError;

  // Thinking related
  thought?: string;
  observation?: string;
}

export type ThinkingResult = {
  parsedLLMOutput: ParsedLLMOutput;
  llmOutput: string;
  llmUsageStats: {
    inputTokens: number;
    outputTokens: number;
  };
};

export type LLMOutput = LLMResult;

/**
 * Metadata about the agent's execution
 */
type AgentLoopMetadata = {
  /** Number of iterations performed */
  iterations: number;
  /** Maximum number of iterations allowed */
  maxAgentIterations: number;
};

/**
 * Result of a successful agent execution
 */
type AgentLoopSuccess = {
  result: ParsedLLMOutput | null;
  error?: never;
  metadata: AgentLoopMetadata;
};

/**
 * Result of a failed agent execution
 */
type AgentLoopError = {
  result?: never;
  error: string;
  metadata: AgentLoopMetadata;
};

/**
 * Combined type representing all possible outcomes of an agent's execution loop
 */
export type AgentLoopResult = AgentLoopSuccess | AgentLoopError;

export type ThinkingPromise = {
  promise: Promise<ThinkingResult>;
  reject: (error: Error) => void;
};

export type ToolCallingPromise = {
  promise: Promise<ToolResult>;
  reject: (error: Error) => void;
};
