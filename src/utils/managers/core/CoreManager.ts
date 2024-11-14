/**
 * @file CoreManager.ts
 * @path src/utils/managers/core/CoreManager.ts
 * @description Core manager implementation providing base functionality for domain managers
 */

// Core utilities
import { LogManager } from '@/utils/managers/core/LogManager';
import { ErrorManager } from '@/utils/managers/core/ErrorManager';

// Types from canonical locations
import type {
    StatusTransition,
    StatusTransitionContext,
    StatusEntity,
    StatusType,
    StatusValidationResult
} from '@/utils/types/common/status';

import {
    isStatusEntity,
    isStatusTransition,
    isStatusTransitionContext
} from '@/utils/types/common/status';

import { EnumTypeGuards } from '@/utils/types/common/enums';

// ─── Core Manager Implementation ──────────────────────────────────────────────

export abstract class CoreManager {
    private logManager = LogManager.getInstance();
    private errorManager = ErrorManager.getInstance();

    // ─── Protected Methods ─────────────────────────────────────────────────────

    /**
     * Protected logging wrapper with consistent formatting
     */
    protected log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
        this.logManager[level](`[${this.constructor.name}] ${message}`);
    }

    /**
     * Protected error handling with centralized ErrorManager
     */
    protected handleError(error: Error, context: string): void {
        this.errorManager.handleAgentError({
            error,
            context,
            task: null, // Use a specific task if available
            agent: null, // Use a specific agent if available
            store: {
                prepareNewLog: (logParams) =>
                    this.logManager.createAgentLog({
                        ...logParams,
                        agentName: logParams.agent?.name || 'Unknown Agent'
                    }),
                setState: (stateUpdate) =>
                    this.logManager.debug('Updating state in ErrorManager', stateUpdate),
            }
        });
    }

    /**
     * Protected method to validate status transitions
     */
    protected validateStatus(
        context: StatusTransitionContext
    ): StatusValidationResult {
        try {
            const { currentStatus, targetStatus, entity } = context;
            
            // Validate current status based on entity type
            if (!this.isValidStatusForEntity(currentStatus, entity)) {
                return {
                    isValid: false,
                    errors: [`Invalid current status: ${currentStatus} for entity type: ${entity}`]
                };
            }

            // Validate target status based on entity type
            if (!this.isValidStatusForEntity(targetStatus, entity)) {
                return {
                    isValid: false,
                    errors: [`Invalid target status: ${targetStatus} for entity type: ${entity}`]
                };
            }

            return { 
                isValid: true,
                context: {
                    transition: `${currentStatus} -> ${targetStatus}`,
                    entity
                }
            };

        } catch (error) {
            this.handleError(
                error instanceof Error ? error : new Error(String(error)),
                JSON.stringify({ context })
            );
            return {
                isValid: false,
                errors: [error instanceof Error ? error.message : String(error)],
                context: { context }
            };
        }
    }

    /**
     * Protected method to apply transition rules
     */
    protected applyTransitionRule(
        context: StatusTransitionContext
    ): boolean {
        const validationResult = this.validateStatus(context);
        
        if (!validationResult.isValid) {
            this.log(
                `Transition validation failed: ${validationResult.errors?.join(', ')}`, 
                'warn'
            );
            return false;
        }

        return true;
    }

    // ─── Private Helper Methods ───────────────────────────────────────────────

    /**
     * Validate status based on entity type
     */
    private isValidStatusForEntity(
        status: StatusType,
        entity: StatusEntity
    ): boolean {
        switch (entity) {
            case 'agent':
                return EnumTypeGuards.isAgentStatus(status);
            case 'message':
                return EnumTypeGuards.isMessageStatus(status);
            case 'task':
                return EnumTypeGuards.isTaskStatus(status);
            case 'workflow':
                return EnumTypeGuards.isWorkflowStatus(status);
            default:
                return false;
        }
    }
}

export default CoreManager;
