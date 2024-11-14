/**
 * @file toolExecution.ts
 * @path KaibanJS/src/agents/reactChampion/execution/toolExecution.ts
 * @description Tool execution using manager-based architecture
 */

// Core managers
import { logger } from '@/utils/core/logger';
import { ToolManager } from '@/utils/managers/domain/agent/ToolManager';
import { StatusManager } from '@/utils/managers/core/StatusManager';

// Handlers
import { errorHandler } from '@/utils/handlers/errorHandler';

// Types from canonical locations
import type { 
    AgentType,
    TaskType,
    TeamStore,
    ToolExecutionParams,
    ToolExecutionResult,
    ThinkingResult,
    ParsedOutput,
    Tool,
    ExecutionContext,
    REACTChampionAgentPrompts
} from '@/utils/types';

import { AGENT_STATUS_enum } from '@/utils/types/common/enums';

/**
 * Tool execution orchestrator
 */
export class ToolExecutionOrchestrator {
    private readonly toolManager: ToolManager;
    private readonly statusManager: StatusManager;

    constructor() {
        this.toolManager = ToolManager.getInstance();
        this.statusManager = StatusManager.getInstance();
    }

    // ─── Tool Execution ──────────────────────────────────────────────────────────

    public async executeTool(params: ToolExecutionParams): Promise<ToolExecutionResult> {
        const { task, tool, input, context, parsedOutput } = params;

        try {
            // Start tool execution phase
            await this.startToolExecution(context.agent, tool);

            // Execute tool
            const result = await this.toolManager.executeTool({
                tool,
                input: typeof input === 'string' ? input : JSON.stringify(input),
                context: {
                    taskId: task.id,
                    agentId: context.agent.id,
                    toolName: tool.name
                }
            });

            // Create feedback message
            const feedbackMessage = await this.createFeedbackMessage(
                context.agent,
                task,
                result.result || '',
                parsedOutput
            );

            return {
                success: true,
                result: result.result,
                feedbackMessage,
                usageStats: result.usageStats
            };

        } catch (error) {
            return this.handleToolError({
                tool,
                error: error as Error,
                context,
                task,
                parsedOutput
            });
        }
    }

    // ─── Tool Not Found ──────────────────────────────────────────────────────────

    public async handleToolNotFound(params: {
        agent: AgentType;
        task: TaskType;
        toolName: string;
        parsedOutput?: ParsedOutput;
    }): Promise<ToolExecutionResult> {
        const { agent, task, toolName, parsedOutput } = params;

        try {
            await this.statusManager.transition({
                currentStatus: agent.status,
                targetStatus: AGENT_STATUS_enum.TOOL_DOES_NOT_EXIST,
                entity: 'agent',
                entityId: agent.id,
                metadata: { toolName }
            });

            const feedbackMessage = agent.promptTemplates.TOOL_NOT_EXIST_FEEDBACK({
                agent,
                task,
                toolName,
                parsedLLMOutput: parsedOutput || null
            });

            return {
                success: false,
                error: new Error(`Tool '${toolName}' does not exist`),
                feedbackMessage
            };

        } catch (error) {
            return this.handleToolError({
                tool: undefined,
                error: error as Error,
                context: { agent, task },
                task,
                parsedOutput
            });
        }
    }

    // ─── Process Control ─────────────────────────────────────────────────────────

    private async startToolExecution(
        agent: AgentType,
        tool: Tool
    ): Promise<void> {
        await this.statusManager.transition({
            currentStatus: agent.status,
            targetStatus: AGENT_STATUS_enum.USING_TOOL,
            entity: 'agent',
            entityId: agent.id,
            metadata: { toolName: tool.name }
        });
    }

    // ─── Error Handling ─────────────────────────────────────────────────────────

    private async handleToolError(params: {
        tool?: Tool;
        error: Error;
        context: ExecutionContext;
        task: TaskType;
        parsedOutput?: ParsedOutput;
    }): Promise<ToolExecutionResult> {
        const { tool, error, context, task, parsedOutput } = params;

        await errorHandler.handleToolError({
            agent: context.agent,
            task,
            tool: tool!,
            error,
            toolName: tool?.name || 'unknown',
            store: {
                getState: () => ({}),
                setState: () => {},
                prepareNewLog: () => ({})
            }
        });

        const feedbackMessage = context.agent.promptTemplates.TOOL_ERROR_FEEDBACK({
            agent: context.agent,
            task,
            toolName: tool?.name || 'unknown',
            error,
            parsedLLMOutput: parsedOutput || null
        });

        return {
            success: false,
            error,
            feedbackMessage
        };
    }

    // ─── Feedback Message Creation ───────────────────────────────────────────────

    private async createFeedbackMessage(
        agent: AgentType,
        task: TaskType,
        result: string,
        parsedOutput?: ParsedOutput
    ): Promise<string> {
        return agent.promptTemplates.TOOL_RESULT_FEEDBACK({
            agent,
            task,
            toolResult: result,
            parsedLLMOutput: parsedOutput || null
        });
    }
}

// Export singleton instance
export const toolExecution = new ToolExecutionOrchestrator();
export default toolExecution;