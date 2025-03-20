/**
 * Pretty Logging Utilities.
 *
 * This module enhances log outputs by formatting them into more readable and visually appealing structures.
 * It provides functions that generate styled log entries for various operational states and outcomes,
 * making it easier to interpret and review logs.
 *
 * @module prettyLogs
 */

import ansis from 'ansis';
import { logger } from './logger';
import { CostResult, LLMUsageStats } from './llmCostCalculator';
import { Task } from '..';
import { WorkflowFinishedLog } from './workflowLogs.types';

/** Task completion log parameters */
export type TaskCompletionParams = {
  /** Task */
  task: Task;
  /** Number of iterations taken */
  iterationCount?: number;
  /** Duration in seconds */
  duration?: number;
  /** LLM usage statistics */
  llmUsageStats?: LLMUsageStats;
  /** Name of the agent */
  agentName?: string;
  /** Model used by the agent */
  agentModel?: string;
  /** Title of the task */
  taskTitle: string;
  /** Current task number */
  currentTaskNumber: number;
  /** Total number of tasks */
  totalTasks: number;
  /** Cost calculation details */
  costDetails?: CostResult;
};

/** Task status log parameters */
export type TaskStatusParams = {
  /** Task */
  task: Task;
  /** Current task number */
  currentTaskNumber: number;
  /** Total number of tasks */
  totalTasks: number;
  /** Title of the task */
  taskTitle: string;
  /** Current status of the task */
  taskStatus: string;
  /** Name of the agent */
  agentName?: string;
};

/** Workflow status log parameters */
export type WorkflowStatusParams = {
  /** Current workflow status */
  status: string;
  /** Status message */
  message: string;
};

/** Workflow result metadata */
export type WorkflowResultMetadata = {
  /** Final workflow result */
  result: string;
  /** Duration in seconds */
  duration?: number;
  /** LLM usage statistics */
  llmUsageStats?: LLMUsageStats;
  /** Number of iterations taken */
  iterationCount?: number;
  /** Cost calculation details */
  costDetails?: CostResult;
  /** Name of the team */
  teamName: string;
  /** Number of tasks */
  taskCount: number;
  /** Number of agents */
  agentCount: number;
};

/**
 * Logs task completion details in a formatted box
 * @param params - Task completion parameters
 */
export function logPrettyTaskCompletion(params: TaskCompletionParams): void {
  const {
    iterationCount,
    duration,
    llmUsageStats,
    agentName,
    agentModel,
    taskTitle,
    currentTaskNumber,
    totalTasks,
    costDetails,
  } = params;

  const message = [
    ansis.black('\n+-----------------------------------------+'),
    ansis.bold(
      `| Task (${currentTaskNumber}/${totalTasks}) - status changed to ${ansis.green(
        'DONE'
      )}     |`
    ),
    '|-----------------------------------------|',
    ansis.bold('| Summary:'),
    '|',
    ansis.black('| Task: ') + ansis.cyan(taskTitle),
    ansis.black('| Agent: ') + ansis.cyan(agentName),
    ansis.black('| Model: ') + ansis.cyan(agentModel),
    '|',
    ansis.black('| Iterations: ') + ansis.cyan(iterationCount),
    ansis.black('| Duration: ') + ansis.cyan(duration) + ansis.cyan(' seconds'),
    ansis.black('| Input Tokens: ') + ansis.yellow(llmUsageStats?.inputTokens),
    ansis.black('| Output Tokens: ') +
      ansis.yellow(llmUsageStats?.outputTokens),
    '|',
    ansis.black('| Cost Input Tokens: ') +
      ansis.cyan(`$${costDetails?.costInputTokens}`),
    ansis.black('| Cost Output Tokens: ') +
      ansis.cyan(`$${costDetails?.costOutputTokens}`),
    ansis.black('| Total Cost: ') + ansis.cyan(`$${costDetails?.totalCost}`),
    '|',
    ansis.black('| Calls Count: ') + ansis.green(llmUsageStats?.callsCount),
    ansis.black('| Calls Error Count: ') +
      ansis.green(llmUsageStats?.callsErrorCount),
    ansis.black('| Parsing Errors: ') +
      ansis.green(llmUsageStats?.parsingErrors),
    ansis.black('+-----------------------------------------+\n\n'),
  ].join('\n');
  logger.info(message);
}

/**
 * Logs task status changes in a formatted box
 * @param params - Task status parameters
 */
export function logPrettyTaskStatus(params: TaskStatusParams): void {
  const { currentTaskNumber, totalTasks, taskTitle, taskStatus, agentName } =
    params;

  logger.info(
    ansis.bold.black('||===========================================||')
  );
  logger.info(
    ansis.bold.black(
      `|| Task (${currentTaskNumber}/${totalTasks}) - status changed to ${
        taskStatus === 'DONE'
          ? ansis.green(taskStatus)
          : ansis.yellow(taskStatus)
      }`
    )
  );
  logger.info(ansis.bold.black(`|| Title: ${taskTitle}`));
  logger.info(ansis.bold.black(`|| Agent: ${agentName}`));
  logger.info(
    ansis.bold.black('||===========================================||\n\n')
  );
}

/**
 * Logs workflow status updates
 * @param params - Workflow status parameters
 */
export function logPrettyWorkflowStatus(params: WorkflowStatusParams): void {
  const { status, message } = params;
  logger.info(`[Workflow Status: ${status}] ${message}`);
}

/**
 * Logs workflow completion results in a formatted box
 * @param params - Workflow result parameters
 */
export function logPrettyWorkflowResult(params: WorkflowFinishedLog): void {
  const {
    result,
    duration,
    llmUsageStats,
    iterationCount,
    costDetails,
    teamName,
    taskCount,
    agentCount,
  } = params.metadata ?? {};

  logger.info(`Workflow Result: ${result}`);
  const message = [
    ansis.black('\n+-----------------------------------------+'),
    ansis.bold(`| WORKFLOW - ${ansis.green('FINISH')}                       |`),
    '|-----------------------------------------|',
    ansis.bold('| Summary:'),
    '|',
    ansis.black('| Team: ') + ansis.cyan(teamName),
    ansis.black('| Tasks: ') + ansis.cyan(taskCount),
    ansis.black('| Agents: ') + ansis.cyan(agentCount),
    '|',
    ansis.black('| Iterations: ') + ansis.yellow(iterationCount),
    ansis.black('| Duration: ') +
      ansis.yellow(duration) +
      ansis.yellow(' seconds'),
    ansis.black('| Input Tokens: ') + ansis.yellow(llmUsageStats?.inputTokens),
    ansis.black('| Output Tokens: ') +
      ansis.yellow(llmUsageStats?.outputTokens),
    '|',
    ansis.black('| Cost Input Tokens: ') +
      ansis.cyan(`$${costDetails?.costInputTokens}`),
    ansis.black('| Cost Output Tokens: ') +
      ansis.cyan(`$${costDetails?.costOutputTokens}`),
    ansis.black('| Total Cost: ') + ansis.cyan(`$${costDetails?.totalCost}`),
    '|',
    ansis.black('| Calls Count: ') + ansis.red(llmUsageStats?.callsCount),
    ansis.black('| Calls Error Count: ') +
      ansis.red(llmUsageStats?.callsErrorCount),
    ansis.black('| Parsing Errors: ') + ansis.red(llmUsageStats?.parsingErrors),
    ansis.black('+-----------------------------------------+\n'),
  ].join('\n');
  logger.info(message);
}
