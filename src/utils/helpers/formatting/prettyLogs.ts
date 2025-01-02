/**
 * @file prettyLogs.ts
 * @path C:\Users\pwalc\Documents\GroqEmailAssistant\KaibanJS\src\utils\helpers\formatting\prettyLogs.ts
 * @description Pretty formatting and logging utilities for consistent output format
 */

// Core utilities
import ansis from "ansis";
import logger from "../../../managers/core/logManager";

// Import types from canonical locations
import type { 
    ITaskLogMetadata,
    IWorkflowLogMetadata
} from '../../../types/team/teamLogsTypes';

// ─── Format Constants ────────────────────────────────────────────────────────────

const SEPARATOR = '+-----------------------------------------+';
const LINE_SEP = '|-----------------------------------------|';

// ─── Task Completion Logging ────────────────────────────────────────────────────

export function logPrettyTaskCompletion({
    iterationCount,
    duration,
    llmUsageMetrics,
    agentName,
    agentModel,
    taskTitle,
    currentTaskNumber,
    totalTasks,
    costDetails,
}: ITaskLogMetadata['task'] & { 
    agentName: string;
    agentModel: string;
    taskTitle: string;
    currentTaskNumber: number;
    totalTasks: number;
}): void {
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
        ansis.black("| Input Tokens: ") + ansis.yellow(llmUsageMetrics.tokenDistribution.prompt.toString()),
        ansis.black("| Output Tokens: ") + ansis.yellow(llmUsageMetrics.tokenDistribution.completion.toString()),
        "|",
        ansis.black("| Cost Input Tokens: ") + ansis.cyan(`$${costDetails.breakdown.promptTokens.cost.toString()}`),
        ansis.black("| Cost Output Tokens: ") + ansis.cyan(`$${costDetails.breakdown.completionTokens.cost.toString()}`),
        ansis.black("| Total Cost: ") + ansis.cyan(`$${costDetails.totalCost.toString()}`),
        "|",
        ansis.black("| Total Requests: ") + ansis.green(llmUsageMetrics.totalRequests.toString()),
        ansis.black("| Active Instances: ") + ansis.green(llmUsageMetrics.activeInstances.toString()),
        ansis.black("| Requests/Second: ") + ansis.green(llmUsageMetrics.requestsPerSecond.toString()),
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
}: {
    currentTaskNumber: number;
    totalTasks: number;
    taskTitle: string;
    taskStatus: string;
    agentName: string;
}): void {
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
}: {
    status: string;
    message: string;
}): void {
    const formattedStatus = formatWorkflowStatus(status);
    logger.info(`[Workflow Status: ${formattedStatus}] ${message}`);
}

// ─── Workflow Result Logging ───────────────────────────────────────────────────

export function logPrettyWorkflowResult({ 
    workflow 
}: IWorkflowLogMetadata): void {
    const { 
        duration, 
        llmUsageMetrics, 
        iterationCount, 
        costDetails, 
        teamName, 
        taskCount, 
        agentCount 
    } = workflow;

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
        ansis.black("| Input Tokens: ") + ansis.yellow(llmUsageMetrics.tokenDistribution.prompt.toString()),
        ansis.black("| Output Tokens: ") + ansis.yellow(llmUsageMetrics.tokenDistribution.completion.toString()),
        "|",
        ansis.black("| Cost Input Tokens: ") + ansis.cyan(`$${costDetails.breakdown.promptTokens.cost.toString()}`),
        ansis.black("| Cost Output Tokens: ") + ansis.cyan(`$${costDetails.breakdown.completionTokens.cost.toString()}`),
        ansis.black("| Total Cost: ") + ansis.cyan(`$${costDetails.totalCost.toString()}`),
        "|",
        ansis.black("| Total Requests: ") + ansis.red(llmUsageMetrics.totalRequests.toString()),
        ansis.black("| Active Instances: ") + ansis.red(llmUsageMetrics.activeInstances.toString()),
        ansis.black("| Requests/Second: ") + ansis.red(llmUsageMetrics.requestsPerSecond.toString()),
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
