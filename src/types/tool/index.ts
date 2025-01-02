/**
 * @file index.ts
 * @path KaibanJS/src/types/tool/index.ts
 * @description Barrel file for tool-related types
 * 
 * @module types/tool
 */

// Tool base types
export {
    TOOL_NAMES,
    type ToolName,
    type IToolDependency,
    type IToolVersion,
    type IToolRegistrationOptions,
    type IToolRegistrationMetadata,
    type IToolValidationResult,
    type IToolExecutionResult,
    Tool,
    isLangchainTool,
    isValidToolName,
    validateToolDependencies,
    validateTool,
    validateToolConfig
} from './toolTypes';

// Tool handler types
export {
    type IToolHandlerParams,
    type IToolHandlerData,
    type IToolHandlerResult,
    type IToolHandlerMetadata,
    isToolHandlerParams,
    isToolHandlerData,
    isToolHandlerResult,
    isToolHandlerMetadata,
    createToolHandlerResult
} from './toolHandlerTypes';

// Tool metric types
export {
    type IToolResourceMetrics,
    type IToolPerformanceMetrics,
    type IToolUsageMetrics,
    isToolResourceMetrics,
    isToolPerformanceMetrics,
    isToolUsageMetrics,
    validateToolResourceMetrics,
    validateToolPerformanceMetrics,
    validateToolUsageMetrics
} from './toolMetricTypes';

// Tool error types
export {
    type IToolErrorContext,
    type IToolValidationErrorContext,
    ToolError,
    ErrorTypeGuards
} from './toolErrorTypes';

// Tool execution types
export {
    type IToolExecutionMetrics,
    type ICostDetails,
    type IToolExecutionParams,
    type IToolExecutionHandlerResult,
    ToolExecutionTypeGuards
} from './toolExecutionTypes';

// Tool manager types
export {
    type IToolInitializationState,
    type IToolManager
} from './toolManagerTypes';
