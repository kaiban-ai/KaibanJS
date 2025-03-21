import { LLMResult } from '@langchain/core/outputs';
import { ZodError, ZodSchema } from 'zod';
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
  outputSchema?: ZodSchema;
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
