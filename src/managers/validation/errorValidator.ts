import { CoreManager } from '../core/coreManager';
import { MANAGER_CATEGORY_enum } from '../../types/common/enumTypes';
import type { IValidationResult, IValidationError } from '../../types/common/validationTypes';
import { 
    VALIDATION_ERROR_enum, 
    VALIDATION_SEVERITY_enum,
    VALIDATION_SCOPE_enum
} from '../../types/common/enumTypes';
import type { IMetricEvent } from '../../types/metrics/base/metricTypes';
import { METRIC_TYPE_enum } from '../../types/metrics/base/metricEnums';

export class ErrorValidator extends CoreManager {
    public readonly category = MANAGER_CATEGORY_enum.VALIDATION;

    private constructor() {
        super();
    }

    private static instance: ErrorValidator | null = null;

    public static getInstance(): ErrorValidator {
        if (!ErrorValidator.instance) {
            ErrorValidator.instance = new ErrorValidator();
        }
        return ErrorValidator.instance;
    }

    public async validateErrorMetric(metric: IMetricEvent): Promise<IValidationResult> {
        const result = await this.safeExecute(async () => {
            const errors: IValidationError[] = [];

            // Validate error metric type
            if (metric.type !== METRIC_TYPE_enum.ERROR) {
                errors.push({
                    code: VALIDATION_ERROR_enum.FIELD_INVALID,
                    message: 'Invalid metric type for error validation',
                    severity: VALIDATION_SEVERITY_enum.ERROR,
                    field: 'type',
                    scope: VALIDATION_SCOPE_enum.VALIDATION
                });
            }

            // Validate error metadata
            if (!metric.metadata || typeof metric.metadata !== 'object') {
                errors.push({
                    code: VALIDATION_ERROR_enum.FIELD_MISSING,
                    message: 'Missing error metadata',
                    severity: VALIDATION_SEVERITY_enum.ERROR,
                    field: 'metadata',
                    scope: VALIDATION_SCOPE_enum.VALIDATION
                });
            }

            return {
                isValid: errors.length === 0,
                errors,
                warnings: []
            };
        });

        return result;
    }

    private async safeExecute(fn: () => Promise<IValidationResult>): Promise<IValidationResult> {
        try {
            return await fn();
        } catch (error) {
            return {
                isValid: false,
                errors: [{
                    code: VALIDATION_ERROR_enum.VALIDATION_FAILED,
                    message: `Validation error: ${error instanceof Error ? error.message : String(error)}`,
                    severity: VALIDATION_SEVERITY_enum.ERROR,
                    field: 'unknown',
                    scope: VALIDATION_SCOPE_enum.VALIDATION
                }],
                warnings: []
            };
        }
    }
}

export default ErrorValidator.getInstance();
