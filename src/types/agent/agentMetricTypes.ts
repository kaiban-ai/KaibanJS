/**
 * @file agentMetricTypes.ts
 * @path KaibanJS/src/types/agent/agentMetricTypes.ts
 * @description Agent-specific metrics type definitions and validation
 * 
 * @module @types/agent
 */

import { createValidationResult } from '@utils/validation/validationUtils';
import type { IValidationResult } from '../common/commonValidationTypes';
import type { IResourceMetrics } from '../metrics/base/resourceMetrics';
import type { 
    IPerformanceMetrics,
    ITimeMetrics,
    IThroughputMetrics,
    IErrorMetrics 
} from '../metrics/base/performanceMetrics';
import type { IUsageMetrics } from '../metrics/base/usageMetrics';

/**
 * Agent-specific cognitive resource metrics
 */
export interface ICognitiveResourceMetrics {
    /** Memory allocation for cognitive processes (in bytes) */
    readonly memoryAllocation: number;
    /** Current cognitive load (0-1) */
    readonly cognitiveLoad: number;
    /** Available processing capacity (0-1) */
    readonly processingCapacity: number;
    /** Context window utilization (0-1) */
    readonly contextUtilization: number;
}

/**
 * Agent-specific thinking operation metrics
 */
export interface IThinkingOperationMetrics {
    /** Time spent in reasoning operations */
    readonly reasoningTime: ITimeMetrics;
    /** Time spent in planning operations */
    readonly planningTime: ITimeMetrics;
    /** Time spent in learning operations */
    readonly learningTime: ITimeMetrics;
    /** Decision confidence scores (0-1) */
    readonly decisionConfidence: number;
    /** Learning efficiency rate (0-1) */
    readonly learningEfficiency: number;
}

/**
 * Agent operation state metrics
 */
export interface IAgentStateMetrics {
    /** Current operational state */
    readonly currentState: string;
    /** Time spent in current state */
    readonly stateTime: number;
    /** State transition count */
    readonly transitionCount: number;
    /** Failed state transitions */
    readonly failedTransitions: number;
    /** Number of blocked tasks */
    readonly blockedTaskCount: number;
    /** Number of history entries */
    readonly historyEntryCount: number;
    /** Last history update timestamp */
    readonly lastHistoryUpdate: number;
}

/**
 * Agent-specific resource metrics extending base resource metrics
 */
export interface IAgentResourceMetrics extends IResourceMetrics {
    /** Cognitive resource utilization */
    readonly cognitive: ICognitiveResourceMetrics;
    /** CPU usage percentage */
    readonly cpuUsage: number;
    /** Memory usage in bytes */
    readonly memoryUsage: number;
    /** Disk I/O statistics */
    readonly diskIO: {
        readonly read: number;
        readonly write: number;
    };
    /** Network usage statistics */
    readonly networkUsage: {
        readonly upload: number;
        readonly download: number;
    };
    /** Timestamp of metrics collection */
    readonly timestamp: number;
}

/**
 * Agent-specific performance metrics extending base performance metrics
 */
export interface IAgentPerformanceMetrics extends IPerformanceMetrics {
    /** Thinking operation performance metrics */
    readonly thinking: IThinkingOperationMetrics;
    /** Task completion success rate (0-1) */
    readonly taskSuccessRate: number;
    /** Goal achievement rate (0-1) */
    readonly goalAchievementRate: number;
}

/**
 * Agent-specific usage metrics extending base usage metrics
 */
export interface IAgentUsageMetrics extends IUsageMetrics {
    /** Agent operational state metrics */
    readonly state: IAgentStateMetrics;
    /** Tool usage frequency */
    readonly toolUsageFrequency: Record<string, number>;
    /** Task completion count */
    readonly taskCompletionCount: number;
    /** Average task completion time */
    readonly averageTaskTime: number;
}

export const AgentMetricsTypeGuards = {
    isCognitiveResourceMetrics: (value: unknown): value is ICognitiveResourceMetrics => {
        if (typeof value !== 'object' || value === null) return false;
        const metrics = value as Partial<ICognitiveResourceMetrics>;

        return (
            typeof metrics.memoryAllocation === 'number' &&
            typeof metrics.cognitiveLoad === 'number' &&
            typeof metrics.processingCapacity === 'number' &&
            typeof metrics.contextUtilization === 'number'
        );
    },

    isThinkingOperationMetrics: (value: unknown): value is IThinkingOperationMetrics => {
        if (typeof value !== 'object' || value === null) return false;
        const metrics = value as Partial<IThinkingOperationMetrics>;

        return (
            typeof metrics.reasoningTime === 'object' &&
            typeof metrics.planningTime === 'object' &&
            typeof metrics.learningTime === 'object' &&
            typeof metrics.decisionConfidence === 'number' &&
            typeof metrics.learningEfficiency === 'number'
        );
    },

    isAgentStateMetrics: (value: unknown): value is IAgentStateMetrics => {
        if (typeof value !== 'object' || value === null) return false;
        const metrics = value as Partial<IAgentStateMetrics>;

        return (
            typeof metrics.currentState === 'string' &&
            typeof metrics.stateTime === 'number' &&
            typeof metrics.transitionCount === 'number' &&
            typeof metrics.failedTransitions === 'number' &&
            typeof metrics.blockedTaskCount === 'number' &&
            typeof metrics.historyEntryCount === 'number' &&
            typeof metrics.lastHistoryUpdate === 'number'
        );
    },

    isAgentResourceMetrics: (value: unknown): value is IAgentResourceMetrics => {
        if (typeof value !== 'object' || value === null) return false;
        const metrics = value as Partial<IAgentResourceMetrics>;

        return (
            AgentMetricsTypeGuards.isCognitiveResourceMetrics(metrics.cognitive) &&
            typeof metrics.cpuUsage === 'number' &&
            typeof metrics.memoryUsage === 'number' &&
            typeof metrics.diskIO === 'object' &&
            typeof metrics.diskIO?.read === 'number' &&
            typeof metrics.diskIO?.write === 'number' &&
            typeof metrics.networkUsage === 'object' &&
            typeof metrics.networkUsage?.upload === 'number' &&
            typeof metrics.networkUsage?.download === 'number' &&
            typeof metrics.timestamp === 'number'
        );
    },

    isAgentPerformanceMetrics: (value: unknown): value is IAgentPerformanceMetrics => {
        if (typeof value !== 'object' || value === null) return false;
        const metrics = value as Partial<IAgentPerformanceMetrics>;

        return (
            AgentMetricsTypeGuards.isThinkingOperationMetrics(metrics.thinking) &&
            typeof metrics.taskSuccessRate === 'number' &&
            typeof metrics.goalAchievementRate === 'number'
        );
    },

    isAgentUsageMetrics: (value: unknown): value is IAgentUsageMetrics => {
        if (typeof value !== 'object' || value === null) return false;
        const metrics = value as Partial<IAgentUsageMetrics>;

        return (
            AgentMetricsTypeGuards.isAgentStateMetrics(metrics.state) &&
            typeof metrics.toolUsageFrequency === 'object' &&
            typeof metrics.taskCompletionCount === 'number' &&
            typeof metrics.averageTaskTime === 'number'
        );
    }
};

export const AgentMetricsValidation = {
    validateCognitiveResourceMetrics(metrics: unknown): IValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!AgentMetricsTypeGuards.isCognitiveResourceMetrics(metrics)) {
            errors.push('Invalid cognitive resource metrics structure');
            return createValidationResult(false, errors);
        }

        if (metrics.memoryAllocation < 0) {
            errors.push('Memory allocation cannot be negative');
        }

        if (metrics.cognitiveLoad < 0 || metrics.cognitiveLoad > 1) {
            errors.push('Cognitive load must be between 0 and 1');
        }

        if (metrics.processingCapacity < 0 || metrics.processingCapacity > 1) {
            errors.push('Processing capacity must be between 0 and 1');
        }

        if (metrics.contextUtilization < 0 || metrics.contextUtilization > 1) {
            errors.push('Context utilization must be between 0 and 1');
        }

        return createValidationResult(errors.length === 0, errors, warnings);
    },

    validateThinkingOperationMetrics(metrics: unknown): IValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!AgentMetricsTypeGuards.isThinkingOperationMetrics(metrics)) {
            errors.push('Invalid thinking operation metrics structure');
            return createValidationResult(false, errors);
        }

        if (metrics.decisionConfidence < 0 || metrics.decisionConfidence > 1) {
            errors.push('Decision confidence must be between 0 and 1');
        }

        if (metrics.learningEfficiency < 0 || metrics.learningEfficiency > 1) {
            errors.push('Learning efficiency must be between 0 and 1');
        }

        return createValidationResult(errors.length === 0, errors, warnings);
    },

    validateAgentStateMetrics(metrics: unknown): IValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!AgentMetricsTypeGuards.isAgentStateMetrics(metrics)) {
            errors.push('Invalid agent state metrics structure');
            return createValidationResult(false, errors);
        }

        if (metrics.stateTime < 0) {
            errors.push('State time cannot be negative');
        }

        if (metrics.transitionCount < 0) {
            errors.push('Transition count cannot be negative');
        }

        if (metrics.failedTransitions < 0) {
            errors.push('Failed transitions cannot be negative');
        }

        if (metrics.failedTransitions > metrics.transitionCount) {
            errors.push('Failed transitions cannot exceed total transitions');
        }

        if (metrics.blockedTaskCount < 0) {
            errors.push('Blocked task count cannot be negative');
        }

        if (metrics.historyEntryCount < 0) {
            errors.push('History entry count cannot be negative');
        }

        if (metrics.lastHistoryUpdate > Date.now()) {
            warnings.push('Last history update timestamp is in the future');
        }

        return createValidationResult(errors.length === 0, errors, warnings);
    },

    validateAgentResourceMetrics(metrics: unknown): IValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!AgentMetricsTypeGuards.isAgentResourceMetrics(metrics)) {
            errors.push('Invalid agent resource metrics structure');
            return createValidationResult(false, errors);
        }

        const cognitiveResult = this.validateCognitiveResourceMetrics(metrics.cognitive);
        errors.push(...cognitiveResult.errors);
        warnings.push(...cognitiveResult.warnings);

        if (metrics.cpuUsage < 0 || metrics.cpuUsage > 100) {
            errors.push('CPU usage must be between 0 and 100');
        }

        if (metrics.memoryUsage < 0) {
            errors.push('Memory usage cannot be negative');
        }

        if (metrics.diskIO.read < 0 || metrics.diskIO.write < 0) {
            errors.push('Disk I/O values cannot be negative');
        }

        if (metrics.networkUsage.upload < 0 || metrics.networkUsage.download < 0) {
            errors.push('Network usage values cannot be negative');
        }

        if (metrics.timestamp > Date.now()) {
            warnings.push('Timestamp is in the future');
        }

        return createValidationResult(errors.length === 0, errors, warnings);
    },

    validateAgentPerformanceMetrics(metrics: unknown): IValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!AgentMetricsTypeGuards.isAgentPerformanceMetrics(metrics)) {
            errors.push('Invalid agent performance metrics structure');
            return createValidationResult(false, errors);
        }

        const thinkingResult = this.validateThinkingOperationMetrics(metrics.thinking);
        errors.push(...thinkingResult.errors);
        warnings.push(...thinkingResult.warnings);

        if (metrics.taskSuccessRate < 0 || metrics.taskSuccessRate > 1) {
            errors.push('Task success rate must be between 0 and 1');
        }

        if (metrics.goalAchievementRate < 0 || metrics.goalAchievementRate > 1) {
            errors.push('Goal achievement rate must be between 0 and 1');
        }

        return createValidationResult(errors.length === 0, errors, warnings);
    },

    validateAgentUsageMetrics(metrics: unknown): IValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!AgentMetricsTypeGuards.isAgentUsageMetrics(metrics)) {
            errors.push('Invalid agent usage metrics structure');
            return createValidationResult(false, errors);
        }

        const stateResult = this.validateAgentStateMetrics(metrics.state);
        errors.push(...stateResult.errors);
        warnings.push(...stateResult.warnings);

        if (metrics.taskCompletionCount < 0) {
            errors.push('Task completion count cannot be negative');
        }

        if (metrics.averageTaskTime < 0) {
            errors.push('Average task time cannot be negative');
        }

        Object.values(metrics.toolUsageFrequency).forEach((frequency) => {
            if (frequency < 0) {
                errors.push('Tool usage frequency cannot be negative');
            }
        });

        return createValidationResult(errors.length === 0, errors, warnings);
    }
};
