/**
 * @file toolExecutionManager.ts
 * @path src/managers/domain/agent/toolExecutionManager.ts
 * @description Tool execution and retry handling functionality
 * 
 * @module @managers/domain/agent
 */

import { Tool } from '@langchain/core/tools';
import { CoreManager } from '../../core/coreManager';
import { MANAGER_CATEGORY_enum, AGENT_STATUS_enum } from '../../../types/common/enumTypes';
import { IAgentType } from '../../../types/agent/agentBaseTypes';
import { ITaskType } from '../../../types/task/taskBaseTypes';
import { ToolError } from '../../../types/tool/toolErrorTypes';
import { 
    IToolHandlerParams, 
    IToolHandlerResult, 
    createToolHandlerResult 
} from '../../../types/tool/toolHandlerTypes';
import type { IBaseManager, IBaseManagerMetadata } from '../../../types/agent/agentManagerTypes';

// ─── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_TIMEOUT = 300000;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

// ─── Tool Execution Manager ────────────────────────────────────────────────────

export class ToolExecutionManager extends CoreManager implements IBaseManager {
    private static instance: ToolExecutionManager;
    private readonly activeTools: Map<string, { 
        startTime: number; 
        timeout: NodeJS.Timeout; 
        retryCount: number; 
    }>;
    private isInitialized = false;
    public readonly category = MANAGER_CATEGORY_enum.RESOURCE;

    private constructor() {
        super();
        this.activeTools = new Map();
    }

    public static getInstance(): ToolExecutionManager {
        if (!ToolExecutionManager.instance) {
            ToolExecutionManager.instance = new ToolExecutionManager();
        }
        return ToolExecutionManager.instance;
    }

    public async initialize(): Promise<void> {
        if (this.isInitialized) return;
        await super.initialize();
        this.isInitialized = true;
    }

    public async validate(params: unknown): Promise<boolean> {
        if (!params || typeof params !== 'object') return false;
        const toolParams = params as IToolHandlerParams;
        return !!(toolParams.agent && toolParams.task && toolParams.tool);
    }

    public getMetadata(): IBaseManagerMetadata {
        return {
            category: MANAGER_CATEGORY_enum.RESOURCE,
            operation: 'tool-execution',
            duration: 0,
            status: 'success',
            agent: { id: '', name: '', role: '', status: '' },
            timestamp: Date.now(),
            component: 'ToolExecutionManager'
        };
    }

    public async executeTool(params: IToolHandlerParams): Promise<IToolHandlerResult> {
        const { agent, task, tool, input } = params;
        const toolKey = `${agent.id}:${tool.name}:${Date.now()}`;
        const startTime = Date.now();

        try {
            this.logInfo(`Starting tool execution: ${tool.name}`, { 
                agentId: agent.id, 
                taskId: task.id 
            });

            await this.handleStatusTransition({
                currentStatus: agent.status,
                targetStatus: AGENT_STATUS_enum.USING_TOOL,
                entity: 'agent',
                entityId: agent.id,
                context: {
                    phase: 'pre-execution',
                    operation: 'tool-execution',
                    toolName: tool.name,
                    toolKey,
                    agentId: agent.id,
                    taskId: task.id
                }
            });

            this.setupToolTimeout(toolKey);
            let result: string;
            try {
                result = await this.executeOperation(tool, input, toolKey);
            } catch (error) {
                result = await this.handleRetry(tool, input, toolKey, error);
            }
            
            this.cleanupActiveToolExecution(toolKey);

            await this.handleStatusTransition({
                currentStatus: agent.status,
                targetStatus: AGENT_STATUS_enum.USING_TOOL_END,
                entity: 'agent',
                entityId: agent.id,
                context: {
                    phase: 'post-execution',
                    operation: 'tool-execution',
                    toolName: tool.name,
                    toolKey,
                    result,
                    agentId: agent.id,
                    taskId: task.id
                }
            });

            this.logInfo(`Tool ${tool.name} executed successfully`, { 
                agentId: agent.id, 
                taskId: task.id 
            });

            return createToolHandlerResult(true, undefined, {
                result,
                feedbackMessage: `Tool ${tool.name} executed successfully`
            });

        } catch (error) {
            this.handleError(error, `Tool execution: ${tool.name}`, 'ExecutionError');
            return createToolHandlerResult(false, undefined, {
                feedbackMessage: error instanceof Error ? error.message : String(error)
            });
        }
    }

    private async executeOperation(
        tool: Tool, 
        input: unknown, 
        toolKey: string
    ): Promise<string> {
        try {
            const result = await tool.invoke(
                typeof input === 'string' ? input : JSON.stringify(input)
            );

            if (typeof result !== 'string') {
                throw new ToolError({
                    message: 'Tool must return a string result',
                    toolName: tool.name,
                    type: 'ExecutionError'
                });
            }

            return result;

        } catch (error) {
            const toolInfo = this.activeTools.get(toolKey);
            const elapsedTime = toolInfo ? Date.now() - toolInfo.startTime : 0;
            
            throw new ToolError({
                message: error instanceof Error ? error.message : String(error),
                toolName: tool.name,
                type: 'ExecutionError',
                phase: 'execute',
                elapsedTime,
                retryable: true
            });
        }
    }

    private setupToolTimeout(toolKey: string): void {
        const timeoutTimer = setTimeout(() => {
            this.handleToolTimeout(toolKey);
        }, DEFAULT_TIMEOUT);

        this.activeTools.set(toolKey, {
            startTime: Date.now(),
            timeout: timeoutTimer,
            retryCount: 0
        });
    }

    private handleToolTimeout(toolKey: string): void {
        const toolInfo = this.activeTools.get(toolKey);
        if (toolInfo) {
            const elapsedTime = Date.now() - toolInfo.startTime;
            const toolName = toolKey.split(':')[1];
            
            this.handleError(
                new ToolError({
                    message: `Tool execution timed out after ${elapsedTime}ms`,
                    toolName,
                    type: 'TimeoutError',
                    elapsedTime,
                    timeout: DEFAULT_TIMEOUT
                }),
                `Tool timeout: ${toolKey}`
            );

            this.cleanupActiveToolExecution(toolKey);
        }
    }

    private cleanupActiveToolExecution(toolKey: string): void {
        const toolInfo = this.activeTools.get(toolKey);
        if (toolInfo) {
            clearTimeout(toolInfo.timeout);
            this.activeTools.delete(toolKey);
        }
    }

    private async handleRetry(
        tool: Tool,
        input: unknown,
        toolKey: string,
        error: unknown
    ): Promise<string> {
        const toolInfo = this.activeTools.get(toolKey);
        if (!toolInfo) {
            throw new ToolError({
                message: 'Tool info not found',
                toolName: tool.name,
                type: 'ExecutionError'
            });
        }

        if (toolInfo.retryCount < MAX_RETRIES) {
            toolInfo.retryCount++;
            this.logWarn(
                `Retrying tool execution (attempt ${toolInfo.retryCount}/${MAX_RETRIES})`
            );

            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * toolInfo.retryCount));
            return this.executeOperation(tool, input, toolKey);
        }

        throw new ToolError({
            message: `Max retries (${MAX_RETRIES}) exceeded`,
            toolName: tool.name,
            type: 'ExecutionError',
            retryable: false
        });
    }
}

export default ToolExecutionManager.getInstance();
