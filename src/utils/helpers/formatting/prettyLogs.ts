/**
 * @file prettyLogs.ts
 * @path src/utils/helpers/formatting/prettyLogs.ts
 * @description Pretty formatting for log output
 */

import ansis from "ansis";
import { logger } from "../../core/logger";
import { 
    TaskCompletionProps, 
    TaskStatusProps,
    WorkflowStatusProps, 
    WorkflowResultProps 
} from '../../types/common/logging';

/**
 * Format task completion log
 */
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
        ansis.black("\n+-----------------------------------------+"),
        ansis.bold(`| Task (${currentTaskNumber}/${totalTasks}) - status changed to ${ansis.green('DONE')}     |`),
        "|-----------------------------------------|",
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
        ansis.black("+-----------------------------------------+\n\n"),
    ].join("\n");
    
    logger.info(message);
}

/**
 * Format task status log
 */
export function logPrettyTaskStatus({
    currentTaskNumber,
    totalTasks,
    taskTitle,
    taskStatus,
    agentName,
}: TaskStatusProps): void {
    logger.info(ansis.bold.black("||===========================================||"));
    logger.info(
        ansis.bold.black(
            `|| Task (${currentTaskNumber}/${totalTasks}) - status changed to ${
                taskStatus === "DONE" ? ansis.green(taskStatus) : ansis.yellow(taskStatus)
            }`
        )
    );
    logger.info(ansis.bold.black(`|| Title: ${taskTitle}`));
    logger.info(ansis.bold.black(`|| Agent: ${agentName}`));
    logger.info(ansis.bold.black("||===========================================||\n\n"));
}

/**
 * Format workflow status log
 */
export function logPrettyWorkflowStatus({ 
    status, 
    message 
}: WorkflowStatusProps): void {
    logger.info(`[Workflow Status: ${status}] ${message}`);
}

/**
 * Format workflow result log
 */
export function logPrettyWorkflowResult({ metadata }: WorkflowResultProps): void {
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
        ansis.black("\n+-----------------------------------------+"),
        ansis.bold(`| WORKFLOW - ${ansis.green("FINISH")}                       |`),
        "|-----------------------------------------|",
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
        ansis.black("+-----------------------------------------+\n"),
    ].join("\n");

    logger.info(message);
}