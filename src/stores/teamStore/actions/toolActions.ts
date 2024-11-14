/**
 * @file toolActions.ts
 * @path KaibanJS/src/stores/teamStore/actions/toolActions.ts
 * @description Tool handling actions for the team store
 */

import { logger } from '@/utils/core/logger';
import { LogCreator } from '@/utils/factories/logCreator';
import { defaultValues } from '../state';
import { Tool } from "@langchain/core/tools";
import type { 
    TeamState,
    AgentType,
    TaskType,
    LLMUsageStats,
    ModelUsageStats
} from '@/utils/types';

// Found in types.ts
interface ToolParameter {
    name: string;
    type: string;
    description?: string;
    required?: boolean;
}

// Gets parameters from a tool in a type-safe way
const getToolParameters = (tool: Tool): ToolParameter[] => {
    try {
        const schema = tool.schema;
        if (!schema) return [];

        return [{
            name: 'input',
            type: 'string',
            required: false
        }];
    } catch (error) {
        logger.warn(`Error extracting parameters for tool ${tool.name}:`, error);
        return [];
    }
};

// Creates tool handling actions
export const createToolActions = (
    get: () => TeamState,
    set: (fn: (state: TeamState) => Partial<TeamState>) => void
) => ({
    handleToolExecution: (params: {
        agent: AgentType;
        task: TaskType;
        tool: Tool;
        input: string;
        result?: string;
    }): void => {
        const { agent, task, tool, input, result } = params;
        
        const log = LogCreator.createAgentLog({
            agent,
            task,
            description: `Tool execution: ${tool.name}`,
            metadata: {
                output: {
                    llmUsageStats: defaultValues.llmUsageStats,
                    toolResult: result
                },
                tool: {
                    name: tool.name,
                    description: tool.description,
                    parameters: getToolParameters(tool)
                },
                input,
                timestamp: Date.now()
            },
            agentStatus: 'USING_TOOL'
        });

        set(state => ({
            ...state,
            workflowLogs: [...state.workflowLogs, log]
        }));
    },

    handleToolError: (params: {
        agent: AgentType;
        task: TaskType;
        tool: Tool;
        error: Error;
        toolName: string;
    }): void => {
        const { agent, task, tool, error, toolName } = params;
        
        const log = LogCreator.createAgentLog({
            agent,
            task,
            description: `Tool error: ${toolName}`,
            metadata: {
                output: {
                    llmUsageStats: defaultValues.llmUsageStats,
                    toolResult: error.message
                },
                tool: {
                    name: tool.name,
                    description: tool.description,
                    parameters: getToolParameters(tool)
                },
                error: {
                    message: error.message,
                    name: error.name,
                    stack: error.stack
                },
                timestamp: Date.now()
            },
            agentStatus: 'USING_TOOL_ERROR'
        });

        set(state => ({
            ...state,
            workflowLogs: [...state.workflowLogs, log]
        }));
    },

    handleToolDoesNotExist: (params: {
        agent: AgentType;
        task: TaskType;
        toolName: string;
    }): void => {
        const { agent, task, toolName } = params;
        
        const log = LogCreator.createAgentLog({
            agent,
            task,
            description: `Tool not found: ${toolName}`,
            metadata: {
                output: {
                    llmUsageStats: defaultValues.llmUsageStats,
                    toolResult: `Tool '${toolName}' does not exist`
                },
                toolName,
                timestamp: Date.now()
            },
            agentStatus: 'TOOL_DOES_NOT_EXIST'
        });

        set(state => ({
            ...state,
            workflowLogs: [...state.workflowLogs, log]
        }));
    },

    handleToolStart: (params: {
        agent: AgentType;
        task: TaskType;
        tool: Tool;
        input: unknown;
    }): void => {
        const { agent, task, tool, input } = params;
        
        const log = LogCreator.createAgentLog({
            agent,
            task,
            description: `Starting tool execution: ${tool.name}`,
            metadata: {
                tool: {
                    name: tool.name,
                    description: tool.description,
                    parameters: getToolParameters(tool)
                },
                input: typeof input === 'string' ? input : JSON.stringify(input),
                timestamp: Date.now(),
                output: {
                    llmUsageStats: defaultValues.llmUsageStats
                }
            },
            agentStatus: 'USING_TOOL'
        });

        set(state => ({
            ...state,
            workflowLogs: [...state.workflowLogs, log]
        }));
    },

    handleToolEnd: (params: {
        agent: AgentType;
        task: TaskType;
        output: unknown;
        tool: Tool;
    }): void => {
        const { agent, task, output, tool } = params;
        
        const log = LogCreator.createAgentLog({
            agent,
            task,
            description: `Tool execution completed: ${tool.name}`,
            metadata: {
                tool: {
                    name: tool.name,
                    description: tool.description,
                    parameters: getToolParameters(tool)
                },
                output: {
                    llmUsageStats: defaultValues.llmUsageStats,
                    toolResult: typeof output === 'string' ? output : JSON.stringify(output)
                },
                timestamp: Date.now()
            },
            agentStatus: 'USING_TOOL_END'
        });

        set(state => ({
            ...state,
            workflowLogs: [...state.workflowLogs, log]
        }));
    },

    validateToolParameters: (
        tool: Tool,
        parameters: Record<string, unknown>
    ): boolean => {
        if (!tool.schema) {
            return true;
        }

        try {
            const result = tool.schema.safeParse(parameters);
            return result.success;
        } catch (error) {
            logger.error(`Error validating parameters for tool ${tool.name}:`, error);
            return false;
        }
    },

    handleToolTimeout: (params: {
        agent: AgentType;
        task: TaskType;
        tool: Tool;
        timeout: number;
    }): void => {
        const { agent, task, tool, timeout } = params;
        
        const log = LogCreator.createAgentLog({
            agent,
            task,
            description: `Tool execution timed out after ${timeout}ms: ${tool.name}`,
            metadata: {
                tool: {
                    name: tool.name,
                    description: tool.description,
                    parameters: getToolParameters(tool)
                },
                timeout,
                timestamp: Date.now(),
                output: {
                    llmUsageStats: defaultValues.llmUsageStats,
                    error: `Tool execution timed out after ${timeout}ms`
                }
            },
            agentStatus: 'USING_TOOL_ERROR'
        });

        set(state => ({
            ...state,
            workflowLogs: [...state.workflowLogs, log]
        }));
    }
});

export type ToolActions = ReturnType<typeof createToolActions>;
export default createToolActions;
