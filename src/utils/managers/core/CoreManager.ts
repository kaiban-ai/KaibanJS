/**
 * @file CoreManager.ts
 * @path C:\Users\pwalc\Documents\GroqEmailAssistant\KaibanJS\src\utils\managers\core\coreManager.ts
 * @description Core manager implementation providing base functionality for domain managers
 *
 * @module @core
 */

// Core managers & types
import { LogManager } from './logManager';
import { ErrorManager } from './errorManager';
import { StatusManager } from './statusManager';

// Import types from canonical locations
import type { 
    StatusTransitionContext,
    StatusValidationResult,
    StatusEntity,
    StatusType 
} from '../../types/common/status';

import { toErrorType } from '../../types/common/errors';
import type { ErrorType } from '../../types/common/errors';
import type { AgentType } from '../../types/agent/base';
import type { TaskType } from '../../types/task/base';
import type { LogLevel } from '../../types/common/logging';

/**
 * Abstract base manager class providing core functionality for all managers
 */
export abstract class CoreManager {
    protected static _instance: any = null;
    public readonly logManager: LogManager;
    public readonly errorManager: ErrorManager;
    public readonly statusManager: StatusManager;

    protected constructor() {
        this.logManager = LogManager.getInstance();
        this.errorManager = ErrorManager.getInstance();
        this.statusManager = StatusManager.getInstance();
    }

    public static getInstance(): CoreManager {
        const Class = this as any;
        if (!Class._instance) {
            Class._instance = new Class();
        }
        return Class._instance;
    }

    // ─── Protected Methods ─────────────────────────────────────────────────────

    /**
     * Protected logging wrapper with flexible signature
     */
    protected log(
        message: string, 
        agentName?: string | null, 
        taskId?: string, 
        level: LogLevel = 'info',
        error?: Error
    ): void {
        // Use the full logging signature of LogManager
        this.logManager.log(
            message, 
            agentName, 
            taskId, 
            level,
            error
        );
    }

    /**
     * Protected error handling with consistent formatting
     */
    protected handleError(error: Error, context: string): void {
        const errorType = toErrorType(error);
        
        this.errorManager.handleAgentError({
            error: errorType,
            context: { 
                component: this.constructor.name, 
                details: context 
            },
            task: undefined,
            agent: undefined,
            store: {
                prepareNewLog: () => ({}),
                setState: () => {},
                getState: () => ({
                    workflowLogs: []
                })
            }
        });
    }

    /**
     * Protected status transition handler
     */
    protected async handleStatusTransition(params: {
        currentStatus: StatusType;
        targetStatus: StatusType;
        entity: StatusEntity;
        entityId: string;
        agent?: AgentType;
        task?: TaskType;
        metadata?: Record<string, unknown>;
    }): Promise<boolean> {
        try {
            return await this.statusManager.transition({
                currentStatus: params.currentStatus,
                targetStatus: params.targetStatus,
                entity: params.entity,
                entityId: params.entityId,
                agent: params.agent,
                task: params.task,
                metadata: params.metadata
            });
        } catch (error) {
            this.handleError(
                error instanceof Error ? error : new Error(String(error)), 
                `Status transition failed: ${params.currentStatus} -> ${params.targetStatus}`
            );
            return false;
        }
    }

    /**
     * Protected status validation
     */
    protected async validateStatus(context: StatusTransitionContext): Promise<StatusValidationResult> {
        try {
            // Use the public method from StatusManager
            return await this.statusManager.publicValidateTransition(context);
        } catch (error) {
            this.handleError(
                error instanceof Error ? error : new Error(String(error)),
                `Status validation failed: ${context.currentStatus} -> ${context.targetStatus}`
            );
            return {
                isValid: false,
                errors: [error instanceof Error ? error.message : String(error)],
                context: { context }
            };
        }
    }

    /**
     * Protected metadata preparation
     */
    protected prepareMetadata(
        baseMetadata: Record<string, unknown> = {},
        additionalMetadata: Record<string, unknown> = {}
    ): Record<string, unknown> {
        return {
            timestamp: Date.now(),
            component: this.constructor.name,
            ...baseMetadata,
            ...additionalMetadata
        };
    }

    /**
     * Protected method to safely execute async operations
     */
    protected async safeExecute<T>(
        operation: () => Promise<T>,
        errorContext: string
    ): Promise<T | null> {
        try {
            return await operation();
        } catch (error) {
            this.handleError(
                error instanceof Error ? error : new Error(String(error)),
                errorContext
            );
            return null;
        }
    }

    /**
     * Protected method to validate required parameters
     */
    protected validateRequiredParams(
        params: Record<string, unknown>,
        required: string[]
    ): void {
        const missing = required.filter(param => !params[param]);
        if (missing.length > 0) {
            throw new Error(`Missing required parameters: ${missing.join(', ')}`);
        }
    }
}

export default CoreManager;
