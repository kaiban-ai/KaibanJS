/**
 * @file toolManager.ts
 * @path src/managers/domain/agent/toolManager.ts
 * @description Core tool management functionality
 * 
 * @module @managers/domain/agent
 */

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
import { 
    validateTool, 
    IToolDependency 
} from '../../../types/tool/toolTypes';
import { 
    IToolExecutionManager,
    IToolRegistrationManager,
    IToolMetricsManager 
} from '../../../types/tool/toolManagerTypes';
import type { IBaseManager, IBaseManagerMetadata } from '../../../types/agent/agentManagerTypes';
import ToolExecutionManager from './toolExecutionManager';
import ToolRegistrationManager from './toolRegistrationManager';
import ToolMetricsManager from './toolMetricsManager';

// ─── Tool Manager ───────────────────────────────────────────────────────────────

export class ToolManager extends CoreManager implements IBaseManager {
    private static instance: ToolManager;
    private readonly toolExecutionManager: IToolExecutionManager;
    private readonly toolRegistrationManager: IToolRegistrationManager;
    private readonly toolMetricsManager: IToolMetricsManager;
    private isInitialized = false;
    public readonly category = MANAGER_CATEGORY_enum.RESOURCE;

    private constructor() {
        super();
        // Access static getInstance() methods
        this.toolExecutionManager = (ToolExecutionManager as unknown as { getInstance(): IToolExecutionManager }).getInstance();
        this.toolRegistrationManager = (ToolRegistrationManager as unknown as { getInstance(): IToolRegistrationManager }).getInstance();
        this.toolMetricsManager = (ToolMetricsManager as unknown as { getInstance(): IToolMetricsManager }).getInstance();
    }

    public static getInstance(): ToolManager {
        if (!ToolManager.instance) {
            ToolManager.instance = new ToolManager();
        }
        return ToolManager.instance;
    }

    public async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            await this.toolExecutionManager.initialize();
            await this.toolRegistrationManager.initialize();
            await this.toolMetricsManager.initialize();
            await super.initialize();
            this.isInitialized = true;
            this.logInfo('ToolManager initialized successfully');
        } catch (error) {
            this.handleError(error, 'ToolManager initialization', 'InitializationError');
            throw error;
        }
    }

    public async validate(params: unknown): Promise<boolean> {
        if (!params || typeof params !== 'object') return false;
        const toolParams = params as IToolHandlerParams;
        return !!(toolParams.agent && toolParams.task && toolParams.tool);
    }

    public getMetadata(): IBaseManagerMetadata {
        return {
            category: MANAGER_CATEGORY_enum.RESOURCE,
            operation: 'tool-management',
            duration: 0,
            status: 'success',
            agent: { id: '', name: '', role: '', status: '' },
            timestamp: Date.now(),
            component: 'ToolManager'
        };
    }

    public isToolInitialized(toolName: string): boolean {
        return this.toolRegistrationManager.isToolRegistered(toolName);
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
            return createToolHandlerResult(true);
        } catch (error) {
            this.handleError(error, `Tool config validation: ${tool.name}`, 'ValidationError');
            return createToolHandlerResult(false, undefined, {
                feedbackMessage: error instanceof Error ? error.message : String(error)
            });
        }
    }

    public async initializeTool(tool: Tool): Promise<void> {
        if (this.isToolInitialized(tool.name)) return;

        try {
            const validation = await this.validateToolConfig(tool);
            if (!validation.success) {
                throw new ToolError({
                    message: `Tool validation failed: ${validation.data?.feedbackMessage}`,
                    toolName: tool.name,
                    type: 'ValidationError'
                });
            }

            await this.toolRegistrationManager.registerTool(tool);
            await this.toolMetricsManager.createMetrics(tool.name);
            this.toolMetricsManager.startCollection(tool.name);

        } catch (error) {
            this.handleError(error, `Tool initialization: ${tool.name}`, 'InitializationError');
            throw error;
        }
    }

    public async initializeTools(agent: IAgentType): Promise<Tool[]> {
        if (!agent.tools?.length) return [];

        const initializedTools: Tool[] = [];
        for (const tool of agent.tools) {
            await this.initializeTool(tool);
            initializedTools.push(tool);
        }

        return initializedTools;
    }

    public async validateToolDependencies(tools: Tool[]): Promise<IToolHandlerResult> {
        return this.toolRegistrationManager.validateToolDependencies(tools);
    }

    public async executeTool(params: IToolHandlerParams): Promise<IToolHandlerResult> {
        const startTime = Date.now();
        try {
            const result = await this.toolExecutionManager.executeTool(params);
            const executionTime = Date.now() - startTime;
            await this.toolMetricsManager.updateMetrics(params.tool.name, executionTime);
            return result;
        } catch (error) {
            this.handleError(error, `Tool execution: ${params.tool.name}`, 'ExecutionError');
            return createToolHandlerResult(false, undefined, {
                feedbackMessage: error instanceof Error ? error.message : String(error)
            });
        }
    }

    public async cancelToolInitialization(toolName: string): Promise<void> {
        this.toolMetricsManager.stopCollection(toolName);
        await this.cleanupTool(toolName);
    }

    public async cleanupTool(toolName: string): Promise<void> {
        this.toolMetricsManager.stopCollection(toolName);
        this.toolMetricsManager.clearMetricsHistory(toolName);
    }

    public async cleanupTools(agent: IAgentType): Promise<void> {
        if (!agent.tools?.length) return;
        for (const tool of agent.tools) {
            await this.cleanupTool(tool.name);
        }
    }

    public async getToolDependencies(toolName: string): Promise<string[]> {
        const metadata = this.toolRegistrationManager.getToolMetadata(toolName);
        if (!metadata?.dependencies?.items) return [];
        return metadata.dependencies.items.map((item: { dependency: IToolDependency }) => item.dependency.toolName);
    }
}

export default ToolManager.getInstance();
