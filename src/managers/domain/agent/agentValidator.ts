/**
 * @file agentValidator.ts
 * @path src/managers/domain/agent/agentValidator.ts
 * @description Enhanced agent validation with rule inheritance and Zod/Langchain integration
 */

import { z } from 'zod';
import { CoreManager } from '../../core/coreManager';
import { createValidationResult } from '../../../utils/validation/validationUtils';
import { createError, AGENT_STATUS_enum, VALIDATION_ERROR_enum, VALIDATION_WARNING_enum } from '../../../types/common';
import { AgentValidationSchema } from '../../../types/agent/agentValidationTypes';
import type { IBaseAgent } from '../../../types/agent/agentBaseTypes';
import type { IAgentExecutionState } from '../../../types/agent/agentStateTypes';
import type { IValidationResult } from '../../../types/common';
import { MetricDomain, MetricType } from '../../../types/metrics/base/metricsManagerTypes';
import { AgentTypeGuards } from '../../../types/agent/agentTypeGuards';

interface ValidationRule {
    id: string;
    parentId?: string;
    validate: (agent: IBaseAgent, context?: ValidationContext) => Promise<IValidationResult>;
    priority: number;
}

interface ValidationContext {
    environment?: Record<string, unknown>;
    runtime?: Record<string, unknown>;
    capabilities?: string[];
    tools?: string[];
}

interface ValidationCache {
    result: IValidationResult;
    timestamp: number;
    context: ValidationContext;
    hash: string;
}

export class AgentValidator extends CoreManager {
    protected static _instance: AgentValidator;
    private validationRules: Map<string, ValidationRule>;
    private validationCache: Map<string, ValidationCache>;
    private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    protected constructor() {
        super();
        this.registerDomainManager('AgentValidator', this);
        this.validationRules = new Map();
        this.validationCache = new Map();
        this.initializeBaseRules();
    }

    public static getInstance(): AgentValidator {
        if (!AgentValidator._instance) {
            AgentValidator._instance = new AgentValidator();
        }
        return AgentValidator._instance;
    }

    public get category(): string {
        return 'agent';
    }

    /**
     * Registers a validation rule with inheritance support
     */
    public registerValidationRule(rule: ValidationRule): void {
        try {
            if (rule.parentId) {
                const parentRule = this.validationRules.get(rule.parentId);
                if (!parentRule) {
                    throw new Error(`Parent rule '${rule.parentId}' not found`);
                }
            }
            this.validationRules.set(rule.id, rule);
            this.clearCacheForRule(rule.id);
        } catch (error) {
            this.logError(`Failed to register validation rule: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Enhanced agent validation with context awareness and caching
     */
    public async validateAgent(
        agent: IBaseAgent,
        context?: ValidationContext
    ): Promise<IValidationResult> {
        const startTime = Date.now();
        const validationKey = this.generateValidationKey(agent, context);

        try {
            // Check cache first
            const cachedResult = this.getCachedValidation(validationKey, context);
            if (cachedResult) {
                return cachedResult;
            }

            // Validate base agent properties first
            if (!AgentTypeGuards.isBaseAgent(agent)) {
                return this.cacheAndReturnResult(validationKey, createValidationResult(false, ['Invalid base agent properties']), context);
            }

            // Validate against schema
            const zodResult = await this.validateAgainstZodSchema(agent);
            if (!zodResult.isValid) {
                return this.cacheAndReturnResult(validationKey, zodResult, context);
            }

            // Get inherited validation rules
            const rules = this.getInheritedRules(agent);

            // Apply context-aware validation rules
            const results = await Promise.all(
                rules.map(rule => rule.validate(agent, context))
            );

            // Combine results
            const combinedResult = this.mergeValidationResults(results);

            // Add execution state validation if needed
            if (agent.executionState) {
                const stateValidation = await this.validateExecutionState(agent.executionState);
                this.mergeValidationResults([combinedResult, stateValidation]);
            }

            // Track metrics
            await this.trackValidationMetrics(startTime, combinedResult);

            return this.cacheAndReturnResult(validationKey, combinedResult, context);
        } catch (error) {
            const errorResult = createValidationResult(false, [
                `Validation error: ${error instanceof Error ? error.message : String(error)}`
            ]);
            return this.cacheAndReturnResult(validationKey, errorResult, context);
        }
    }

    /**
     * Validates an agent against the schema
     */
    private async validateAgainstZodSchema(agent: IBaseAgent): Promise<IValidationResult> {
        try {
            AgentValidationSchema.parse(agent);
            return createValidationResult(true);
        } catch (error) {
            if (error instanceof z.ZodError) {
                const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
                return createValidationResult(false, errors);
            }
            return createValidationResult(false, ['Invalid agent schema']);
        }
    }

    private async validateExecutionState(state: IAgentExecutionState): Promise<IValidationResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Validate assignment state
        if (!Array.isArray(state.assignment.assignedTasks)) {
            errors.push('assignedTasks must be an array');
        }
        if (!Array.isArray(state.assignment.completedTasks)) {
            errors.push('completedTasks must be an array');
        }
        if (!Array.isArray(state.assignment.failedTasks)) {
            errors.push('failedTasks must be an array');
        }
        if (!Array.isArray(state.assignment.blockedTasks)) {
            errors.push('blockedTasks must be an array');
        }

        // Validate error state
        if (typeof state.error.errorCount !== 'number' || state.error.errorCount < 0) {
            errors.push('errorCount must be a non-negative number');
        }
        if (typeof state.error.retryCount !== 'number' || state.error.retryCount < 0) {
            errors.push('retryCount must be a non-negative number');
        }
        if (state.error.retryCount > state.error.maxRetries) {
            errors.push('retryCount cannot exceed maxRetries');
        }

        // Validate timing state
        if (state.timing.startTime && !(state.timing.startTime instanceof Date)) {
            errors.push('startTime must be a Date object');
        }
        if (state.timing.endTime && !(state.timing.endTime instanceof Date)) {
            errors.push('endTime must be a Date object');
        }

        // Validate core state
        if (!Object.values(AGENT_STATUS_enum).includes(state.core.status as AGENT_STATUS_enum)) {
            errors.push('Invalid agent status');
        }
        if (typeof state.core.thinking !== 'boolean') {
            errors.push('thinking must be a boolean');
        }
        if (typeof state.core.busy !== 'boolean') {
            errors.push('busy must be a boolean');
        }

        return createValidationResult(errors.length === 0, errors, warnings);
    }

    private getInheritedRules(agent: IBaseAgent): ValidationRule[] {
        const rules: ValidationRule[] = [];
        const addedRules = new Set<string>();

        const addRule = (ruleId: string) => {
            if (addedRules.has(ruleId)) return;
            const rule = this.validationRules.get(ruleId);
            if (!rule) return;

            if (rule.parentId) {
                addRule(rule.parentId);
            }
            rules.push(rule);
            addedRules.add(ruleId);
        };

        // Add rules based on agent capabilities
        if (agent.capabilities) {
            if (agent.capabilities.canThink) addRule('thinkingCapabilityRule');
            if (agent.capabilities.canUseTools) addRule('toolUsageRule');
            if (agent.capabilities.canLearn) addRule('learningCapabilityRule');
        }

        return rules.sort((a, b) => a.priority - b.priority);
    }

    private generateValidationKey(agent: IBaseAgent, context?: ValidationContext): string {
        const agentKey = `${agent.id}_${agent.version}`;
        const contextKey = context ? JSON.stringify(context) : '';
        return `${agentKey}_${contextKey}`;
    }

    private getCachedValidation(key: string, context?: ValidationContext): IValidationResult | null {
        const cached = this.validationCache.get(key);
        if (!cached) return null;

        const isExpired = Date.now() - cached.timestamp > this.CACHE_TTL;
        const contextChanged = context && JSON.stringify(context) !== JSON.stringify(cached.context);

        if (isExpired || contextChanged) {
            this.validationCache.delete(key);
            return null;
        }

        return cached.result;
    }

    private cacheAndReturnResult(
        key: string,
        result: IValidationResult,
        context?: ValidationContext
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

    private async trackValidationMetrics(startTime: number, result: IValidationResult): Promise<void> {
        const duration = Date.now() - startTime;
        const metricsManager = this.getMetricsManager();

        // Track validation duration
        await metricsManager.trackMetric({
            timestamp: Date.now(),
            domain: MetricDomain.AGENT,
            type: MetricType.PERFORMANCE,
            value: duration,
            metadata: {
                metric: 'validation_duration',
                component: 'AgentValidator'
            }
        });

        // Track validation success
        await metricsManager.trackMetric({
            timestamp: Date.now(),
            domain: MetricDomain.AGENT,
            type: MetricType.PERFORMANCE,
            value: result.isValid ? 1 : 0,
            metadata: {
                metric: 'validation_success',
                component: 'AgentValidator'
            }
        });

        // Track validation errors if any
        if (!result.isValid && result.errors) {
            await metricsManager.trackMetric({
                timestamp: Date.now(),
                domain: MetricDomain.AGENT,
                type: MetricType.PERFORMANCE,
                value: result.errors.length,
                metadata: {
                    metric: 'validation_errors',
                    component: 'AgentValidator'
                }
            });
        }
    }

    private mergeValidationResults(results: IValidationResult[]): IValidationResult {
        return results.reduce((combined, current) => ({
            isValid: combined.isValid && current.isValid,
            errors: [...(combined.errors || []), ...(current.errors || [])],
            warnings: [...(combined.warnings || []), ...(current.warnings || [])]
        }), { isValid: true, errors: [], warnings: [] });
    }

    private initializeBaseRules(): void {
        // Register base validation rules
        this.registerValidationRule({
            id: 'baseAgentRule',
            priority: 0,
            validate: async (agent) => {
                const errors: string[] = [];
                if (!agent.id) errors.push('Agent ID is required');
                if (!agent.name) errors.push('Agent name is required');
                if (!agent.role) errors.push('Agent role is required');
                return createValidationResult(errors.length === 0, errors);
            }
        });

        // Register capability-specific rules
        this.registerValidationRule({
            id: 'thinkingCapabilityRule',
            parentId: 'baseAgentRule',
            priority: 1,
            validate: async (agent) => {
                const errors: string[] = [];
                if (!agent.capabilities?.canThink) {
                    errors.push('Agent must have thinking capability enabled');
                }
                return createValidationResult(errors.length === 0, errors);
            }
        });

        this.registerValidationRule({
            id: 'toolUsageRule',
            parentId: 'baseAgentRule',
            priority: 1,
            validate: async (agent) => {
                const errors: string[] = [];
                if (!agent.capabilities?.canUseTools) {
                    errors.push('Agent must have tool usage capability enabled');
                }
                if (!Array.isArray(agent.capabilities?.supportedToolTypes)) {
                    errors.push('Agent must define supported tool types');
                }
                return createValidationResult(errors.length === 0, errors);
            }
        });
    }

    public cleanup(): void {
        this.validationCache.clear();
        this.validationRules.clear();
    }
}

export default AgentValidator.getInstance();
