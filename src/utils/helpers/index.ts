/**
 * @file index.ts
 * @path src/utils/helpers/index.ts
 * @description Central export point for all helper functions
 */

// Agent helpers
export {
    getApiKey,
    replaceAgentAttributes,
    validateAgentAttributes
} from './agent';

// Cost calculation helpers
export {
    calculateTaskCost,
    calculateTotalWorkflowCost,
} from './costs';

// Formatting helpers
export {
    logPrettyTaskCompletion,
    logPrettyTaskStatus,
    logPrettyWorkflowStatus,
    logPrettyWorkflowResult
} from './formatting';

// Prompt helpers
export { 
    REACT_CHAMPION_AGENT_DEFAULT_PROMPTS 
} from './prompts';

// Task helpers
export { 
    getTaskTitleForLogs,
    validateTask,
    interpolateTaskDescription
} from './tasks';

// Statistics helpers
export {
    calculateTaskStats,
    calculateAverageCostPerToken,
    calculateTokenRate,
    formatCost
} from './stats';