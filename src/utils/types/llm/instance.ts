/**
 * @file instance.ts
 * @path src/utils/types/llm/instance.ts
 * @description LLM instance and runtime interfaces
 *
 * @packageDocumentation
 * @module @types/llm
 */

import { LLMResponse } from './responses';
import { LLMRuntimeOptions } from './providers';
import { StreamingChunk } from './responses';
import { Output } from './responses';

/**
 * Core LLM instance interface
 */
export interface LLMInstance {
    /**
     * Generate a response from the LLM
     * @param input Input text to process
     * @param options Runtime options
     */
    generate(input: string, options?: LLMRuntimeOptions): Promise<LLMResponse>;
    
    /**
     * Generate a streaming response
     * @param input Input text to process
     * @param options Runtime options
     */
    generateStream(input: string, options?: LLMRuntimeOptions): AsyncIterator<StreamingChunk>;
    
    /**
     * Validate instance configuration
     */
    validateConfig(): Promise<void>;
    
    /**
     * Cleanup instance resources
     */
    cleanup(): Promise<void>;
}

/**
 * Result of an agentic loop execution
 */
export interface AgenticLoopResult {
    /** Error message if execution failed */
    error?: string;
    
    /** Execution result */
    result?: Output | null;
    
    /** Execution metadata */
    metadata: {
        /** Number of iterations performed */
        iterations: number;
        
        /** Maximum allowed iterations */
        maxAgentIterations: number;
    };
}