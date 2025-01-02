/**
 * @file agentTypeGuards.ts
 * @path src/types/agent/agentTypeGuards.ts
 * @description Centralized type guards for all agent-related types
 *
 * @module @types/agent
 */

import type { 
    IBaseAgent,
    IAgentMetadata,
    IReactChampionAgent 
} from './agentBaseTypes';
import type {
    IAgentMetrics,
    ICognitiveResourceMetrics,
    IThinkingOperationMetrics,
    IAgentStateMetrics,
    IAgentResourceMetrics,
    IAgentPerformanceMetrics,
    IAgentUsageMetrics
} from './agentMetricTypes';
import type {
    IAgentRuntimeSelectors,
    IAgentMetricSelectors,
    IAgentStoreSelectors
} from './agentSelectorsTypes';
import type { IAgentEventMetadata } from './agentEventTypes';
import type { 
    IAgentValidationResult,
    IAgentSelectionCriteria,
    IAgentCreationResult 
} from './agentValidationTypes';

// ─── Base Agent Type Guards ────────────────────────────────────────────────────

export const AgentTypeGuards = {
    isAgentMetadata: (value: unknown): value is IAgentMetadata => {
        if (typeof value !== 'object' || value === null) return false;
        const metadata = value as Partial<IAgentMetadata>;
        return (
            typeof metadata.id === 'string' &&
            typeof metadata.name === 'string' &&
            Array.isArray(metadata.capabilities) &&
            metadata.created instanceof Date &&
            metadata.modified instanceof Date &&  // Check for modified Date
            typeof metadata.version === 'string' &&  // Check for version string
            typeof metadata.type === 'string' &&
            typeof metadata.description === 'string' &&
            typeof metadata.status === 'string'
        );
    },

    isBaseAgent: (agent: unknown): agent is IBaseAgent => {
        if (typeof agent !== 'object' || agent === null) return false;
        return (
            'id' in agent &&
            'name' in agent &&
            'role' in agent &&
            'goal' in agent &&
            'tools' in agent &&
            'status' in agent &&
            'capabilities' in agent &&
            'metadata' in agent &&
            'executionState' in agent &&
            AgentTypeGuards.isAgentMetadata((agent as IBaseAgent).metadata)
        );
    },

    isReactChampionAgent: (agent: unknown): agent is IReactChampionAgent => {
        if (!AgentTypeGuards.isBaseAgent(agent)) return false;
        const reactAgent = agent as Partial<IReactChampionAgent>;
        return (
            // Check executableAgent is an empty object (private implementation)
            'executableAgent' in reactAgent &&
            typeof reactAgent.executableAgent === 'object' &&
            Object.keys(reactAgent.executableAgent || {}).length === 0 &&
            // Check required properties
            'messages' in reactAgent &&
            'context' in reactAgent &&
            'history' in reactAgent &&
            // Check capabilities
            'capabilities' in reactAgent &&
            typeof reactAgent.capabilities === 'object' &&
            reactAgent.capabilities !== null &&
            typeof reactAgent.capabilities.canThink === 'boolean' &&
            typeof reactAgent.capabilities.canUseTools === 'boolean' &&
            typeof reactAgent.capabilities.canLearn === 'boolean' &&
            Array.isArray(reactAgent.capabilities.supportedToolTypes) &&
            typeof reactAgent.capabilities.maxConcurrentTasks === 'number' &&
            typeof reactAgent.capabilities.memoryCapacity === 'number'
        );
    }
};

// ─── Metrics Type Guards ──────────────────────────────────────────────────────

export const MetricsTypeGuards = {
    isAgentMetrics: (value: unknown): value is IAgentMetrics => {
        if (typeof value !== 'object' || value === null) return false;
        const metrics = value as Partial<IAgentMetrics>;
        return (
            MetricsTypeGuards.isAgentResourceMetrics(metrics.resources) &&
            MetricsTypeGuards.isAgentPerformanceMetrics(metrics.performance) &&
            MetricsTypeGuards.isAgentUsageMetrics(metrics.usage) &&
            typeof metrics.timestamp === 'number'
        );
    },

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
            typeof metrics.lastHistoryUpdate === 'number' &&
            typeof metrics.taskStats === 'object'
        );
    },

    isAgentResourceMetrics: (value: unknown): value is IAgentResourceMetrics => {
        if (typeof value !== 'object' || value === null) return false;
        const metrics = value as Partial<IAgentResourceMetrics>;
        return (
            MetricsTypeGuards.isCognitiveResourceMetrics(metrics.cognitive) &&
            typeof metrics.cpuUsage === 'number' &&
            typeof metrics.memoryUsage === 'number' &&
            typeof metrics.diskIO === 'object' &&
            typeof metrics.networkUsage === 'object' &&
            typeof metrics.timestamp === 'number'
        );
    },

    isAgentPerformanceMetrics: (value: unknown): value is IAgentPerformanceMetrics => {
        if (typeof value !== 'object' || value === null) return false;
        const metrics = value as Partial<IAgentPerformanceMetrics>;
        return (
            MetricsTypeGuards.isThinkingOperationMetrics(metrics.thinking) &&
            typeof metrics.taskSuccessRate === 'number' &&
            typeof metrics.goalAchievementRate === 'number'
        );
    },

    isAgentUsageMetrics: (value: unknown): value is IAgentUsageMetrics => {
        if (typeof value !== 'object' || value === null) return false;
        const metrics = value as Partial<IAgentUsageMetrics>;
        return (
            MetricsTypeGuards.isAgentStateMetrics(metrics.state) &&
            typeof metrics.toolUsageFrequency === 'object' &&
            typeof metrics.taskCompletionCount === 'number' &&
            typeof metrics.averageTaskTime === 'number'
        );
    }
};

// ─── Selector Type Guards ─────────────────────────────────────────────────────

export const SelectorTypeGuards = {
    isRuntimeSelectors: (value: unknown): value is IAgentRuntimeSelectors => {
        if (typeof value !== 'object' || value === null) return false;
        const selectors = value as Partial<IAgentRuntimeSelectors>;
        return (
            typeof selectors.getCurrentAgent === 'function' &&
            typeof selectors.getCurrentTask === 'function' &&
            typeof selectors.getLastError === 'function' &&
            typeof selectors.getStatus === 'function'
        );
    },

    isMetricSelectors: (value: unknown): value is IAgentMetricSelectors => {
        if (typeof value !== 'object' || value === null) return false;
        const selectors = value as Partial<IAgentMetricSelectors>;
        return (
            typeof selectors.getLLMUsageStats === 'function' &&
            typeof selectors.getIterationCount === 'function' &&
            typeof selectors.getTotalCalls === 'function' &&
            typeof selectors.getErrorCount === 'function' &&
            typeof selectors.getAverageLatency === 'function' &&
            typeof selectors.getCostDetails === 'function'
        );
    },

    isStoreSelectors: (value: unknown): value is IAgentStoreSelectors => {
        if (typeof value !== 'object' || value === null) return false;
        return (
            SelectorTypeGuards.isRuntimeSelectors(value) &&
            SelectorTypeGuards.isMetricSelectors(value)
        );
    }
};

// ─── Event Type Guards ────────────────────────────────────────────────────────

export const EventTypeGuards = {
    isAgentEventMetadata: (value: unknown): value is IAgentEventMetadata => {
        if (typeof value !== 'object' || value === null) return false;
        const metadata = value as Partial<IAgentEventMetadata>;
        return (
            typeof metadata.agent === 'object' &&
            metadata.agent !== null &&
            typeof metadata.agent.name === 'string' &&
            typeof metadata.agent.role === 'string' &&
            typeof metadata.agent.status === 'string' &&
            typeof metadata.agent.metrics === 'object' &&
            metadata.agent.metrics !== null
        );
    }
};

// ─── Validation Type Guards ────────────────────────────────────────────────────

export const ValidationTypeGuards = {
    isValidationResult: (value: unknown): value is IAgentValidationResult => {
        if (typeof value !== 'object' || value === null) return false;
        const result = value as Partial<IAgentValidationResult>;
        return (
            typeof result.isValid === 'boolean' &&
            Array.isArray(result.errors) &&
            Array.isArray(result.warnings) &&
            typeof result.metadata === 'object' &&
            result.metadata !== null
        );
    },

    isSelectionCriteria: (value: unknown): value is IAgentSelectionCriteria => {
        if (typeof value !== 'object' || value === null) return false;
        const criteria = value as Partial<IAgentSelectionCriteria>;
        return (
            (typeof criteria.role === 'string' || criteria.role === undefined) &&
            (Array.isArray(criteria.tools) || criteria.tools === undefined) &&
            (Array.isArray(criteria.preferredModels) || criteria.preferredModels === undefined) &&
            (Array.isArray(criteria.capabilities) || criteria.capabilities === undefined) &&
            (typeof criteria.minPerformanceScore === 'number' || criteria.minPerformanceScore === undefined)
        );
    },

    isCreationResult: (value: unknown): value is IAgentCreationResult => {
        if (typeof value !== 'object' || value === null) return false;
        const result = value as Partial<IAgentCreationResult>;
        return (
            typeof result.success === 'boolean' &&
            ValidationTypeGuards.isValidationResult(result.validation) &&
            typeof result.metadata === 'object' &&
            result.metadata !== null &&
            typeof result.metadata.createdAt === 'number' &&
            typeof result.metadata.configHash === 'string' &&
            typeof result.metadata.version === 'string'
        );
    }
};
