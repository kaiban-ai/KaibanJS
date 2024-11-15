/**
 * @file StatusValidator.ts
 * @path src/managers/core/StatusValidator.ts
 * @description Status validation and transition rule enforcement
 * 
 * @module @core
 */

import CoreManager from './CoreManager';
import { transitionRules } from './TransitionRules';

// Import types from canonical locations
import type {
    StatusTransitionContext,
    StatusValidationResult,
    StatusEntity,
    StatusType,
    StatusTransitionRule,
    StatusTransition
} from '@/utils/types/common/status';

import {
    AGENT_STATUS_enum,
    MESSAGE_STATUS_enum,
    TASK_STATUS_enum,
    WORKFLOW_STATUS_enum
} from '@/utils/types/common/enums';

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

    // ─── Core Validation Methods ────────────────────────────────────────────────

    /**
     * Validate a proposed status transition
     */
    public async validateTransition(context: StatusTransitionContext): Promise<StatusValidationResult> {
        try {
            // Basic validity checks
            if (!this.isValidStatus(context.currentStatus, context.entity)) {
                return {
                    isValid: false,
                    errors: [`Invalid current status: ${context.currentStatus}`]
                };
            }

            if (!this.isValidStatus(context.targetStatus, context.entity)) {
                return {
                    isValid: false,
                    errors: [`Invalid target status: ${context.targetStatus}`]
                };
            }

            // Get transition rules for entity
            const rules = transitionRules.get(context.entity);
            if (!rules) {
                return {
                    isValid: false,
                    errors: [`No transition rules defined for entity: ${context.entity}`]
                };
            }

            // Check if transition is allowed
            const isAllowed = this.isTransitionAllowed(rules, context.currentStatus, context.targetStatus);
            if (!isAllowed) {
                return {
                    isValid: false,
                    errors: [
                        `Transition from ${context.currentStatus} to ${context.targetStatus} not allowed for ${context.entity}`
                    ]
                };
            }

            // Execute custom validation if defined
            for (const rule of rules) {
                if (this.matchesRule(rule, context.currentStatus, context.targetStatus)) {
                    if (rule.validation) {
                        const isValid = await rule.validation(context);
                        if (!isValid) {
                            return {
                                isValid: false,
                                errors: [`Custom validation failed for transition`]
                            };
                        }
                    }
                }
            }

            return {
                isValid: true,
                context: {
                    entity: context.entity,
                    transition: `${context.currentStatus} -> ${context.targetStatus}`,
                    metadata: context.metadata
                }
            };

        } catch (error) {
            this.log(`Validation error: ${error}`, 'error');
            return {
                isValid: false,
                errors: [(error as Error).message],
                context: {
                    entity: context.entity,
                    transition: `${context.currentStatus} -> ${context.targetStatus}`
                }
            };
        }
    }

    /**
     * Check if a status is valid for an entity
     */
    public isValidStatus(status: string, entity: StatusEntity): boolean {
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
    public getAvailableTransitions(status: StatusType, entity: StatusEntity): StatusType[] {
        const rules = transitionRules.get(entity);
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
        rules: StatusTransitionRule[],
        currentStatus: StatusType,
        targetStatus: StatusType
    ): boolean {
        return rules.some(rule => this.matchesRule(rule, currentStatus, targetStatus));
    }

    /**
     * Check if a rule matches a transition
     */
    private matchesRule(
        rule: StatusTransitionRule,
        currentStatus: StatusType,
        targetStatus: StatusType
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