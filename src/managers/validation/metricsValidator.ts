import { CoreManager } from '../core/coreManager';
import { MANAGER_CATEGORY_enum } from '../../types/common/enumTypes';
import type { 
    IValidationResult, 
    IValidationError, 
    IValidationWarning 
} from '../../types/common/validationTypes';
import type { IMetricEvent } from '../../types/metrics/base/metricTypes';
import { METRIC_DOMAIN_enum, METRIC_TYPE_enum } from '../../types/metrics/base/metricEnums';
import { 
    VALIDATION_ERROR_enum, 
    VALIDATION_SEVERITY_enum,
    VALIDATION_SCOPE_enum,
    VALIDATION_WARNING_enum
} from '../../types/common/enumTypes';

export class MetricsValidator extends CoreManager {
    public readonly category = MANAGER_CATEGORY_enum.VALIDATION;

    private constructor() {
        super();
    }

    private static instance: MetricsValidator | null = null;

    public static getInstance(): MetricsValidator {
        if (!MetricsValidator.instance) {
            MetricsValidator.instance = new MetricsValidator();
        }
        return MetricsValidator.instance;
    }

    public async validateMetric(metric: IMetricEvent): Promise<IValidationResult> {
        const result = await this.safeExecute(async () => {
            const errors: IValidationError[] = [];
            const warnings: IValidationWarning[] = [];

            // Validate required fields
            if (!metric.timestamp) {
                errors.push({
                    code: VALIDATION_ERROR_enum.FIELD_MISSING,
                    message: 'Missing timestamp',
                    severity: VALIDATION_SEVERITY_enum.ERROR,
                    field: 'timestamp',
                    scope: VALIDATION_SCOPE_enum.VALIDATION
                });
            }
            if (!metric.domain) {
                errors.push({
                    code: VALIDATION_ERROR_enum.FIELD_MISSING,
                    message: 'Missing domain',
                    severity: VALIDATION_SEVERITY_enum.ERROR,
                    field: 'domain',
                    scope: VALIDATION_SCOPE_enum.VALIDATION
                });
            }
            if (!metric.type) {
                errors.push({
                    code: VALIDATION_ERROR_enum.FIELD_MISSING,
                    message: 'Missing type',
                    severity: VALIDATION_SEVERITY_enum.ERROR,
                    field: 'type',
                    scope: VALIDATION_SCOPE_enum.VALIDATION
                });
            }
            if (typeof metric.value !== 'number') {
                errors.push({
                    code: VALIDATION_ERROR_enum.FIELD_TYPE_MISMATCH,
                    message: 'Invalid value type',
                    severity: VALIDATION_SEVERITY_enum.ERROR,
                    field: 'value',
                    scope: VALIDATION_SCOPE_enum.VALIDATION
                });
            }

            // Validate domain
            if (!Object.values(METRIC_DOMAIN_enum).includes(metric.domain)) {
                errors.push({
                    code: VALIDATION_ERROR_enum.FIELD_INVALID,
                    message: `Invalid domain: ${metric.domain}`,
                    severity: VALIDATION_SEVERITY_enum.ERROR,
                    field: 'domain',
                    scope: VALIDATION_SCOPE_enum.VALIDATION
                });
            }

            // Validate type
            if (!Object.values(METRIC_TYPE_enum).includes(metric.type)) {
                errors.push({
                    code: VALIDATION_ERROR_enum.FIELD_INVALID,
                    message: `Invalid type: ${metric.type}`,
                    severity: VALIDATION_SEVERITY_enum.ERROR,
                    field: 'type',
                    scope: VALIDATION_SCOPE_enum.VALIDATION
                });
            }

            return {
                isValid: errors.length === 0,
                errors,
                warnings
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

export default MetricsValidator.getInstance();
