/**
* @file llmBaseTypes.ts
* @path src/types/llm/llmBaseTypes.ts
* @description Base types and utilities for LLM configuration, response handling, and type guards
*
* @module @types/llm
*/

import { LLM_PROVIDER_enum } from '../common/enumTypes';
import { IHandlerResult, IBaseHandlerMetadata } from '../common/baseTypes';
import { IBaseError } from '../common/errorTypes';
import { IResourceMetrics } from '../metrics/base/resourceMetrics';
import { IUsageMetrics } from '../metrics/base/usageMetrics';

// ─── LLM Configuration Interface ─────────────────────────────────────────────────

export interface ILLMConfig {
  provider: LLM_PROVIDER_enum;
  apiKey?: string;
  model?: string;
  temperature?: number;
  streaming?: boolean;
  apiBaseUrl?: string;
  maxRetries?: number;
  timeout?: number;
  maxConcurrency?: number;
  headers?: Record<string, string>;
}

// ─── LLM Response Interface ────────────────────────────────────────────────────

export interface ILLMResponse<T = unknown> {
  content: string;
  rawOutput: T;
  metrics: {
    resources: IResourceMetrics;
    usage: IUsageMetrics;
  };
  metadata: {
    model: string;
    provider: LLM_PROVIDER_enum;
    timestamp: number;
    latency: number;
    finishReason?: string;
    requestId?: string;
  };
}

// ─── LLM Result Interface ──────────────────────────────────────────────────────

export interface ILLMResultMetadata extends IBaseHandlerMetadata {
  model: string;
  latency: number;
}

export interface ILLMResult extends IHandlerResult {
  output?: string;
  error?: IBaseError;
  metadata: ILLMResultMetadata;
}

// ─── Streaming Options Interface ───────────────────────────────────────────────

export interface IStreamingOptions {
  onToken?: (token: string) => void;
  onComplete?: (content: string) => void;
  onError?: (error: IBaseError) => void;
  timeoutMs?: number;
  signal?: AbortSignal;
}

// ─── Type Guards ─────────────────────────────────────────────────────────────

export const ILLMTypeGuards = {
  isLLMConfig: (value: unknown): value is ILLMConfig => {
    if (typeof value !== "object" || value === null) return false;
    const config = value as Partial<ILLMConfig>;
    return typeof config.provider === "string";
  },

  isLLMResponse: <T>(value: unknown): value is ILLMResponse<T> => {
    if (typeof value !== "object" || value === null) return false;
    const response = value as Partial<ILLMResponse<T>>;
    return (
      typeof response.content === "string" &&
      "rawOutput" in response &&
      typeof response.metadata === "object" &&
      response.metadata !== null
    );
  },
};
