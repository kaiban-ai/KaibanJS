/**
 * @file transitionRules.ts
 * @path src/utils/managers/transitionRules.ts
 * @description Contains transition rules for managing status transitions of messages, agents, tasks, and workflows.
 */

import { 
    MESSAGE_STATUS_enum, 
    AGENT_STATUS_enum, 
    TASK_STATUS_enum, 
    WORKFLOW_STATUS_enum 
} from '@/utils/types/common/enums';

import type { StatusTransitionRule } from '@/utils/types/common/status';

// Updated workflow type imports
import { WorkflowState } from '@/utils/types/workflow/store';
import { WorkflowResult } from '@/utils/types/workflow/base';

/**
 * Transition rules for different status entities.
 */
export const transitionRules: Map<string, StatusTransitionRule[]> = new Map([
    ['message', [
        { from: MESSAGE_STATUS_enum.INITIAL, to: MESSAGE_STATUS_enum.QUEUED },
        { from: MESSAGE_STATUS_enum.QUEUED, to: MESSAGE_STATUS_enum.PROCESSING },
        { from: MESSAGE_STATUS_enum.PROCESSING, to: [MESSAGE_STATUS_enum.PROCESSED, MESSAGE_STATUS_enum.ERROR] },
        { from: MESSAGE_STATUS_enum.PROCESSED, to: [MESSAGE_STATUS_enum.RETRIEVING, MESSAGE_STATUS_enum.CLEARING] },
        { from: MESSAGE_STATUS_enum.RETRIEVING, to: [MESSAGE_STATUS_enum.RETRIEVED, MESSAGE_STATUS_enum.ERROR] },
        { from: MESSAGE_STATUS_enum.CLEARING, to: [MESSAGE_STATUS_enum.CLEARED, MESSAGE_STATUS_enum.ERROR] },
    ]],
    ['agent', [
        { from: AGENT_STATUS_enum.INITIAL, to: AGENT_STATUS_enum.THINKING },
        { from: AGENT_STATUS_enum.THINKING, to: [AGENT_STATUS_enum.THINKING_END, AGENT_STATUS_enum.THINKING_ERROR] },
        { from: AGENT_STATUS_enum.THINKING_END, to: [AGENT_STATUS_enum.EXECUTING_ACTION, AGENT_STATUS_enum.SELF_QUESTION, AGENT_STATUS_enum.OBSERVATION] },
        { from: AGENT_STATUS_enum.EXECUTING_ACTION, to: [AGENT_STATUS_enum.USING_TOOL, AGENT_STATUS_enum.FINAL_ANSWER] },
        { from: AGENT_STATUS_enum.USING_TOOL, to: [AGENT_STATUS_enum.USING_TOOL_END, AGENT_STATUS_enum.USING_TOOL_ERROR] },
        { from: AGENT_STATUS_enum.USING_TOOL_ERROR, to: AGENT_STATUS_enum.TOOL_DOES_NOT_EXIST },
        { from: AGENT_STATUS_enum.ISSUES_PARSING_LLM_OUTPUT, to: AGENT_STATUS_enum.WEIRD_LLM_OUTPUT },
        { from: AGENT_STATUS_enum.WEIRD_LLM_OUTPUT, to: AGENT_STATUS_enum.FINAL_ANSWER },
    ]],
    ['task', [
        { from: TASK_STATUS_enum.PENDING, to: TASK_STATUS_enum.TODO },
        { from: TASK_STATUS_enum.TODO, to: [TASK_STATUS_enum.DOING, TASK_STATUS_enum.REVISE] },
        { from: TASK_STATUS_enum.REVISE, to: TASK_STATUS_enum.DOING },
        { from: TASK_STATUS_enum.AWAITING_VALIDATION, to: TASK_STATUS_enum.VALIDATED },
        { from: TASK_STATUS_enum.VALIDATED, to: TASK_STATUS_enum.DONE },
        { from: TASK_STATUS_enum.DOING, to: [TASK_STATUS_enum.BLOCKED, TASK_STATUS_enum.ERROR] },
        { from: TASK_STATUS_enum.ERROR, to: TASK_STATUS_enum.REVISE },
    ]],
    ['workflow', [
        { from: WORKFLOW_STATUS_enum.INITIAL, to: WORKFLOW_STATUS_enum.RUNNING },
        { from: WORKFLOW_STATUS_enum.RUNNING, to: [WORKFLOW_STATUS_enum.STOPPING, WORKFLOW_STATUS_enum.FINISHED, WORKFLOW_STATUS_enum.ERRORED, WORKFLOW_STATUS_enum.BLOCKED] },
        { from: WORKFLOW_STATUS_enum.STOPPING, to: WORKFLOW_STATUS_enum.STOPPED },
        { from: WORKFLOW_STATUS_enum.BLOCKED, to: WORKFLOW_STATUS_enum.RUNNING },
        { from: WORKFLOW_STATUS_enum.ERRORED, to: WORKFLOW_STATUS_enum.RUNNING },
        { from: WORKFLOW_STATUS_enum.STOPPED, to: WORKFLOW_STATUS_enum.INITIAL },
    ]]
]);
