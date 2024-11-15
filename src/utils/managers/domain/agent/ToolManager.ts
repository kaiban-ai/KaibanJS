/**
 * @file ToolManager.ts
 * @path src/managers/domain/agent/ToolManager.ts
 * @description Tool execution management and orchestration
 *
 * @module @managers/domain/agent
 */

import { Tool } from 'langchain/tools';
import CoreManager from '../../core/CoreManager';
import { ErrorManager } from '../../core/ErrorManager';
import { LogManager } from '../../core/LogManager';
import { StatusManager } from '../../core/StatusManager';
import { DefaultFactory } from '../../../factories/defaultFactory';

// Import types from canonical locations
import type { 
    ToolExecutionParams,
    ToolExecutionResult,
    ToolHandlerParams,
    CostDetails
} from '../../../types/tool/execution';
import type { AgentType } from '../../../types/agent/base';
import type { TaskType } from '../../../types/task/base';
import type { ParsedOutput } from '../../../types/llm/responses';

import { AGENT_STATUS_enum } from '../../../types/common/enums';

/**
 * Core tool execution and management implementation
 */
export class ToolManager extends CoreManager {
    private static instance: ToolManager;

    private constructor() {
        super();
    }

    /**
     * Get singleton instance
     */
    public static getInstance(): ToolManager {
        if (!ToolManager.instance) {
            ToolManager.instance = new ToolManager();
        }
        return ToolManager.instance;
    }

    // ─── Tool Execution ──────────────────────────────────────────────────────────

    /**
     * Execute a tool with proper lifecycle management
     */
    public async executeTool(params: ToolExecutionParams): Promise<ToolExecutionResult> {
        const { agent, task, tool, input, context, parsedOutput } = params;

        const toolKey = this.generateToolKey(agent.id, tool.name);
        
        try {
            await this.startToolExecution(agent, task, tool);
            this.setupToolTimeout(toolKey);

            const result = await this.executeOperation(tool, input);
            
            await this.handleToolSuccess(agent, task, tool, result);
            this.cleanupTool(toolKey);

            const costDetails: CostDetails = DefaultFactory.createCostDetails();

            return {
                success: true,
                result,
                feedbackMessage: this.generateSuccessFeedback(agent, task, result, parsedOutput),
                costDetails,
                usageStats: DefaultFactory.createLLMUsageStats()
            };

        } catch (error) {
            return await this.handleToolError({
                agent,
                task,
                tool,
                error: error instanceof Error ? error : new Error(String(error)),
                toolName: tool.name
            });
        }
    }

    /**
     * Handle non-existent tool error
     */
    public async handleToolDoesNotExist(params: {
        agent: AgentType;
        task: TaskType;
        toolName: string;
        parsedOutput?: ParsedOutput;
    }): Promise<ToolExecutionResult> {
        const { agent, task, toolName, parsedOutput } = params;

        try {
            await this.updateAgentStatus(agent, AGENT_STATUS_enum.TOOL_DOES_NOT_EXIST, {
                toolName,
                timestamp: Date.now()
            });

            const feedbackMessage = agent.promptTemplates.TOOL_NOT_EXIST_FEEDBACK({
                agent,
                task,
                toolName,
                parsedLLMOutput: parsedOutput
            });

            return {
                success: false,
                error: new Error(`Tool '${toolName}' does not exist`),
                feedbackMessage
            };

        } catch (error) {
            return await this.handleToolError({
                agent,
                task,
                tool: undefined,
                error: error instanceof Error ? error : new Error(String(error)),
                toolName
            });
        }
    }

    // ─── Tool Lifecycle Management ───────────────────────────────────────────────

    /**
     * Start tool execution phase
     */
    private async startToolExecution(
        agent: AgentType,
        task: TaskType,
        tool: Tool
    ): Promise<void> {
        await this.updateAgentStatus(agent, AGENT_STATUS_enum.USING_TOOL, {
            toolName: tool.name,
            startTime: Date.now()
        });

        this.log(`Agent ${agent.name} using tool: ${tool.name}`);
    }

    /**
     * Handle successful tool completion
     */
    private async handleToolSuccess(
        agent: AgentType,
        task: TaskType,
        tool: Tool,
        result: string
    ): Promise<void> {
        await this.updateAgentStatus(agent, AGENT_STATUS_enum.USING_TOOL_END, {
            toolName: tool.name,
            result,
            endTime: Date.now()
        });

        this.log(`Tool ${tool.name} executed successfully`);
    }

    /**
     * Handle tool execution error
     */
    private async handleToolError(params: ToolHandlerParams): Promise<ToolExecutionResult> {
        const { agent, task, tool, error, toolName } = params;

        await this.updateAgentStatus(agent, AGENT_STATUS_enum.USING_TOOL_ERROR, {
            toolName,
            error,
            timestamp: Date.now()
        });

        // Use the protected handleError method from CoreManager
        this.handleError(error, `Tool execution error in ${toolName}`);

        const feedbackMessage = agent.promptTemplates.TOOL_ERROR_FEEDBACK({
            agent,
            task,
            toolName,
            error,
            parsedLLMOutput: undefined
        });

        this.log(`Tool error in ${toolName}`, agent.name, task.id, 'error', error);

        return {
            success: false,
            error,
            feedbackMessage
        };
    }

    // ─── Tool Operations ─────────────────────────────────────────────────────────

    /**
     * Execute the tool operation
     */
    private async executeOperation(tool: Tool, input: unknown): Promise<string> {
        try {
            // Use a more flexible approach to calling the tool
            const result = await tool.call(typeof input === 'string' ? input : JSON.stringify(input));
            if (typeof result !== 'string') {
                throw new Error('Tool must return a string result');
            }
            return result;
        } catch (error) {
            throw new Error(`Tool execution failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Setup tool execution timeout
     */
    private setupToolTimeout(toolKey: string, timeout: number = 300000): void {
        const timeoutTimer = setTimeout(() => {
            this.handleToolTimeout(toolKey);
        }, timeout);

        this.activeTools.set(toolKey, {
            startTime: Date.now(),
            timeout: timeoutTimer
        });
    }

    /**
     * Handle tool timeout
     */
    private handleToolTimeout(toolKey: string): void {
        const toolInfo = this.activeTools.get(toolKey);
        if (toolInfo) {
            const duration = Date.now() - toolInfo.startTime;
            this.log(`Tool execution timed out after ${duration}ms`, undefined, undefined, 'warn');
            this.cleanupTool(toolKey);
        }
    }

    /**
     * Clean up tool resources
     */
    private cleanupTool(toolKey: string): void {
        const toolInfo = this.activeTools.get(toolKey);
        if (toolInfo) {
            clearTimeout(toolInfo.timeout);
            this.activeTools.delete(toolKey);
        }
    }

    // ─── Status Management ────────────────────────────────────────────────────────

    /**
     * Update agent status with metadata
     */
    private async updateAgentStatus(
        agent: AgentType,
        status: keyof typeof AGENT_STATUS_enum,
        metadata?: Record<string, unknown>
    ): Promise<void> {
        await this.handleStatusTransition({
            currentStatus: agent.status,
            targetStatus: status,
            entity: 'agent',
            entityId: agent.id,
            agent,
            metadata: {
                ...metadata,
                timestamp: Date.now()
            }
        });

        agent.status = status;
    }

    // ─── Utility Methods ──────────────────────────────────────────────────────────

    /**
     * Generate unique tool execution key
     */
    private generateToolKey(agentId: string, toolName: string): string {
        return `${agentId}:${toolName}:${Date.now()}`;
    }

    /**
     * Generate success feedback message
     */
    private generateSuccessFeedback(
        agent: AgentType,
        task: TaskType,
        result: string,
        parsedOutput?: ParsedOutput
    ): string {
        return agent.promptTemplates.TOOL_RESULT_FEEDBACK({
            agent,
            task,
            toolResult: result,
            parsedLLMOutput: parsedOutput
        });
    }

    // ─── Resource Management ───────────────────────────────────────────────────────

    /**
     * Clean up all tool resources
     */
    public async cleanup(): Promise<void> {
        for (const [toolKey, toolInfo] of this.activeTools.entries()) {
            clearTimeout(toolInfo.timeout);
            this.activeTools.delete(toolKey);
        }
        this.log('Tool resources cleaned up');
    }

    /**
     * Get active tool count
     */
    public getActiveToolCount(): number {
        return this.activeTools.size;
    }

    // Private map to track active tools
    private activeTools: Map<string, { startTime: number; timeout: NodeJS.Timeout }> = new Map();
}

export default ToolManager.getInstance();
