/**
 * @file statusValidator.ts
 * @path src/managers/core/statusValidator.ts
 * @description Status validation and transition rule enforcement
 * 
 * @module @core
 */

import { CoreManager } from './coreManager';
import { TransitionRules } from './transitionRules';

import { 
    createStatusValidationResult,
    createValidationError,
    VALIDATION_SCOPE_enum
} from '../../types/common/validationTypes';

import { ERROR_KINDS } from '../../types/common/errorTypes';
import { 
    VALIDATION_ERROR_enum,
    VALIDATION_SEVERITY_enum,
    MANAGER_CATEGORY_enum 
} from '../../types/common/enumTypes';

// Import types from canonical locations
import type {
    IStatusTransitionContext,
    IStatusEntity,
    IStatusType,
    IStatusTransitionRule
} from '../../types/common/statusTypes';

import type {
    IStatusValidationResult,
    IValidationError,
    IValidationMetadata
} from '../../types/common/validationTypes';

import {
    AGENT_STATUS_enum,
    MESSAGE_STATUS_enum,
    TASK_STATUS_enum,
    WORKFLOW_STATUS_enum
} from '../../types/common/enumTypes';

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
    private readonly COMPONENT_NAME = 'StatusValidator';

    public readonly category = MANAGER_CATEGORY_enum.CORE;

    private constructor() {
        super();
        this.registerDomainManager('StatusValidator', this);
    }

    public static getInstance(): StatusValidator {
        if (!StatusValidator.instance) {
            StatusValidator.instance = new StatusValidator();
        }
        return StatusValidator.instance;
    }

    /**
     * Initialize the validator
     */
    public async initialize(params?: Record<string, unknown>): Promise<void> {
        await super.initialize(params);
        this.logInfo('Status validator initialized');
    }

    public async validate(params: unknown): Promise<boolean> {
        return await super.validate(params);
    }

    /**
     * Validate a proposed status transition
     */
    public async validateTransition(
        context: IStatusTransitionContext,
        metadata: IValidationMetadata
    ): Promise<IStatusValidationResult> {
        try {
            // Validate required fields
            const fieldErrors = this.validateRequiredFields(context);
            if (fieldErrors.length > 0) {
                return createStatusValidationResult({
                    isValid: false,
                    errors: fieldErrors,
                    metadata: {
                        ...metadata,
                        validatedFields: [...(metadata.validatedFields || []), ...Object.keys(context)],
                        status: 'error'
                    }
                });
            }

            // Validate phase transition
            if (!this.isValidPhaseTransition(context.phase as Phase)) {
                return createStatusValidationResult({
                    isValid: false,
            errors: [createValidationError({
                code: VALIDATION_ERROR_enum.STATE_TRANSITION_INVALID,
                message: `Invalid phase transition to: ${context.phase}`,
                scope: VALIDATION_SCOPE_enum.SYSTEM,
                severity: VALIDATION_SEVERITY_enum.ERROR
            })],
                    metadata: {
                        ...metadata,
                        validatedFields: [...(metadata.validatedFields || []), 'phase'],
                        status: 'error'
                    }
                });
            }

            // Basic status validity checks
            if (!this.isValidStatus(context.currentStatus, context.entity)) {
                return createStatusValidationResult({
                    isValid: false,
            errors: [createValidationError({
                code: VALIDATION_ERROR_enum.INVALID_STATE,
                message: `Invalid current status: ${context.currentStatus}`,
                scope: VALIDATION_SCOPE_enum.SYSTEM,
                severity: VALIDATION_SEVERITY_enum.ERROR
            })],
                    metadata: {
                        ...metadata,
                        validatedFields: [...(metadata.validatedFields || []), 'currentStatus'],
                        status: 'error'
                    }
                });
            }

            if (!this.isValidStatus(context.targetStatus, context.entity)) {
                return createStatusValidationResult({
                    isValid: false,
            errors: [createValidationError({
                code: VALIDATION_ERROR_enum.INVALID_STATE,
                message: `Invalid target status: ${context.targetStatus}`,
                scope: VALIDATION_SCOPE_enum.SYSTEM,
                severity: VALIDATION_SEVERITY_enum.ERROR
            })],
                    metadata: {
                        ...metadata,
                        validatedFields: [...(metadata.validatedFields || []), 'targetStatus'],
                        status: 'error'
                    }
                });
            }

            // Get transition rules for entity
            const rules = TransitionRules.get(context.entity);
            if (!rules) {
                return createStatusValidationResult({
                    isValid: false,
            errors: [createValidationError({
                code: VALIDATION_ERROR_enum.VALIDATION_RULE_VIOLATION,
                message: `No transition rules defined for entity: ${context.entity}`,
                scope: VALIDATION_SCOPE_enum.SYSTEM,
                severity: VALIDATION_SEVERITY_enum.ERROR
            })],
                    metadata: {
                        ...metadata,
                        validatedFields: [...(metadata.validatedFields || []), 'entity'],
                        status: 'error'
                    }
                });
            }

            // Check if transition is allowed
            const isAllowed = this.isTransitionAllowed(rules, context.currentStatus, context.targetStatus);
            if (!isAllowed) {
                return createStatusValidationResult({
                    isValid: false,
            errors: [createValidationError({
                code: VALIDATION_ERROR_enum.STATE_TRANSITION_INVALID,
                message: `Transition from ${context.currentStatus} to ${context.targetStatus} not allowed for ${context.entity}`,
                scope: VALIDATION_SCOPE_enum.SYSTEM,
                severity: VALIDATION_SEVERITY_enum.ERROR
            })],
                    metadata: {
                        ...metadata,
                        validatedFields: [...(metadata.validatedFields || []), 'transition'],
                        status: 'error'
                    }
                });
            }

            // Execute custom validation if defined
            for (const rule of rules) {
                if (this.matchesRule(rule, context.currentStatus, context.targetStatus)) {
                    if (rule.validation) {
                        const isValid = await rule.validation(context);
                        if (!isValid) {
                            return createStatusValidationResult({
                                isValid: false,
            errors: [createValidationError({
                code: VALIDATION_ERROR_enum.VALIDATION_RULE_VIOLATION,
                message: 'Custom validation failed for transition',
                scope: VALIDATION_SCOPE_enum.SYSTEM,
                severity: VALIDATION_SEVERITY_enum.ERROR
            })],
                                metadata: {
                                    ...metadata,
                                    validatedFields: [...(metadata.validatedFields || []), 'customValidation'],
                                    status: 'error'
                                }
                            });
                        }
                    }
                }
            }

            return createStatusValidationResult({
                isValid: true,
                metadata: {
                    ...metadata,
                    validatedFields: [
                        ...(metadata.validatedFields || []),
                        'status',
                        'transition',
                        'rules'
                    ],
                    status: 'success'
                },
                context: {
                    entity: context.entity,
                    transition: `${context.currentStatus} -> ${context.targetStatus}`,
                    metadata: context.metadata
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
            });

        } catch (error) {
            await this.handleError(
                error,
                'Validation error',
                ERROR_KINDS.ValidationError
            );

            return createStatusValidationResult({
                isValid: false,
            errors: [createValidationError({
                code: VALIDATION_ERROR_enum.VALIDATION_FAILED,
                message: error instanceof Error ? error.message : String(error),
                scope: VALIDATION_SCOPE_enum.SYSTEM,
                severity: VALIDATION_SEVERITY_enum.ERROR
            })],
                metadata: {
                    ...metadata,
                    validatedFields: [...(metadata.validatedFields || []), 'error'],
                    status: 'error'
                },
                context: {
                    entity: context.entity,
                    transition: `${context.currentStatus} -> ${context.targetStatus}`
                }
            });
        }
    }

    /**
     * Validate required fields in transition context
     */
    private validateRequiredFields(context: IStatusTransitionContext): IValidationError[] {
        const errors: IValidationError[] = [];

        if (!context.entityId) {
            errors.push(createValidationError({
                code: VALIDATION_ERROR_enum.FIELD_MISSING,
                message: 'Entity ID is required',
                field: 'entityId',
                severity: VALIDATION_SEVERITY_enum.ERROR
            }));
        }

        if (!context.operation) {
            errors.push(createValidationError({
                code: VALIDATION_ERROR_enum.FIELD_MISSING,
                message: 'Operation is required',
                field: 'operation',
                severity: VALIDATION_SEVERITY_enum.ERROR
            }));
        }

        if (!context.phase) {
            errors.push(createValidationError({
                code: VALIDATION_ERROR_enum.FIELD_MISSING,
                message: 'Phase is required',
                field: 'phase',
                severity: VALIDATION_SEVERITY_enum.ERROR
            }));
        }

        if (!context.startTime) {
            errors.push(createValidationError({
                code: VALIDATION_ERROR_enum.FIELD_MISSING,
                message: 'Start time is required',
                field: 'startTime',
                severity: VALIDATION_SEVERITY_enum.ERROR
            }));
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

    protected log(message: string, level: 'info' | 'error' = 'info', context?: Record<string, unknown>): void {
        super.log(message, level, {
            component: this.COMPONENT_NAME,
            timestamp: Date.now(),
            ...(context || {})
        });
    }

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

    private isAgentStatus(status: unknown): status is keyof typeof AGENT_STATUS_enum {
        return Object.values(AGENT_STATUS_enum).includes(status as AGENT_STATUS_enum);
    }

    private isMessageStatus(status: unknown): status is keyof typeof MESSAGE_STATUS_enum {
        return Object.values(MESSAGE_STATUS_enum).includes(status as MESSAGE_STATUS_enum);
    }

    private isTaskStatus(status: unknown): status is keyof typeof TASK_STATUS_enum {
        return Object.values(TASK_STATUS_enum).includes(status as TASK_STATUS_enum);
    }

    private isWorkflowStatus(status: unknown): status is keyof typeof WORKFLOW_STATUS_enum {
        return Object.values(WORKFLOW_STATUS_enum).includes(status as WORKFLOW_STATUS_enum);
    }
}

export default StatusValidator.getInstance();
