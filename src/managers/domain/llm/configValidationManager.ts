/**
 * @file configValidationManager.ts
 * @description Manages validation of LLM configurations
 */

import { IValidationResult } from '../../../types/common/commonValidationTypes';
import { VALIDATION_ERROR_enum, VALIDATION_WARNING_enum } from '../../../types/common/commonEnums';
import { createValidationResult } from '@utils/validation/validationUtils';
import { EnumTypeGuards } from '../../../types/common/commonEnums';

/**
 * Validates LLM configuration
 */
export const validateLLMConfig = (config: unknown): IValidationResult => {
    const errors: VALIDATION_ERROR_enum[] = [];
    const warnings: VALIDATION_WARNING_enum[] = [];

    // Basic type validation
    if (!config || typeof config !== 'object') {
        errors.push(VALIDATION_ERROR_enum.CONFIG_TYPE_MISMATCH);
        return createValidationResult(false, errors);
    }

    // Required fields validation
    const requiredFields = ['provider', 'model', 'apiKey'] as const;
    for (const field of requiredFields) {
        if (!(field in (config as Record<string, unknown>))) {
            errors.push(VALIDATION_ERROR_enum.CONFIG_MISSING_FIELD);
            warnings.push(VALIDATION_WARNING_enum.FIELD_CONSTRAINT_RELAXED);
            continue;
        }

        const value = (config as Record<string, unknown>)[field];
        if (value === undefined) {
            errors.push(VALIDATION_ERROR_enum.FIELD_UNDEFINED);
        } else if (value === null) {
            errors.push(VALIDATION_ERROR_enum.FIELD_NULL);
        } else if (value === '') {
            errors.push(VALIDATION_ERROR_enum.FIELD_EMPTY);
        }
    }

    // Provider validation
    const provider = (config as Record<string, unknown>).provider;
    if (!provider) {
        errors.push(VALIDATION_ERROR_enum.FIELD_MISSING);
    } else if (typeof provider !== 'string') {
        errors.push(VALIDATION_ERROR_enum.FIELD_TYPE_MISMATCH);
        warnings.push(VALIDATION_WARNING_enum.TYPE_CONVERSION_NEEDED);
    } else if (!EnumTypeGuards.isLLMProvider(provider)) {
        errors.push(VALIDATION_ERROR_enum.FIELD_CONSTRAINT_VIOLATION);
        warnings.push(VALIDATION_WARNING_enum.FIELD_VALUE_SUBOPTIMAL);
    }

    // Model validation
    const model = (config as Record<string, unknown>).model;
    if (!model) {
        errors.push(VALIDATION_ERROR_enum.FIELD_MISSING);
    } else if (typeof model !== 'string') {
        errors.push(VALIDATION_ERROR_enum.FIELD_TYPE_MISMATCH);
        warnings.push(VALIDATION_WARNING_enum.TYPE_CONVERSION_NEEDED);
    } else if (provider && EnumTypeGuards.isLLMProvider(provider)) {
        if (!EnumTypeGuards.isValidModelForProvider(model, provider)) {
            errors.push(VALIDATION_ERROR_enum.FIELD_CONSTRAINT_VIOLATION);
            warnings.push(VALIDATION_WARNING_enum.FIELD_VALUE_SUBOPTIMAL);
        }
    }

    // API key validation
    const apiKey = (config as Record<string, unknown>).apiKey;
    if (!apiKey) {
        errors.push(VALIDATION_ERROR_enum.FIELD_MISSING);
    } else if (typeof apiKey !== 'string') {
        errors.push(VALIDATION_ERROR_enum.FIELD_TYPE_MISMATCH);
        warnings.push(VALIDATION_WARNING_enum.TYPE_CONVERSION_NEEDED);
    } else {
        // API key format validation
        if (apiKey.length < 10) {
            errors.push(VALIDATION_ERROR_enum.FIELD_CONSTRAINT_VIOLATION);
            warnings.push(VALIDATION_WARNING_enum.FIELD_LENGTH_SUBOPTIMAL);
        }
        if (!/^[a-zA-Z0-9_-]+$/.test(apiKey)) {
            errors.push(VALIDATION_ERROR_enum.FIELD_FORMAT_INVALID);
            warnings.push(VALIDATION_WARNING_enum.FIELD_FORMAT_SUBOPTIMAL);
        }
    }

    // Optional fields validation
    const optionalFields = {
        temperature: { type: 'number', min: 0, max: 1 },
        maxTokens: { type: 'number', min: 1 },
        topP: { type: 'number', min: 0, max: 1 },
        frequencyPenalty: { type: 'number', min: -2, max: 2 },
        presencePenalty: { type: 'number', min: -2, max: 2 }
    } as const;

    for (const [field, validation] of Object.entries(optionalFields)) {
        if (field in (config as Record<string, unknown>)) {
            const value = (config as Record<string, unknown>)[field];
            
            if (value !== undefined && value !== null) {
                if (typeof value !== validation.type) {
                    errors.push(VALIDATION_ERROR_enum.FIELD_TYPE_MISMATCH);
                    warnings.push(VALIDATION_WARNING_enum.TYPE_CONVERSION_NEEDED);
                } else if (validation.type === 'number') {
                    const numValue = value as number;
                    if ('min' in validation && numValue < validation.min) {
                        errors.push(VALIDATION_ERROR_enum.VALUE_OUT_OF_RANGE);
                        warnings.push(VALIDATION_WARNING_enum.FIELD_VALUE_SUBOPTIMAL);
                    }
                    if ('max' in validation && numValue > validation.max) {
                        errors.push(VALIDATION_ERROR_enum.VALUE_OUT_OF_RANGE);
                        warnings.push(VALIDATION_WARNING_enum.FIELD_VALUE_SUBOPTIMAL);
                    }
                }
            }
        }
    }

    return createValidationResult(errors.length === 0, errors, warnings);
};
