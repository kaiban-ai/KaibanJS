/**
 * @file metricValidation.ts
 * @description Validation utilities for metrics
 */

import { MetricDomain, MetricType } from '../../../../types/metrics/base/metricsManagerTypes';
import type { IMetricEvent } from '../../../../types/metrics/base/metricsManagerTypes';
import type { IMetricsCollectionOptions } from '../../../../types/metrics/base/baseMetrics';
import type { IValidationResult } from '../../../../types/common/validationTypes';
import type { IUsageMetrics, IRateLimitMetrics } from '../../../../types/metrics/base/usageMetrics';
import type { IErrorMetrics } from '../../../../types/metrics/base/errorMetrics';
import { UsageMetricsTypeGuards } from '../../../../types/metrics/base/usageMetrics';
import { ErrorMetricsTypeGuards } from '../../../../types/metrics/base/errorMetrics';
import { createValidationResult } from '../../../../types/common/validationTypes';

/**
 * Validate error metrics
 */
export function validateErrorMetrics(metrics: unknown): IValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!ErrorMetricsTypeGuards.isErrorMetrics(metrics)) {
        return createValidationResult(false, ['Invalid error metrics structure'], [], { validator: 'errorMetricsValidator' });
    }

    const m = metrics as IErrorMetrics;

    // Basic error tracking validation
    if (m.count < 0) errors.push('Error count cannot be negative');
    if (m.timestamp > Date.now()) warnings.push('Error timestamp is in the future');

    return createValidationResult(errors.length === 0, errors, warnings, { validator: 'errorMetricsValidator' });
}

/**
 * Validate rate limit metrics
 */
export function validateRateLimitMetrics(metrics: unknown): IValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!UsageMetricsTypeGuards.isRateLimitMetrics(metrics)) {
        return createValidationResult(false, ['Invalid rate limit metrics structure'], [], { validator: 'rateLimitValidator' });
    }

    const m = metrics as IRateLimitMetrics;

    if (m.current < 0) errors.push('Current rate limit usage cannot be negative');
    if (m.limit < 0) errors.push('Rate limit cannot be negative');
    if (m.remaining < 0) errors.push('Remaining rate limit cannot be negative');
    if (m.current > m.limit) errors.push('Current rate limit usage cannot exceed total limit');
    if (m.remaining > m.limit) errors.push('Remaining rate limit cannot exceed total limit');
    if (m.current + m.remaining !== m.limit) {
        warnings.push('Current usage plus remaining should equal total limit');
    }
    if (m.resetTime < Date.now()) warnings.push('Rate limit reset time is in the past');

    return createValidationResult(errors.length === 0, errors, warnings, { validator: 'rateLimitValidator' });
}

/**
 * Validate usage metrics
 */
export function validateUsageMetrics(metrics: unknown): IValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!UsageMetricsTypeGuards.isUsageMetrics(metrics)) {
        return createValidationResult(false, ['Invalid usage metrics structure'], [], { validator: 'usageMetricsValidator' });
    }

    const m = metrics as IUsageMetrics;

    // Core metrics validation
    if (m.totalRequests < 0) errors.push('Total requests cannot be negative');
    if (m.activeUsers < 0) errors.push('Active users cannot be negative');
    if (m.requestsPerSecond < 0) errors.push('Requests per second cannot be negative');
    if (m.averageResponseSize < 0) errors.push('Average response size cannot be negative');
    if (m.peakMemoryUsage < 0) errors.push('Peak memory usage cannot be negative');
    if (m.uptime < 0) errors.push('Uptime cannot be negative');

    // Rate limit validation
    const rateLimitResult = validateRateLimitMetrics(m.rateLimit);
    if (!rateLimitResult.isValid) {
        errors.push(...rateLimitResult.errors);
        warnings.push(...rateLimitResult.warnings);
    }

    // Domain-specific metrics validation
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

    if (m.timestamp > Date.now()) {
        warnings.push('Timestamp is in the future');
    }

    return createValidationResult(errors.length === 0, errors, warnings, { validator: 'usageMetricsValidator' });
}

/**
 * Validate metrics collection options
 */
export function validateCollectionOptions(options: unknown): IValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!options || typeof options !== 'object') {
        return createValidationResult(false, ['Invalid metrics collection options structure'], [], { validator: 'collectionOptionsValidator' });
    }

    const opts = options as IMetricsCollectionOptions;

    // Validate interval if provided
    if (opts.interval !== undefined) {
        if (typeof opts.interval !== 'number') {
            errors.push('Interval must be a number');
        } else if (opts.interval <= 0) {
            errors.push('Interval must be positive');
        } else if (opts.interval < 1000) {
            warnings.push('Interval less than 1 second may impact performance');
        }
    }

    // Validate detailed flag if provided
    if (opts.detailed !== undefined && typeof opts.detailed !== 'boolean') {
        errors.push('Detailed flag must be a boolean');
    }

    return createValidationResult(errors.length === 0, errors, warnings, { validator: 'collectionOptionsValidator' });
}

/**
 * Validate metric event
 */
export function validateMetricEvent(event: IMetricEvent): IValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!event || typeof event !== 'object') {
        errors.push('Invalid metric event structure');
        return createValidationResult(false, errors, warnings, { validator: 'metricEventValidator' });
    }

    if (!Object.values(MetricDomain).includes(event.domain)) {
        errors.push(`Invalid metric domain: ${event.domain}`);
    }

    if (!Object.values(MetricType).includes(event.type)) {
        errors.push(`Invalid metric type: ${event.type}`);
    }

    if (typeof event.value !== 'number' && typeof event.value !== 'string') {
        errors.push('Metric value must be number or string');
    }

    if (typeof event.timestamp !== 'number') {
        errors.push('Timestamp must be a number');
    }

    if (event.timestamp > Date.now()) {
        warnings.push('Timestamp is in the future');
    }

    if (typeof event.metadata !== 'object' || event.metadata === null) {
        errors.push('Metadata must be an object');
    }

    return createValidationResult(errors.length === 0, errors, warnings, { validator: 'metricEventValidator' });
}
