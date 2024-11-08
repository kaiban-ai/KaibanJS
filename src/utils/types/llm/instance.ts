/**
 * @file instance.ts
 * @description Interfaces for defining LLM instances and runtime behavior.
 *
 * @module @types/llm
 */

import { LLMResponse, StreamingChunk, Output } from './responses';
import { LLMRuntimeOptions } from './common';

// Core LLM instance interface
export interface LLMInstance {
    generate(input: string, options?: LLMRuntimeOptions): Promise<LLMResponse>;
    generateStream(input: string, options?: LLMRuntimeOptions): AsyncIterator<StreamingChunk>;
    validateConfig(): Promise<void>;
    cleanup(): Promise<void>;
}

// Result of an agentic loop execution
export interface AgenticLoopResult {
    error?: string;
    result?: Output | null;
    metadata: {
        iterations: number;
        maxAgentIterations: number;
    };
}
