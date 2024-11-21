/**
 * @file validationManager.ts
 * @path src/utils/managers/domain/task/validationManager.ts
 * @description Task validation management implementation using service registry pattern
 *
 * @module @managers/domain/task
 */

import CoreManager from '../../core/coreManager';
import { TASK_STATUS_enum } from '@/utils/types/common/enums';
import { DefaultFactory } from '@/utils/factories/defaultFactory';

import type { 
    TaskType,
    TaskValidationParams,
    TaskValidationResult,
    HandlerResult 
} from '@/types/task';

import type { 
    ValidationConfig,
    ValidationRule,
    ValidationFunction 
} from '@/utils/types/common/validation';

/**
 * Task validation management implementation
 */
export class ValidationManager extends CoreManager {
    private static instance: ValidationManager;
    private readonly validationRules: Map<string, ValidationRule[]>;
    private readonly validators: Map<string, ValidationFunction<unknown>[]>;

    private constructor() {
        super();
        this.validationRules = new Map();
        this.validators = new Map();
        this.registerDomainManager('ValidationManager', this);
    }

    public static getInstance(): ValidationManager {
        if (!ValidationManager.instance) {
            ValidationManager.instance = new ValidationManager();
        }
        return ValidationManager.instance;
    }

    // ─── Validation Methods ────────────────────────────────────────────────────

    /**
     * Validate task with comprehensive validation
     */
    public async validateTask(params: TaskValidationParams): Promise<HandlerResult> {
        const { task, context = {}, options = {} } = params;

        return await this.safeExecute(async () => {
            const validationResult = await this.performValidation(task, options);
            if (!validationResult.isValid) {
                await this.handleValidationFailure(task, validationResult);
                return {
                    success: false,
                    error: new Error(validationResult.errors.join(', ')),
                    data: validationResult
                };
            }

            const log = task.store?.prepareNewLog({
                task,
                logDescription: 'Task validation successful',
                metadata: this.prepareMetadata({ task, context }),
                logType: 'TaskStatusUpdate',
                taskStatus: task.status
            });

            if (log && task.store) {
                task.store.setState(state => ({
                    workflowLogs: [...state.workflowLogs, log]
                }));
            }

            return {
                success: true,
                data: validationResult
            };

        }, 'Task validation failed');
    }

    /**
     * Add task validation rule
     */
    public addValidationRule(ruleId: string, rule: ValidationRule): void {
        const rules = this.validationRules.get(ruleId) || [];
        rules.push(rule);
        this.validationRules.set(ruleId, rules);
    }

    /**
     * Remove validation rule
     */
    public removeValidationRule(ruleId: string): void {
        this.validationRules.delete(ruleId);
    }

    // ─── Protected Methods ─────────────────────────────────────────────────────

    /**
     * Perform comprehensive validation
     */
    protected async performValidation(
        task: TaskType,
        options: ValidationConfig = {}
    ): Promise<TaskValidationResult> {
        const errors: string[] = [];

        // Basic validation
        if (!task.title) errors.push('Task title is required');
        if (!task.description) errors.push('Task description is required');
        if (!task.agent) errors.push('Task must have an assigned agent');
        if (!task.expectedOutput) errors.push('Expected output is required');

        // Rule validation
        const rules = this.validationRules.get(task.id) || [];
        for (const rule of rules) {
            try {
                const result = await rule.validate(task);
                if (!result.isValid) {
                    errors.push(...(result.errors || []));
                }
            } catch (error) {
                errors.push(`Rule ${rule.id} validation failed: ${error instanceof Error ? error.message : String(error)}`);
            }
        }

        // Custom validator execution
        if (options.customValidators) {
            for (const validator of options.customValidators) {
                try {
                    if (!validator(task)) {
                        errors.push('Custom validation failed');
                    }
                } catch (error) {
                    errors.push(`Custom validator failed: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            context: {
                taskId: task.id,
                taskStatus: task.status,
                validationTime: Date.now()
            }
        };
    }

    /**
     * Handle validation failure
     */
    protected async handleValidationFailure(
        task: TaskType,
        result: TaskValidationResult
    ): Promise<void> {
        await this.handleStatusTransition({
            currentStatus: task.status,
            targetStatus: TASK_STATUS_enum.ERROR,
            entity: 'task',
            entityId: task.id,
            metadata: {
                errors: result.errors,
                validationTime: Date.now()
            }
        });

        const log = task.store?.prepareNewLog({
            task,
            logDescription: `Task validation failed: ${result.errors.join(', ')}`,
            metadata: {
                validationResult: result,
                timestamp: Date.now()
            },
            logType: 'TaskStatusUpdate',
            taskStatus: TASK_STATUS_enum.ERROR
        });

        if (log && task.store) {
            task.store.setState(state => ({
                workflowLogs: [...state.workflowLogs, log]
            }));
        }
    }

    /**
     * Create default validation options
     */
    protected createDefaultOptions(): ValidationConfig {
        return {
            strict: true,
            validateDependencies: true,
            customValidators: []
        };
    }
}

export default ValidationManager.getInstance();