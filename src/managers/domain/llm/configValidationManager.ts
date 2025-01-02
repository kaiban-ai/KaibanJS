/**
 * @file configValidationManager.ts
 * @path src/managers/domain/llm/configValidationManager.ts
 * @description Manages validation of LLM configurations
 *
 * @module @managers/domain/llm
 */

import { CoreManager } from '../../core/coreManager';
import { 
    MANAGER_CATEGORY_enum,
    LLM_STATUS_enum,
    VALIDATION_ERROR_enum,
    VALIDATION_WARNING_enum
} from '../../../types/common/enumTypes';
import { MetricDomain, MetricType } from '../../../types/metrics/base/metricsManagerTypes';
import { createLLMValidationResult } from '../../../types/llm/llmValidationTypes';
import { EnumTypeGuards } from '../../../types/common/enumTypes';
import { ERROR_KINDS } from '../../../types/common/errorTypes';
import { createBaseMetadata } from '../../../types/common/baseTypes';

import type { 
    ILLMValidationResult,
    ILLMValidationContext,
    ILLMValidationField
} from '../../../types/llm/llmValidationTypes';
import type { ILLMProviderConfig } from '../../../types/llm/llmProviderTypes';
import type { IHandlerResult } from '../../../types/common/baseTypes';

// ─── Constants ─────────────────────────────────────────────────────────────────

const REQUIRED_FIELDS = ['provider', 'model', 'apiKey'] as const;

const OPTIONAL_FIELDS: Record<string, ILLMValidationField> = {
    temperature: { type: 'number', min: 0, max: 1 },
    maxTokens: { type: 'number', min: 1 },
    topP: { type: 'number', min: 0, max: 1 },
    frequencyPenalty: { type: 'number', min: -2, max: 2 },
    presencePenalty: { type: 'number', min: -2, max: 2 }
};

// ─── Implementation ────────────────────────────────────────────────────────────

class ConfigValidationManager extends CoreManager {
    private static instance: ConfigValidationManager;
    private isInitialized = false;
    public readonly category = MANAGER_CATEGORY_enum.VALIDATION;

    protected constructor() {
        super();
        this.registerDomainManager('ConfigValidationManager', this);
    }

    public static getInstance(): ConfigValidationManager {
        if (!ConfigValidationManager.instance) {
            ConfigValidationManager.instance = new ConfigValidationManager();
        }
        return ConfigValidationManager.instance;
    }

    public async initialize(params?: Record<string, unknown>): Promise<void> {
        await super.initialize(params);

        const result = await this.safeExecute(async () => {
            await this.handleStatusTransition({
                entity: 'llm',
                entityId: this.constructor.name,
                currentStatus: LLM_STATUS_enum.INITIALIZING,
                targetStatus: LLM_STATUS_enum.READY,
                context: {
                    component: this.constructor.name,
                    operation: 'initialize',
                    params
                }
            });

            this.isInitialized = true;
            this.logInfo('Config Validation Manager initialized successfully');
        }, 'Failed to initialize Config Validation Manager');

        if (!result.success) {
            throw result.metadata.error;
        }
    }

    public async validateConfig(config: unknown): Promise<IHandlerResult<ILLMValidationResult<ILLMProviderConfig>>> {
        const startTime = Date.now();
        const result = await this.safeExecute(async () => {
            if (!this.isInitialized) {
                throw new Error('Config Validation Manager not initialized');
            }

            const errors: VALIDATION_ERROR_enum[] = [];
            const warnings: VALIDATION_WARNING_enum[] = [];

            if (!config || typeof config !== 'object') {
                const validationResult = createLLMValidationResult<ILLMProviderConfig>(
                    false,
                    [VALIDATION_ERROR_enum.CONFIG_TYPE_MISMATCH],
                    [],
                    undefined,
                    {
                        provider: 'unknown',
                        model: 'unknown',
                        validatedFields: [],
                        configHash: '',
                        validationDuration: Date.now() - startTime
                    }
                );

                return {
                    success: false,
                    error: {
                        message: 'Invalid configuration type',
                        type: ERROR_KINDS.ValidationError
                    },
                    data: validationResult,
                    metadata: createBaseMetadata(this.constructor.name, 'validateConfig')
                };
            }

            await this.validateRequiredFields(config as Record<string, unknown>, errors, warnings);
            await this.validateOptionalFields(config as Record<string, unknown>, errors, warnings);

            const validationContext: ILLMValidationContext = {
                provider: (config as ILLMProviderConfig).provider || 'unknown',
                model: (config as ILLMProviderConfig).model || 'unknown',
                operation: 'validateConfig',
                timestamp: Date.now(),
                validationDuration: Date.now() - startTime
            };

            await this.metricsManager.trackMetric({
                domain: MetricDomain.LLM,
                type: MetricType.PERFORMANCE,
                value: errors.length === 0 ? 1 : 0,
                timestamp: Date.now(),
                metadata: {
                    component: this.constructor.name,
                    operation: 'validateConfig',
                    context: validationContext,
                    errors,
                    warnings
                }
            });

            const validationResult = createLLMValidationResult<ILLMProviderConfig>(
                errors.length === 0,
                errors,
                warnings,
                errors.length === 0 ? config as ILLMProviderConfig : undefined,
                {
                    provider: validationContext.provider,
                    model: validationContext.model,
                    validatedFields: [...REQUIRED_FIELDS, ...Object.keys(OPTIONAL_FIELDS)],
                    configHash: '',
                    validationDuration: validationContext.validationDuration
                }
            );

            return {
                success: errors.length === 0,
                error: errors.length > 0 ? {
                    message: 'Configuration validation failed',
                    type: ERROR_KINDS.ValidationError
                } : undefined,
                data: validationResult,
                metadata: {
                    ...createBaseMetadata(this.constructor.name, 'validateConfig'),
                    validation: validationResult
                }
            };
        }, 'Failed to validate config');

        if (!result.success || !result.data) {
            throw result.metadata.error;
        }

        return result.data;
    }

    private async validateRequiredFields(
        config: Record<string, unknown>,
        errors: VALIDATION_ERROR_enum[],
        warnings: VALIDATION_WARNING_enum[]
    ): Promise<void> {
        for (const field of REQUIRED_FIELDS) {
            if (!(field in config)) {
                errors.push(VALIDATION_ERROR_enum.CONFIG_MISSING_FIELD);
                warnings.push(VALIDATION_WARNING_enum.FIELD_CONSTRAINT_RELAXED);
                continue;
            }

            const value = config[field];
            if (value === undefined) {
                errors.push(VALIDATION_ERROR_enum.FIELD_UNDEFINED);
            } else if (value === null) {
                errors.push(VALIDATION_ERROR_enum.FIELD_NULL);
            } else if (value === '') {
                errors.push(VALIDATION_ERROR_enum.FIELD_EMPTY);
            }
        }

        await this.validateProviderAndModel(config, errors, warnings);
    }

    private async validateProviderAndModel(
        config: Record<string, unknown>,
        errors: VALIDATION_ERROR_enum[],
        warnings: VALIDATION_WARNING_enum[]
    ): Promise<void> {
        const provider = config.provider;
        if (!provider) {
            errors.push(VALIDATION_ERROR_enum.FIELD_MISSING);
        } else if (typeof provider !== 'string') {
            errors.push(VALIDATION_ERROR_enum.FIELD_TYPE_MISMATCH);
            warnings.push(VALIDATION_WARNING_enum.TYPE_CONVERSION_NEEDED);
        } else if (!EnumTypeGuards.isLLMProvider(provider)) {
            errors.push(VALIDATION_ERROR_enum.FIELD_CONSTRAINT_VIOLATION);
            warnings.push(VALIDATION_WARNING_enum.FIELD_VALUE_SUBOPTIMAL);
        }

        const model = config.model;
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
    }

    private async validateOptionalFields(
        config: Record<string, unknown>,
        errors: VALIDATION_ERROR_enum[],
        warnings: VALIDATION_WARNING_enum[]
    ): Promise<void> {
        for (const [field, validation] of Object.entries(OPTIONAL_FIELDS)) {
            if (field in config) {
                const value = config[field];
                
                if (value !== undefined && value !== null) {
                    if (typeof value !== validation.type) {
                        errors.push(VALIDATION_ERROR_enum.FIELD_TYPE_MISMATCH);
                        warnings.push(VALIDATION_WARNING_enum.TYPE_CONVERSION_NEEDED);
                    } else if (validation.type === 'number') {
                        const numValue = value as number;
                        if (validation.min !== undefined && numValue < validation.min) {
                            errors.push(VALIDATION_ERROR_enum.VALUE_OUT_OF_RANGE);
                            warnings.push(VALIDATION_WARNING_enum.FIELD_VALUE_SUBOPTIMAL);
                        }
                        if (validation.max !== undefined && numValue > validation.max) {
                            errors.push(VALIDATION_ERROR_enum.VALUE_OUT_OF_RANGE);
                            warnings.push(VALIDATION_WARNING_enum.FIELD_VALUE_SUBOPTIMAL);
                        }
                    }
                }
            }
        }
    }

    public async cleanup(): Promise<void> {
        const result = await this.safeExecute(async () => {
            this.isInitialized = false;
            this.logInfo('Config Validation Manager cleaned up successfully');
        }, 'Failed to cleanup Config Validation Manager');

        if (!result.success) {
            throw result.metadata.error;
        }
    }
}

export default ConfigValidationManager.getInstance();
