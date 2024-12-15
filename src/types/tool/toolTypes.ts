/**
 * @file toolTypes.ts
 * @path KaibanJS/src/types/tool/toolTypes.ts
 * @description Tool type definitions and type guards for Langchain tools integration
 *
 * @module types/tool
 */

import { Tool } from "@langchain/core/tools";
import { IErrorType } from "../common/commonErrorTypes";
import { IValidationResult } from "@types/common";
import { VALIDATION_ERROR_enum, VALIDATION_WARNING_enum } from "../common/enumTypes";

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
 * Tool dependency configuration
 */
export interface IToolDependency {
    toolName: ToolName;
    required: boolean;
    version?: string;
    configOverrides?: Record<string, unknown>;
}

/**
 * Tool versioning information
 */
export interface IToolVersion {
    major: number;
    minor: number;
    patch: number;
    toString(): string;
}

/**
 * Tool registration options with enhanced type safety and dependency support
 */
export interface IToolRegistrationOptions {
    priority?: number;
    timeout?: number;
    maxRetries?: number;
    retryDelay?: number;
    version?: IToolVersion;
    dependencies?: IToolDependency[];
    configValidation?: (config: unknown) => IToolValidationResult;
    dependencyValidation?: (dependencies: IToolDependency[]) => IToolValidationResult;
}

/**
 * Tool registration metadata with enhanced tracking
 */
export interface IToolRegistrationMetadata {
    registeredAt: number;
    lastUsed?: number;
    usageCount: number;
    priority: number;
    status: 'active' | 'inactive' | 'error';
    error?: string;
    version?: IToolVersion;
    dependencies?: {
        resolved: boolean;
        items: Array<{
            dependency: IToolDependency;
            status: 'resolved' | 'missing' | 'error';
            error?: string;
        }>;
    };
}

/**
 * Tool validation result interface
 */
export interface IToolValidationResult extends Omit<IValidationResult, 'errors' | 'warnings'> {
    errors: VALIDATION_ERROR_enum[];
    warnings?: VALIDATION_WARNING_enum[];
    toolSpecificErrors?: string[];
    toolSpecificWarnings?: string[];
}

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
        dependencies?: {
            used: ToolName[];
            failed?: Array<{
                name: ToolName;
                error: string;
            }>;
        };
    };
}

// Re-export the Tool type from langchain for convenience
export { Tool };

/**
 * Type guard for Tool instances
 */
export const isLangchainTool = (value: unknown): value is Tool => {
    if (typeof value !== 'object' || value === null) return false;
    const tool = value as Partial<Tool>;
    return (
        typeof tool.name === 'string' &&
        typeof tool.description === 'string' &&
        typeof tool.invoke === 'function'
    );
};

/**
 * Helper function to validate if a string is a valid tool name
 */
export function isValidToolName(name: string): name is ToolName {
    return Object.values(TOOL_NAMES).includes(name as ToolName);
}

/**
 * Validate tool dependencies
 */
export const validateToolDependencies = (dependencies: IToolDependency[]): IToolValidationResult => {
    const errors: VALIDATION_ERROR_enum[] = [];
    const warnings: VALIDATION_WARNING_enum[] = [];
    const toolSpecificErrors: string[] = [];
    const toolSpecificWarnings: string[] = [];

    for (const dep of dependencies) {
        if (!isValidToolName(dep.toolName)) {
            errors.push(VALIDATION_ERROR_enum.FIELD_TYPE_MISMATCH);
            toolSpecificErrors.push(`Invalid dependency tool name: ${dep.toolName}`);
        }

        if (typeof dep.required !== 'boolean') {
            errors.push(VALIDATION_ERROR_enum.FIELD_TYPE_MISMATCH);
            toolSpecificErrors.push(`Required flag must be boolean for dependency: ${dep.toolName}`);
        }

        if (dep.version && typeof dep.version !== 'string') {
            errors.push(VALIDATION_ERROR_enum.FIELD_TYPE_MISMATCH);
            toolSpecificErrors.push(`Version must be string for dependency: ${dep.toolName}`);
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        toolSpecificErrors,
        toolSpecificWarnings
    };
};

/**
 * Enhanced tool validation function
 */
export const validateTool = (tool: unknown): IToolValidationResult => {
    const errors: VALIDATION_ERROR_enum[] = [];
    const warnings: VALIDATION_WARNING_enum[] = [];
    const toolSpecificErrors: string[] = [];
    const toolSpecificWarnings: string[] = [];

    if (!isLangchainTool(tool)) {
        errors.push(VALIDATION_ERROR_enum.TYPE_NOT_SUPPORTED);
        toolSpecificErrors.push('Must be a valid Langchain Tool instance');
        return {
            isValid: false,
            errors,
            warnings,
            toolSpecificErrors,
            toolSpecificWarnings
        };
    }

    // Name validation
    if (!tool.name) {
        errors.push(VALIDATION_ERROR_enum.FIELD_MISSING);
        toolSpecificErrors.push('Tool must have a name');
    } else if (typeof tool.name !== 'string') {
        errors.push(VALIDATION_ERROR_enum.FIELD_TYPE_MISMATCH);
        toolSpecificErrors.push('Tool name must be a string');
    } else if (tool.name.length < 2) {
        warnings.push(VALIDATION_WARNING_enum.FIELD_LENGTH_SUBOPTIMAL);
        toolSpecificWarnings.push('Tool name is very short');
    }

    // Description validation
    if (!tool.description) {
        errors.push(VALIDATION_ERROR_enum.FIELD_MISSING);
        toolSpecificErrors.push('Tool must have a description');
    } else if (typeof tool.description !== 'string') {
        errors.push(VALIDATION_ERROR_enum.FIELD_TYPE_MISMATCH);
        toolSpecificErrors.push('Tool description must be a string');
    } else if (tool.description.length < 10) {
        warnings.push(VALIDATION_WARNING_enum.FIELD_LENGTH_SUBOPTIMAL);
        toolSpecificWarnings.push('Tool description is very short');
    }

    // Invoke method validation
    if (typeof tool.invoke !== 'function') {
        errors.push(VALIDATION_ERROR_enum.FIELD_TYPE_MISMATCH);
        toolSpecificErrors.push('Tool must have an invoke method');
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        toolSpecificErrors,
        toolSpecificWarnings
    };
};

/**
 * Enhanced tool configuration validation
 */
export const validateToolConfig = (config: unknown): IToolValidationResult => {
    const errors: VALIDATION_ERROR_enum[] = [];
    const warnings: VALIDATION_WARNING_enum[] = [];
    const toolSpecificErrors: string[] = [];
    const toolSpecificWarnings: string[] = [];

    if (!config || typeof config !== 'object') {
        errors.push(VALIDATION_ERROR_enum.CONFIG_TYPE_MISMATCH);
        toolSpecificErrors.push('Invalid tool configuration type');
        return {
            isValid: false,
            errors,
            warnings,
            toolSpecificErrors,
            toolSpecificWarnings
        };
    }

    const options = config as IToolRegistrationOptions;

    // Validate optional fields if present
    if (options.priority !== undefined && typeof options.priority !== 'number') {
        errors.push(VALIDATION_ERROR_enum.FIELD_TYPE_MISMATCH);
        toolSpecificErrors.push('Priority must be a number');
    }

    if (options.timeout !== undefined && typeof options.timeout !== 'number') {
        errors.push(VALIDATION_ERROR_enum.FIELD_TYPE_MISMATCH);
        toolSpecificErrors.push('Timeout must be a number');
    }

    if (options.maxRetries !== undefined && typeof options.maxRetries !== 'number') {
        errors.push(VALIDATION_ERROR_enum.FIELD_TYPE_MISMATCH);
        toolSpecificErrors.push('MaxRetries must be a number');
    }

    if (options.retryDelay !== undefined && typeof options.retryDelay !== 'number') {
        errors.push(VALIDATION_ERROR_enum.FIELD_TYPE_MISMATCH);
        toolSpecificErrors.push('RetryDelay must be a number');
    }

    // Validate dependencies if present
    if (options.dependencies) {
        const depValidation = validateToolDependencies(options.dependencies);
        if (!depValidation.isValid) {
            errors.push(...depValidation.errors);
            toolSpecificErrors.push(...(depValidation.toolSpecificErrors || []));
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        toolSpecificErrors,
        toolSpecificWarnings
    };
};
