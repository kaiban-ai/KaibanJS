import chalk from "chalk";
import { logger } from "./logger";

function logPrettyTaskCompletion({ iterationCount, duration, llmUsageStats, agentName, agentModel, taskTitle, currentTaskNumber,totalTasks, costDetails }) {
    const message = [
        chalk.black('\n+-----------------------------------------+'),
        chalk.bold(`| Task (${currentTaskNumber}/${totalTasks}) - status changed to ${chalk.green('DONE')}     |`),        
        '|-----------------------------------------|',
        chalk.bold('| Summary:'),
        '|',
        chalk.black('| Task: ') + chalk.cyan(taskTitle),
        chalk.black('| Agent: ') + chalk.cyan(agentName),
        chalk.black('| Model: ') + chalk.cyan(agentModel),
        '|',        
        chalk.black('| Iterations: ') + chalk.cyan(iterationCount),
        chalk.black('| Duration: ') + chalk.cyan(duration) + chalk.cyan(' seconds'),
        chalk.black('| Input Tokens: ') + chalk.yellow(llmUsageStats.inputTokens),
        chalk.black('| Output Tokens: ') + chalk.yellow(llmUsageStats.outputTokens),
        '|',           
        chalk.black('| Cost Input Tokens: ') + chalk.cyan(`$${costDetails.costInputTokens}`),
        chalk.black('| Cost Output Tokens: ') + chalk.cyan(`$${costDetails.costOutputTokens}`),
        chalk.black('| Total Cost: ') + chalk.cyan(`$${costDetails.totalCost}`),        
        '|',                   
        chalk.black('| Calls Count: ') + chalk.green(llmUsageStats.callsCount),
        chalk.black('| Calls Error Count: ') + chalk.red(llmUsageStats.callsErrorCount),
        chalk.black('| Parsing Errors: ') + chalk.red(llmUsageStats.parsingErrors),
        chalk.black('+-----------------------------------------+\n\n'),
    ].join('\n');
    logger.info(message);
}

function logPrettyTaskStatus({currentTaskNumber, totalTasks, taskTitle, taskStatus, agentName}) {
    // Bold border and task status line
    logger.info(chalk.bold.black('||===========================================||'));
    logger.info(chalk.bold.black(`|| Task (${currentTaskNumber}/${totalTasks}) - status changed to ${taskStatus === 'DONE' ? chalk.green(taskStatus) : chalk.yellow(taskStatus) }`));
    logger.info(chalk.bold.black(`|| Title: ${taskTitle}`));
    logger.info(chalk.bold.black(`|| Agent: ${agentName}`));
    logger.info(chalk.bold.black('||===========================================||\n\n'));
}

// Function to log workflow status updates in a formatted manner
function logPrettyWorkflowStatus({ status, message }) {
    logger.info(`[Workflow Status: ${status}] ${message}`);
}

// Function to log workflow status updates in a formatted manner
function logPrettyWorkflowResult({metadata}) {
    const {result, duration, llmUsageStats, iterationCount, costDetails, teamName, taskCount, agentCount} = metadata;
    logger.info(`Workflow Result: ${result}`);
    const message = [
        chalk.black('\n+-----------------------------------------+'),
        chalk.bold(`| WORKFLOW - ${chalk.green('FINISH')}                       |`),        
        '|-----------------------------------------|',
        chalk.bold('| Summary:'),
        '|',
        chalk.black('| Team: ') + chalk.cyan(teamName),
        chalk.black('| Tasks: ') + chalk.cyan(taskCount),
        chalk.black('| Agents: ') + chalk.cyan(agentCount),
        '|',        
        chalk.black('| Iterations: ') + chalk.yellow(iterationCount),
        chalk.black('| Duration: ') + chalk.yellow(duration) + chalk.yellow(' seconds'),
        chalk.black('| Input Tokens: ') + chalk.yellow(llmUsageStats.inputTokens),
        chalk.black('| Output Tokens: ') + chalk.yellow(llmUsageStats.outputTokens),
        '|',           
        chalk.black('| Cost Input Tokens: ') + chalk.cyan(`$${costDetails.costInputTokens}`),
        chalk.black('| Cost Output Tokens: ') + chalk.cyan(`$${costDetails.costOutputTokens}`),
        chalk.black('| Total Cost: ') + chalk.cyan(`$${costDetails.totalCost}`),        
        '|',                   
        chalk.black('| Calls Count: ') + chalk.red(llmUsageStats.callsCount),
        chalk.black('| Calls Error Count: ') + chalk.red(llmUsageStats.callsErrorCount),
        chalk.black('| Parsing Errors: ') + chalk.red(llmUsageStats.parsingErrors),
        chalk.black('+-----------------------------------------+\n'),
    ].join('\n');
    logger.info(message);        
}


export { logPrettyTaskCompletion, logPrettyTaskStatus, logPrettyWorkflowStatus, logPrettyWorkflowResult };