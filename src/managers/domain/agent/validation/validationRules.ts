/**
 * @file validationRules.ts
 * @path src/managers/domain/agent/validation/validationRules.ts
 * @description Agent validation rules system with inheritance and context awareness
 */

import { z } from 'zod';
import { LLM_PROVIDER_enum } from '../../../../types/common/commonEnums';
import { IAgentType } from '../../../../types/agent/agentBaseTypes';
import { IAgentValidationSchema } from '../../../../types/agent/agentValidationTypes';
import { IAgentExecutionState } from '../../../../types/agent/agentStateTypes';

/**
 * Base validation rule interface
 */
export interface IValidationRule {
    name: string;
    description: string;
    priority: number;
    validate: (agent: IAgentType, context?: ValidationContext) => Promise<ValidationRuleResult>;
    dependencies?: string[];
    schema?: z.ZodSchema;
}

/**
 * Validation context for context-aware validation
 */
export interface ValidationContext {
    currentState?: IAgentExecutionState;
    environmentVariables?: Record<string, unknown>;
    systemResources?: {
        availableMemory: number;
        cpuUsage: number;
        networkLatency: number;
    };
    teamContext?: {
        activeAgents: number;
        totalTasks: number;
        resourceUtilization: number;
    };
    timestamp: number;
}

/**
 * Validation rule result
 */
export interface ValidationRuleResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    metadata: {
        ruleName: string;
        executionTime: number;
        contextUsed: boolean;
        cacheable: boolean;
    };
}

/**
 * Base validation rules that all agents must satisfy
 */
export const BaseValidationRules: IValidationRule[] = [
    {
        name: 'core-fields',
        description: 'Validates core agent fields',
        priority: 100,
        schema: z.object({
            id: z.string().min(1),
            name: z.string().min(1),
            role: z.string().min(1),
            goal: z.string().min(1),
            version: z.string()
        }),
        async validate(agent: IAgentType): Promise<ValidationRuleResult> {
            const startTime = Date.now();
            const errors: string[] = [];
            const warnings: string[] = [];

            try {
                await this.schema!.parseAsync(agent);
            } catch (error) {
                if (error instanceof z.ZodError) {
                    errors.push(...error.errors.map(e => e.message));
                }
            }

            return {
                isValid: errors.length === 0,
                errors,
                warnings,
                metadata: {
                    ruleName: this.name,
                    executionTime: Date.now() - startTime,
                    contextUsed: false,
                    cacheable: true
                }
            };
        }
    },
    {
        name: 'capabilities',
        description: 'Validates agent capabilities',
        priority: 90,
        schema: z.object({
            capabilities: z.object({
                canThink: z.boolean(),
                canUseTools: z.boolean(),
                canLearn: z.boolean(),
                supportedToolTypes: z.array(z.string()),
                maxConcurrentTasks: z.number().min(1)
            })
        }),
        async validate(agent: IAgentType): Promise<ValidationRuleResult> {
            const startTime = Date.now();
            const errors: string[] = [];
            const warnings: string[] = [];

            try {
                await this.schema!.parseAsync(agent);
            } catch (error) {
                if (error instanceof z.ZodError) {
                    errors.push(...error.errors.map(e => e.message));
                }
            }

            return {
                isValid: errors.length === 0,
                errors,
                warnings,
                metadata: {
                    ruleName: this.name,
                    executionTime: Date.now() - startTime,
                    contextUsed: false,
                    cacheable: true
                }
            };
        }
    }
];

/**
 * Context-aware validation rules
 */
export const ContextAwareRules: IValidationRule[] = [
    {
        name: 'resource-availability',
        description: 'Validates agent resource requirements against system availability',
        priority: 80,
        async validate(agent: IAgentType, context?: ValidationContext): Promise<ValidationRuleResult> {
            const startTime = Date.now();
            const errors: string[] = [];
            const warnings: string[] = [];

            if (!context?.systemResources) {
                warnings.push('System resource context not available');
                return {
                    isValid: true,
                    errors,
                    warnings,
                    metadata: {
                        ruleName: this.name,
                        executionTime: Date.now() - startTime,
                        contextUsed: false,
                        cacheable: false
                    }
                };
            }

            const { availableMemory, cpuUsage, networkLatency } = context.systemResources;

            // Check memory requirements
            if (agent.capabilities.memoryCapacity > availableMemory) {
                errors.push(`Agent memory requirement (${agent.capabilities.memoryCapacity}) exceeds available memory (${availableMemory})`);
            }

            // Check CPU usage
            if (cpuUsage > 90) {
                warnings.push('System CPU usage is high, agent performance may be impacted');
            }

            // Check network conditions
            if (networkLatency > 1000) {
                warnings.push('High network latency detected, agent communication may be impacted');
            }

            return {
                isValid: errors.length === 0,
                errors,
                warnings,
                metadata: {
                    ruleName: this.name,
                    executionTime: Date.now() - startTime,
                    contextUsed: true,
                    cacheable: false
                }
            };
        }
    },
    {
        name: 'team-capacity',
        description: 'Validates agent against team capacity and workload',
        priority: 70,
        async validate(agent: IAgentType, context?: ValidationContext): Promise<ValidationRuleResult> {
            const startTime = Date.now();
            const errors: string[] = [];
            const warnings: string[] = [];

            if (!context?.teamContext) {
                warnings.push('Team context not available');
                return {
                    isValid: true,
                    errors,
                    warnings,
                    metadata: {
                        ruleName: this.name,
                        executionTime: Date.now() - startTime,
                        contextUsed: false,
                        cacheable: false
                    }
                };
            }

            const { activeAgents, totalTasks, resourceUtilization } = context.teamContext;

            // Check team capacity
            if (activeAgents >= 10) {
                errors.push('Maximum team size reached');
            }

            // Check workload distribution
            const tasksPerAgent = totalTasks / (activeAgents + 1);
            if (tasksPerAgent > agent.capabilities.maxConcurrentTasks) {
                warnings.push('High workload per agent detected');
            }

            // Check resource utilization
            if (resourceUtilization > 0.8) {
                warnings.push('Team resource utilization is high');
            }

            return {
                isValid: errors.length === 0,
                errors,
                warnings,
                metadata: {
                    ruleName: this.name,
                    executionTime: Date.now() - startTime,
                    contextUsed: true,
                    cacheable: false
                }
            };
        }
    }
];

/**
 * Cache for validation results
 */
export class ValidationCache {
    private static instance: ValidationCache;
    private cache: Map<string, {
        result: ValidationRuleResult;
        timestamp: number;
        ttl: number;
    }>;

    private constructor() {
        this.cache = new Map();
    }

    public static getInstance(): ValidationCache {
        if (!ValidationCache.instance) {
            ValidationCache.instance = new ValidationCache();
        }
        return ValidationCache.instance;
    }

    public get(key: string): ValidationRuleResult | undefined {
        const cached = this.cache.get(key);
        if (!cached) return undefined;

        if (Date.now() - cached.timestamp > cached.ttl) {
            this.cache.delete(key);
            return undefined;
        }

        return cached.result;
    }

    public set(key: string, result: ValidationRuleResult, ttl: number = 60000): void {
        this.cache.set(key, {
            result,
            timestamp: Date.now(),
            ttl
        });
    }

    public clear(): void {
        this.cache.clear();
    }

    public prune(): void {
        const now = Date.now();
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > value.ttl) {
                this.cache.delete(key);
            }
        }
    }
}

export const validationCache = ValidationCache.getInstance();
