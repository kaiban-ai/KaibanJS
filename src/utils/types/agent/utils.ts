/**
 * @file utils.ts
 * @path KaibanJS/src/utils/types/agent/utils.ts
 * @description Type definitions for agent utilities
 */

/**
 * Required attributes for agent operations
 */
export interface AgentAttributes {
    /** Agent name */
    name: string;
    
    /** Agent role */
    role: string;
    
    /** Agent background */
    background: string;
    
    /** Agent goal */
    goal: string;
    
    /** Optional context */
    context?: string;
    
    /** Expected output format */
    expectedOutput?: string;
}

/**
 * API key configuration
 */
export interface ApiKeyConfig {
    /** API key value */
    apiKey?: string;
    
    /** Provider identifier */
    provider?: string;
}

/**
 * Template replacement options
 */
export interface TemplateOptions {
    /** Whether to throw on missing attributes */
    strict?: boolean;
    
    /** Custom placeholder format */
    placeholderFormat?: 'braces' | 'dollars' | 'custom';
    
    /** Custom placeholder pattern if format is 'custom' */
    customPattern?: RegExp;
}