/**
 * @file agentValidator.ts
 * @path src/managers/domain/agent/agentValidator.ts
 * @description Agent validation implementation
 *
 * @module @managers/domain/agent
 */

import { CoreManager } from '../../core/coreManager';
import { createValidationResult } from '../../../utils/validation/validationUtils';
import { createError } from '../../../types/common/commonErrorTypes';
import { AGENT_STATUS_enum } from '../../../types/common/commonEnums';
import type { IAgentType } from '../../../types/agent/agentBaseTypes';
import type { IAgentExecutionState } from '../../../types/agent/agentStateTypes';
import type { IValidationResult } from '../../../types/common/commonValidationTypes';
import type { IAgentValidationSchema } from '../../../types/agent/agentValidationTypes';

export class AgentValidator extends CoreManager {
    protected static _instance: AgentValidator;

    protected constructor() {
        super();
        this.registerDomainManager('AgentValidator', this);
    }

    public static getInstance(): AgentValidator {
        if (!AgentValidator._instance) {
            AgentValidator._instance = new AgentValidator();
        }
        return AgentValidator._instance;
    }

    public async validateAgent(agent: IAgentType, schema?: IAgentValidationSchema): Promise<IValidationResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        try {
            // Validate required fields
            if (!agent.id) errors.push('Agent ID is required');
            if (!agent.name) errors.push('Agent name is required');
            if (!agent.role) errors.push('Agent role is required');
            if (!agent.goal) errors.push('Agent goal is required');
            if (!agent.version) errors.push('Agent version is required');

            // Validate status
            if (!Object.values(AGENT_STATUS_enum).includes(agent.status as AGENT_STATUS_enum)) {
                errors.push('Invalid agent status');
            }

            // Validate capabilities
            if (!agent.capabilities) {
                errors.push('Agent capabilities are required');
            } else {
                if (typeof agent.capabilities.canThink !== 'boolean') {
                    errors.push('canThink capability must be a boolean');
                }
                if (typeof agent.capabilities.canUseTools !== 'boolean') {
                    errors.push('canUseTools capability must be a boolean');
                }
                if (typeof agent.capabilities.canLearn !== 'boolean') {
                    errors.push('canLearn capability must be a boolean');
                }
                if (!Array.isArray(agent.capabilities.supportedToolTypes)) {
                    errors.push('supportedToolTypes must be an array');
                }
            }

            // Validate execution state
            if (agent.executionState) {
                const stateValidation = await this.validateExecutionState(agent.executionState);
                errors.push(...stateValidation.errors);
                warnings.push(...stateValidation.warnings);
            } else {
                errors.push('Agent execution state is required');
            }

            // Validate against schema if provided
            if (schema) {
                const schemaValidation = await this.validateAgainstSchema(agent, schema);
                errors.push(...schemaValidation.errors);
                warnings.push(...schemaValidation.warnings);
            }

            return createValidationResult(errors.length === 0, errors, warnings);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return createValidationResult(false, [`Validation error: ${errorMessage}`]);
        }
    }

    private async validateExecutionState(state: IAgentExecutionState): Promise<IValidationResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Validate arrays
        if (!Array.isArray(state.assignedTasks)) {
            errors.push('assignedTasks must be an array');
        }
        if (!Array.isArray(state.completedTasks)) {
            errors.push('completedTasks must be an array');
        }
        if (!Array.isArray(state.failedTasks)) {
            errors.push('failedTasks must be an array');
        }
        if (!Array.isArray(state.blockedTasks)) {
            errors.push('blockedTasks must be an array');
        }

        // Validate counters
        if (typeof state.errorCount !== 'number' || state.errorCount < 0) {
            errors.push('errorCount must be a non-negative number');
        }
        if (typeof state.retryCount !== 'number' || state.retryCount < 0) {
            errors.push('retryCount must be a non-negative number');
        }
        if (typeof state.maxRetries !== 'number' || state.maxRetries < 0) {
            errors.push('maxRetries must be a non-negative number');
        }
        if (state.retryCount > state.maxRetries) {
            errors.push('retryCount cannot exceed maxRetries');
        }

        // Validate iterations
        if (typeof state.iterations !== 'number' || state.iterations < 0) {
            errors.push('iterations must be a non-negative number');
        }
        if (typeof state.maxIterations !== 'number' || state.maxIterations < 0) {
            errors.push('maxIterations must be a non-negative number');
        }
        if (state.iterations > state.maxIterations) {
            errors.push('iterations cannot exceed maxIterations');
        }

        // Validate flags
        if (typeof state.thinking !== 'boolean') {
            errors.push('thinking must be a boolean');
        }
        if (typeof state.busy !== 'boolean') {
            errors.push('busy must be a boolean');
        }

        // Validate timestamps
        if (!(state.startTime instanceof Date)) {
            errors.push('startTime must be a Date object');
        }
        if (state.endTime && !(state.endTime instanceof Date)) {
            errors.push('endTime must be a Date object');
        }
        if (state.lastActiveTime && !(state.lastActiveTime instanceof Date)) {
            errors.push('lastActiveTime must be a Date object');
        }

        // Validate history entries
        if (Array.isArray(state.history)) {
            state.history.forEach((entry, index) => {
                if (!(entry.timestamp instanceof Date)) {
                    errors.push(`history[${index}].timestamp must be a Date object`);
                }
                if (typeof entry.action !== 'string') {
                    errors.push(`history[${index}].action must be a string`);
                }
                if (typeof entry.details !== 'object') {
                    errors.push(`history[${index}].details must be an object`);
                }
            });
        } else {
            errors.push('history must be an array');
        }

        // Validate performance metrics
        if (!state.performance || typeof state.performance !== 'object') {
            errors.push('performance metrics are required');
        } else {
            if (typeof state.performance.completedTaskCount !== 'number' || state.performance.completedTaskCount < 0) {
                errors.push('completedTaskCount must be a non-negative number');
            }
            if (typeof state.performance.failedTaskCount !== 'number' || state.performance.failedTaskCount < 0) {
                errors.push('failedTaskCount must be a non-negative number');
            }
            if (typeof state.performance.averageTaskDuration !== 'number' || state.performance.averageTaskDuration < 0) {
                errors.push('averageTaskDuration must be a non-negative number');
            }
            if (typeof state.performance.successRate !== 'number' || state.performance.successRate < 0 || state.performance.successRate > 1) {
                errors.push('successRate must be between 0 and 1');
            }
            if (typeof state.performance.averageIterationsPerTask !== 'number' || state.performance.averageIterationsPerTask < 0) {
                errors.push('averageIterationsPerTask must be a non-negative number');
            }
        }

        return createValidationResult(errors.length === 0, errors, warnings);
    }

    private async validateAgainstSchema(agent: IAgentType, schema: IAgentValidationSchema): Promise<IValidationResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Validate required fields from schema
        if (schema.name && agent.name !== schema.name) {
            errors.push(`Agent name must be "${schema.name}"`);
        }
        if (schema.role && agent.role !== schema.role) {
            errors.push(`Agent role must be "${schema.role}"`);
        }
        if (schema.goal && agent.goal !== schema.goal) {
            errors.push(`Agent goal must be "${schema.goal}"`);
        }
        if (schema.version && agent.version !== schema.version) {
            errors.push(`Agent version must be "${schema.version}"`);
        }

        // Validate capabilities from schema
        if (schema.capabilities) {
            if (schema.capabilities.canThink !== undefined && agent.capabilities.canThink !== schema.capabilities.canThink) {
                errors.push(`canThink capability must be ${schema.capabilities.canThink}`);
            }
            if (schema.capabilities.canUseTools !== undefined && agent.capabilities.canUseTools !== schema.capabilities.canUseTools) {
                errors.push(`canUseTools capability must be ${schema.capabilities.canUseTools}`);
            }
            if (schema.capabilities.canLearn !== undefined && agent.capabilities.canLearn !== schema.capabilities.canLearn) {
                errors.push(`canLearn capability must be ${schema.capabilities.canLearn}`);
            }
            if (schema.capabilities.supportedToolTypes) {
                const missingTools = schema.capabilities.supportedToolTypes.filter(
                    tool => !agent.capabilities.supportedToolTypes.includes(tool)
                );
                if (missingTools.length > 0) {
                    errors.push(`Missing required tool types: ${missingTools.join(', ')}`);
                }
            }
        }

        // Validate execution configuration
        if (schema.executionConfig) {
            if (schema.executionConfig.maxRetries !== undefined && agent.executionState.maxRetries !== schema.executionConfig.maxRetries) {
                errors.push(`maxRetries must be ${schema.executionConfig.maxRetries}`);
            }
            if (schema.executionConfig.timeoutMs !== undefined && agent.executionState.duration !== schema.executionConfig.timeoutMs) {
                errors.push(`execution timeout must be ${schema.executionConfig.timeoutMs}ms`);
            }
            if (schema.executionConfig.errorThreshold !== undefined && agent.executionState.errorCount > schema.executionConfig.errorThreshold) {
                errors.push(`error count exceeds threshold of ${schema.executionConfig.errorThreshold}`);
            }
        }

        return createValidationResult(errors.length === 0, errors, warnings);
    }

    public cleanup(): void {
        // No cleanup needed as we're using singletons
    }
}

export default AgentValidator.getInstance();
