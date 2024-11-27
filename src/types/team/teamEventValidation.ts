/**
 * @file teamEventValidation.ts
 * @path src/types/team/teamEventValidation.ts
 * @description Validation schemas for team events using Zod
 *
 * @module @types/team
 */

import { z } from 'zod';
import { TeamEventType } from './teamEventTypes';
import { ITeamHandlerMetadata } from './teamStoreTypes';
import { IWorkflowResult } from '../workflow/workflowBaseTypes';
import { IErrorMetadata } from '../common/commonMetadataTypes';

// ─── Base Event Validation ────────────────────────────────────────────────────

const baseEventSchema = z.object({
    id: z.string().min(1),
    type: z.nativeEnum(TeamEventType),
    timestamp: z.number().positive(),
    metadata: z.custom<ITeamHandlerMetadata>()
});

// ─── Workflow Event Validation ────────────────────────────────────────────────

export const workflowStartSchema = baseEventSchema.extend({
    type: z.literal(TeamEventType.WORKFLOW_START),
    payload: z.object({
        workflowId: z.string().min(1),
        config: z.record(z.unknown())
    })
});

export const workflowStopSchema = baseEventSchema.extend({
    type: z.literal(TeamEventType.WORKFLOW_STOP),
    payload: z.object({
        workflowId: z.string().min(1),
        result: z.custom<IWorkflowResult>()
    })
});

export const workflowErrorSchema = baseEventSchema.extend({
    type: z.literal(TeamEventType.WORKFLOW_ERROR),
    payload: z.object({
        workflowId: z.string().min(1),
        error: z.custom<IErrorMetadata>()
    })
});

// ─── Agent Event Validation ──────────────────────────────────────────────────

export const agentStatusChangeSchema = baseEventSchema.extend({
    type: z.literal(TeamEventType.AGENT_STATUS_CHANGE),
    payload: z.object({
        agentId: z.string().min(1),
        previousStatus: z.string().min(1),
        newStatus: z.string().min(1),
        timestamp: z.number().positive()
    })
});

export const agentErrorSchema = baseEventSchema.extend({
    type: z.literal(TeamEventType.AGENT_ERROR),
    payload: z.object({
        agentId: z.string().min(1),
        error: z.custom<IErrorMetadata>()
    })
});

// ─── Task Event Validation ───────────────────────────────────────────────────

export const taskStatusChangeSchema = baseEventSchema.extend({
    type: z.literal(TeamEventType.TASK_STATUS_CHANGE),
    payload: z.object({
        taskId: z.string().min(1),
        previousStatus: z.string().min(1),
        newStatus: z.string().min(1),
        timestamp: z.number().positive()
    })
});

export const taskErrorSchema = baseEventSchema.extend({
    type: z.literal(TeamEventType.TASK_ERROR),
    payload: z.object({
        taskId: z.string().min(1),
        error: z.custom<IErrorMetadata>()
    })
});

export const taskBlockedSchema = baseEventSchema.extend({
    type: z.literal(TeamEventType.TASK_BLOCKED),
    payload: z.object({
        taskId: z.string().min(1),
        reason: z.string().min(1),
        blockedBy: z.string().min(1).optional(),
        timestamp: z.number().positive()
    })
});

// ─── Feedback Event Validation ────────────────────────────────────────────────

export const feedbackProvidedSchema = baseEventSchema.extend({
    type: z.literal(TeamEventType.FEEDBACK_PROVIDED),
    payload: z.object({
        feedbackId: z.string().min(1),
        targetId: z.string().min(1),
        targetType: z.enum(['agent', 'task', 'workflow']),
        content: z.string().min(1),
        rating: z.number().min(0).max(5).optional(),
        timestamp: z.number().positive()
    })
});

// ─── Validation Registry ────────────────────────────────────────────────────

export const teamEventValidationSchemas = {
    [TeamEventType.WORKFLOW_START]: workflowStartSchema,
    [TeamEventType.WORKFLOW_STOP]: workflowStopSchema,
    [TeamEventType.WORKFLOW_ERROR]: workflowErrorSchema,
    [TeamEventType.AGENT_STATUS_CHANGE]: agentStatusChangeSchema,
    [TeamEventType.AGENT_ERROR]: agentErrorSchema,
    [TeamEventType.TASK_STATUS_CHANGE]: taskStatusChangeSchema,
    [TeamEventType.TASK_ERROR]: taskErrorSchema,
    [TeamEventType.TASK_BLOCKED]: taskBlockedSchema,
    [TeamEventType.FEEDBACK_PROVIDED]: feedbackProvidedSchema
} as const;

// ─── Validation Functions ────────────────────────────────────────────────────

/**
 * Validates a team event based on its type
 * @param event The event to validate
 * @returns Validation result
 */
export function validateTeamEvent(event: unknown): z.SafeParseReturnType<unknown, unknown> {
    if (typeof event !== 'object' || event === null) {
        return {
            success: false,
            error: new z.ZodError([{
                code: z.ZodIssueCode.invalid_type,
                expected: 'object',
                received: typeof event,
                path: [],
                message: 'Event must be an object'
            }])
        };
    }

    const eventType = (event as { type?: TeamEventType }).type;
    const receivedType = eventType?.toString() || 'undefined';

    if (!eventType || !Object.values(TeamEventType).includes(eventType)) {
        return {
            success: false,
            error: new z.ZodError([{
                code: z.ZodIssueCode.invalid_enum_value,
                received: receivedType,
                options: Object.values(TeamEventType),
                path: ['type'],
                message: 'Invalid event type'
            }])
        };
    }

    const schema = teamEventValidationSchemas[eventType];
    return schema.safeParse(event);
}

/**
 * Type guard to check if an unknown value is a valid team event
 * @param event The value to check
 * @returns Type predicate
 */
export function isValidTeamEvent(event: unknown): boolean {
    return validateTeamEvent(event).success;
}
