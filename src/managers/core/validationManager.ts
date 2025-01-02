/**
 * @file validationManager.ts
 * @path src/managers/core/validationManager.ts
 * @description Core validation service providing base validation functionality and rule management
 */

import { CoreManager } from './coreManager';
import { 
    createValidationResult,
    IValidationResult,
    IValidationContext
} from '../../types/common/validationTypes';
import { 
    MANAGER_CATEGORY_enum, 
    AGENT_STATUS_enum,
    VALIDATION_ERROR_enum
} from '../../types/common/enumTypes';
import { ERROR_KINDS } from '../../types/common/errorTypes';
import { MetricDomain, MetricType } from '../../types/metrics/base/metricsManagerTypes';

import type { IBaseManagerMetadata } from '../../types/agent/agentManagerTypes';

interface ValidationRule<T> {
    id: string;
    validate: (value: T, context?: IValidationContext) => Promise<boolean>;
    priority: number;
}

interface ValidationCache {
    result: IValidationResult;
    timestamp: number;
    context?: IValidationContext;
    hash: string;
}

export class ValidationManager extends CoreManager {
    protected static _instance: ValidationManager;
    private readonly validationRules: Map<string, ValidationRule<any>>;
    private readonly validationCache: Map<string, ValidationCache>;
    private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    protected constructor() {
        super();
        this.registerDomainManager('ValidationManager', this);
        this.validationRules = new Map();
        this.validationCache = new Map();
    }

    public static getInstance(): ValidationManager {
        if (!ValidationManager._instance) {
            ValidationManager._instance = new ValidationManager();
        }
        return ValidationManager._instance;
    }

    public readonly category: MANAGER_CATEGORY_enum = MANAGER_CATEGORY_enum.CORE;

    /**
     * Register a validation rule
     */
    public registerValidationRule<T>(rule: ValidationRule<T>): void {
        try {
            this.validationRules.set(rule.id, rule);
            this.clearCacheForRule(rule.id);
        } catch (error) {
            this.logError(`Failed to register validation rule: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Validate a value using registered rules
     */
    public async validate<T>(
        value: T,
        context?: IValidationContext
    ): Promise<boolean> {
        const startTime = Date.now();
        const validationKey = this.generateValidationKey(value, context);

        try {
            // Check cache first
            const cachedResult = this.getCachedValidation(validationKey, context);
            if (cachedResult) {
                return cachedResult.isValid;
            }

            // Basic validation
            if (value === undefined || value === null) {
                this.cacheAndReturnResult(validationKey, createValidationResult({
                    isValid: false,
                    errors: [VALIDATION_ERROR_enum.FIELD_MISSING],
                    warnings: []
                }), context);
                return false;
            }

            // Get applicable rules
            const rules = Array.from(this.validationRules.values())
                .sort((a, b) => a.priority - b.priority);

            // Apply rules
            const results = await Promise.all(
                rules.map((rule: ValidationRule<T>) => rule.validate(value, context))
            );

            // Track metrics
            await this.metricsManager.trackMetric({
                domain: MetricDomain.WORKFLOW,
                type: MetricType.PERFORMANCE,
                value: Date.now() - startTime,
                timestamp: startTime,
                metadata: {
                    operation: 'validate',
                    component: this.constructor.name,
                    success: results.every(r => r),
                    errorCount: results.filter(r => !r).length
                }
            });

            return results.every((r: boolean) => r);
        } catch (error) {
            await this.handleError(error, 'Validation failed', ERROR_KINDS.ValidationError);
            return false;
        }
    }

    /**
     * Clear validation cache for a specific rule
     */
    private clearCacheForRule(ruleId: string): void {
        for (const [key, cache] of this.validationCache.entries()) {
            if (cache.hash.includes(ruleId)) {
                this.validationCache.delete(key);
            }
        }
    }

    /**
     * Generate a cache key for validation
     */
    private generateValidationKey(value: unknown, context?: IValidationContext): string {
        const valueHash = typeof value === 'object' ? JSON.stringify(value) : String(value);
        const contextHash = context ? JSON.stringify(context) : '';
        return `${valueHash}_${contextHash}`;
    }

    /**
     * Get cached validation result if available
     */
    private getCachedValidation(key: string, context?: IValidationContext): IValidationResult | null {
        const cached = this.validationCache.get(key);
        if (!cached) return null;

        const isExpired = Date.now() - cached.timestamp > this.CACHE_TTL;
        const contextChanged = context && JSON.stringify(context) !== JSON.stringify(cached.context);

        if (isExpired || contextChanged) {
            this.validationCache.delete(key);
            return null;
        }

        return cached.result;
    }

    /**
     * Cache and return validation result
     */
    private cacheAndReturnResult(
        key: string,
        result: IValidationResult,
        context?: IValidationContext
    ): IValidationResult {
        this.validationCache.set(key, {
            result,
            timestamp: Date.now(),
            context,
            hash: key
        });
        return result;
    }

    public getMetadata(): IBaseManagerMetadata {
        return {
            category: this.category,
            operation: 'validation',
            duration: 0,
            status: 'success',
            agent: {
                id: 'system',
                name: 'ValidationManager',
                role: 'system',
                status: AGENT_STATUS_enum.IDLE
            },
            timestamp: Date.now(),
            component: this.constructor.name
        };
    }
}

export default ValidationManager.getInstance();
