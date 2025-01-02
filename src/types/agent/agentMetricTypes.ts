/**
 * @file agentMetricTypes.ts
 * @path KaibanJS/src/types/agent/agentMetricTypes.ts
 * @description Consolidated agent metrics type definitions and validation
 * 
 * @module @types/agent
 */

import { 
    createValidationResult,
    createValidationMetadata,
    type IValidationResult 
} from '../common/validationTypes';
import { VALIDATION_ERROR_enum, VALIDATION_WARNING_enum } from '../common/enumTypes';
import type { ITimeMetrics, IThroughputMetrics } from '../metrics/base/performanceMetrics';
import type { IUsageMetrics } from '../metrics/base/usageMetrics';
import type { ICostDetails } from '../workflow/workflowCostsTypes';
import type { IErrorMetrics } from '../metrics/base/errorMetrics';
import { UsageMetricsTypeGuards } from '../metrics/base/usageMetrics';

// ─── Base Metrics Interface ────────────────────────────────────────────────────

import { type IBaseMetrics } from '../metrics/base/baseMetrics';

/**
 * Base resource metrics interface
 */
export interface IBaseResourceMetrics extends IBaseMetrics {
    readonly usage: number;
    readonly limit: number;
    readonly available: number;
}

/**
 * Base performance metrics interface
 */
export interface IBasePerformanceMetrics extends IBaseMetrics {
    readonly duration: number;
    readonly success: boolean;
    readonly errorCount: number;
}

/**
 * Base usage metrics interface
 */
export interface IBaseUsageMetrics extends IBaseMetrics {
    readonly count: number;
    readonly rate: number;
    readonly total: number;
}

// ─── Agent Specific Metrics ────────────────────────────────────────────────────

/**
 * Agent metrics interface - Core metrics container
 */
export interface IAgentMetrics extends IBaseMetrics {
    readonly resources: IAgentResourceMetrics;
    readonly performance: IAgentPerformanceMetrics;
    readonly usage: IAgentUsageMetrics;
    readonly errors: IErrorMetrics;
    readonly warnings: string[];
    readonly info: string[];
}

/**
 * Agent-specific cognitive resource metrics
 */
export interface ICognitiveResourceMetrics extends IBaseResourceMetrics {
    readonly memoryAllocation: number;
    readonly cognitiveLoad: number;
    readonly processingCapacity: number;
    readonly contextUtilization: number;
}

/**
 * Agent-specific thinking operation metrics
 */
export interface IThinkingOperationMetrics extends IBasePerformanceMetrics {
    readonly reasoningTime: ITimeMetrics;
    readonly planningTime: ITimeMetrics;
    readonly learningTime: ITimeMetrics;
    readonly decisionConfidence: number;
    readonly learningEfficiency: number;
}

/**
 * Agent operation state metrics
 */
export interface IAgentStateMetrics extends IBaseMetrics {
    readonly currentState: string;
    readonly stateTime: number;
    readonly transitionCount: number;
    readonly failedTransitions: number;
    readonly blockedTaskCount: number;
    readonly historyEntryCount: number;
    readonly lastHistoryUpdate: number;
    readonly taskStats: {
        completedCount: number;
        failedCount: number;
        averageDuration: number;
        successRate: number;
        averageIterations: number;
    };
}

/**
 * Agent-specific resource metrics
 */
export interface IAgentResourceMetrics extends IBaseResourceMetrics {
    readonly cognitive: ICognitiveResourceMetrics;
    readonly cpuUsage: number;
    readonly memoryUsage: number;
    readonly diskIO: {
        readonly read: number;
        readonly write: number;
    };
    readonly networkUsage: {
        readonly upload: number;
        readonly download: number;
    };
}

/**
 * Agent-specific performance metrics
 */
export interface IAgentPerformanceMetrics extends IBasePerformanceMetrics {
    readonly thinking: IThinkingOperationMetrics;
    readonly taskSuccessRate: number;
    readonly goalAchievementRate: number;
    readonly responseTime: ITimeMetrics;
    readonly throughput: IThroughputMetrics;
}

/**
 * Agent-specific usage metrics
 */
export interface IAgentUsageMetrics extends IUsageMetrics {
    readonly state: IAgentStateMetrics;
    readonly toolUsageFrequency: Record<string, number>;
    readonly taskCompletionCount: number;
    readonly averageTaskTime: number;
    readonly costs: ICostDetails;
}

// ─── Type Guards ────────────────────────────────────────────────────────────

export const MetricsTypeGuards = {
    isBaseMetrics: (value: unknown): value is IBaseMetrics => {
        if (typeof value !== 'object' || value === null) return false;
        const metrics = value as Partial<IBaseMetrics>;
        return (
            typeof metrics.timestamp === 'number' &&
            typeof metrics.component === 'string' &&
            typeof metrics.category === 'string' &&
            typeof metrics.version === 'string'
        );
    },

    isBaseResourceMetrics: (value: unknown): value is IBaseResourceMetrics => {
        if (!MetricsTypeGuards.isBaseMetrics(value)) return false;
        const metrics = value as Partial<IBaseResourceMetrics>;
        return (
            typeof metrics.usage === 'number' &&
            typeof metrics.limit === 'number' &&
            typeof metrics.available === 'number'
        );
    },

    isBasePerformanceMetrics: (value: unknown): value is IBasePerformanceMetrics => {
        if (!MetricsTypeGuards.isBaseMetrics(value)) return false;
        const metrics = value as Partial<IBasePerformanceMetrics>;
        return (
            typeof metrics.duration === 'number' &&
            typeof metrics.success === 'boolean' &&
            typeof metrics.errorCount === 'number'
        );
    },

    isBaseUsageMetrics: (value: unknown): value is IBaseUsageMetrics => {
        if (!MetricsTypeGuards.isBaseMetrics(value)) return false;
        const metrics = value as Partial<IBaseUsageMetrics>;
        return (
            typeof metrics.count === 'number' &&
            typeof metrics.rate === 'number' &&
            typeof metrics.total === 'number'
        );
    },

    isAgentMetrics: (value: unknown): value is IAgentMetrics => {
        if (!MetricsTypeGuards.isBaseMetrics(value)) return false;
        const metrics = value as Partial<IAgentMetrics>;
        return (
            MetricsTypeGuards.isAgentResourceMetrics(metrics.resources) &&
            MetricsTypeGuards.isAgentPerformanceMetrics(metrics.performance) &&
            MetricsTypeGuards.isAgentUsageMetrics(metrics.usage)
        );
    },

    isCognitiveResourceMetrics: (value: unknown): value is ICognitiveResourceMetrics => {
        if (!MetricsTypeGuards.isBaseResourceMetrics(value)) return false;
        const metrics = value as Partial<ICognitiveResourceMetrics>;
        return (
            typeof metrics.memoryAllocation === 'number' &&
            typeof metrics.cognitiveLoad === 'number' &&
            typeof metrics.processingCapacity === 'number' &&
            typeof metrics.contextUtilization === 'number'
        );
    },

    isThinkingOperationMetrics: (value: unknown): value is IThinkingOperationMetrics => {
        if (!MetricsTypeGuards.isBasePerformanceMetrics(value)) return false;
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
        if (!MetricsTypeGuards.isBaseMetrics(value)) return false;
        const metrics = value as Partial<IAgentStateMetrics>;
        return (
            typeof metrics.currentState === 'string' &&
            typeof metrics.stateTime === 'number' &&
            typeof metrics.transitionCount === 'number' &&
            typeof metrics.failedTransitions === 'number' &&
            typeof metrics.blockedTaskCount === 'number' &&
            typeof metrics.historyEntryCount === 'number' &&
            typeof metrics.lastHistoryUpdate === 'number' &&
            typeof metrics.taskStats === 'object'
        );
    },

    isAgentResourceMetrics: (value: unknown): value is IAgentResourceMetrics => {
        if (!MetricsTypeGuards.isBaseResourceMetrics(value)) return false;
        const metrics = value as Partial<IAgentResourceMetrics>;
        return (
            MetricsTypeGuards.isCognitiveResourceMetrics(metrics.cognitive) &&
            typeof metrics.cpuUsage === 'number' &&
            typeof metrics.memoryUsage === 'number' &&
            typeof metrics.diskIO === 'object' &&
            typeof metrics.networkUsage === 'object'
        );
    },

    isAgentPerformanceMetrics: (value: unknown): value is IAgentPerformanceMetrics => {
        if (!MetricsTypeGuards.isBasePerformanceMetrics(value)) return false;
        const metrics = value as Partial<IAgentPerformanceMetrics>;
        return (
            MetricsTypeGuards.isThinkingOperationMetrics(metrics.thinking) &&
            typeof metrics.taskSuccessRate === 'number' &&
            typeof metrics.goalAchievementRate === 'number' &&
            typeof metrics.responseTime === 'object' &&
            typeof metrics.throughput === 'object'
        );
    },

    isAgentUsageMetrics: (value: unknown): value is IAgentUsageMetrics => {
        if (!UsageMetricsTypeGuards.isUsageMetrics(value)) return false;
        const metrics = value as Partial<IAgentUsageMetrics>;
        return (
            MetricsTypeGuards.isAgentStateMetrics(metrics.state) &&
            typeof metrics.toolUsageFrequency === 'object' &&
            typeof metrics.taskCompletionCount === 'number' &&
            typeof metrics.averageTaskTime === 'number' &&
            typeof metrics.costs === 'object'
        );
    }
};

// ─── Validation Functions ─────────────────────────────────────────────────────

/**
 * Unified validation utility for all metric types
 */
export const MetricsValidation = {
    validateAgentMetrics(metrics: unknown): IValidationResult {
        const errors: VALIDATION_ERROR_enum[] = [];
        const warnings: VALIDATION_WARNING_enum[] = [];

        const baseResult = this.validateBaseMetrics(metrics);
        if (!baseResult.isValid) {
            return baseResult;
        }

        if (!MetricsTypeGuards.isAgentMetrics(metrics)) {
            errors.push(VALIDATION_ERROR_enum.INVALID_INPUT);
            return createValidationResult({
                isValid: false,
                errors,
                warnings,
                metadata: createValidationMetadata({
                    component: 'MetricsValidation',
                    validatedFields: ['resources', 'performance', 'usage']
                })
            });
        }

        const agentMetrics = metrics as IAgentMetrics;

        const resourceResult = this.validateAgentResourceMetrics(agentMetrics.resources);
        const performanceResult = this.validateAgentPerformanceMetrics(agentMetrics.performance);
        const usageResult = this.validateAgentUsageMetrics(agentMetrics.usage);

        // Convert validation results to appropriate enum types
        resourceResult.errors.forEach(error => {
            if (error in VALIDATION_ERROR_enum) {
                errors.push(error as VALIDATION_ERROR_enum);
            }
        });
        performanceResult.errors.forEach(error => {
            if (error in VALIDATION_ERROR_enum) {
                errors.push(error as VALIDATION_ERROR_enum);
            }
        });
        usageResult.errors.forEach(error => {
            if (error in VALIDATION_ERROR_enum) {
                errors.push(error as VALIDATION_ERROR_enum);
            }
        });

        resourceResult.warnings?.forEach(warning => {
            if (warning in VALIDATION_WARNING_enum) {
                warnings.push(warning as VALIDATION_WARNING_enum);
            }
        });
        performanceResult.warnings?.forEach(warning => {
            if (warning in VALIDATION_WARNING_enum) {
                warnings.push(warning as VALIDATION_WARNING_enum);
            }
        });
        usageResult.warnings?.forEach(warning => {
            if (warning in VALIDATION_WARNING_enum) {
                warnings.push(warning as VALIDATION_WARNING_enum);
            }
        });

        return createValidationResult({
            isValid: errors.length === 0,
            errors,
            warnings,
            metadata: createValidationMetadata({
                component: 'MetricsValidation',
                validatedFields: ['resources', 'performance', 'usage']
            })
        });
    },

    validateAgentResourceMetrics(metrics: unknown): IValidationResult {
        const errors: VALIDATION_ERROR_enum[] = [];
        const warnings: VALIDATION_WARNING_enum[] = [];

        const baseResult = this.validateBaseResourceMetrics(metrics);
        if (!baseResult.isValid) {
            return baseResult;
        }

        if (!MetricsTypeGuards.isAgentResourceMetrics(metrics)) {
            errors.push(VALIDATION_ERROR_enum.INVALID_INPUT);
            return createValidationResult({
                isValid: false,
                errors,
                warnings,
                metadata: createValidationMetadata({
                    component: 'MetricsValidation',
                    validatedFields: ['cognitive', 'cpuUsage', 'memoryUsage', 'diskIO', 'networkUsage']
                })
            });
        }

        const resourceMetrics = metrics as IAgentResourceMetrics;

        const cognitiveResult = this.validateCognitiveResourceMetrics(resourceMetrics.cognitive);
        cognitiveResult.errors.forEach(error => {
            if (error in VALIDATION_ERROR_enum) {
                errors.push(error as VALIDATION_ERROR_enum);
            }
        });
        cognitiveResult.warnings?.forEach(warning => {
            if (warning in VALIDATION_WARNING_enum) {
                warnings.push(warning as VALIDATION_WARNING_enum);
            }
        });

        if (resourceMetrics.cpuUsage < 0 || resourceMetrics.cpuUsage > 100) {
            errors.push(VALIDATION_ERROR_enum.VALUE_OUT_OF_RANGE);
        }

        if (resourceMetrics.memoryUsage < 0) {
            errors.push(VALIDATION_ERROR_enum.VALUE_OUT_OF_RANGE);
        }

        if (resourceMetrics.diskIO.read < 0 || resourceMetrics.diskIO.write < 0) {
            errors.push(VALIDATION_ERROR_enum.VALUE_OUT_OF_RANGE);
        }

        if (resourceMetrics.networkUsage.upload < 0 || resourceMetrics.networkUsage.download < 0) {
            errors.push(VALIDATION_ERROR_enum.VALUE_OUT_OF_RANGE);
        }

        return createValidationResult({
            isValid: errors.length === 0,
            errors,
            warnings,
            metadata: createValidationMetadata({
                component: 'MetricsValidation',
                validatedFields: ['cognitive', 'cpuUsage', 'memoryUsage', 'diskIO', 'networkUsage']
            })
        });
    },

    validateAgentPerformanceMetrics(metrics: unknown): IValidationResult {
        const errors: VALIDATION_ERROR_enum[] = [];
        const warnings: VALIDATION_WARNING_enum[] = [];

        const baseResult = this.validateBasePerformanceMetrics(metrics);
        if (!baseResult.isValid) {
            return baseResult;
        }

        if (!MetricsTypeGuards.isAgentPerformanceMetrics(metrics)) {
            errors.push(VALIDATION_ERROR_enum.INVALID_INPUT);
            return createValidationResult({
                isValid: false,
                errors,
                warnings,
                metadata: createValidationMetadata({
                    component: 'MetricsValidation',
                    validatedFields: ['thinking', 'taskSuccessRate', 'goalAchievementRate']
                })
            });
        }

        const performanceMetrics = metrics as IAgentPerformanceMetrics;

        const thinkingResult = this.validateThinkingOperationMetrics(performanceMetrics.thinking);
        thinkingResult.errors.forEach(error => {
            if (error in VALIDATION_ERROR_enum) {
                errors.push(error as VALIDATION_ERROR_enum);
            }
        });
        thinkingResult.warnings?.forEach(warning => {
            if (warning in VALIDATION_WARNING_enum) {
                warnings.push(warning as VALIDATION_WARNING_enum);
            }
        });

        if (performanceMetrics.taskSuccessRate < 0 || performanceMetrics.taskSuccessRate > 1) {
            errors.push(VALIDATION_ERROR_enum.VALUE_OUT_OF_RANGE);
        }

        if (performanceMetrics.goalAchievementRate < 0 || performanceMetrics.goalAchievementRate > 1) {
            errors.push(VALIDATION_ERROR_enum.VALUE_OUT_OF_RANGE);
        }

        return createValidationResult({
            isValid: errors.length === 0,
            errors,
            warnings,
            metadata: createValidationMetadata({
                component: 'MetricsValidation',
                validatedFields: ['thinking', 'taskSuccessRate', 'goalAchievementRate']
            })
        });
    },

    validateAgentUsageMetrics(metrics: unknown): IValidationResult {
        const errors: VALIDATION_ERROR_enum[] = [];
        const warnings: VALIDATION_WARNING_enum[] = [];

        const baseResult = this.validateBaseUsageMetrics(metrics);
        if (!baseResult.isValid) {
            return baseResult;
        }

        if (!MetricsTypeGuards.isAgentUsageMetrics(metrics)) {
            errors.push(VALIDATION_ERROR_enum.INVALID_INPUT);
            return createValidationResult({
                isValid: false,
                errors,
                warnings,
                metadata: createValidationMetadata({
                    component: 'MetricsValidation',
                    validatedFields: ['state', 'toolUsageFrequency', 'taskCompletionCount', 'averageTaskTime', 'costs']
                })
            });
        }

        const usageMetrics = metrics as IAgentUsageMetrics;

        const stateResult = this.validateAgentStateMetrics(usageMetrics.state);
        stateResult.errors.forEach(error => {
            if (error in VALIDATION_ERROR_enum) {
                errors.push(error as VALIDATION_ERROR_enum);
            }
        });
        stateResult.warnings?.forEach(warning => {
            if (warning in VALIDATION_WARNING_enum) {
                warnings.push(warning as VALIDATION_WARNING_enum);
            }
        });

        if (usageMetrics.taskCompletionCount < 0) {
            errors.push(VALIDATION_ERROR_enum.VALUE_OUT_OF_RANGE);
        }

        if (usageMetrics.averageTaskTime < 0) {
            errors.push(VALIDATION_ERROR_enum.VALUE_OUT_OF_RANGE);
        }

        Object.values(usageMetrics.toolUsageFrequency).forEach((frequency) => {
            if (frequency < 0) {
                errors.push(VALIDATION_ERROR_enum.VALUE_OUT_OF_RANGE);
            }
        });

        // Validate costs using the validateCostDetails function
        const costsResult = this.validateCostDetails(usageMetrics.costs);
        costsResult.errors.forEach(error => {
            if (error in VALIDATION_ERROR_enum) {
                errors.push(error as VALIDATION_ERROR_enum);
            }
        });
        costsResult.warnings?.forEach(warning => {
            if (warning in VALIDATION_WARNING_enum) {
                warnings.push(warning as VALIDATION_WARNING_enum);
            }
        });

        return createValidationResult({
            isValid: errors.length === 0,
            errors,
            warnings,
            metadata: createValidationMetadata({
                component: 'MetricsValidation',
                validatedFields: ['state', 'toolUsageFrequency', 'taskCompletionCount', 'averageTaskTime', 'costs']
            })
        });
    },

    validateBaseMetrics(metrics: unknown): IValidationResult {
        const errors: VALIDATION_ERROR_enum[] = [];
        const warnings: VALIDATION_WARNING_enum[] = [];

        if (typeof metrics !== 'object' || metrics === null) {
            errors.push(VALIDATION_ERROR_enum.INVALID_INPUT);
            return createValidationResult({
                isValid: false,
                errors,
                warnings,
                metadata: createValidationMetadata({
                    component: 'MetricsValidation',
                    validatedFields: ['timestamp', 'component', 'category', 'version']
                })
            });
        }

        const baseMetrics = metrics as Partial<IBaseMetrics>;

        if (typeof baseMetrics.timestamp !== 'number') {
            errors.push(VALIDATION_ERROR_enum.TYPE_MISMATCH);
        } else if (baseMetrics.timestamp > Date.now()) {
            warnings.push(VALIDATION_WARNING_enum.POTENTIAL_ISSUE);
        }

        if (typeof baseMetrics.component !== 'string') {
            errors.push(VALIDATION_ERROR_enum.TYPE_MISMATCH);
        }

        if (typeof baseMetrics.category !== 'string') {
            errors.push(VALIDATION_ERROR_enum.TYPE_MISMATCH);
        }

        if (typeof baseMetrics.version !== 'string') {
            errors.push(VALIDATION_ERROR_enum.TYPE_MISMATCH);
        }

        return createValidationResult({
            isValid: errors.length === 0,
            errors,
            warnings,
            metadata: createValidationMetadata({
                component: 'MetricsValidation',
                validatedFields: ['timestamp', 'component', 'category', 'version']
            })
        });
    },

    validateBaseResourceMetrics(metrics: unknown): IValidationResult {
        const errors: VALIDATION_ERROR_enum[] = [];
        const warnings: VALIDATION_WARNING_enum[] = [];

        const baseResult = this.validateBaseMetrics(metrics);
        if (!baseResult.isValid) {
            return baseResult;
        }

        if (!MetricsTypeGuards.isBaseResourceMetrics(metrics)) {
            errors.push(VALIDATION_ERROR_enum.INVALID_INPUT);
            return createValidationResult({
                isValid: false,
                errors,
                warnings,
                metadata: createValidationMetadata({
                    component: 'MetricsValidation',
                    validatedFields: ['usage', 'limit', 'available']
                })
            });
        }

        const resourceMetrics = metrics as IBaseResourceMetrics;

        if (resourceMetrics.usage < 0) {
            errors.push(VALIDATION_ERROR_enum.VALUE_OUT_OF_RANGE);
        }

        if (resourceMetrics.limit < 0) {
            errors.push(VALIDATION_ERROR_enum.VALUE_OUT_OF_RANGE);
        }

        if (resourceMetrics.usage > resourceMetrics.limit) {
            errors.push(VALIDATION_ERROR_enum.VALUE_OUT_OF_RANGE);
        }

        return createValidationResult({
            isValid: errors.length === 0,
            errors,
            warnings,
            metadata: createValidationMetadata({
                component: 'MetricsValidation',
                validatedFields: ['usage', 'limit', 'available']
            })
        });
    },

    validateBasePerformanceMetrics(metrics: unknown): IValidationResult {
        const errors: VALIDATION_ERROR_enum[] = [];
        const warnings: VALIDATION_WARNING_enum[] = [];

        const baseResult = this.validateBaseMetrics(metrics);
        if (!baseResult.isValid) {
            return baseResult;
        }

        if (!MetricsTypeGuards.isBasePerformanceMetrics(metrics)) {
            errors.push(VALIDATION_ERROR_enum.INVALID_INPUT);
            return createValidationResult({
                isValid: false,
                errors,
                warnings,
                metadata: createValidationMetadata({
                    component: 'MetricsValidation',
                    validatedFields: ['duration', 'success', 'errorCount']
                })
            });
        }

        const performanceMetrics = metrics as IBasePerformanceMetrics;

        if (performanceMetrics.duration < 0) {
            errors.push(VALIDATION_ERROR_enum.VALUE_OUT_OF_RANGE);
        }

        if (performanceMetrics.errorCount < 0) {
            errors.push(VALIDATION_ERROR_enum.VALUE_OUT_OF_RANGE);
        }

        return createValidationResult({
            isValid: errors.length === 0,
            errors,
            warnings,
            metadata: createValidationMetadata({
                component: 'MetricsValidation',
                validatedFields: ['duration', 'success', 'errorCount']
            })
        });
    },

    validateBaseUsageMetrics(metrics: unknown): IValidationResult {
        const errors: VALIDATION_ERROR_enum[] = [];
        const warnings: VALIDATION_WARNING_enum[] = [];

        const baseResult = this.validateBaseMetrics(metrics);
        if (!baseResult.isValid) {
            return baseResult;
        }

        if (!MetricsTypeGuards.isBaseUsageMetrics(metrics)) {
            errors.push(VALIDATION_ERROR_enum.INVALID_INPUT);
            return createValidationResult({
                isValid: false,
                errors,
                warnings,
                metadata: createValidationMetadata({
                    component: 'MetricsValidation',
                    validatedFields: ['count', 'rate', 'total']
                })
            });
        }

        const usageMetrics = metrics as IBaseUsageMetrics;

        if (usageMetrics.count < 0) {
            errors.push(VALIDATION_ERROR_enum.VALUE_OUT_OF_RANGE);
        }

        if (usageMetrics.rate < 0) {
            errors.push(VALIDATION_ERROR_enum.VALUE_OUT_OF_RANGE);
        }

        if (usageMetrics.total < usageMetrics.count) {
            errors.push(VALIDATION_ERROR_enum.VALUE_OUT_OF_RANGE);
        }

        return createValidationResult({
            isValid: errors.length === 0,
            errors,
            warnings,
            metadata: createValidationMetadata({
                component: 'MetricsValidation',
                validatedFields: ['count', 'rate', 'total']
            })
        });
    },

    validateCognitiveResourceMetrics(metrics: unknown): IValidationResult {
        const errors: VALIDATION_ERROR_enum[] = [];
        const warnings: VALIDATION_WARNING_enum[] = [];

        const baseResult = this.validateBaseResourceMetrics(metrics);
        if (!baseResult.isValid) {
            return baseResult;
        }

        if (!MetricsTypeGuards.isCognitiveResourceMetrics(metrics)) {
            errors.push(VALIDATION_ERROR_enum.INVALID_INPUT);
            return createValidationResult({
                isValid: false,
                errors,
                warnings,
                metadata: createValidationMetadata({
                    component: 'MetricsValidation',
                    validatedFields: ['memoryAllocation', 'cognitiveLoad', 'processingCapacity', 'contextUtilization']
                })
            });
        }

        const cognitiveMetrics = metrics as ICognitiveResourceMetrics;

        if (cognitiveMetrics.memoryAllocation < 0) {
            errors.push(VALIDATION_ERROR_enum.VALUE_OUT_OF_RANGE);
        }

        if (cognitiveMetrics.cognitiveLoad < 0 || cognitiveMetrics.cognitiveLoad > 1) {
            errors.push(VALIDATION_ERROR_enum.VALUE_OUT_OF_RANGE);
        }

        if (cognitiveMetrics.processingCapacity < 0 || cognitiveMetrics.processingCapacity > 1) {
            errors.push(VALIDATION_ERROR_enum.VALUE_OUT_OF_RANGE);
        }

        if (cognitiveMetrics.contextUtilization < 0 || cognitiveMetrics.contextUtilization > 1) {
            errors.push(VALIDATION_ERROR_enum.VALUE_OUT_OF_RANGE);
        }

        return createValidationResult({
            isValid: errors.length === 0,
            errors,
            warnings,
            metadata: createValidationMetadata({
                component: 'MetricsValidation',
                validatedFields: ['memoryAllocation', 'cognitiveLoad', 'processingCapacity', 'contextUtilization']
            })
        });
    },

    validateThinkingOperationMetrics(metrics: unknown): IValidationResult {
        const errors: VALIDATION_ERROR_enum[] = [];
        const warnings: VALIDATION_WARNING_enum[] = [];

        const baseResult = this.validateBasePerformanceMetrics(metrics);
        if (!baseResult.isValid) {
            return baseResult;
        }

        if (!MetricsTypeGuards.isThinkingOperationMetrics(metrics)) {
            errors.push(VALIDATION_ERROR_enum.INVALID_INPUT);
            return createValidationResult({
                isValid: false,
                errors,
                warnings,
                metadata: createValidationMetadata({
                    component: 'MetricsValidation',
                    validatedFields: ['reasoningTime', 'planningTime', 'learningTime', 'decisionConfidence', 'learningEfficiency']
                })
            });
        }

        const thinkingMetrics = metrics as IThinkingOperationMetrics;

        if (thinkingMetrics.decisionConfidence < 0 || thinkingMetrics.decisionConfidence > 1) {
            errors.push(VALIDATION_ERROR_enum.VALUE_OUT_OF_RANGE);
        }

        if (thinkingMetrics.learningEfficiency < 0 || thinkingMetrics.learningEfficiency > 1) {
            errors.push(VALIDATION_ERROR_enum.VALUE_OUT_OF_RANGE);
        }

        return createValidationResult({
            isValid: errors.length === 0,
            errors,
            warnings,
            metadata: createValidationMetadata({
                component: 'MetricsValidation',
                validatedFields: ['reasoningTime', 'planningTime', 'learningTime', 'decisionConfidence', 'learningEfficiency']
            })
        });
    },

    validateAgentStateMetrics(metrics: unknown): IValidationResult {
        const errors: VALIDATION_ERROR_enum[] = [];
        const warnings: VALIDATION_WARNING_enum[] = [];

        const baseResult = this.validateBaseMetrics(metrics);
        if (!baseResult.isValid) {
            return baseResult;
        }

        if (!MetricsTypeGuards.isAgentStateMetrics(metrics)) {
            errors.push(VALIDATION_ERROR_enum.INVALID_INPUT);
            return createValidationResult({
                isValid: false,
                errors,
                warnings,
                metadata: createValidationMetadata({
                    component: 'MetricsValidation',
                    validatedFields: ['currentState', 'stateTime', 'transitionCount', 'failedTransitions', 'blockedTaskCount', 'historyEntryCount', 'lastHistoryUpdate', 'taskStats']
                })
            });
        }

        const stateMetrics = metrics as IAgentStateMetrics;

        if (stateMetrics.stateTime < 0) {
            errors.push(VALIDATION_ERROR_enum.VALUE_OUT_OF_RANGE);
        }

        if (stateMetrics.transitionCount < 0) {
            errors.push(VALIDATION_ERROR_enum.VALUE_OUT_OF_RANGE);
        }

        if (stateMetrics.failedTransitions < 0) {
            errors.push(VALIDATION_ERROR_enum.VALUE_OUT_OF_RANGE);
        }

        if (stateMetrics.failedTransitions > stateMetrics.transitionCount) {
            errors.push(VALIDATION_ERROR_enum.VALUE_OUT_OF_RANGE);
        }

        if (stateMetrics.blockedTaskCount < 0) {
            errors.push(VALIDATION_ERROR_enum.VALUE_OUT_OF_RANGE);
        }

        if (stateMetrics.historyEntryCount < 0) {
            errors.push(VALIDATION_ERROR_enum.VALUE_OUT_OF_RANGE);
        }

        if (stateMetrics.lastHistoryUpdate > Date.now()) {
            warnings.push(VALIDATION_WARNING_enum.POTENTIAL_ISSUE);
        }

        const taskStats = stateMetrics.taskStats;
        if (taskStats.completedCount < 0) {
            errors.push(VALIDATION_ERROR_enum.VALUE_OUT_OF_RANGE);
        }

        if (taskStats.failedCount < 0) {
            errors.push(VALIDATION_ERROR_enum.VALUE_OUT_OF_RANGE);
        }

        if (taskStats.averageDuration < 0) {
            errors.push(VALIDATION_ERROR_enum.VALUE_OUT_OF_RANGE);
        }

        if (taskStats.successRate < 0 || taskStats.successRate > 1) {
            errors.push(VALIDATION_ERROR_enum.VALUE_OUT_OF_RANGE);
        }

        if (taskStats.averageIterations < 0) {
            errors.push(VALIDATION_ERROR_enum.VALUE_OUT_OF_RANGE);
        }

        return createValidationResult({
            isValid: errors.length === 0,
            errors,
            warnings,
            metadata: createValidationMetadata({
                component: 'MetricsValidation',
                validatedFields: ['currentState', 'stateTime', 'transitionCount', 'failedTransitions', 'blockedTaskCount', 'historyEntryCount', 'lastHistoryUpdate', 'taskStats']
            })
        });
    },

    validateCostDetails(costs: unknown): IValidationResult {
        const errors: VALIDATION_ERROR_enum[] = [];
        const warnings: VALIDATION_WARNING_enum[] = [];
        const validatedComponents: string[] = ['costs'];

        if (typeof costs !== 'object' || costs === null) {
            errors.push(VALIDATION_ERROR_enum.INVALID_INPUT);
            return createValidationResult({
                isValid: false,
                errors,
                warnings,
                metadata: createValidationMetadata({
                    component: 'MetricsValidation',
                    validatedFields: validatedComponents
                })
            });
        }

        const costDetails = costs as Partial<ICostDetails>;

        if (typeof costDetails.totalCost !== 'number' || costDetails.totalCost < 0) {
            errors.push(VALIDATION_ERROR_enum.VALUE_OUT_OF_RANGE);
            validatedComponents.push('totalCost');
        }

        if (typeof costDetails.inputCost !== 'number' || costDetails.inputCost < 0) {
            errors.push(VALIDATION_ERROR_enum.VALUE_OUT_OF_RANGE);
            validatedComponents.push('inputCost');
        }

        if (typeof costDetails.outputCost !== 'number' || costDetails.outputCost < 0) {
            errors.push(VALIDATION_ERROR_enum.VALUE_OUT_OF_RANGE);
            validatedComponents.push('outputCost');
        }

        if (typeof costDetails.currency !== 'string') {
            errors.push(VALIDATION_ERROR_enum.TYPE_MISMATCH);
            validatedComponents.push('currency');
        }

        if (costDetails.breakdown) {
            validatedComponents.push('breakdown');
            const breakdown = costDetails.breakdown as Partial<{
                promptTokens: { count: number; cost: number };
                completionTokens: { count: number; cost: number };
            }>;

            if (breakdown.promptTokens) {
                validatedComponents.push('breakdown.promptTokens');
                if (typeof breakdown.promptTokens.count !== 'number' || breakdown.promptTokens.count < 0 ||
                    typeof breakdown.promptTokens.cost !== 'number' || breakdown.promptTokens.cost < 0) {
                    errors.push(VALIDATION_ERROR_enum.VALUE_OUT_OF_RANGE);
                }
            }

            if (breakdown.completionTokens) {
                validatedComponents.push('breakdown.completionTokens');
                if (typeof breakdown.completionTokens.count !== 'number' || breakdown.completionTokens.count < 0 ||
                    typeof breakdown.completionTokens.cost !== 'number' || breakdown.completionTokens.cost < 0) {
                    errors.push(VALIDATION_ERROR_enum.VALUE_OUT_OF_RANGE);
                }
            }
        }

        return createValidationResult({
            isValid: errors.length === 0,
            errors,
            warnings,
            metadata: createValidationMetadata({
                component: 'MetricsValidation',
                validatedFields: validatedComponents
            })
        });
    }
};
