/**
 * @file ToolManager.ts
 * @path KaibanJS/src/utils/managers/tool/ToolManager.ts
 * @description Manages the execution of tools, tracking results, handling errors, and logging outcomes.
 */

import CoreManager from '../../core/CoreManager';
import { ErrorHandler } from '@/utils/handlers';
import { AGENT_STATUS_enum } from '@/utils/types/common/enums';
import type { AgentType, TaskType, ToolExecutionParams, ToolExecutionResult, ThinkingResult } from '@/utils/types';
import type { Tool } from "langchain/tools";

export class ToolManager extends CoreManager {
    // Executes a tool for an agent, manages transitions, and returns execution result
    public async executeTool(params: ToolExecutionParams): Promise<ToolExecutionResult> {
        const { agent, task, tool, toolInput, parsedLLMOutput } = params;

        try {
            await this.handleToolStart(agent, task, tool, toolInput);
            const result = await this.executeToolOperation(tool, toolInput);
            await this.handleToolSuccess(agent, task, tool, result);

            return {
                success: true,
                feedbackMessage: this.generateSuccessFeedback(agent, task, result, parsedLLMOutput),
                result
            };

        } catch (error) {
            return await errorHandler.handleToolError({
                agent,
                task,
                tool,
                error,
                store: task.store
            });
        }
    }

    // Logs and initiates the tool start
    private async handleToolStart(agent: AgentType, task: TaskType, tool: Tool, input: unknown): Promise<void> {
        await this.logTransition(agent, AGENT_STATUS_enum.USING_TOOL, { toolName: tool.name });
        this.log(`🛠️ Using tool: ${tool.name} for task ${task.title}`, 'info');
    }

    // Executes the tool operation and returns the result
    private async executeToolOperation(tool: Tool, input: unknown): Promise<string> {
        try {
            return await tool.call(input);
        } catch (error) {
            throw new Error(`Tool execution failed: ${tool.name}`);
        }
    }

    // Manages success transition and logs successful tool execution
    private async handleToolSuccess(agent: AgentType, task: TaskType, tool: Tool, result: string): Promise<void> {
        await this.logTransition(agent, AGENT_STATUS_enum.USING_TOOL_END, { toolName: tool.name, result });
        this.log(`🛠️✅ Tool execution complete: ${tool.name}`, 'info');
    }

    // Manages error transition and handles tool errors
    private async handleToolError(agent: AgentType, task: TaskType, tool: Tool, error: Error, parsedLLMOutput: ThinkingResult): Promise<ToolExecutionResult> {
        await this.logTransition(agent, AGENT_STATUS_enum.USING_TOOL_ERROR, { toolName: tool.name, error });
        this.log(`🛠️🛑 Tool error in ${tool.name}: ${error.message}`, 'error');

        return {
            success: false,
            error,
            feedbackMessage: this.generateErrorFeedback(agent, task, tool, error, parsedLLMOutput)
        };
    }

    // Generates feedback for successful tool execution
    private generateSuccessFeedback(agent: AgentType, task: TaskType, toolResult: string, parsedLLMOutput: ThinkingResult): string {
        return agent.promptTemplates.TOOL_RESULT_FEEDBACK({
            agent,
            task,
            toolResult,
            parsedLLMOutput
        });
    }

    // Generates feedback for tool execution errors
    private generateErrorFeedback(agent: AgentType, task: TaskType, tool: Tool, error: Error, parsedLLMOutput: ThinkingResult): string {
        return agent.promptTemplates.TOOL_ERROR_FEEDBACK({
            agent,
            task,
            toolName: tool.name,
            error,
            parsedLLMOutput
        });
    }

    // Updates agent status and logs status transition
    private async logTransition(agent: AgentType, status: AGENT_STATUS_enum, metadata: Record<string, any>): Promise<void> {
        await agent.setStatus(status);
        this.log(`Transitioning agent ${agent.id} to status: ${status}`, 'info');
    }
}

export default ToolManager;
