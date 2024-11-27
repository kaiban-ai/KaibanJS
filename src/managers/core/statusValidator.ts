/**
 * @file statusValidator.ts
 * @path src/managers/core/statusValidator.ts
 * @description Status validation and transition rule enforcement
 * 
 * @module @core
 */

import CoreManager from './coreManager';
import { TransitionRules } from './transitionRules';
import { createValidationResult } from '../../types/common/commonValidationTypes';

// Import types from canonical locations
import type {
    IStatusTransitionContext,
    IStatusEntity,
    IStatusType,
    IStatusTransitionRule,
    IStatusTransition
} from '../../types/common/commonStatusTypes';

import type {
    IStatusValidationResult
} from '../../types/common/commonValidationTypes';

import {
    AGENT_STATUS_enum,
    MESSAGE_STATUS_enum,
    TASK_STATUS_enum,
    WORKFLOW_STATUS_enum,
    EnumTypeGuards
} from '../../types/common/commonEnums';

type Phase = 'pre-execution' | 'execution' | 'post-execution' | 'error';
const VALID_PHASE_TRANSITIONS: Record<Phase, Phase[]> = {
    'pre-execution': ['execution', 'error'],
    'execution': ['post-execution', 'error'],
    'post-execution': ['error'],
    'error': []
};

/**
 * Status validation implementation
 */
export class StatusValidator extends CoreManager {
    private static instance: StatusValidator;

    private constructor() {
        super();
    }

    public static getInstance(): StatusValidator {
        if (!StatusValidator.instance) {
            StatusValidator.instance = new StatusValidator();
        }
        return StatusValidator.instance;
    }

    /**
     * Validate a proposed status transition
     */
    public async validateTransition(context: IStatusTransitionContext): Promise<IStatusValidationResult> {
        const startTime = Date.now();
        try {
            // Validate required fields
            const fieldErrors = this.validateRequiredFields(context);
            if (fieldErrors.length > 0) {
                return {
                    ...createValidationResult(false, 'StatusValidator'),
                    errors: fieldErrors,
                    metadata: {
                        timestamp: Date.now(),
                        duration: Date.now() - startTime,
                        validatorName: 'StatusValidator'
                    }
                };
            }

            // Validate phase transition
            if (!this.isValidPhaseTransition(context.phase)) {
                return {
                    ...createValidationResult(false, 'StatusValidator'),
                    errors: [`Invalid phase transition to: ${context.phase}`],
                    metadata: {
                        timestamp: Date.now(),
                        duration: Date.now() - startTime,
                        validatorName: 'StatusValidator'
                    }
                };
            }

            // Basic status validity checks
            if (!this.isValidStatus(context.currentStatus, context.entity)) {
                return {
                    ...createValidationResult(false, 'StatusValidator'),
                    errors: [`Invalid current status: ${context.currentStatus}`],
                    metadata: {
                        timestamp: Date.now(),
                        duration: Date.now() - startTime,
                        validatorName: 'StatusValidator'
                    }
                };
            }

            if (!this.isValidStatus(context.targetStatus, context.entity)) {
                return {
                    ...createValidationResult(false, 'StatusValidator'),
                    errors: [`Invalid target status: ${context.targetStatus}`],
                    metadata: {
                        timestamp: Date.now(),
                        duration: Date.now() - startTime,
                        validatorName: 'StatusValidator'
                    }
                };
            }

            // Get transition rules for entity
            const rules = TransitionRules.get(context.entity);
            if (!rules) {
                return {
                    ...createValidationResult(false, 'StatusValidator'),
                    errors: [`No transition rules defined for entity: ${context.entity}`],
                    metadata: {
                        timestamp: Date.now(),
                        duration: Date.now() - startTime,
                        validatorName: 'StatusValidator'
                    }
                };
            }

            // Check if transition is allowed
            const isAllowed = this.isTransitionAllowed(rules, context.currentStatus, context.targetStatus);
            if (!isAllowed) {
                return {
                    ...createValidationResult(false, 'StatusValidator'),
                    errors: [
                        `Transition from ${context.currentStatus} to ${context.targetStatus} not allowed for ${context.entity}`
                    ],
                    metadata: {
                        timestamp: Date.now(),
                        duration: Date.now() - startTime,
                        validatorName: 'StatusValidator'
                    }
                };
            }

            // Execute custom validation if defined
            for (const rule of rules) {
                if (this.matchesRule(rule, context.currentStatus, context.targetStatus)) {
                    if (rule.validation) {
                        const isValid = await rule.validation(context);
                        if (!isValid) {
                            return {
                                ...createValidationResult(false, 'StatusValidator'),
                                errors: [`Custom validation failed for transition`],
                                metadata: {
                                    timestamp: Date.now(),
                                    duration: Date.now() - startTime,
                                    validatorName: 'StatusValidator'
                                }
                            };
                        }
                    }
                }
            }

            return {
                ...createValidationResult(true, 'StatusValidator'),
                metadata: {
                    timestamp: Date.now(),
                    duration: Date.now() - startTime,
                    validatorName: 'StatusValidator'
                },
                context: {
                    entity: context.entity,
                    transition: `${context.currentStatus} -> ${context.targetStatus}`,
                    metadata: context.metadata,
                    performance: context.performanceMetrics,
                    resources: context.resourceMetrics
                },
                domainMetadata: {
                    phase: context.phase,
                    operation: context.operation,
                    startTime: context.startTime,
                    duration: context.duration
                },
                transition: {
                    from: context.currentStatus,
                    to: context.targetStatus
                }
            };

        } catch (error) {
            this.log(`Validation error: ${error}`, undefined, undefined, 'error');
            return {
                ...createValidationResult(false, 'StatusValidator'),
                errors: [(error as Error).message],
                metadata: {
                    timestamp: Date.now(),
                    duration: Date.now() - startTime,
                    validatorName: 'StatusValidator'
                },
                context: {
                    entity: context.entity,
                    transition: `${context.currentStatus} -> ${context.targetStatus}`,
                    error: error as Error
                }
            };
        }
    }

    /**
     * Validate required fields in transition context
     */
    private validateRequiredFields(context: IStatusTransitionContext): string[] {
        const errors: string[] = [];

        if (!context.operation) {
            errors.push('Operation is required');
        }

        if (!context.phase) {
            errors.push('Phase is required');
        }

        if (!context.startTime) {
            errors.push('Start time is required');
        }

        if (!context.resourceMetrics) {
            errors.push('Resource metrics are required');
        }

        if (!context.performanceMetrics) {
            errors.push('Performance metrics are required');
        }

        return errors;
    }

    /**
     * Validate phase transition
     */
    private isValidPhaseTransition(phase: Phase): boolean {
        return phase === 'pre-execution' || 
               VALID_PHASE_TRANSITIONS[phase]?.length > 0;
    }

    /**
     * Check if a status is valid for an entity
     */
    public isValidStatus(status: string, entity: IStatusEntity): boolean {
        switch (entity) {
            case 'agent':
                return this.isAgentStatus(status);
            case 'message':
                return this.isMessageStatus(status);
            case 'task':
                return this.isTaskStatus(status);
            case 'workflow':
                return this.isWorkflowStatus(status);
            default:
                return false;
        }
    }

    /**
     * Get available transitions for a status
     */
    public getAvailableTransitions(status: IStatusType, entity: IStatusEntity): IStatusType[] {
        const rules = TransitionRules.get(entity);
        if (!rules) return [];

        return rules
            .filter(rule => 
                (Array.isArray(rule.from) ? rule.from.includes(status) : rule.from === status))
            .flatMap(rule => 
                Array.isArray(rule.to) ? rule.to : [rule.to]
            );
    }

    // ─── Private Helper Methods ───────────────────────────────────────────────

    /**
     * Check if a transition is allowed by rules
     */
    private isTransitionAllowed(
        rules: IStatusTransitionRule[],
        currentStatus: IStatusType,
        targetStatus: IStatusType
    ): boolean {
        return rules.some(rule => this.matchesRule(rule, currentStatus, targetStatus));
    }

    /**
     * Check if a rule matches a transition
     */
    private matchesRule(
        rule: IStatusTransitionRule,
        currentStatus: IStatusType,
        targetStatus: IStatusType
    ): boolean {
        const matchesFrom = Array.isArray(rule.from)
            ? rule.from.includes(currentStatus)
            : rule.from === currentStatus;

        const matchesTo = Array.isArray(rule.to)
            ? rule.to.includes(targetStatus)
            : rule.to === targetStatus;

        return matchesFrom && matchesTo;
    }

    // ─── Type Guard Methods ─────────────────────────────────────────────────────

    /**
     * Type guard for agent status
     */
    private isAgentStatus(status: unknown): status is keyof typeof AGENT_STATUS_enum {
        return Object.values(AGENT_STATUS_enum).includes(status as AGENT_STATUS_enum);
    }

    /**
     * Type guard for message status
     */
    private isMessageStatus(status: unknown): status is keyof typeof MESSAGE_STATUS_enum {
        return Object.values(MESSAGE_STATUS_enum).includes(status as MESSAGE_STATUS_enum);
    }

    /**
     * Type guard for task status
     */
    private isTaskStatus(status: unknown): status is keyof typeof TASK_STATUS_enum {
        return Object.values(TASK_STATUS_enum).includes(status as TASK_STATUS_enum);
    }

    /**
     * Type guard for workflow status
     */
    private isWorkflowStatus(status: unknown): status is keyof typeof WORKFLOW_STATUS_enum {
        return Object.values(WORKFLOW_STATUS_enum).includes(status as WORKFLOW_STATUS_enum);
    }
}

export default StatusValidator.getInstance();
