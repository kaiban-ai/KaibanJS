/**
 * @file agentValidator.ts
 * @description Enhanced agent validation with type-safe rule system and caching
 */

import { z } from 'zod';
import { CoreManager } from '../../core/coreManager';
import { createValidationResult } from '../../../types/common/validationTypes';
import { 
    AGENT_STATUS_enum, 
    MANAGER_CATEGORY_enum,
    VALIDATION_ERROR_enum,
    VALIDATION_WARNING_enum
} from '../../../types/common/enumTypes';
import { 
    AgentValidationSchema,
    type IAgentValidationRule,
    type IAgentValidationContext,
    type IAgentValidationCache,
    type IAgentValidationResult
} from '../../../types/agent/agentValidationTypes';
import { ERROR_KINDS, createError } from '../../../types/common/errorTypes';
import { MetricDomain, MetricType } from '../../../types/metrics/base/metricsManagerTypes';
import { AGENT_EVENT_TYPE, AGENT_EVENT_CATEGORY } from '../../../types/agent/agentEvents';

import type { IBaseAgent, IAgentExecutionState } from '../../../types/agent/agentBaseTypes';
import type { IToolManager } from '../../../types/tool/toolManagerTypes';
import type { IValidationResult, IValidationError, IValidationWarning } from '../../../types/common/validationTypes';
import type { IBaseEvent } from '../../../types/common/baseTypes';
import type { IAgentValidationCompletedEvent } from '../../../types/agent/agentEvents';
import type { IAgentPerformanceMetrics, IAgentResourceMetrics, IAgentUsageMetrics } from '../../../types/agent/agentMetricTypes';

export class AgentValidator extends CoreManager {
    private static instance: AgentValidator;
    private readonly validationRules = new Map<string, IAgentValidationRule>();
    private readonly validationCache = new Map<string, IAgentValidationCache>();
    private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    public readonly category = MANAGER_CATEGORY_enum.VALIDATION;

    private constructor() {
        super();
        this.registerDomainManager('AgentValidator', this);
        this.initializeBaseRules();
    }

    public static getInstance(): AgentValidator {
        if (!AgentValidator.instance) {
            AgentValidator.instance = new AgentValidator();
        }
        return AgentValidator.instance;
    }

    public async initialize(): Promise<void> {
        try {
            await super.initialize();
            await this.trackInitializationMetrics();
            await this.transitionToIdle();
        } catch (error) {
            await this.handleError(
                error,
                'Failed to initialize AgentValidator',
                ERROR_KINDS.InitializationError
            );
            throw error;
        }
    }

    private async trackInitializationMetrics(): Promise<void> {
        await this.getMetricsManager().trackMetric({
            domain: MetricDomain.AGENT,
            type: MetricType.SYSTEM_HEALTH,
            value: 1,
            timestamp: Date.now(),
            metadata: {
                operation: 'initialize',
                component: this.constructor.name
            }
        });
    }

    private async transitionToIdle(): Promise<void> {
        await this.handleStatusTransition({
            entity: 'agent',
            entityId: this.constructor.name,
            currentStatus: AGENT_STATUS_enum.INITIAL,
            targetStatus: AGENT_STATUS_enum.IDLE,
            context: {
                component: this.constructor.name,
                operation: 'initialize'
            }
        });
    }

    public registerValidationRule(rule: IAgentValidationRule): void {
        try {
            this.validationRules.set(rule.id, rule);
            this.clearCacheForRule(rule.id);
            this.logInfo(`Registered validation rule: ${rule.id}`);
        } catch (error) {
            this.handleError(
                error,
                `Failed to register validation rule: ${rule.id}`,
                ERROR_KINDS.ValidationError
            );
        }
    }

    public async validateAgent(
        agent: IBaseAgent,
        context?: IAgentValidationContext
    ): Promise<IValidationResult> {
        const startTime = Date.now();
        const validationKey = this.generateValidationKey(agent, context);

        const result = await this.safeExecute(async () => {
            const cachedResult = this.getCachedValidation(validationKey, context);
            if (cachedResult) return cachedResult;

            const baseResult = await this.performBaseValidation(agent);
            if (!baseResult.isValid) {
                return this.cacheAndReturnResult(validationKey, baseResult, context);
            }

            const combinedResult = await this.performFullValidation(agent, context);
            await this.trackValidationMetrics(startTime, combinedResult);
            await this.emitValidationEvent(agent, combinedResult);

            return this.cacheAndReturnResult(validationKey, combinedResult, context);
        }, 'validateAgent');

        if (!result.success || !result.data) {
            return createValidationResult({
                isValid: false,
                errors: [VALIDATION_ERROR_enum.VALIDATION_FAILED],
                warnings: []
            });
        }

        return result.data;
    }

    private async performBaseValidation(agent: IBaseAgent): Promise<IValidationResult> {
        if (!agent || typeof agent !== 'object') {
            return createValidationResult({
                isValid: false,
                errors: [VALIDATION_ERROR_enum.INVALID_INPUT],
                warnings: []
            });
        }

        return this.validateAgainstZodSchema(agent);
    }

    private async performFullValidation(
        agent: IBaseAgent,
        context?: IAgentValidationContext
    ): Promise<IValidationResult> {
        const rules = this.getValidationRules(agent);
        const results = await Promise.all(
            rules.map(rule => rule.validate(agent, context))
        );

        let combinedResult = this.mergeValidationResults(results);

        if (agent.executionState) {
            const stateValidation = await this.validateExecutionState(agent.executionState);
            combinedResult = this.mergeValidationResults([combinedResult, stateValidation]);
            
            if (combinedResult.isValid) {
                await this.updateAgentStatus(agent);
            }
        }

        return combinedResult;
    }

    private async validateAgainstZodSchema(agent: IBaseAgent): Promise<IValidationResult> {
        try {
            AgentValidationSchema.parse(agent);
            return createValidationResult({
                isValid: true,
                errors: [],
                warnings: []
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return this.convertZodErrorToValidationResult(error);
            }
            return createValidationResult({
                isValid: false,
                errors: [VALIDATION_ERROR_enum.SCHEMA_VALIDATION_FAILED],
                warnings: []
            });
        }
    }

    private convertZodErrorToValidationResult(error: z.ZodError): IValidationResult {
        const errors = error.errors.map(err => {
            if (err.code === z.ZodIssueCode.invalid_type) {
                return VALIDATION_ERROR_enum.TYPE_MISMATCH;
            }
            if (err.message.includes('Required')) {
                return VALIDATION_ERROR_enum.FIELD_MISSING;
            }
            return VALIDATION_ERROR_enum.SCHEMA_VALIDATION_FAILED;
        });

        return createValidationResult({
            isValid: false,
            errors,
            warnings: []
        });
    }

    private getValidationRules(agent: IBaseAgent): IAgentValidationRule[] {
        return Array.from(this.validationRules.values())
            .sort((a, b) => a.priority - b.priority);
    }

    private async updateAgentStatus(agent: IBaseAgent): Promise<void> {
        await this.handleStatusTransition({
            entity: 'agent',
            entityId: agent.id,
            currentStatus: agent.executionState.status,
            targetStatus: AGENT_STATUS_enum.IDLE,
            context: {
                component: this.constructor.name,
                operation: 'validateAgent'
            }
        });
    }

    private async validateExecutionState(state: IAgentExecutionState): Promise<IValidationResult> {
        const errors: VALIDATION_ERROR_enum[] = [];

        if (!Object.values(AGENT_STATUS_enum).includes(state.status)) {
            errors.push(VALIDATION_ERROR_enum.INVALID_STATE);
        }

        if (typeof state.currentStep !== 'number' || state.currentStep < 0) {
            errors.push(VALIDATION_ERROR_enum.FIELD_CONSTRAINT_VIOLATION);
        }

        if (!(state.startTime instanceof Date) || !(state.lastUpdate instanceof Date)) {
            errors.push(VALIDATION_ERROR_enum.TYPE_MISMATCH);
        }

        return createValidationResult({
            isValid: errors.length === 0,
            errors,
            warnings: []
        });
    }

    private generateValidationKey(agent: IBaseAgent, context?: IAgentValidationContext): string {
        return `${agent.id}_${agent.version}_${context ? JSON.stringify(context) : ''}`;
    }

    private getCachedValidation(key: string, context?: IAgentValidationContext): IValidationResult | null {
        const cached = this.validationCache.get(key);
        if (!cached) return null;

        if (this.isCacheExpired(cached, context)) {
            this.validationCache.delete(key);
            return null;
        }

        return cached.result;
    }

    private isCacheExpired(cached: IAgentValidationCache, context?: IAgentValidationContext): boolean {
        const isExpired = Date.now() - cached.timestamp > this.CACHE_TTL;
        const contextChanged = context && 
            JSON.stringify(context) !== JSON.stringify(cached.context);
        return isExpired || contextChanged;
    }

    private cacheAndReturnResult(
        key: string,
        result: IValidationResult,
        context?: IAgentValidationContext
    ): IValidationResult {
        this.validationCache.set(key, {
            result,
            timestamp: Date.now(),
            context: context || {},
            hash: key
        });
        return result;
    }

    private clearCacheForRule(ruleId: string): void {
        for (const [key, cache] of this.validationCache.entries()) {
            if (cache.hash.includes(ruleId)) {
                this.validationCache.delete(key);
            }
        }
    }

    private async trackValidationMetrics(
        startTime: number,
        result: IValidationResult
    ): Promise<void> {
        const duration = Date.now() - startTime;
        await this.getMetricsManager().trackMetric({
            domain: MetricDomain.AGENT,
            type: MetricType.PERFORMANCE,
            value: duration,
            timestamp: Date.now(),
            metadata: {
                metric: 'validation_metrics',
                component: this.constructor.name,
                success: result.isValid,
                errorCount: result.errors.length,
                warningCount: result.warnings?.length || 0,
                duration
            }
        });
    }

    private async emitValidationEvent(
        agent: IBaseAgent,
        result: IValidationResult
    ): Promise<void> {
        const validationResult = this.convertToAgentValidationResult(result, agent);
        await this.emitEvent<IAgentValidationCompletedEvent>({
            id: `validation_${Date.now()}`,
            timestamp: Date.now(),
            type: AGENT_EVENT_TYPE.AGENT_VALIDATION_COMPLETED,
            agentId: agent.id,
            validationResult,
            metadata: {
                timestamp: Date.now(),
                component: this.constructor.name,
                operation: 'validateAgent',
                agent: {
                    id: agent.id,
                    name: agent.name,
                    role: agent.role,
                    status: agent.executionState?.status || AGENT_STATUS_enum.IDLE,
                    metrics: {
                        performance: {} as IAgentPerformanceMetrics,
                        resources: {} as IAgentResourceMetrics,
                        usage: {} as IAgentUsageMetrics
                    }
                },
                category: AGENT_EVENT_CATEGORY.VALIDATION,
                source: this.constructor.name
            }
        });
    }

    private mergeValidationResults(results: IValidationResult[]): IValidationResult {
        const allErrors: IValidationError[] = [];
        const allWarnings: IValidationWarning[] = [];

        for (const result of results) {
            if (result.errors) allErrors.push(...result.errors);
            if (result.warnings) allWarnings.push(...result.warnings);
        }

        return createValidationResult({
            isValid: results.every(r => r.isValid),
            errors: allErrors.map(err => err.code),
            warnings: allWarnings.map(warn => warn.code)
        });
    }

    private convertToAgentValidationResult(
        result: IValidationResult,
        agent?: IBaseAgent
    ): IAgentValidationResult {
        return {
            isValid: result.isValid,
            errors: result.errors.map(err => err.code) as readonly VALIDATION_ERROR_enum[],
            warnings: result.warnings?.map(warn => warn.code) as readonly VALIDATION_WARNING_enum[] || [],
            agent,
            metadata: {
                timestamp: Date.now(),
                duration: result.metadata?.duration || 0,
                validatorName: this.constructor.name,
                validatedFields: result.metadata?.validatedFields || [],
                configHash: result.metadata?.context?.configHash as string | undefined,
                validationDuration: result.metadata?.duration
            }
        };
    }

    public async cleanup(): Promise<void> {
        try {
            this.validationCache.clear();
            this.validationRules.clear();
            
            await this.handleStatusTransition({
                entity: 'agent',
                entityId: this.constructor.name,
                currentStatus: AGENT_STATUS_enum.IDLE,
                targetStatus: AGENT_STATUS_enum.AGENTIC_LOOP_ERROR,
                context: {
                    component: this.constructor.name,
                    operation: 'cleanup'
                }
            });

            await this.emitEvent<IBaseEvent>({
                id: `cleanup_${Date.now()}`,
                timestamp: Date.now(),
                type: 'agent.validator.cleanup',
                metadata: {
                    timestamp: Date.now(),
                    component: this.constructor.name,
                    operation: 'cleanup',
                    status: 'completed'
                }
            });
        } catch (error) {
            await this.handleError(
                error,
                'Failed to cleanup AgentValidator',
                ERROR_KINDS.SystemError
            );
        }
    }

    private initializeBaseRules(): void {
        // Core fields validation rule
        this.registerValidationRule({
            id: 'core-fields',
            priority: 100,
            validate: async (agent: IBaseAgent): Promise<IValidationResult> => {
                const errors: VALIDATION_ERROR_enum[] = [];
                
                if (!agent.id) errors.push(VALIDATION_ERROR_enum.FIELD_MISSING);
                if (!agent.name) errors.push(VALIDATION_ERROR_enum.FIELD_MISSING);
                if (!agent.role) errors.push(VALIDATION_ERROR_enum.FIELD_MISSING);
                if (!agent.version) errors.push(VALIDATION_ERROR_enum.FIELD_MISSING);
                
                if (typeof agent.maxIterations !== 'number' || agent.maxIterations < 1) {
                    errors.push(VALIDATION_ERROR_enum.FIELD_CONSTRAINT_VIOLATION);
                }

                return createValidationResult({
                    isValid: errors.length === 0,
                    errors,
                    warnings: []
                });
            }
        });

        // Capabilities validation rule
        this.registerValidationRule({
            id: 'capabilities',
            priority: 90,
            validate: async (agent: IBaseAgent): Promise<IValidationResult> => {
                const errors: VALIDATION_ERROR_enum[] = [];
                const warnings: VALIDATION_WARNING_enum[] = [];

                if (!agent.capabilities) {
                    errors.push(VALIDATION_ERROR_enum.FIELD_MISSING);
                    return createValidationResult({ isValid: false, errors, warnings });
                }

                if (agent.capabilities.canThink === undefined) {
                    errors.push(VALIDATION_ERROR_enum.FIELD_MISSING);
                }

                if (agent.capabilities.canUseTools === undefined) {
                    errors.push(VALIDATION_ERROR_enum.FIELD_MISSING);
                }

                if (agent.capabilities.canUseTools && 
                    (!Array.isArray(agent.capabilities.supportedToolTypes) || 
                     agent.capabilities.supportedToolTypes.length === 0)) {
                    errors.push(VALIDATION_ERROR_enum.FIELD_CONSTRAINT_VIOLATION);
                }

                if (!agent.capabilities.maxConcurrentTasks || 
                    agent.capabilities.maxConcurrentTasks < 1) {
                    errors.push(VALIDATION_ERROR_enum.FIELD_CONSTRAINT_VIOLATION);
                }

                if (agent.capabilities.memoryCapacity !== undefined && 
                    agent.capabilities.memoryCapacity < 0) {
                    errors.push(VALIDATION_ERROR_enum.VALUE_OUT_OF_RANGE);
                }

                return createValidationResult({
                    isValid: errors.length === 0,
                    errors,
                    warnings
                });
            }
        });

        // State validation rule
        this.registerValidationRule({
            id: 'execution-state',
            priority: 80,
            validate: async (agent: IBaseAgent): Promise<IValidationResult> => {
                const errors: VALIDATION_ERROR_enum[] = [];

                if (!agent.executionState) {
                    errors.push(VALIDATION_ERROR_enum.FIELD_MISSING);
                    return createValidationResult({ isValid: false, errors });
                }

                const stateValidation = await this.validateExecutionState(agent.executionState);
                return stateValidation;
            }
        });

        // Tool configuration rule
        this.registerValidationRule({
            id: 'tool-config',
            priority: 70,
            validate: async (agent: IBaseAgent): Promise<IValidationResult> => {
                const errors: VALIDATION_ERROR_enum[] = [];
                const warnings: VALIDATION_WARNING_enum[] = [];

                if (agent.capabilities?.canUseTools && 
                    (!Array.isArray(agent.tools) || agent.tools.length === 0)) {
                    warnings.push(VALIDATION_WARNING_enum.OPTIONAL_FIELD_MISSING);
                }

                if (agent.tools) {
                    const toolManager = await this.getDomainManager<IToolManager>('ToolManager');
                    const validations = await Promise.all(
                        agent.tools.map(tool => toolManager.validateToolConfig(tool))
                    );

                    if (validations.some(result => !result.success)) {
                        errors.push(VALIDATION_ERROR_enum.INVALID_CONFIG);
                    }
                }

                return createValidationResult({
                    isValid: errors.length === 0,
                    errors,
                    warnings
                });
            }
        });
    }
}

export default AgentValidator.getInstance();