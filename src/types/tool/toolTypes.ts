/**
 * @file toolTypes.ts
 * @path KaibanJS/src/types/tool/toolTypes.ts
 * @description Tool type definitions and type guards for langchain tools
 *
 * @module types/tool
 */

import { StructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { IErrorType } from "../common/commonErrorTypes";
import { IValidationResult } from "../common/commonValidationTypes";
import { createValidationResult } from "@utils/validation/validationUtils";

/**
 * Standard tool names supported by the system
 */
export const TOOL_NAMES = {
    browser: 'browser',
    calculator: 'calculator',
    search: 'search',
    shell: 'shell',
    human: 'human',
    code_executor: 'code_executor',
    file_manager: 'file_manager',
    database: 'database',
    api_caller: 'api_caller',
    memory: 'memory'
} as const;

/**
 * Tool name type to ensure type safety for tool names
 */
export type ToolName = (typeof TOOL_NAMES)[keyof typeof TOOL_NAMES];

/**
 * Base tool schema that all tools must implement
 */
export const BaseToolSchema = z.object({
    name: z.string(),
    description: z.string(),
    returnDirect: z.boolean().optional(),
    verbose: z.boolean().optional()
});

/**
 * Tool execution result
 */
export interface IToolExecutionResult {
    success: boolean;
    output?: string;
    error?: IErrorType;
    metadata?: {
        duration: number;
        startTime: number;
        endTime: number;
    };
}

/**
 * Tool configuration
 */
export interface IToolConfig {
    name: ToolName;
    description: string;
    returnDirect?: boolean;
    verbose?: boolean;
    schema: z.ZodObject<any>;
}

/**
 * Tool validation schema
 */
export interface IToolValidationSchema {
    required: string[];
    constraints: {
        name?: {
            minLength?: number;
            maxLength?: number;
            pattern?: RegExp;
        };
        description?: {
            minLength?: number;
            maxLength?: number;
        };
    };
    customValidation?: (config: Record<string, unknown>) => boolean;
}

// Re-export the StructuredTool type from langchain for convenience
export { StructuredTool };

// Type guard for Tool instances
export const isLangchainTool = (value: unknown): value is StructuredTool => {
    if (typeof value !== 'object' || value === null) return false;
    const tool = value as Partial<StructuredTool>;
    return (
        typeof tool.name === 'string' &&
        typeof tool.description === 'string' &&
        typeof tool.invoke === 'function' &&
        typeof tool.schema === 'object'
    );
};

// Type guard for tool configuration
export const isToolConfig = (value: unknown): value is IToolConfig => {
    if (typeof value !== 'object' || value === null) return false;
    const config = value as Partial<IToolConfig>;
    return (
        typeof config.name === 'string' &&
        typeof config.description === 'string' &&
        config.schema instanceof z.ZodObject
    );
};

/**
 * Helper function to validate if a string is a valid tool name
 */
export function isValidToolName(name: string): name is ToolName {
    return Object.values(TOOL_NAMES).includes(name as ToolName);
}

// Validation functions
export const validateTool = (tool: unknown): IValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!isLangchainTool(tool)) {
        errors.push('Invalid tool: must be a valid Langchain StructuredTool instance');
        return createValidationResult(false, errors);
    }

    if (!tool.name) {
        errors.push('Tool must have a name');
    } else if (tool.name.length < 2) {
        warnings.push('Tool name is very short');
    }

    if (!tool.description) {
        errors.push('Tool must have a description');
    } else if (tool.description.length < 10) {
        warnings.push('Tool description is very short');
    }

    if (!tool.schema) {
        errors.push('Tool must have a schema defined');
    }

    return createValidationResult(errors.length === 0, errors, warnings);
};

export const validateToolConfig = (config: unknown): IValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!isToolConfig(config)) {
        errors.push('Invalid tool configuration');
        return createValidationResult(false, errors);
    }

    if (!config.name) {
        errors.push('Tool configuration must have a name');
    } else if (config.name.length < 2) {
        warnings.push('Tool name is very short');
    }

    if (!config.description) {
        errors.push('Tool configuration must have a description');
    } else if (config.description.length < 10) {
        warnings.push('Tool description is very short');
    }

    if (!config.schema) {
        errors.push('Tool configuration must have a schema defined');
    }

    return createValidationResult(errors.length === 0, errors, warnings);
};
