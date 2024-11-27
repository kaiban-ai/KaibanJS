/**
 * @file validationUtils.ts
 * @path KaibanJS\src\utils\validation\validationUtils.ts
 * @description Common validation utilities and helper functions
 * 
 * @module @utils/validation
 */

import type { IValidationResult } from '../../types/common/commonValidationTypes';

/**
 * Creates a standardized validation result object
 * @param isValid - Whether the validation passed
 * @param errors - Array of error messages
 * @param warnings - Array of warning messages
 * @param validatorName - Name of the validator
 * @returns Validation result object
 */
export const createValidationResult = (
    isValid: boolean,
    errors: string[] = [],
    warnings: string[] = [],
    validatorName: string = 'default'
): IValidationResult => {
    return {
        isValid,
        errors,
        warnings,
        metadata: {
            timestamp: Date.now(),
            duration: 0,
            validatorName
        },
        validatedFields: []
    };
};

/**
 * Combines multiple validation results into a single result
 * @param results - Array of validation results to combine
 * @returns Combined validation result
 */
export const combineValidationResults = (
    results: IValidationResult[]
): IValidationResult => {
    const allErrors: string[] = [];
    const allWarnings: string[] = [];
    let isValid = true;
    const startTime = Date.now();

    results.forEach(result => {
        if (!result.isValid) {
            isValid = false;
        }
        allErrors.push(...result.errors);
        allWarnings.push(...result.warnings);
    });

    return {
        isValid,
        errors: allErrors,
        warnings: allWarnings,
        metadata: {
            timestamp: Date.now(),
            duration: Date.now() - startTime,
            validatorName: 'combinedValidator'
        },
        validatedFields: results.flatMap(r => r.validatedFields || [])
    };
};

/**
 * Validates that a value is within a numeric range
 * @param value - Number to validate
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @param fieldName - Name of the field being validated
 * @returns Validation result
 */
export const validateNumericRange = (
    value: number,
    min: number,
    max: number,
    fieldName: string
): IValidationResult => {
    const errors: string[] = [];
    const startTime = Date.now();
    
    if (value < min || value > max) {
        errors.push(`${fieldName} must be between ${min} and ${max}`);
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings: [],
        metadata: {
            timestamp: Date.now(),
            duration: Date.now() - startTime,
            validatorName: 'numericRangeValidator'
        },
        validatedFields: [fieldName]
    };
};

/**
 * Validates that a timestamp is within acceptable bounds
 * @param timestamp - Timestamp to validate
 * @param maxFutureMs - Maximum allowed milliseconds in the future
 * @param maxPastMs - Maximum allowed milliseconds in the past
 * @returns Validation result
 */
export const validateTimestamp = (
    timestamp: number,
    maxFutureMs: number = 5000,
    maxPastMs: number = 24 * 60 * 60 * 1000 // 24 hours
): IValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const startTime = Date.now();
    const now = Date.now();

    if (timestamp > now + maxFutureMs) {
        errors.push('Timestamp is too far in the future');
    }

    if (timestamp < now - maxPastMs) {
        warnings.push('Timestamp is significantly in the past');
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        metadata: {
            timestamp: now,
            duration: Date.now() - startTime,
            validatorName: 'timestampValidator'
        },
        validatedFields: ['timestamp']
    };
};

/**
 * Validates required fields in an object
 * @param obj - Object to validate
 * @param requiredFields - Array of required field names
 * @returns Validation result
 */
export const validateRequiredFields = (
    obj: unknown,
    requiredFields: string[]
): IValidationResult => {
    const errors: string[] = [];
    const startTime = Date.now();

    if (typeof obj !== 'object' || obj === null) {
        errors.push('Invalid object structure');
        return {
            isValid: false,
            errors,
            warnings: [],
            metadata: {
                timestamp: Date.now(),
                duration: Date.now() - startTime,
                validatorName: 'requiredFieldsValidator'
            },
            validatedFields: []
        };
    }

    requiredFields.forEach(field => {
        if (!(field in obj)) {
            errors.push(`Missing required field: ${field}`);
        }
    });

    return {
        isValid: errors.length === 0,
        errors,
        warnings: [],
        metadata: {
            timestamp: Date.now(),
            duration: Date.now() - startTime,
            validatorName: 'requiredFieldsValidator'
        },
        validatedFields: requiredFields.filter(field => field in obj)
    };
};
