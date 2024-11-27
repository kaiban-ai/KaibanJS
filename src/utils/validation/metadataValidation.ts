/**
 * @file metadataValidation.ts
 * @description Runtime validation utilities for metadata structures
 */

import { MetadataTypeGuards } from '../../types/common/commonMetadataTypes';
import type {
    IBaseHandlerMetadata,
    IErrorMetadata,
    ISuccessMetadata,
    ITeamMetadata,
    IAgentMetadata,
    ITaskMetadata,
    IAgentCreationMetadata,
    IAgentExecutionMetadata
} from '../../types/common/commonMetadataTypes';

/**
 * Validates metadata structure at runtime
 * @throws Error if validation fails
 */
export function validateMetadata<T extends IBaseHandlerMetadata>(
    metadata: unknown,
    guard: (value: unknown) => value is T
): asserts metadata is T {
    if (!guard(metadata)) {
        throw new Error('Invalid metadata structure');
    }
}

/**
 * Enhanced validation with detailed error messages
 */
export function validateMetadataWithDetails<T extends IBaseHandlerMetadata>(
    metadata: unknown,
    guard: (value: unknown) => value is T,
    context: string
): asserts metadata is T {
    if (!guard(metadata)) {
        const errorDetails = getValidationErrorDetails(metadata);
        throw new Error(`Invalid metadata structure in ${context}: ${errorDetails}`);
    }
}

/**
 * Get detailed validation error information
 */
function getValidationErrorDetails(value: unknown): string {
    if (typeof value !== 'object' || value === null) {
        return 'Expected an object, received ' + typeof value;
    }

    const missingRequiredFields = [
        'timestamp',
        'component',
        'operation',
        'performance'
    ].filter(field => !(field in value));

    if (missingRequiredFields.length > 0) {
        return `Missing required fields: ${missingRequiredFields.join(', ')}`;
    }

    return 'Invalid metadata structure';
}

/**
 * Validation wrapper for metadata factory methods
 */
export function withMetadataValidation<T, M extends IBaseHandlerMetadata>(
    factory: () => { success: boolean; data?: T; error?: Error; metadata: M },
    guard: (value: unknown) => value is M,
    context: string
): { success: boolean; data?: T; error?: Error; metadata: M } {
    const result = factory();
    validateMetadataWithDetails(result.metadata, guard, context);
    return result;
}

/**
 * Type-safe metadata validators
 */
export const MetadataValidators = {
    validateBaseMetadata(metadata: unknown): asserts metadata is IBaseHandlerMetadata {
        validateMetadataWithDetails(metadata, MetadataTypeGuards.isBaseHandlerMetadata, 'BaseMetadata');
    },

    validateErrorMetadata(metadata: unknown): asserts metadata is IErrorMetadata {
        validateMetadataWithDetails(metadata, MetadataTypeGuards.isErrorMetadata, 'ErrorMetadata');
    },

    validateSuccessMetadata(metadata: unknown): asserts metadata is ISuccessMetadata {
        validateMetadataWithDetails(metadata, MetadataTypeGuards.isSuccessMetadata, 'SuccessMetadata');
    },

    validateTeamMetadata(metadata: unknown): asserts metadata is ITeamMetadata {
        validateMetadataWithDetails(metadata, MetadataTypeGuards.isTeamMetadata, 'TeamMetadata');
    },

    validateAgentMetadata(metadata: unknown): asserts metadata is IAgentMetadata {
        validateMetadataWithDetails(metadata, MetadataTypeGuards.isAgentMetadata, 'AgentMetadata');
    },

    validateTaskMetadata(metadata: unknown): asserts metadata is ITaskMetadata {
        validateMetadataWithDetails(metadata, MetadataTypeGuards.isTaskMetadata, 'TaskMetadata');
    },

    validateAgentCreationMetadata(metadata: unknown): asserts metadata is IAgentCreationMetadata {
        validateMetadataWithDetails(metadata, MetadataTypeGuards.isAgentCreationMetadata, 'AgentCreationMetadata');
    },

    validateAgentExecutionMetadata(metadata: unknown): asserts metadata is IAgentExecutionMetadata {
        validateMetadataWithDetails(metadata, MetadataTypeGuards.isAgentExecutionMetadata, 'AgentExecutionMetadata');
    }
};
