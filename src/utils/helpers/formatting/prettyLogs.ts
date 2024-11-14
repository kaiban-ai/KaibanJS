/**
 * @file prettyLogs.ts
 * @path KaibanJS/src/utils/helpers/formatting/prettyLogs.ts
 * @description Pretty formatting and logging utilities for consistent output format
 */

// Core utilities
import ansis from "ansis";
import { logger } from "@/utils/core/logger";

// Import types from canonical locations
import type { 
    TaskCompletionProps, 
    TaskStatusProps,
    WorkflowStatusProps, 
    WorkflowResultProps 
} from '@/utils/types/common/logging';

// ─── Format Constants ────────────────────────────────────────────────────────────

const SEPARATOR = '+-----------------------------------------+';
const LINE_SEP = '|-----------------------------------------|';

// ─── Task Completion Logging ────────────────────────────────────────────────────

export function logPrettyTaskCompletion({
    iterationCount,
    duration,
    llmUsageStats,
    agentName,
    agentModel,
    taskTitle,
    currentTaskNumber,
    totalTasks,
    costDetails,
}: TaskCompletionProps): void {
    const message = [
        ansis.black("\n" + SEPARATOR),
        ansis.bold(`| Task (${currentTaskNumber}/${totalTasks}) - status changed to ${ansis.green('DONE')}     |`),
        LINE_SEP,
        ansis.bold("| Summary:"),
        "|",
        ansis.black("| Task: ") + ansis.cyan(taskTitle),
        ansis.black("| Agent: ") + ansis.cyan(agentName),
        ansis.black("| Model: ") + ansis.cyan(agentModel),
        "|",
        ansis.black("| Iterations: ") + ansis.cyan(iterationCount.toString()),
        ansis.black("| Duration: ") + ansis.cyan(duration.toString()) + ansis.cyan(" seconds"),
        ansis.black("| Input Tokens: ") + ansis.yellow(llmUsageStats.inputTokens.toString()),
        ansis.black("| Output Tokens: ") + ansis.yellow(llmUsageStats.outputTokens.toString()),
        "|",
        ansis.black("| Cost Input Tokens: ") + ansis.cyan(`$${costDetails.breakdown.promptTokens.cost.toString()}`),
        ansis.black("| Cost Output Tokens: ") + ansis.cyan(`$${costDetails.breakdown.completionTokens.cost.toString()}`),
        ansis.black("| Total Cost: ") + ansis.cyan(`$${costDetails.totalCost.toString()}`),
        "|",
        ansis.black("| Calls Count: ") + ansis.green(llmUsageStats.callsCount.toString()),
        ansis.black("| Calls Error Count: ") + ansis.green(llmUsageStats.callsErrorCount.toString()),
        ansis.black("| Parsing Errors: ") + ansis.green(llmUsageStats.parsingErrors.toString()),
        ansis.black(SEPARATOR + "\n\n"),
    ].join("\n");
    
    logger.info(message);
}

// ─── Task Status Logging ──────────────────────────────────────────────────────

export function logPrettyTaskStatus({
    currentTaskNumber,
    totalTasks,
    taskTitle,
    taskStatus,
    agentName,
}: TaskStatusProps): void {
    const header = ansis.bold.black("||===========================================||");
    const taskInfo = ansis.bold.black(
        `|| Task (${currentTaskNumber}/${totalTasks}) - status changed to ${
            taskStatus === "DONE" ? ansis.green(taskStatus) : ansis.yellow(taskStatus)
        }`
    );
    const title = ansis.bold.black(`|| Title: ${taskTitle}`);
    const agent = ansis.bold.black(`|| Agent: ${agentName}`);
    const footer = ansis.bold.black("||===========================================||\n\n");

    const message = [
        header,
        taskInfo,
        title,
        agent,
        footer
    ].join("\n");

    logger.info(message);
}

// ─── Workflow Status Logging ───────────────────────────────────────────────────

export function logPrettyWorkflowStatus({ 
    status, 
    message 
}: WorkflowStatusProps): void {
    const formattedStatus = formatWorkflowStatus(status);
    logger.info(`[Workflow Status: ${formattedStatus}] ${message}`);
}

// ─── Workflow Result Logging ───────────────────────────────────────────────────

export function logPrettyWorkflowResult({ 
    metadata 
}: WorkflowResultProps): void {
    const { 
        result, 
        duration, 
        llmUsageStats, 
        iterationCount, 
        costDetails, 
        teamName, 
        taskCount, 
        agentCount 
    } = metadata;

    const message = [
        ansis.black("\n" + SEPARATOR),
        ansis.bold(`| WORKFLOW - ${ansis.green("FINISH")}                       |`),
        LINE_SEP,
        ansis.bold("| Summary:"),
        "|",
        ansis.black("| Team: ") + ansis.cyan(teamName),
        ansis.black("| Tasks: ") + ansis.cyan(taskCount.toString()),
        ansis.black("| Agents: ") + ansis.cyan(agentCount.toString()),
        "|",
        ansis.black("| Iterations: ") + ansis.yellow(iterationCount.toString()),
        ansis.black("| Duration: ") + ansis.yellow(duration.toString()) + ansis.yellow(" seconds"),
        ansis.black("| Input Tokens: ") + ansis.yellow(llmUsageStats.inputTokens.toString()),
        ansis.black("| Output Tokens: ") + ansis.yellow(llmUsageStats.outputTokens.toString()),
        "|",
        ansis.black("| Cost Input Tokens: ") + ansis.cyan(`$${costDetails.breakdown.promptTokens.cost.toString()}`),
        ansis.black("| Cost Output Tokens: ") + ansis.cyan(`$${costDetails.breakdown.completionTokens.cost.toString()}`),
        ansis.black("| Total Cost: ") + ansis.cyan(`$${costDetails.totalCost.toString()}`),
        "|",
        ansis.black("| Calls Count: ") + ansis.red(llmUsageStats.callsCount.toString()),
        ansis.black("| Calls Error Count: ") + ansis.red(llmUsageStats.callsErrorCount.toString()),
        ansis.black("| Parsing Errors: ") + ansis.red(llmUsageStats.parsingErrors.toString()),
        ansis.black(SEPARATOR + "\n"),
    ].join("\n");

    logger.info(message);
}

// ─── Private Helper Functions ────────────────────────────────────────────────────

/**
 * Format workflow status with appropriate colors
 */
function formatWorkflowStatus(status: string): string {
    switch (status.toLowerCase()) {
        case 'running':
            return ansis.cyan(status);
        case 'finished':
            return ansis.green(status);
        case 'errored':
            return ansis.red(status);
        case 'blocked':
            return ansis.yellow(status);
        default:
            return status;
    }
}

/**
 * Format costs with consistent decimal places
 */
function formatCost(value: number): string {
    return value.toFixed(4);
}