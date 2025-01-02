/**
 * @file agentLoopTypes.ts
 * @path KaibanJS/src/types/agent/agentLoopTypes.ts
 * @description Type guards for agentic loop handling
 * @deprecated Use types and type guards from executionFlow.ts instead. This file is maintained for backward compatibility.
 */

import type {
    ILoopContext,
    ILoopHandlerMetadata,
    ILoopResult,
    ILoopControl
} from './agentExecutionFlow';

/**
 * Type guards for loop-related types
 * @deprecated Use ExecutionFlowTypeGuards from executionFlow.ts instead
 */
export const ILoopTypeGuards = {
    isLoopContext: (value: unknown): value is ILoopContext => {
        if (typeof value !== 'object' || value === null) return false;
        const context = value as Partial<ILoopContext>;
        return (
            typeof context.startTime === 'number' &&
            typeof context.iterations === 'number' &&
            typeof context.maxIterations === 'number' &&
            typeof context.lastUpdateTime === 'number' &&
            typeof context.status === 'string' &&
            typeof context.performance === 'object' &&
            context.performance !== null &&
            typeof context.resources === 'object' &&
            context.resources !== null &&
            typeof context.usage === 'object' &&
            context.usage !== null &&
            typeof context.costs === 'object' &&
            context.costs !== null
        );
    },

    isLoopHandlerMetadata: (value: unknown): value is ILoopHandlerMetadata => {
        if (typeof value !== 'object' || value === null) return false;
        const metadata = value as Partial<ILoopHandlerMetadata>;
        return (
            metadata.loop !== undefined &&
            typeof metadata.loop.iterations === 'number' &&
            typeof metadata.loop.maxIterations === 'number' &&
            typeof metadata.loop.status === 'string' &&
            typeof metadata.loop.performance === 'object' &&
            metadata.loop.performance !== null &&
            typeof metadata.loop.context === 'object' &&
            metadata.loop.context !== null &&
            typeof metadata.loop.resources === 'object' &&
            metadata.loop.resources !== null &&
            typeof metadata.loop.usage === 'object' &&
            metadata.loop.usage !== null &&
            typeof metadata.loop.costs === 'object' &&
            metadata.loop.costs !== null &&
            typeof metadata.loop.llmUsageMetrics === 'object' &&
            metadata.loop.llmUsageMetrics !== null &&
            metadata.agent !== undefined &&
            typeof metadata.agent.id === 'string' &&
            typeof metadata.agent.name === 'string' &&
            typeof metadata.agent.metrics === 'object' &&
            metadata.agent.metrics !== null &&
            metadata.task !== undefined &&
            typeof metadata.task.id === 'string' &&
            typeof metadata.task.title === 'string' &&
            typeof metadata.task.metrics === 'object' &&
            metadata.task.metrics !== null
        );
    },

    isLoopResult: (value: unknown): value is ILoopResult => {
        if (typeof value !== 'object' || value === null) return false;
        const result = value as Partial<ILoopResult>;
        return (
            typeof result.success === 'boolean' &&
            typeof result.metadata === 'object' &&
            result.metadata !== null &&
            typeof result.metadata.iterations === 'number' &&
            typeof result.metadata.maxAgentIterations === 'number'
        );
    },

    isLoopControl: (value: unknown): value is ILoopControl => {
        if (typeof value !== 'object' || value === null) return false;
        const control = value as Partial<ILoopControl>;
        return (
            typeof control.shouldContinue === 'boolean' &&
            (control.metrics === undefined || (
                typeof control.metrics === 'object' &&
                control.metrics !== null &&
                typeof control.metrics.confidence === 'number' &&
                typeof control.metrics.progress === 'number' &&
                typeof control.metrics.remainingIterations === 'number' &&
                typeof control.metrics.executionTime === 'number'
            ))
        );
    }
};
