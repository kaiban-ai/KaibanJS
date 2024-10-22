/**
 * C:\Users\pwalc\Documents\GroqEmailAssistant\KaibanJS\src\utils\prettyLogs.ts
 * Pretty Logging Utilities.
 *
 * Enhances log outputs by formatting them into more readable and visually appealing structures. This file contains functions 
 * that generate styled log entries for various operational states and outcomes within the KaibanJS library, making it easier 
 * to interpret and review logs.
 *
 * Usage:
 * Use these functions to output enhanced visual logs for better clarity and easier debugging during development and monitoring.
 */

import ansis from "ansis";
import { logger } from "./logger";
import type { 
  TaskCompletionProps,
  TaskStatusProps,
  WorkflowStatusProps,
  WorkflowResultProps 
} from '../../types/types';

function logPrettyTaskCompletion({
  iterationCount,
  duration,
  llmUsageStats,
  agentName,
  agentModel,
  taskTitle,
  currentTaskNumber,
  totalTasks,
  costDetails,
}: TaskCompletionProps) {
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
    ansis.black("| Cost Input Tokens: ") + ansis.cyan(`$${costDetails.costInputTokens.toString()}`),
    ansis.black("| Cost Output Tokens: ") + ansis.cyan(`$${costDetails.costOutputTokens.toString()}`),
    ansis.black("| Total Cost: ") + ansis.cyan(`$${costDetails.totalCost.toString()}`),
    "|",
    ansis.black("| Calls Count: ") + ansis.green(llmUsageStats.callsCount.toString()),
    ansis.black("| Calls Error Count: ") + ansis.green(llmUsageStats.callsErrorCount.toString()),
    ansis.black("| Parsing Errors: ") + ansis.green(llmUsageStats.parsingErrors.toString()),
    ansis.black("+-----------------------------------------+\n\n"),
  ].join("\n");
  logger.info(message);
}

function logPrettyTaskStatus({
  currentTaskNumber,
  totalTasks,
  taskTitle,
  taskStatus,
  agentName,
}: TaskStatusProps) {
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

function logPrettyWorkflowStatus({ status, message }: WorkflowStatusProps) {
  logger.info(`[Workflow Status: ${status}] ${message}`);
}

function logPrettyWorkflowResult({ metadata }: WorkflowResultProps) {
  const { result, duration, llmUsageStats, iterationCount, costDetails, teamName, taskCount, agentCount } = metadata;
  logger.info(`Workflow Result: ${result}`);
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
    ansis.black("| Cost Input Tokens: ") + ansis.cyan(`$${costDetails.costInputTokens.toString()}`),
    ansis.black("| Cost Output Tokens: ") + ansis.cyan(`$${costDetails.costOutputTokens.toString()}`),
    ansis.black("| Total Cost: ") + ansis.cyan(`$${costDetails.totalCost.toString()}`),
    "|",
    ansis.black("| Calls Count: ") + ansis.red(llmUsageStats.callsCount.toString()),
    ansis.black("| Calls Error Count: ") + ansis.red(llmUsageStats.callsErrorCount.toString()),
    ansis.black("| Parsing Errors: ") + ansis.red(llmUsageStats.parsingErrors.toString()),
    ansis.black("+-----------------------------------------+\n"),
  ].join("\n");
  logger.info(message);
}

export { logPrettyTaskCompletion, logPrettyTaskStatus, logPrettyWorkflowStatus, logPrettyWorkflowResult, WorkflowResultProps };
