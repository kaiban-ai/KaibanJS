import { Tool } from "langchain/tools";
import type { AGENT_STATUS_enum } from "./enums.d.ts";

/**
 * Implement various stores later on.
 */
export type TStore = any;

/**
 * Used to define various types of agents.
 */
export type TAgentTypes = "ReactChampionAgent";

/**
 * Used to reference the core BaseAgent class type.
 */
export class BaseAgent {
  id: string;
  store: TStore;
  status: AGENT_STATUS_enum;
  env: Record<string, any> | null;
  llmSystemMessage: string;

  name: string;
  role: string;
  goal: string;
  background: string;
  tools: Tool[];
  llmConfig: ILLMConfig;
  maxIterations: number;
  forceFinalAnswer: boolean;
}

/**
 * An object for the various api keys.
 */
export interface IApiKeys {
  openai?: string;
  google?: string;
  anthropic?: string;
  mistral?: string;
}

/**
 * LLM configuration object.
 */
export interface ILLMConfig {
  provider: "openai" | "google" | "anthropic" | "mistral";
  model: string;
  maxRetries: number;
  apiKey?: IApiKeys;
}

/**
 * BaseAgent params.
 */
export interface IBaseAgentParams {
  name: string;
  role: string;
  goal: string;
  background: string;
  tools?: Tool[];
  llmConfig?: ILLMConfig;
  maxIterations?: number;
  forceFinalAnswer?: boolean;
}

/**
 * LLM usage stats.
 */
export interface ILLMUsageStats {
  inputTokens: number;
  outputTokens: number;
  callsCount: number;
  callsErrorCount: number;
  parsingErrors: number;
}

/**
 * Task stats.
 */
export interface ITaskStats {
  startTime: number;
  endTime: number;
  duration: number;
  llmUsageStats: ILLMUsageStats;
  iterationCount: number;
}
