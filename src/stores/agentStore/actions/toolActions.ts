/**
 * @file toolActions.ts
 * @path src/stores/agentStore/actions/toolActions.ts
 * @description Tool execution and management actions for agent store
 */

import { Tool } from "langchain/tools";
import { logger } from '@/utils/core/logger';
import { LogCreator } from '@/utils/factories/logCreator';
import { ParsedOutput } from "@/utils/types/llm";
import { 
    AgentType,
    TaskType,
    Output
} from '@/utils/types';
import { AGENT_STATUS_enum } from '@/utils/types/common/enums';
import { AgentState } from '../state';
import { DefaultFactory } from '@/utils/factories/defaultFactory';

/**
 * Tool execution action creators for agent store
 */
export const createToolActions = (
    get: () => AgentState,
    set: (partial: Partial<AgentState> | ((state: AgentState) => Partial<AgentState>)) => void
) => ({
    /**
     * Start tool execution
     */
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
                tool,
                input,
                timestamp: Date.now(),
                output: {
                    llmUsageStats: DefaultFactory.createLLMUsageStats()
                }
            },
            agentStatus: 'USING_TOOL',
            logType: 'AgentStatusUpdate'
        });

        logger.info(`🛠️ Agent ${agent.name} starting tool execution: ${tool.name}`);
        logger.debug('Tool input:', input);

        set(state => ({
            status: 'USING_TOOL',
            workflowLogs: [...state.workflowLogs, log],
            stats: {
                ...state.stats,
                totalCalls: state.stats.totalCalls + 1
            }
        }));
    },

/**
 * Handle successful tool execution completion
 */
handleToolEnd: (params: {
    agent: AgentType;
    task: TaskType;
    output: string | Record<string, unknown>;  // Updated type to match AgentLogMetadata
    tool: Tool;
}): void => {
    const { agent, task, output, tool } = params;

    const log = LogCreator.createAgentLog({
        agent,
        task,
        description: `Tool execution completed: ${tool.name}`,
        metadata: {
            tool,
            output: {
                llmUsageStats: DefaultFactory.createLLMUsageStats(),
                toolResult: output  // Now matches the expected type
            },
            timestamp: Date.now()
        },
        agentStatus: 'USING_TOOL_END',
        logType: 'AgentStatusUpdate'
    });

    logger.info(`✅ Agent ${agent.name} completed tool execution: ${tool.name}`);
    logger.debug('Tool output:', output);

    set(state => ({
        status: 'USING_TOOL_END',
        workflowLogs: [...state.workflowLogs, log]
    }));
},

    /**
     * Handle non-existent tool
     */
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
                toolName,
                timestamp: Date.now(),
                output: {
                    llmUsageStats: DefaultFactory.createLLMUsageStats(),
                    toolResult: `Tool '${toolName}' does not exist`
                }
            },
            agentStatus: 'TOOL_DOES_NOT_EXIST',
            logType: 'AgentStatusUpdate'
        });

        logger.warn(`❌ Agent ${agent.name} attempted to use non-existent tool: ${toolName}`);

        set(state => ({
            status: 'TOOL_DOES_NOT_EXIST',
            workflowLogs: [...state.workflowLogs, log],
            stats: {
                ...state.stats,
                errorCount: state.stats.errorCount + 1
            }
        }));
    },

    /**
     * Process tool execution result
     */
    processToolResult: (params: {
        agent: AgentType;
        task: TaskType;
        tool: Tool;
        result: string;
        parsedOutput: Output;
    }): string => {
        const { agent, task, tool, result, parsedOutput } = params;

        const log = LogCreator.createAgentLog({
            agent,
            task,
            description: `Processing tool result: ${tool.name}`,
            metadata: {
                tool,
                result,
                parsedOutput,
                timestamp: Date.now()
            },
            agentStatus: 'OBSERVATION',
            logType: 'AgentStatusUpdate'
        });

        set(state => ({
            status: 'OBSERVATION',
            workflowLogs: [...state.workflowLogs, log]
        }));

        return `Tool ${tool.name} returned: ${result}. Please analyze this result and decide on next steps.`;
    },

    /**
     * Generate error feedback for tool errors
     */
    generateToolErrorFeedback: (params: {
        agent: AgentType;
        task: TaskType;
        toolName: string;
        error: Error;
        parsedOutput: ParsedOutput;
    }): string => {
        const { toolName, error } = params;
        
        return `Error occurred while using tool ${toolName}: ${error.message}. Please try a different approach or tool. Remember to use JSON format for your response.`;
    },

    /**
     * Generate feedback for non-existent tools
     */
    generateToolNotExistFeedback: (params: {
        agent: AgentType;
        task: TaskType;
        toolName: string;
        parsedOutput: ParsedOutput;
    }): string => {
        const { agent, toolName } = params;
        const availableTools = agent.tools.map(t => t.name).join(', ');
        
        return `The tool "${toolName}" is not available. Please choose from the available tools: ${availableTools}. Respond with your new approach in JSON format.`;
    }
});

/**
 * Type for tool actions when instantiated
 */
export type ToolActions = ReturnType<typeof createToolActions>;