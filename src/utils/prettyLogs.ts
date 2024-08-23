/**
 * Pretty Logging Utilities.
 *
 * Enhances log outputs by formatting them into more readable and visually appealing structures. This file contains functions
 * that generate styled log entries for various operational states and outcomes within the AgenticJS library, making it easier
 * to interpret and review logs.
 *
 * Usage:
 * Use these functions to output enhanced visual logs for better clarity and easier debugging during development and monitoring.
 */

import ansis from "ansis";
import { logger } from "./logger";
import { ICostDetails } from "./llmCostCalculator";
import { IUsageStats } from "./types";

const logPrettyTaskCompletion = ({
  task,
  iterationCount,
  duration,
  llmUsageStats,
  agentName,
  agentModel,
  taskTitle,
  currentTaskNumber,
  totalTasks,
  costDetails,
}: {
  task: { id: string; title: string };
  iterationCount: number;
  duration: number;
  llmUsageStats: IUsageStats;
  agentName: string;
  agentModel: string;
  taskTitle: string;
  currentTaskNumber: number;
  totalTasks: number;
  costDetails: ICostDetails;
}): void => {
  const message = [
    ansis.black("\n+-----------------------------------------+"),
    ansis.bold(
      `| Task (${currentTaskNumber}/${totalTasks}) - status changed to ${ansis.green(
        "DONE"
      )}     |`
    ),
    "|-----------------------------------------|",
    ansis.bold("| Summary:"),
    "|",
    ansis.black("| Task: ") + ansis.cyan(taskTitle),
    ansis.black("| Agent: ") + ansis.cyan(agentName),
    ansis.black("| Model: ") + ansis.cyan(agentModel),
    "|",
    ansis.black("| Iterations: ") + ansis.cyan(iterationCount.toString()),
    ansis.black("| Duration: ") +
      ansis.cyan(duration.toString()) +
      ansis.cyan(" seconds"),
    ansis.black("| Input Tokens: ") +
      ansis.yellow(llmUsageStats.inputTokens.toString()),
    ansis.black("| Output Tokens: ") +
      ansis.yellow(llmUsageStats.outputTokens.toString()),
    "|",
    ansis.black("| Cost Input Tokens: ") +
      ansis.cyan(`$${costDetails.costInputTokens}`),
    ansis.black("| Cost Output Tokens: ") +
      ansis.cyan(`$${costDetails.costOutputTokens}`),
    ansis.black("| Total Cost: ") + ansis.cyan(`$${costDetails.totalCost}`),
    "|",
    ansis.black("| Calls Count: ") +
      ansis.green(llmUsageStats.callsCount.toString() ?? "0"),
    ansis.black("| Calls Error Count: ") +
      ansis.green(llmUsageStats.callsErrorCount.toString() ?? "0"),
    ansis.black("| Parsing Errors: ") +
      ansis.green(llmUsageStats.parsingErrors.toString() ?? "0"),
    ansis.black("+-----------------------------------------+\n\n"),
  ].join("\n");
  logger.info(message);
};

const logPrettyTaskStatus = ({
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
}): void => {
  // Bold border and task status line
  logger.info(
    ansis.bold.black("||===========================================||")
  );
  logger.info(
    ansis.bold.black(
      `|| Task (${currentTaskNumber}/${totalTasks}) - status changed to ${
        taskStatus === "DONE"
          ? ansis.green(taskStatus)
          : ansis.yellow(taskStatus)
      }`
    )
  );
  logger.info(ansis.bold.black(`|| Title: ${taskTitle}`));
  logger.info(ansis.bold.black(`|| Agent: ${agentName}`));
  logger.info(
    ansis.bold.black("||===========================================||\n\n")
  );
};

// Function to log workflow status updates in a formatted manner
const logPrettyWorkflowStatus = ({
  status,
  message,
}: {
  status: string;
  message: string;
}): void => {
  logger.info(`[Workflow Status: ${status}] ${message}`);
};

// Function to log workflow status updates in a formatted manner
const logPrettyWorkflowResult = ({
  metadata,
}: {
  metadata: {
    result: string;
    duration: number;
    llmUsageStats: IUsageStats;
    iterationCount: number;
    costDetails: ICostDetails;
    teamName: string;
    taskCount: number;
    agentCount: number;
  };
}): void => {
  const {
    result,
    duration,
    llmUsageStats,
    iterationCount,
    costDetails,
    teamName,
    taskCount,
    agentCount,
  } = metadata;
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
    ansis.black("| Duration: ") +
      ansis.yellow(duration.toString()) +
      ansis.yellow(" seconds"),
    ansis.black("| Input Tokens: ") +
      ansis.yellow(llmUsageStats.inputTokens.toString()),
    ansis.black("| Output Tokens: ") +
      ansis.yellow(llmUsageStats.outputTokens.toString()),
    "|",
    ansis.black("| Cost Input Tokens: ") +
      ansis.cyan(`$${costDetails.costInputTokens}`),
    ansis.black("| Cost Output Tokens: ") +
      ansis.cyan(`$${costDetails.costOutputTokens}`),
    ansis.black("| Total Cost: ") + ansis.cyan(`$${costDetails.totalCost}`),
    "|",
    ansis.black("| Calls Count: ") +
      ansis.red(llmUsageStats.callsCount.toString()),
    ansis.black("| Calls Error Count: ") +
      ansis.red(llmUsageStats.callsErrorCount.toString()),
    ansis.black("| Parsing Errors: ") +
      ansis.red(llmUsageStats.parsingErrors.toString()),
    ansis.black("+-----------------------------------------+\n"),
  ].join("\n");
  logger.info(message);
};

export {
  logPrettyTaskCompletion,
  logPrettyTaskStatus,
  logPrettyWorkflowStatus,
  logPrettyWorkflowResult,
};
