/**
 * @file statusValidators.ts
 * @path src/utils/managers/statusValidators.ts
 * @description Provides validation functions for checking the validity of status transitions for messages, agents, tasks, and workflows.
 */

import { MESSAGE_STATUS_enum, AGENT_STATUS_enum, TASK_STATUS_enum, WORKFLOW_STATUS_enum, StatusTypeGuards } from '@/utils/types/common/enums';
import type { StatusTransitionContext } from '@/utils/types/common/status';

/**
 * Validates a message status transition.
 */
export async function validateMessageTransition(context: StatusTransitionContext): Promise<boolean> {
    const { currentStatus, targetStatus } = context;

    if (!StatusTypeGuards.isMessageStatus(currentStatus) || !StatusTypeGuards.isMessageStatus(targetStatus)) {
        return false;
    }

    switch (currentStatus) {
        case MESSAGE_STATUS_enum.INITIAL:
            return targetStatus === MESSAGE_STATUS_enum.QUEUED;
        case MESSAGE_STATUS_enum.QUEUED:
            return targetStatus === MESSAGE_STATUS_enum.PROCESSING;
        case MESSAGE_STATUS_enum.PROCESSING:
            return [MESSAGE_STATUS_enum.PROCESSED, MESSAGE_STATUS_enum.ERROR].includes(targetStatus as MESSAGE_STATUS_enum);
        case MESSAGE_STATUS_enum.PROCESSED:
            return [MESSAGE_STATUS_enum.RETRIEVING, MESSAGE_STATUS_enum.CLEARING].includes(targetStatus as MESSAGE_STATUS_enum);
        case MESSAGE_STATUS_enum.RETRIEVING:
            return [MESSAGE_STATUS_enum.RETRIEVED, MESSAGE_STATUS_enum.ERROR].includes(targetStatus as MESSAGE_STATUS_enum);
        case MESSAGE_STATUS_enum.CLEARING:
            return [MESSAGE_STATUS_enum.CLEARED, MESSAGE_STATUS_enum.ERROR].includes(targetStatus as MESSAGE_STATUS_enum);
        default:
            return targetStatus === MESSAGE_STATUS_enum.ERROR;
    }
}

/**
 * Validates an agent status transition.
 */
export async function validateAgentTransition(context: StatusTransitionContext): Promise<boolean> {
    const { currentStatus, targetStatus } = context;

    if (!StatusTypeGuards.isAgentStatus(currentStatus) || !StatusTypeGuards.isAgentStatus(targetStatus)) {
        return false;
    }

    // Add additional validation logic specific to agent transitions if needed.
    return true;
}

/**
 * Validates a task status transition.
 */
export async function validateTaskTransition(context: StatusTransitionContext): Promise<boolean> {
    const { currentStatus, targetStatus } = context;

    if (!StatusTypeGuards.isTaskStatus(currentStatus) || !StatusTypeGuards.isTaskStatus(targetStatus)) {
        return false;
    }

    // Add additional validation logic specific to task transitions if needed.
    return true;
}

/**
 * Validates a workflow status transition.
 */
export async function validateWorkflowTransition(context: StatusTransitionContext): Promise<boolean> {
    const { currentStatus, targetStatus } = context;

    if (!StatusTypeGuards.isWorkflowStatus(currentStatus) || !StatusTypeGuards.isWorkflowStatus(targetStatus)) {
        return false;
    }

    // Add additional validation logic specific to workflow transitions if needed.
    return true;
}
