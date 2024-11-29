/**
 * @file taskValidator.ts
 * @path src/managers/domain/task/taskValidator.ts
 * @description Task validation implementation
 *
 * @module @managers/domain/task
 */

import { CoreManager } from '../../core/coreManager';
import { createError } from '../../../types/common/commonErrorTypes';
import { TASK_STATUS_enum } from '../../../types/common/commonEnums';
import { TaskEventEmitter } from './taskEventEmitter';
import { TaskUtilsManager } from './taskUtilsManager';
import { TaskManager } from './taskManager';
import { createValidationError, createValidationWarning } from '../../../types/common/commonValidationTypes';

import type { ITaskType } from '../../../types/task/taskBaseTypes';
import type { ITaskValidationResult } from '../../../types/task/taskHandlerTypes';
import type { IStatusTransitionContext } from '../../../types/common/commonStatusTypes';

// ─── Validator Implementation ───────────────────────────────────────────────────

export class TaskValidator extends CoreManager {
    private readonly eventEmitter: TaskEventEmitter;
    private readonly utilsManager: TaskUtilsManager;
    private readonly taskManager: TaskManager;

    constructor() {
        super();
        this.eventEmitter = TaskEventEmitter.getInstance();
        this.utilsManager = TaskUtilsManager.getInstance();
        this.taskManager = TaskManager.getInstance();
    }

    public async validateTask(task: ITaskType): Promise<ITaskValidationResult> {
        const startTime = Date.now();
        const errors: string[] = [];
        const warnings: string[] = [];

        try {
            // Basic task validation using TaskUtilsManager
            if (!this.utilsManager.validateTask(task)) {
                errors.push('Basic task validation failed');
            }

            // Status validation using StatusManager
            const transitionContext: IStatusTransitionContext = {
                entity: 'task',
                entityId: task.id,
                currentStatus: task.status,
                targetStatus: task.status, // Validate current status
                operation: 'validateTask',
                phase: 'execution',
                startTime,
                resourceMetrics: task.metrics?.resources,
                performanceMetrics: task.metrics?.performance,
                task,
                agent: task.agent
            };

            const statusValidation = await this.statusManager.validateTransition(transitionContext);
            if (!statusValidation) {
                errors.push(`Invalid task status: ${task.status}`);
            }

            // Metrics validation
            if (task.metrics) {
                if (task.metrics.startTime < 0) errors.push('Start time cannot be negative');
                if (task.metrics.endTime < task.metrics.startTime) {
                    errors.push('End time cannot be before start time');
                }
                if (task.metrics.duration < 0) errors.push('Duration cannot be negative');
                if (task.metrics.iterationCount < 0) {
                    errors.push('Iteration count cannot be negative');
                }
            } else {
                errors.push('Task metrics are required');
            }

            // Progress validation
            if (task.progress) {
                if (task.progress.progress < 0 || task.progress.progress > 100) {
                    errors.push('Progress must be between 0 and 100');
                }
                if (task.progress.timeElapsed < 0) {
                    errors.push('Time elapsed cannot be negative');
                }
            } else {
                errors.push('Task progress is required');
            }

            // History validation
            if (!Array.isArray(task.history)) {
                errors.push('Task history must be an array');
            }

            // Feedback validation
            if (!Array.isArray(task.feedback)) {
                errors.push('Task feedback must be an array');
            }

            // Configuration validation
            if (typeof task.isDeliverable !== 'boolean') {
                warnings.push('isDeliverable should be explicitly set');
            }
            if (typeof task.externalValidationRequired !== 'boolean') {
                warnings.push('externalValidationRequired should be explicitly set');
            }
            if (!task.inputs || typeof task.inputs !== 'object') {
                warnings.push('Task inputs should be initialized as an object');
            }

            // Description interpolation check
            if (task.inputs && Object.keys(task.inputs).length > 0) {
                // Convert inputs to string map, tracking any that can't be converted
                const stringInputs: Record<string, string> = {};
                const nonStringInputs: string[] = [];

                for (const [key, value] of Object.entries(task.inputs)) {
                    if (value === null || value === undefined) {
                        nonStringInputs.push(key);
                    } else if (typeof value === 'object') {
                        nonStringInputs.push(key);
                    } else {
                        stringInputs[key] = String(value);
                    }
                }

                const interpolatedDescription = this.utilsManager.interpolateTaskDescription(task.description, stringInputs);
                if (interpolatedDescription === task.description) {
                    warnings.push('Task description contains no interpolated values despite having inputs');
                }
                if (nonStringInputs.length > 0) {
                    warnings.push(`Some inputs could not be interpolated: ${nonStringInputs.join(', ')}`);
                }
            }

            const validationResult: ITaskValidationResult = {
                isValid: errors.length === 0,
                errors: errors.map(error => createValidationError({ code: 'VALIDATION_ERROR', message: error })),
                warnings: warnings.map(warning => createValidationWarning({ code: 'VALIDATION_WARNING', message: warning })),
                context: {
                    taskId: task.id,
                    taskStatus: task.status,
                    validationTime: Date.now()
                }
            };

            // Emit validation completed event
            await this.eventEmitter.emitTaskValidationCompleted({
                taskId: task.id,
                validationResult
            });

            // If validation failed, also emit error occurred event
            if (!validationResult.isValid) {
                const validationError = createError({
                    message: 'Task validation failed',
                    type: 'ValidationError',
                    context: {
                        taskId: task.id,
                        errors: validationResult.errors,
                        warnings: validationResult.warnings
                    }
                });

                await this.eventEmitter.emitTaskErrorOccurred({
                    taskId: task.id,
                    error: validationError,
                    context: {
                        operation: 'validateTask',
                        state: {
                            id: task.id,
                            status: task.status,
                            metrics: task.metrics
                        }
                    }
                });
            }

            return validationResult;

        } catch (error) {
            const errorResult: ITaskValidationResult = {
                isValid: false,
                errors: [createValidationError({ code: 'VALIDATION_ERROR', message: (error as Error).message })],
                warnings: [],
                context: {
                    taskId: task.id,
                    taskStatus: task.status,
                    validationTime: Date.now()
                }
            };

            // Emit error event
            await this.eventEmitter.emitTaskErrorOccurred({
                taskId: task.id,
                error: error as Error,
                context: {
                    operation: 'validateTask',
                    state: {
                        id: task.id,
                        status: task.status,
                        metrics: task.metrics
                    }
                }
            });

            return errorResult;
        }
    }
}
