/**
 * @file typeGuards.ts
 * @path KaibanJS/src/stores/teamStore/utils/typeGuards.ts
 * @description Type guard utilities for the team store implementation
 */

import type { 
    TeamStore,
    TaskLogMetadata,
    WorkflowLogMetadata,
    AgentLogMetadata
} from '@/utils/types';

/* Type guard utilities */
export const TypeGuards = {
    isFunction(value: unknown): value is Function {
        return typeof value === 'function';
    },

    isTeamStore(store: unknown): store is TeamStore {
        return (
            typeof store === 'object' &&
            store !== null &&
            'getState' in store &&
            'setState' in store &&
            'subscribe' in store &&
            'destroy' in store
        );
    },

    isTaskMetadata(metadata: unknown): metadata is TaskLogMetadata {
        if (!metadata || typeof metadata !== 'object') return false;
        const m = metadata as any;
        return (
            'llmUsageStats' in m &&
            'iterationCount' in m &&
            'duration' in m &&
            'costDetails' in m &&
            typeof m.iterationCount === 'number' &&
            typeof m.duration === 'number'
        );
    },

    isWorkflowMetadata(metadata: unknown): metadata is WorkflowLogMetadata {
        if (!metadata || typeof metadata !== 'object') return false;
        const m = metadata as any;
        return (
            'duration' in m &&
            'llmUsageStats' in m &&
            'iterationCount' in m &&
            'costDetails' in m &&
            'teamName' in m &&
            'taskCount' in m &&
            'agentCount' in m
        );
    },

    isAgentMetadata(metadata: unknown): metadata is AgentLogMetadata {
        if (!metadata || typeof metadata !== 'object') return false;
        const m = metadata as any;
        return (
            'output' in m &&
            typeof m.output === 'object' &&
            m.output !== null &&
            'llmUsageStats' in m.output
        );
    },

    isNonEmptyString(value: unknown): value is string {
        return typeof value === 'string' && value.trim().length > 0;
    },

    isValidDate(value: unknown): value is Date {
        return value instanceof Date && !isNaN(value.getTime());
    },

    isValidNumber(value: unknown): value is number {
        return typeof value === 'number' && !isNaN(value);
    },

    isValidObject(value: unknown): value is Record<string, unknown> {
        return typeof value === 'object' && value !== null && !Array.isArray(value);
    },

    isValidArray(value: unknown): value is unknown[] {
        return Array.isArray(value);
    }
};

export default TypeGuards;
