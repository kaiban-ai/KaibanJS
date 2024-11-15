/**
 * @file TransitionRules.ts
 * @path src/managers/core/TransitionRules.ts
 * @description Status transition rules and validation for all entities
 * 
 * @module @core
 */

import type { StatusEntity, StatusTransitionRule, StatusType } from '@/utils/types/common/status';
import {
    AGENT_STATUS_enum,
    MESSAGE_STATUS_enum,
    TASK_STATUS_enum,
    WORKFLOW_STATUS_enum,
    EnumTypeGuards
} from '@/utils/types/common/enums';

// ─── Transition Rule Maps ───────────────────────────────────────────────────────

/**
 * Core status transition rules for all entities
 */
export const transitionRules: Map<StatusEntity, StatusTransitionRule[]> = new Map([
    // ─── Agent Status Rules ────────────────────────────────────────────────────
    ['agent', [
        // Initial transitions
        {
            from: AGENT_STATUS_enum.INITIAL,
            to: [
                AGENT_STATUS_enum.THINKING,
                AGENT_STATUS_enum.ITERATION_START
            ]
        },

        // Thinking process transitions
        {
            from: AGENT_STATUS_enum.THINKING,
            to: [
                AGENT_STATUS_enum.THINKING_END,
                AGENT_STATUS_enum.THINKING_ERROR,
                AGENT_STATUS_enum.WEIRD_LLM_OUTPUT
            ]
        },
        {
            from: AGENT_STATUS_enum.THINKING_END,
            to: [
                AGENT_STATUS_enum.THOUGHT,
                AGENT_STATUS_enum.SELF_QUESTION,
                AGENT_STATUS_enum.FINAL_ANSWER,
                AGENT_STATUS_enum.EXECUTING_ACTION
            ]
        },
        {
            from: AGENT_STATUS_enum.THINKING_ERROR,
            to: [
                AGENT_STATUS_enum.ITERATION_END,
                AGENT_STATUS_enum.AGENTIC_LOOP_ERROR
            ]
        },

        // Tool execution transitions
        {
            from: AGENT_STATUS_enum.EXECUTING_ACTION,
            to: [
                AGENT_STATUS_enum.USING_TOOL,
                AGENT_STATUS_enum.FINAL_ANSWER
            ]
        },
        {
            from: AGENT_STATUS_enum.USING_TOOL,
            to: [
                AGENT_STATUS_enum.USING_TOOL_END,
                AGENT_STATUS_enum.USING_TOOL_ERROR,
                AGENT_STATUS_enum.TOOL_DOES_NOT_EXIST
            ]
        },
        {
            from: AGENT_STATUS_enum.USING_TOOL_END,
            to: [
                AGENT_STATUS_enum.OBSERVATION,
                AGENT_STATUS_enum.ITERATION_END
            ]
        },

        // Thinking state transitions
        {
            from: AGENT_STATUS_enum.THOUGHT,
            to: [
                AGENT_STATUS_enum.EXECUTING_ACTION,
                AGENT_STATUS_enum.SELF_QUESTION,
                AGENT_STATUS_enum.FINAL_ANSWER
            ]
        },
        {
            from: AGENT_STATUS_enum.SELF_QUESTION,
            to: [
                AGENT_STATUS_enum.THINKING,
                AGENT_STATUS_enum.OBSERVATION
            ]
        },
        {
            from: AGENT_STATUS_enum.OBSERVATION,
            to: [
                AGENT_STATUS_enum.THINKING,
                AGENT_STATUS_enum.FINAL_ANSWER
            ]
        },

        // Iteration handling
        {
            from: AGENT_STATUS_enum.ITERATION_START,
            to: [
                AGENT_STATUS_enum.THINKING,
                AGENT_STATUS_enum.MAX_ITERATIONS_ERROR
            ]
        },
        {
            from: AGENT_STATUS_enum.ITERATION_END,
            to: [
                AGENT_STATUS_enum.ITERATION_START,
                AGENT_STATUS_enum.FINAL_ANSWER
            ]
        },

        // Error state transitions
        {
            from: [
                AGENT_STATUS_enum.USING_TOOL_ERROR,
                AGENT_STATUS_enum.ISSUES_PARSING_LLM_OUTPUT,
                AGENT_STATUS_enum.WEIRD_LLM_OUTPUT,
                AGENT_STATUS_enum.MAX_ITERATIONS_ERROR
            ],
            to: [
                AGENT_STATUS_enum.ITERATION_END,
                AGENT_STATUS_enum.AGENTIC_LOOP_ERROR
            ]
        }
    ]],

    // ─── Message Status Rules ───────────────────────────────────────────────────
    ['message', [
        {
            from: MESSAGE_STATUS_enum.INITIAL,
            to: MESSAGE_STATUS_enum.QUEUED
        },
        {
            from: MESSAGE_STATUS_enum.QUEUED,
            to: [
                MESSAGE_STATUS_enum.PROCESSING,
                MESSAGE_STATUS_enum.ERROR
            ]
        },
        {
            from: MESSAGE_STATUS_enum.PROCESSING,
            to: [
                MESSAGE_STATUS_enum.PROCESSED,
                MESSAGE_STATUS_enum.ERROR
            ]
        },
        {
            from: MESSAGE_STATUS_enum.PROCESSED,
            to: [
                MESSAGE_STATUS_enum.RETRIEVING,
                MESSAGE_STATUS_enum.CLEARING
            ]
        },
        {
            from: MESSAGE_STATUS_enum.RETRIEVING,
            to: [
                MESSAGE_STATUS_enum.RETRIEVED,
                MESSAGE_STATUS_enum.ERROR
            ]
        },
        {
            from: MESSAGE_STATUS_enum.CLEARING,
            to: [
                MESSAGE_STATUS_enum.CLEARED,
                MESSAGE_STATUS_enum.ERROR
            ]
        }
    ]],

    // ─── Task Status Rules ─────────────────────────────────────────────────────
    ['task', [
        {
            from: TASK_STATUS_enum.PENDING,
            to: TASK_STATUS_enum.TODO
        },
        {
            from: TASK_STATUS_enum.TODO,
            to: [
                TASK_STATUS_enum.DOING,
                TASK_STATUS_enum.BLOCKED
            ]
        },
        {
            from: TASK_STATUS_enum.DOING,
            to: [
                TASK_STATUS_enum.DONE,
                TASK_STATUS_enum.ERROR,
                TASK_STATUS_enum.BLOCKED,
                TASK_STATUS_enum.AWAITING_VALIDATION
            ]
        },
        {
            from: TASK_STATUS_enum.AWAITING_VALIDATION,
            to: [
                TASK_STATUS_enum.VALIDATED,
                TASK_STATUS_enum.REVISE
            ]
        },
        {
            from: TASK_STATUS_enum.VALIDATED,
            to: TASK_STATUS_enum.DONE
        },
        {
            from: TASK_STATUS_enum.ERROR,
            to: [
                TASK_STATUS_enum.REVISE,
                TASK_STATUS_enum.BLOCKED
            ]
        },
        {
            from: TASK_STATUS_enum.REVISE,
            to: TASK_STATUS_enum.DOING
        },
        {
            from: TASK_STATUS_enum.BLOCKED,
            to: [
                TASK_STATUS_enum.TODO,
                TASK_STATUS_enum.ERROR
            ]
        }
    ]],

    // ─── Workflow Status Rules ──────────────────────────────────────────────────
    ['workflow', [
        {
            from: WORKFLOW_STATUS_enum.INITIAL,
            to: WORKFLOW_STATUS_enum.RUNNING
        },
        {
            from: WORKFLOW_STATUS_enum.RUNNING,
            to: [
                WORKFLOW_STATUS_enum.FINISHED,
                WORKFLOW_STATUS_enum.ERRORED,
                WORKFLOW_STATUS_enum.BLOCKED,
                WORKFLOW_STATUS_enum.STOPPING
            ]
        },
        {
            from: WORKFLOW_STATUS_enum.STOPPING,
            to: WORKFLOW_STATUS_enum.STOPPED
        },
        {
            from: WORKFLOW_STATUS_enum.BLOCKED,
            to: [
                WORKFLOW_STATUS_enum.RUNNING,
                WORKFLOW_STATUS_enum.ERRORED
            ]
        },
        {
            from: WORKFLOW_STATUS_enum.STOPPED,
            to: WORKFLOW_STATUS_enum.INITIAL
        }
    ]]
]);

// ─── Rule Validation Utilities ────────────────────────────────────────────────

/**
 * Check if a transition is allowed for an entity
 */
export function isTransitionAllowed(
    entity: StatusEntity,
    fromStatus: StatusType,
    toStatus: StatusType
): boolean {
    // Validate input statuses match the entity
    if (!EnumTypeGuards.isValidStatusForEntity(fromStatus, entity) ||
        !EnumTypeGuards.isValidStatusForEntity(toStatus, entity)) {
        return false;
    }

    const entityRules = transitionRules.get(entity);
    if (!entityRules) return false;

    return entityRules.some(rule => {
        const fromMatches = Array.isArray(rule.from)
            ? rule.from.includes(fromStatus)
            : rule.from === fromStatus;

        const toMatches = Array.isArray(rule.to)
            ? rule.to.includes(toStatus)
            : rule.to === toStatus;

        return fromMatches && toMatches;
    });
}

/**
 * Get available transitions for a status
 */
export function getAvailableTransitions(
    entity: StatusEntity,
    currentStatus: StatusType
): StatusType[] {
    // Validate current status matches the entity
    if (!EnumTypeGuards.isValidStatusForEntity(currentStatus, entity)) {
        return [];
    }

    const entityRules = transitionRules.get(entity);
    if (!entityRules) return [];

    return entityRules
        .filter(rule => 
            Array.isArray(rule.from)
                ? rule.from.includes(currentStatus)
                : rule.from === currentStatus
        )
        .flatMap(rule => Array.isArray(rule.to) ? rule.to : [rule.to]);
}

/**
 * Export utilities
 */
export const TransitionUtils = {
    isTransitionAllowed,
    getAvailableTransitions
};

export default transitionRules;
