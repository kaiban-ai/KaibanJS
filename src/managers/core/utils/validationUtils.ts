/**
 * @file validationUtils.ts
 * @description Validation utility functions for the core system
 */

import type { IValidationResult } from '../../../types/common/validationTypes';

export const createValidationResult = (
    isValid: boolean,
    errors: string[],
    warnings: string[] = []
): IValidationResult => ({
    isValid,
    errors,
    warnings,
    metadata: {
        timestamp: Date.now(),
        duration: 0,
        validatorName: 'CoreValidator'
    }
});
