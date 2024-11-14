/**
 * @file validation.ts
 * @path KaibanJS/src/utils/types/common/validation.ts
 * @description Validation result types for agent configurations and operations
 */

import { ErrorType } from "./errors";

// Structure for validation results
export interface ValidationResult {
    isValid: boolean;
    error?: ErrorType;
    context?: Record<string, unknown>;
}
