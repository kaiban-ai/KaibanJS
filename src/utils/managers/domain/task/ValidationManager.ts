/**
 * @file ValidationManager.ts
 * @path src/managers/domain/task/ValidationManager.ts
 * @description Domain manager for task validation and constraints
 *
 * @module @managers/domain/task
 */

import CoreManager from '../../core/CoreManager';
import { ErrorManager } from '../../core/ErrorManager';
import { LogManager } from '../../core/LogManager';
import { DefaultFactory } from '../../../factories/defaultFactory';
import { MetadataFactory } from '../../../factories/metadataFactory';
import { StatusManager } from '../../core/StatusManager';

// Import types from canonical locations
import type { 
    TaskType,
    TaskValidationResult,
    TaskValidationParams,
    HandlerResult
} from '@/utils/types/task';

import type { 
    ValidationConfig,
    ValidationRule 
} from '@/utils/types/common/validation';

import { TASK_STATUS_enum } from '@/utils/types/common/enums';

/**
 * Manages task validation and constraint checking
 */
export class ValidationManager extends CoreManager {
    private static instance: ValidationManager;
    private readonly errorManager: ErrorManager;
    private readonly logManager: LogManager;
    private readonly statusManager: StatusManager;
    private readonly validationRules: Map<string, ValidationRule[]>;

    private constructor() {
        super();
        this.errorManager = ErrorManager.getInstance();
        this.logManager = LogManager.getInstance();
        this.statusManager = StatusManager.getInstance();
        this.validationRules = new Map();
    }

    public static getInstance(): ValidationManager {
        if (!ValidationManager.instance) {
            ValidationManager.instance = new ValidationManager();
        }
        return ValidationManager.instance;
    }

    // ─── Task Validation Methods ─────────────────────────────────────────────────

    /**
     * Validate task with optional configuration
     */
    public async validateTask(params: TaskValidationParams): Promise<HandlerResult> {
        const { task, context = {}, options = {} } = params;

        try {
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
                metadata: MetadataFactory.forTask(
                    DefaultFactory.createTaskStats(),
                    null,
                    DefaultFactory.createCostDetails()
                ),
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

        } catch (error) {
            return this.handleValidationError(task, error, context);
        }
    }

    /**
     * Add validation rule for task type
     */
    public addValidationRule(taskType: string, rule: ValidationRule): void {
        const rules = this.validationRules.get(taskType) || [];
        rules.push(rule);
        this.validationRules.set(taskType, rules);
    }

    /**
     * Remove validation rule
     */
    public removeValidationRule(taskType: string, ruleId: string): void {
        const rules = this.validationRules.get(taskType);
        if (rules) {
            const filtered = rules.filter(rule => rule.id !== ruleId);
            this.validationRules.set(taskType, filtered);
        }
    }

    // ─── Private Helper Methods ───────────────────────────────────────────────────

    /**
     * Perform comprehensive task validation
     */
    private async performValidation(
        task: TaskType,
        options: ValidationConfig = {}
    ): Promise<TaskValidationResult> {
        const errors: string[] = [];

        // Basic validation
        if (!task.title) errors.push('Task title is required');
        if (!task.description) errors.push('Task description is required');
        if (!task.agent) errors.push('Task must have an assigned agent');

        // Custom rules validation
        const rules = this.validationRules.get(task.constructor.name) || [];
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

        // Dependency validation
        if (options.validateDependencies) {
            const dependencyErrors = await this.validateDependencies(task);
            errors.push(...dependencyErrors);
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
     * Validate task dependencies
     */
    private async validateDependencies(task: TaskType): Promise<string[]> {
        const errors: string[] = [];
        const state = task.store?.getState();
        if (!state) return ['Task store not available'];

        // Check for circular dependencies
        const visited = new Set<string>();
        const visiting = new Set<string>();

        const checkCyclicDependencies = (taskId: string): boolean => {
            if (visiting.has(taskId)) {
                errors.push(`Circular dependency detected involving task ${taskId}`);
                return true;
            }
            if (visited.has(taskId)) return false;

            visiting.add(taskId);

            // Implementation would check actual task dependencies here
            // This is a placeholder for the dependency check logic
            const dependencies: string[] = []; // Would be populated from task dependencies

            for (const depId of dependencies) {
                if (checkCyclicDependencies(depId)) {
                    return true;
                }
            }

            visiting.delete(taskId);
            visited.add(taskId);
            return false;
        };

        checkCyclicDependencies(task.id);

        return errors;
    }

    /**
     * Handle validation failure
     */
    private async handleValidationFailure(
        task: TaskType,
        result: TaskValidationResult
    ): Promise<void> {
        await this.statusManager.transition({
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
     * Handle validation error
     */
    private handleValidationError(
        task: TaskType,
        error: unknown,
        context: Record<string, unknown>
    ): HandlerResult {
        this.logManager.error('Task validation error:', error);

        const log = task.store?.prepareNewLog({
            task,
            logDescription: `Task validation error: ${error instanceof Error ? error.message : String(error)}`,
            metadata: {
                error,
                context,
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

        return {
            success: false,
            error: error instanceof Error ? error : new Error(String(error)),
            data: {
                taskId: task.id,
                context
            }
        };
    }
}

export default ValidationManager.getInstance();