/**
 * @file StatusValidator.ts
 * @path KaibanJS/src/utils/managers/core/StatusValidator.ts
 * @description Status validation and transition rule enforcement
 */

import CoreManager from './CoreManager';
import { transitionRules } from './TransitionRules';

// Types from canonical locations
import type {
    StatusTransitionContext,
    StatusValidationResult,
    StatusEntity,
    StatusType,
    StatusTransitionRule
} from '@/utils/types/common/status';

// Enum values needed for runtime checks
import {
    AGENT_STATUS_enum,
    MESSAGE_STATUS_enum,
    TASK_STATUS_enum,
    WORKFLOW_STATUS_enum
} from '@/utils/types/common/enums';

// ─── Status Validator Implementation ───────────────────────────────────────────

export class StatusValidator extends CoreManager {
    // ─── Transition Validation ──────────────────────────────────────────────────

    public async validateTransition(context: StatusTransitionContext): Promise<StatusValidationResult> {
        const { currentStatus, targetStatus, entity, metadata } = context;

        try {
            // Basic validity checks
            if (!this.isValidStatus(currentStatus, entity)) {
                return {
                    isValid: false,
                    errors: [`Invalid current status: ${currentStatus}`]
                };
            }

            if (!this.isValidStatus(targetStatus, entity)) {
                return {
                    isValid: false,
                    errors: [`Invalid target status: ${targetStatus}`]
                };
            }

            // Get transition rules for entity
            const rules = transitionRules.get(entity);
            if (!rules) {
                return {
                    isValid: false,
                    errors: [`No transition rules defined for entity: ${entity}`]
                };
            }

            // Check if transition is allowed
            const isAllowed = this.isTransitionAllowed(rules, currentStatus, targetStatus);
            if (!isAllowed) {
                return {
                    isValid: false,
                    errors: [`Transition from ${currentStatus} to ${targetStatus} not allowed for ${entity}`]
                };
            }

            // Execute custom validation if defined
            for (const rule of rules) {
                if (this.matchesRule(rule, currentStatus, targetStatus)) {
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
                    entity,
                    transition: `${currentStatus} -> ${targetStatus}`,
                    metadata
                }
            };

        } catch (error) {
            this.handleError(error as Error, 'Transition validation failed');
            return {
                isValid: false,
                errors: [(error as Error).message],
                context: { entity, transition: `${currentStatus} -> ${targetStatus}` }
            };
        }
    }

    // ─── Status Validation ─────────────────────────────────────────────────────

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

    // ─── Private Helper Methods ────────────────────────────────────────────────

    private isTransitionAllowed(
        rules: StatusTransitionRule[],
        currentStatus: StatusType,
        targetStatus: StatusType
    ): boolean {
        return rules.some(rule => this.matchesRule(rule, currentStatus, targetStatus));
    }

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

    // ─── Entity Type Guards ─────────────────────────────────────────────────────

    public isAgentStatus(status: unknown): status is keyof typeof AGENT_STATUS_enum {
        return Object.values(AGENT_STATUS_enum).includes(status as AGENT_STATUS_enum);
    }

    public isMessageStatus(status: unknown): status is keyof typeof MESSAGE_STATUS_enum {
        return Object.values(MESSAGE_STATUS_enum).includes(status as MESSAGE_STATUS_enum);
    }

    public isTaskStatus(status: unknown): status is keyof typeof TASK_STATUS_enum {
        return Object.values(TASK_STATUS_enum).includes(status as TASK_STATUS_enum);
    }

    public isWorkflowStatus(status: unknown): status is keyof typeof WORKFLOW_STATUS_enum {
        return Object.values(WORKFLOW_STATUS_enum).includes(status as WORKFLOW_STATUS_enum);
    }
}

export default StatusValidator;
