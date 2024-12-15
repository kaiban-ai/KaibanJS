/**
 * @file toolManagerTypes.ts
 * @path src/types/tool/toolManagerTypes.ts
 * @description Type definitions for tool managers
 * 
 * @module @types/tool
 */

import { Tool } from '@langchain/core/tools';
import { BaseMessage } from '@langchain/core/messages';
import { IHandlerResult } from '../common/baseTypes';
import { IBaseManager } from '../agent/agentManagerTypes';
import { IAgentType } from '../agent/agentBaseTypes';
import { ITaskType } from '../task/taskBaseTypes';
import { IToolHandlerResult } from './toolHandlerTypes';
import { MANAGER_CATEGORY_enum } from '../common/enumTypes';

/**
 * Interface for tracking tool initialization state within the tool manager.
 * This is an implementation detail specific to tool initialization tracking.
 */
export interface IToolInitializationState {
    /** Whether the tool is currently being initialized */
    isInitializing: boolean;
    /** Set of tool names that this tool depends on */
    dependencies: Set<string>;
    /** Set of tool names that depend on this tool */
    dependents: Set<string>;
    /** Promise representing the ongoing initialization process */
    initializationPromise?: Promise<void>;
    /** Any error that occurred during initialization */
    error?: Error;
}

/**
 * Tool manager interface for handling agent tools
 */
export interface IToolManager extends IBaseManager<Tool> {
    readonly category: MANAGER_CATEGORY_enum.RESOURCE;

    executeTool(params: {
        agent: IAgentType;
        task: ITaskType;
        tool: Tool;
        input: Record<string, unknown>;
        messages: BaseMessage[];
    }): Promise<IHandlerResult>;

    validateToolConfig(tool: Tool): Promise<IToolHandlerResult>;
    validateToolDependencies(tools: Tool[]): Promise<IToolHandlerResult>;
    initializeTools(agent: IAgentType): Promise<Tool[]>;
    initializeTool(tool: Tool): Promise<void>;
    cleanupTools(agent: IAgentType): Promise<void>;
    cleanupTool(toolName: string): Promise<void>;
    getToolDependencies(toolName: string): Promise<string[]>;
    isToolInitialized(toolName: string): boolean;
    cancelToolInitialization(toolName: string): Promise<void>;
}
