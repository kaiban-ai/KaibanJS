import chalk from "chalk";
import { logger } from "./logger";

function logPrettyTaskCompletion({ iterationCount, duration, llmUsageStats, agentName, taskTitle, currentTaskNumber,totalTasks }) {
    const message = [
        chalk.black('+-----------------------------------------+'),
        chalk.bold(`| Task (${currentTaskNumber}/${totalTasks}) - status changed to ${chalk.green('DONE')}     |`),        
        '|-----------------------------------------|',
        chalk.bold('| Summary:'),
        '|',
        chalk.black('| Task: ') + chalk.cyan(taskTitle),
        chalk.black('| Agent: ') + chalk.cyan(agentName),
        '|',        
        chalk.black('| Iterations: ') + chalk.cyan(iterationCount),
        chalk.black('| Duration: ') + chalk.cyan(duration) + chalk.cyan(' seconds'),
        chalk.black('| Input Tokens: ') + chalk.yellow(llmUsageStats.inputTokens),
        chalk.black('| Output Tokens: ') + chalk.yellow(llmUsageStats.outputTokens),
        chalk.black('| Calls Count: ') + chalk.green(llmUsageStats.callsCount),
        chalk.black('| Calls Error Count: ') + chalk.red(llmUsageStats.callsErrorCount),
        chalk.black('| Parsing Errors: ') + chalk.red(llmUsageStats.parsingErrors),
        chalk.black('+-----------------------------------------+'),
    ].join('\n');
    logger.info(message);
}

function logPrettyTaskStatus({currentTaskNumber, totalTasks, taskTitle, taskStatus, agentName}) {
    // Bold border and task status line
    logger.info(chalk.bold.black('||===========================================||'));
    logger.info(chalk.bold.black(`|| Task (${currentTaskNumber}/${totalTasks}) - status changed to ${taskStatus === 'DONE' ? chalk.green(taskStatus) : chalk.yellow(taskStatus) }`));
    logger.info(chalk.bold.black(`|| Title: ${taskTitle}`));
    logger.info(chalk.bold.black(`|| Agent: ${agentName}`));
    logger.info(chalk.bold.black('||===========================================||'));
}

// Function to log workflow status updates in a formatted manner
function logPrettyWorkflowStatus({ status, message }) {
    logger.info(`[Workflow Status: ${status}] ${message}`);
}


export { logPrettyTaskCompletion, logPrettyTaskStatus, logPrettyWorkflowStatus };