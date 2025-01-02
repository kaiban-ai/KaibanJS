/**
 * @file toolManager.ts
 * @path src/managers/domain/agent/toolManager.ts
 * @description Enhanced tool management with centralized metrics handling
 */

import { Tool } from '@langchain/core/tools';
import { CoreManager } from '../../core/coreManager';
import { MANAGER_CATEGORY_enum, AGENT_STATUS_enum } from '../../../types/common/enumTypes';
import { IAgentType } from '../../../types/agent/agentBaseTypes';
import { ToolError } from '../../../types/tool/toolErrorTypes';
import { 
    IToolHandlerParams, 
    IToolHandlerResult, 
    IToolHandlerMetadata,
    createToolHandlerResult 
} from '../../../types/tool/toolHandlerTypes';
import { validateTool, IToolInitializationState } from '../../../types/tool/toolTypes';
import { 
    IToolExecutionManager,
    IToolRegistrationManager,
    IToolManager
} from '../../../types/tool/toolManagerTypes';
import type { IBaseManagerMetadata } from '../../../types/agent/agentManagerTypes';
import type { IStandardCostDetails, IHandlerResult } from '../../../types/common/baseTypes';
import { ERROR_KINDS, createError } from '../../../types/common/errorTypes';
import ToolExecutionManager from './toolExecutionManager';
import ToolRegistrationManager from './toolRegistrationManager';
import AgentManager from './agentManager';

// Helper function to create base metadata
function createBaseMetadata(component: string, operation: string) {
    return {
        component,
        operation,
        timestamp: Date.now(),
        version: '1.0.0'
    };
}

export class ToolManager extends CoreManager implements IToolManager {
    [x: string]: any;
    private static instance: ToolManager;
    private readonly toolExecutionManager: IToolExecutionManager;
    private readonly toolRegistrationManager: IToolRegistrationManager;
    private readonly initializationState: Map<string, IToolInitializationState>;
    private isInitialized = false;
    private baseMetadata?: IBaseManagerMetadata;
    public readonly category = MANAGER_CATEGORY_enum.RESOURCE;

    private constructor() {
        super();
        this.toolExecutionManager = (ToolExecutionManager as unknown as { getInstance(): IToolExecutionManager }).getInstance();
        this.toolRegistrationManager = (ToolRegistrationManager as unknown as { getInstance(): IToolRegistrationManager }).getInstance();
        this.initializationState = new Map();
        this.registerDomainManager('ToolManager', this);
    }

    public static getInstance(): ToolManager {
        if (!ToolManager.instance) {
            ToolManager.instance = new ToolManager();
        }
        return ToolManager.instance;
    }

    public async initialize(metadata?: IBaseManagerMetadata): Promise<void> {
        if (this.isInitialized) return;

        try {
            this.baseMetadata = metadata;
            await this.toolExecutionManager.initialize();
            await this.toolRegistrationManager.initialize();
            await super.initialize();
            this.isInitialized = true;
            this.logInfo('ToolManager initialized successfully');

            await this.getMetricsManager().trackManagerInitialization({
                component: this.constructor.name,
                baseMetadata: metadata
            });
        } catch (error) {
            await this.handleError(error, 'ToolManager initialization', ERROR_KINDS.InitializationError);
            throw error;
        }
    }

    private async createToolMetadata(
        toolName: string,
        phase: 'pre' | 'execute' | 'post',
        status: 'success' | 'failed' = 'success'
    ): Promise<IToolHandlerMetadata> {
        const agentManager = this.getDomainManager<typeof AgentManager>('AgentManager');
        const activeAgents = agentManager.getActiveAgents();
        const currentAgent = activeAgents.find((agent: IAgentType) => 
            agent.status !== AGENT_STATUS_enum.IDLE && 
            agent.status !== AGENT_STATUS_enum.INITIAL
        );

        const baseMetadata = createBaseMetadata(this.constructor.name, 'tool_execution');

        const agentInfo = currentAgent || this.baseMetadata?.agent || {
            id: 'system',
            name: 'ToolManager',
            role: 'system',
            status: AGENT_STATUS_enum.IDLE
        };

        return {
            ...baseMetadata,
            timestamp: Date.now(),
            component: this.constructor.name,
            operation: 'tool_execution',
            status,
            duration: 0,
            agent: {
                id: agentInfo.id,
                name: agentInfo.name,
                role: agentInfo.role,
                status: agentInfo.status,
                metrics: await this.getAgentMetrics(agentInfo.id)
            },
            toolId: toolName,
            executionPhase: phase
        };
    }

    // Simplified agent metrics retrieval
    private async getAgentMetrics(agentId: string) {
        return await this.getMetricsManager().getAgentMetrics(agentId);
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

            return createToolHandlerResult(
                true,
                await this.createToolMetadata(tool.name, 'pre', 'success')
            );
        } catch (error) {
            await this.handleError(error, `Tool config validation: ${tool.name}`, ERROR_KINDS.ValidationError);
            return createToolHandlerResult(false, await this.createToolMetadata(tool.name, 'pre', 'failed'));
        }
    }

    public async validateToolDependencies(tools: Tool[]): Promise<IToolHandlerResult> {
        try {
            const dependencies = await this.buildDependencyGraph(tools);
            await this.validateDependencyGraph(dependencies);
            return createToolHandlerResult(true, await this.createToolMetadata('dependency-validation', 'pre', 'success'));
        } catch (error) {
            await this.handleError(error, 'Tool dependency validation', ERROR_KINDS.ValidationError);
            return createToolHandlerResult(false, await this.createToolMetadata('dependency-validation', 'pre', 'failed'));
        }
    }

    private async buildDependencyGraph(tools: Tool[]): Promise<Map<string, Set<string>>> {
        const dependencies = new Map<string, Set<string>>();
        for (const tool of tools) {
            if (!dependencies.has(tool.name)) {
                dependencies.set(tool.name, new Set());
            }
            const deps = await this.getToolDependencies(tool.name);
            deps.forEach(dep => dependencies.get(tool.name)?.add(dep));
        }
        return dependencies;
    }

    private async validateDependencyGraph(dependencies: Map<string, Set<string>>): Promise<void> {
        const checkCircular = (tool: string, path: Set<string>): boolean => {
            if (path.has(tool)) return true;
            path.add(tool);
            const deps = dependencies.get(tool) || new Set();
            for (const dep of deps) {
                if (checkCircular(dep, new Set(path))) return true;
            }
            return false;
        };

        for (const tool of dependencies.keys()) {
            if (checkCircular(tool, new Set())) {
                throw createError({
                    message: `Circular dependency detected for tool: ${tool}`,
                    type: ERROR_KINDS.ValidationError
                });
            }
        }
    }

    public async initializeTools(agent: IAgentType): Promise<Tool[]> {
        if (!agent.tools?.length) return [];

        const initializedTools: Tool[] = [];
        try {
            const dependencyValidation = await this.validateToolDependencies(agent.tools);
            if (!dependencyValidation.success) {
                throw new ToolError({
                    message: `Tool dependency validation failed: ${dependencyValidation.data?.feedbackMessage}`,
                    toolName: 'multiple',
                    type: 'ValidationError'
                });
            }

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
        const state = this.getInitializationState(tool.name);
        if (state.isInitializing) {
            return state.initializationPromise;
        }

        state.isInitializing = true;
        state.initializationPromise = this.performToolInitialization(tool, state);
        await state.initializationPromise;
    }

    private async performToolInitialization(tool: Tool, state: IToolInitializationState): Promise<void> {
        try {
            await this.initializeToolDependencies(tool);
            await this.validateAndRegisterTool(tool);
            
            state.isInitializing = false;
            state.error = undefined;
            this.initializationState.set(tool.name, state);

            await this.emitEvent({
                id: `tool_initialized_${tool.name}`,
                type: 'TOOL_INITIALIZED',
                timestamp: Date.now(),
                metadata: await this.createToolMetadata(tool.name, 'pre', 'success')
            });
        } catch (error) {
            state.isInitializing = false;
            state.error = error as Error;
            this.initializationState.set(tool.name, state);
            await this.handleError(error, `Tool initialization: ${tool.name}`, ERROR_KINDS.InitializationError);
            throw error;
        }
    }

    private async initializeToolDependencies(tool: Tool): Promise<void> {
        const deps = await this.getToolDependencies(tool.name);
        for (const dep of deps) {
            const dependencyTool = this.toolRegistrationManager.getToolByName(dep);
            if (!dependencyTool) {
                throw new ToolError({
                    message: `Dependency tool not found: ${dep}`,
                    toolName: tool.name,
                    type: 'ValidationError'
                });
            }
            await this.initializeTool(dependencyTool);
        }
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

    private getInitializationState(toolName: string): IToolInitializationState {
        let state = this.initializationState.get(toolName);
        if (!state) {
            state = {
                isInitializing: false,
                dependencies: new Set(),
                dependents: new Set()
            };
            this.initializationState.set(toolName, state);
        }
        return state;
    }

    public async cleanupTools(agent: IAgentType): Promise<void> {
        if (!agent.tools?.length) return;
        await Promise.all(agent.tools.map(tool => this.cleanupTool(tool.name)));
    }

    public async cleanupTool(toolName: string): Promise<void> {
        const state = this.getInitializationState(toolName);
        
        await this.safeExecute(async () => {
            if (state.dependents.size) {
                await Promise.all(Array.from(state.dependents).map(dep => this.cleanupTool(dep)));
            }

            await this.toolRegistrationManager.unregisterTool(toolName);
            this.initializationState.delete(toolName);

            await this.emitEvent({
                id: `tool_cleaned_up_${toolName}`,
                type: 'TOOL_CLEANED_UP',
                timestamp: Date.now(),
                metadata: await this.createToolMetadata(toolName, 'post', 'success')
            });
        }, `Cleanup tool: ${toolName}`);
    }

    public async getToolDependencies(toolName: string): Promise<string[]> {
        const state = this.getInitializationState(toolName);
        return Array.from(state.dependencies);
    }

    public isToolInitialized(toolName: string): boolean {
        const state = this.initializationState.get(toolName);
        return !!(state && !state.isInitializing && !state.error);
    }

    public async cancelToolInitialization(toolName: string): Promise<void> {
        const state = this.getInitializationState(toolName);
        
        await this.safeExecute(async () => {
            if (state.isInitializing) {
                state.isInitializing = false;
                state.error = createError({
                    message: 'Tool initialization cancelled',
                    type: ERROR_KINDS.InitializationError
                });
                this.initializationState.set(toolName, state);
            }

            await this.cleanupTool(toolName);

            await this.emitEvent({
                id: `tool_initialization_cancelled_${toolName}`,
                type: 'TOOL_INITIALIZATION_CANCELLED',
                timestamp: Date.now(),
                metadata: await this.createToolMetadata(toolName, 'post', 'failed')
            });
        }, `Cancel tool initialization: ${toolName}`);
    }

    public async executeTool(params: IToolHandlerParams): Promise<IHandlerResult> {
        const startTime = Date.now();

        try {
            if (!this.isToolInitialized(params.tool.name)) {
                throw createError({
                    message: `Tool ${params.tool.name} is not initialized`,
                    type: ERROR_KINDS.ExecutionError
                });
            }

            const result = await this.toolExecutionManager.executeTool(params);
            const executionTime = Date.now() - startTime;

            await this.getMetricsManager().trackToolExecution({
                toolName: params.tool.name,
                success: result.success,
                executionTime,
                inputSize: JSON.stringify(params.input).length,
                outputSize: result.data ? JSON.stringify(result.data).length : 0
            });

            if (result.success && result.data) {
                return {
                    success: true,
                    data: result.data,
                    metadata: await this.createToolMetadata(params.tool.name, 'execute', 'success')
                };
            }

            throw result.error || new Error('Tool execution failed');
        } catch (error) {
            return {
                success: false,
                error: createError({
                    message: error instanceof Error ? error.message : String(error),
                    type: ERROR_KINDS.ExecutionError
                }),
                metadata: await this.createToolMetadata(params.tool.name, 'execute', 'failed')
            };
        }
    }

    // ... rest of the file remains unchanged ...
}

export default ToolManager.getInstance();
