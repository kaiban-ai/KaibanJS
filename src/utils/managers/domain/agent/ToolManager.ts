/**
 * @file toolManager.ts
 * @path src/utils/managers/domain/agent/toolManager.ts
 * @description Centralized tool execution and lifecycle management implementation
 *
 * @module @managers/domain/agent
 */

import CoreManager from '../../core/coreManager';
import type {
    ToolExecutionParams,
    ToolExecutionResult,
    ToolHandlerParams,
    HandlerResult
} from '@/utils/types/tool/execution';

import type { 
    AgentType,
    TaskType
} from '@/utils/types';

import { AGENT_STATUS_enum } from '@/utils/types/common/enums';

/**
 * Manages tool execution and lifecycle for agents
 */
export class ToolManager extends CoreManager {
    private static instance: ToolManager;
    private readonly activeTools: Map<string, { 
        startTime: number; 
        timeout: NodeJS.Timeout;
    }>;

    private constructor() {
        super();
        this.activeTools = new Map();
    }

    public static getInstance(): ToolManager {
        if (!ToolManager.instance) {
            ToolManager.instance = new ToolManager();
        }
        return ToolManager.instance;
    }

    /**
     * Execute a tool with proper lifecycle management
     */
    public async executeTool(params: ToolExecutionParams): Promise<ToolExecutionResult> {
        const { agent, task, tool, input, parsedOutput } = params;
        const toolKey = this.generateToolKey(agent.id, tool.name);
        
        return await this.safeExecute(async () => {
            await this.startToolExecution(agent, task, tool);
            this.setupToolTimeout(toolKey);

            const result = await this.executeOperation(tool, input);
            
            await this.handleToolSuccess(agent, task, tool, result);
            this.cleanupTool(toolKey);

            return {
                success: true,
                result,
                feedbackMessage: this.generateSuccessFeedback(agent, task, result, parsedOutput)
            };
        }, `Tool execution failed for ${tool.name}`);
    }

    /**
     * Handle case where tool does not exist
     */
    public async handleToolDoesNotExist(params: {
        agent: AgentType;
        task: TaskType;
        toolName: string;
        parsedOutput?: Record<string, unknown>;
    }): Promise<ToolExecutionResult> {
        const { agent, task, toolName, parsedOutput } = params;

        return await this.safeExecute(async () => {
            await this.handleStatusTransition({
                currentStatus: agent.status,
                targetStatus: AGENT_STATUS_enum.TOOL_DOES_NOT_EXIST,
                entity: 'agent',
                entityId: agent.id,
                metadata: this.prepareMetadata({ toolName })
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
        }, `Tool not found handling failed for ${toolName}`);
    }

    private async startToolExecution(
        agent: AgentType,
        task: TaskType,
        tool: any
    ): Promise<void> {
        await this.handleStatusTransition({
            currentStatus: agent.status,
            targetStatus: AGENT_STATUS_enum.USING_TOOL,
            entity: 'agent',
            entityId: agent.id,
            metadata: this.prepareMetadata({ toolName: tool.name })
        });

        this.logManager.debug(`Agent ${agent.name} using tool: ${tool.name}`, agent.name, task.id);
    }

    private async handleToolSuccess(
        agent: AgentType,
        task: TaskType,
        tool: any,
        result: string
    ): Promise<void> {
        await this.handleStatusTransition({
            currentStatus: agent.status,
            targetStatus: AGENT_STATUS_enum.USING_TOOL_END,
            entity: 'agent',
            entityId: agent.id,
            metadata: this.prepareMetadata({ toolName: tool.name, result })
        });

        this.logManager.debug(`Tool ${tool.name} executed successfully`, agent.name, task.id);
    }

    private async executeOperation(tool: any, input: unknown): Promise<string> {
        try {
            const result = await tool.call(
                typeof input === 'string' ? input : JSON.stringify(input)
            );
            if (typeof result !== 'string') {
                throw new Error('Tool must return a string result');
            }
            return result;
        } catch (error) {
            throw new Error(`Tool execution failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private setupToolTimeout(toolKey: string, timeout: number = 300000): void {
        const timeoutTimer = setTimeout(() => {
            this.handleToolTimeout(toolKey);
        }, timeout);

        this.activeTools.set(toolKey, {
            startTime: Date.now(),
            timeout: timeoutTimer
        });
    }

    private handleToolTimeout(toolKey: string): void {
        const toolInfo = this.activeTools.get(toolKey);
        if (toolInfo) {
            const duration = Date.now() - toolInfo.startTime;
            this.logManager.warn(`Tool execution timed out after ${duration}ms`, undefined, toolKey);
            this.cleanupTool(toolKey);
        }
    }

    private cleanupTool(toolKey: string): void {
        const toolInfo = this.activeTools.get(toolKey);
        if (toolInfo) {
            clearTimeout(toolInfo.timeout);
            this.activeTools.delete(toolKey);
        }
    }

    private generateToolKey(agentId: string, toolName: string): string {
        return `${agentId}:${toolName}:${Date.now()}`;
    }

    private generateSuccessFeedback(
        agent: AgentType,
        task: TaskType,
        result: string,
        parsedOutput?: Record<string, unknown>
    ): string {
        return agent.promptTemplates.TOOL_RESULT_FEEDBACK({
            agent,
            task,
            toolResult: result,
            parsedLLMOutput: parsedOutput
        });
    }

    public getActiveToolCount(): number {
        return this.activeTools.size;
    }
}

export default ToolManager.getInstance();