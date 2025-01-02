/**
 * @file usageMetrics.ts
 * @path KaibanJS\src\types\metrics\base\usageMetrics.ts
 * @description Usage metrics type definitions and validation for system usage tracking
 * 
 * @module @types/metrics/base
 */

import { 
    type IValidationResult,
    createValidationResult 
} from '../../common/validationTypes';
import { type IBaseMetrics } from './baseMetrics';

/**
 * Rate limit tracking
 */
export interface IRateLimitMetrics {
    readonly current: number;
    readonly limit: number;
    readonly remaining: number;
    readonly resetTime: number;
}

/**
 * Comprehensive usage metrics for system monitoring
 */
export interface IUsageMetrics extends IBaseMetrics {
    // Core usage metrics
    readonly totalRequests: number;
    readonly activeUsers: number;
    readonly requestsPerSecond: number;
    readonly averageResponseSize: number;
    readonly peakMemoryUsage: number;
    readonly uptime: number;
    readonly rateLimit: IRateLimitMetrics;
    readonly timestamp: number;

    // LLM-specific usage metrics
    readonly llmMetrics?: {
        readonly totalTokens: number;
        readonly promptTokens: number;
        readonly completionTokens: number;
        readonly modelCalls: number;
        readonly costPerModel: Record<string, number>;
        readonly tokenUtilization: number;
    };

    // Message-specific usage metrics
    readonly messageMetrics?: {
        readonly totalMessages: number;
        readonly activeChannels: number;
        readonly messageVolume: number;
        readonly deliverySuccess: number;
        readonly routingEfficiency: number;
        readonly queueUtilization: number;
    };

    // Agent-specific usage metrics
    readonly agentMetrics?: {
        readonly totalAgents: number;
        readonly activeAgents: number;
        readonly toolCalls: number;
        readonly memoryUtilization: number;
        readonly learningProgress: number;
        readonly cognitiveLoad: number;
    };

    // Task-specific usage metrics
    readonly taskMetrics?: {
        readonly totalTasks: number;
        readonly activeTasks: number;
        readonly completedTasks: number;
        readonly taskSuccess: number;
        readonly taskEfficiency: number;
        readonly poolUtilization: number;
    };

    // Team-specific usage metrics
    readonly teamMetrics?: {
        readonly totalTeams: number;
        readonly activeTeams: number;
        readonly teamSize: number;
        readonly collaborationRate: number;
        readonly teamEfficiency: number;
        readonly resourceUtilization: number;
    };

    // Workflow-specific usage metrics
    readonly workflowMetrics?: {
        readonly totalWorkflows: number;
        readonly activeWorkflows: number;
        readonly completedSteps: number;
        readonly stateTransitions: number;
        readonly workflowEfficiency: number;
        readonly resourceUtilization: number;
    };
}

export const UsageMetricsTypeGuards = {
    isRateLimitMetrics(value: unknown): value is IRateLimitMetrics {
        if (!value || typeof value !== 'object') return false;
        const m = value as Partial<IRateLimitMetrics>;
        return !!(
            typeof m?.current === 'number' &&
            typeof m?.limit === 'number' &&
            typeof m?.remaining === 'number' &&
            typeof m?.resetTime === 'number'
        );
    },

    isModelCostRecord(value: unknown): value is Record<string, number> {
        if (!value || typeof value !== 'object') return false;
        return Object.entries(value).every(([key, val]) => 
            typeof key === 'string' && typeof val === 'number'
        );
    },

    isLLMMetrics(value: unknown): value is NonNullable<IUsageMetrics['llmMetrics']> {
        if (!value || typeof value !== 'object') return false;
        const m = value as Partial<IUsageMetrics['llmMetrics']>;
        return !!(
            typeof m?.totalTokens === 'number' &&
            typeof m?.promptTokens === 'number' &&
            typeof m?.completionTokens === 'number' &&
            typeof m?.modelCalls === 'number' &&
            typeof m?.tokenUtilization === 'number' &&
            this.isModelCostRecord(m?.costPerModel)
        );
    },

    isMessageMetrics(value: unknown): value is NonNullable<IUsageMetrics['messageMetrics']> {
        if (!value || typeof value !== 'object') return false;
        const m = value as Partial<IUsageMetrics['messageMetrics']>;
        return !!(
            typeof m?.totalMessages === 'number' &&
            typeof m?.activeChannels === 'number' &&
            typeof m?.messageVolume === 'number' &&
            typeof m?.deliverySuccess === 'number' &&
            typeof m?.routingEfficiency === 'number' &&
            typeof m?.queueUtilization === 'number'
        );
    },

    isAgentMetrics(value: unknown): value is NonNullable<IUsageMetrics['agentMetrics']> {
        if (!value || typeof value !== 'object') return false;
        const m = value as Partial<IUsageMetrics['agentMetrics']>;
        return !!(
            typeof m?.totalAgents === 'number' &&
            typeof m?.activeAgents === 'number' &&
            typeof m?.toolCalls === 'number' &&
            typeof m?.memoryUtilization === 'number' &&
            typeof m?.learningProgress === 'number' &&
            typeof m?.cognitiveLoad === 'number'
        );
    },

    isTaskMetrics(value: unknown): value is NonNullable<IUsageMetrics['taskMetrics']> {
        if (!value || typeof value !== 'object') return false;
        const m = value as Partial<IUsageMetrics['taskMetrics']>;
        return !!(
            typeof m?.totalTasks === 'number' &&
            typeof m?.activeTasks === 'number' &&
            typeof m?.completedTasks === 'number' &&
            typeof m?.taskSuccess === 'number' &&
            typeof m?.taskEfficiency === 'number' &&
            typeof m?.poolUtilization === 'number'
        );
    },

    isTeamMetrics(value: unknown): value is NonNullable<IUsageMetrics['teamMetrics']> {
        if (!value || typeof value !== 'object') return false;
        const m = value as Partial<IUsageMetrics['teamMetrics']>;
        return !!(
            typeof m?.totalTeams === 'number' &&
            typeof m?.activeTeams === 'number' &&
            typeof m?.teamSize === 'number' &&
            typeof m?.collaborationRate === 'number' &&
            typeof m?.teamEfficiency === 'number' &&
            typeof m?.resourceUtilization === 'number'
        );
    },

    isWorkflowMetrics(value: unknown): value is NonNullable<IUsageMetrics['workflowMetrics']> {
        if (!value || typeof value !== 'object') return false;
        const m = value as Partial<IUsageMetrics['workflowMetrics']>;
        return !!(
            typeof m?.totalWorkflows === 'number' &&
            typeof m?.activeWorkflows === 'number' &&
            typeof m?.completedSteps === 'number' &&
            typeof m?.stateTransitions === 'number' &&
            typeof m?.workflowEfficiency === 'number' &&
            typeof m?.resourceUtilization === 'number'
        );
    },

    isUsageMetrics(value: unknown): value is IUsageMetrics {
        if (!value || typeof value !== 'object') return false;
        const m = value as Partial<IUsageMetrics>;

        // Check core metrics
        if (
            typeof m?.totalRequests !== 'number' ||
            typeof m?.activeUsers !== 'number' ||
            typeof m?.requestsPerSecond !== 'number' ||
            typeof m?.averageResponseSize !== 'number' ||
            typeof m?.peakMemoryUsage !== 'number' ||
            typeof m?.uptime !== 'number' ||
            !m?.rateLimit ||
            !this.isRateLimitMetrics(m.rateLimit) ||
            typeof m?.timestamp !== 'number'
        ) {
            return false;
        }

        // Check domain-specific metrics if present
        if (m.llmMetrics !== undefined && !this.isLLMMetrics(m.llmMetrics)) return false;
        if (m.messageMetrics !== undefined && !this.isMessageMetrics(m.messageMetrics)) return false;
        if (m.agentMetrics !== undefined && !this.isAgentMetrics(m.agentMetrics)) return false;
        if (m.taskMetrics !== undefined && !this.isTaskMetrics(m.taskMetrics)) return false;
        if (m.teamMetrics !== undefined && !this.isTeamMetrics(m.teamMetrics)) return false;
        if (m.workflowMetrics !== undefined && !this.isWorkflowMetrics(m.workflowMetrics)) return false;

        return true;
    }
};

export const UsageMetricsValidation = {
    validateRateLimitMetrics(metrics: unknown): IValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!UsageMetricsTypeGuards.isRateLimitMetrics(metrics)) {
            return createValidationResult({
                isValid: false,
                errors: ['Invalid rate limit metrics structure']
            });
        }

        if (metrics.current < 0) {
            errors.push('Current rate limit usage cannot be negative');
        }

        if (metrics.limit < 0) {
            errors.push('Rate limit cannot be negative');
        }

        if (metrics.remaining < 0) {
            errors.push('Remaining rate limit cannot be negative');
        }

        if (metrics.current > metrics.limit) {
            errors.push('Current rate limit usage cannot exceed total limit');
        }

        if (metrics.remaining > metrics.limit) {
            errors.push('Remaining rate limit cannot exceed total limit');
        }

        if (metrics.current + metrics.remaining !== metrics.limit) {
            warnings.push('Current usage plus remaining should equal total limit');
        }

        if (metrics.resetTime < Date.now()) {
            warnings.push('Rate limit reset time is in the past');
        }

        return createValidationResult({
            isValid: errors.length === 0,
            errors,
            warnings
        });
    },

    validateUsageMetrics(metrics: unknown): IValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!UsageMetricsTypeGuards.isUsageMetrics(metrics)) {
            return createValidationResult({
                isValid: false,
                errors: ['Invalid usage metrics structure']
            });
        }

        // Validate core metrics
        const m = metrics as IUsageMetrics;
        if (m.totalRequests < 0) errors.push('Total requests cannot be negative');
        if (m.activeUsers < 0) errors.push('Active users cannot be negative');
        if (m.requestsPerSecond < 0) errors.push('Requests per second cannot be negative');
        if (m.averageResponseSize < 0) errors.push('Average response size cannot be negative');
        if (m.peakMemoryUsage < 0) errors.push('Peak memory usage cannot be negative');
        if (m.uptime < 0) errors.push('Uptime cannot be negative');

        // Validate rate limit metrics
        const rateLimitResult = this.validateRateLimitMetrics(m.rateLimit);
        errors.push(...rateLimitResult.errors);
        warnings.push(...rateLimitResult.warnings);

        // Validate domain-specific metrics if present
        if (m.llmMetrics && UsageMetricsTypeGuards.isLLMMetrics(m.llmMetrics)) {
            const llm = m.llmMetrics;
            if (llm.totalTokens < 0) errors.push('Total tokens cannot be negative');
            if (llm.promptTokens < 0) errors.push('Prompt tokens cannot be negative');
            if (llm.completionTokens < 0) errors.push('Completion tokens cannot be negative');
            if (llm.modelCalls < 0) errors.push('Model calls cannot be negative');
            if (llm.tokenUtilization < 0 || llm.tokenUtilization > 1) {
                errors.push('Token utilization must be between 0 and 1');
            }
            if (Object.values(llm.costPerModel).some(cost => cost < 0)) {
                errors.push('Model costs cannot be negative');
            }
        } else if (m.llmMetrics) {
            errors.push('Invalid LLM metrics structure');
        }

        if (m.messageMetrics && UsageMetricsTypeGuards.isMessageMetrics(m.messageMetrics)) {
            const msg = m.messageMetrics;
            if (msg.totalMessages < 0) errors.push('Total messages cannot be negative');
            if (msg.activeChannels < 0) errors.push('Active channels cannot be negative');
            if (msg.messageVolume < 0) errors.push('Message volume cannot be negative');
            if (msg.deliverySuccess < 0 || msg.deliverySuccess > 1) {
                errors.push('Delivery success must be between 0 and 1');
            }
            if (msg.routingEfficiency < 0 || msg.routingEfficiency > 1) {
                errors.push('Routing efficiency must be between 0 and 1');
            }
            if (msg.queueUtilization < 0 || msg.queueUtilization > 1) {
                errors.push('Queue utilization must be between 0 and 1');
            }
        } else if (m.messageMetrics) {
            errors.push('Invalid message metrics structure');
        }

        if (m.agentMetrics && UsageMetricsTypeGuards.isAgentMetrics(m.agentMetrics)) {
            const agent = m.agentMetrics;
            if (agent.totalAgents < 0) errors.push('Total agents cannot be negative');
            if (agent.activeAgents < 0) errors.push('Active agents cannot be negative');
            if (agent.toolCalls < 0) errors.push('Tool calls cannot be negative');
            if (agent.memoryUtilization < 0 || agent.memoryUtilization > 1) {
                errors.push('Memory utilization must be between 0 and 1');
            }
            if (agent.learningProgress < 0 || agent.learningProgress > 1) {
                errors.push('Learning progress must be between 0 and 1');
            }
            if (agent.cognitiveLoad < 0 || agent.cognitiveLoad > 1) {
                errors.push('Cognitive load must be between 0 and 1');
            }
        } else if (m.agentMetrics) {
            errors.push('Invalid agent metrics structure');
        }

        if (m.taskMetrics && UsageMetricsTypeGuards.isTaskMetrics(m.taskMetrics)) {
            const task = m.taskMetrics;
            if (task.totalTasks < 0) errors.push('Total tasks cannot be negative');
            if (task.activeTasks < 0) errors.push('Active tasks cannot be negative');
            if (task.completedTasks < 0) errors.push('Completed tasks cannot be negative');
            if (task.taskSuccess < 0 || task.taskSuccess > 1) {
                errors.push('Task success must be between 0 and 1');
            }
            if (task.taskEfficiency < 0 || task.taskEfficiency > 1) {
                errors.push('Task efficiency must be between 0 and 1');
            }
            if (task.poolUtilization < 0 || task.poolUtilization > 1) {
                errors.push('Pool utilization must be between 0 and 1');
            }
        } else if (m.taskMetrics) {
            errors.push('Invalid task metrics structure');
        }

        if (m.teamMetrics && UsageMetricsTypeGuards.isTeamMetrics(m.teamMetrics)) {
            const team = m.teamMetrics;
            if (team.totalTeams < 0) errors.push('Total teams cannot be negative');
            if (team.activeTeams < 0) errors.push('Active teams cannot be negative');
            if (team.teamSize < 0) errors.push('Team size cannot be negative');
            if (team.collaborationRate < 0 || team.collaborationRate > 1) {
                errors.push('Collaboration rate must be between 0 and 1');
            }
            if (team.teamEfficiency < 0 || team.teamEfficiency > 1) {
                errors.push('Team efficiency must be between 0 and 1');
            }
            if (team.resourceUtilization < 0 || team.resourceUtilization > 1) {
                errors.push('Resource utilization must be between 0 and 1');
            }
        } else if (m.teamMetrics) {
            errors.push('Invalid team metrics structure');
        }

        if (m.workflowMetrics && UsageMetricsTypeGuards.isWorkflowMetrics(m.workflowMetrics)) {
            const workflow = m.workflowMetrics;
            if (workflow.totalWorkflows < 0) errors.push('Total workflows cannot be negative');
            if (workflow.activeWorkflows < 0) errors.push('Active workflows cannot be negative');
            if (workflow.completedSteps < 0) errors.push('Completed steps cannot be negative');
            if (workflow.stateTransitions < 0) errors.push('State transitions cannot be negative');
            if (workflow.workflowEfficiency < 0 || workflow.workflowEfficiency > 1) {
                errors.push('Workflow efficiency must be between 0 and 1');
            }
            if (workflow.resourceUtilization < 0 || workflow.resourceUtilization > 1) {
                errors.push('Resource utilization must be between 0 and 1');
            }
        } else if (m.workflowMetrics) {
            errors.push('Invalid workflow metrics structure');
        }

        if (metrics.timestamp > Date.now()) {
            warnings.push('Timestamp is in the future');
        }

        return createValidationResult({
            isValid: errors.length === 0,
            errors,
            warnings
        });
    }
};
