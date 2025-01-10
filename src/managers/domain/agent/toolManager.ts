import { Tool } from '@langchain/core/tools';
import { CoreManager } from '../../core/coreManager';
import { MANAGER_CATEGORY_enum } from '../../../types/common/enumTypes';
import { IAgentType } from '../../../types/agent/agentBaseTypes';
import { ToolError } from '../../../types/tool/toolErrorTypes';
import { 
    IToolHandlerParams, 
    IToolHandlerResult,
    createToolHandlerResult 
} from '../../../types/tool/toolHandlerTypes';
import { validateTool } from '../../../types/tool/toolTypes';
import { ERROR_KINDS, createError } from '../../../types/common/errorTypes';
import ToolExecutionManager from './toolExecutionManager';
import ToolRegistrationManager from './toolRegistrationManager';
import AgentManager from './agentManager';
import type { IToolExecutionManager } from '../../../types/tool/toolManagerTypes';
import type { IToolRegistrationManager } from '../../../types/tool/toolManagerTypes';

export class ToolManager extends CoreManager {
    private static instance: ToolManager;
    private readonly toolExecutionManager: IToolExecutionManager;
    private readonly toolRegistrationManager: IToolRegistrationManager;
    private isInitialized = false;
    public readonly category = MANAGER_CATEGORY_enum.RESOURCE;

    private constructor() {
        super();
        this.toolExecutionManager = ToolExecutionManager.getInstance();
        this.toolRegistrationManager = ToolRegistrationManager.getInstance();
        this.registerDomainManager('ToolManager', this);
    }

    public static getInstance(): ToolManager {
        if (!ToolManager.instance) {
            ToolManager.instance = new ToolManager();
        }
        return ToolManager.instance;
    }

    public async initialize(): Promise<void> {
        if (this.isInitialized) return;
        
        await this.toolExecutionManager.initialize();
        await this.toolRegistrationManager.initialize();
        await super.initialize();
        
        this.isInitialized = true;
    }

    public async validateToolConfig(tool: Tool): Promise<IToolHandlerResult> {
        try {
            const toolValidation = validateTool(tool);
            if (!toolValidation.isValid) {
                throw new ToolError({
                    message: `Tool validation failed: ${toolValidation.errors?.join(', ')}`,
                    toolName: tool.name,
                    type: 'ValidationError',
                    errors: toolValidation.errors
                });
            }

            if (tool.schema) {
                await this.toolRegistrationManager.validateToolSchema(tool);
            }

            return createToolHandlerResult(true);
        } catch (error) {
            return createToolHandlerResult(false);
        }
    }

    public async initializeTools(agent: IAgentType): Promise<Tool[]> {
        if (!agent.tools?.length) return [];

        const initializedTools: Tool[] = [];
        try {
            for (const tool of agent.tools) {
                await this.initializeTool(tool);
                initializedTools.push(tool);
            }
            return initializedTools;
        } catch (error) {
            await Promise.all(initializedTools.map(tool => this.cleanupTool(tool.name)));
            throw error;
        }
    }

    public async initializeTool(tool: Tool): Promise<void> {
        await this.validateAndRegisterTool(tool);
    }

    private async validateAndRegisterTool(tool: Tool): Promise<void> {
        const validation = await this.validateToolConfig(tool);
        if (!validation.success) {
            throw new ToolError({
                message: `Tool validation failed: ${validation.data?.feedbackMessage}`,
                toolName: tool.name,
                type: 'ValidationError'
            });
        }
        await this.toolRegistrationManager.registerTool(tool);
    }

    public async cleanupTools(agent: IAgentType): Promise<void> {
        if (!agent.tools?.length) return;
        await Promise.all(agent.tools.map(tool => this.cleanupTool(tool.name)));
    }

    public async cleanupTool(toolName: string): Promise<void> {
        await this.toolRegistrationManager.unregisterTool(toolName);
    }

    public async executeTool(params: IToolHandlerParams): Promise<IToolHandlerResult> {
        try {
            const result = await this.toolExecutionManager.executeTool(params);
            
            if (result.success && result.data) {
                return {
                    success: true,
                    data: result.data
                };
            }

            throw result.error || new Error('Tool execution failed');
        } catch (error) {
            return {
                success: false,
                error: createError({
                    message: error instanceof Error ? error.message : String(error),
                    type: ERROR_KINDS.ExecutionError
                })
            };
        }
    }
}

export default ToolManager.getInstance();
