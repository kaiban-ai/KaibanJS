/**
 * @file typeGuards.ts
 * @path src/stores/teamStore/utils/typeGuards.ts
 * @description Type guard utilities for the team store implementation
 */

import type { 
    TeamStore,
    TaskLogMetadata,
    WorkflowLogMetadata,
    AgentLogMetadata
} from '@/utils/types';

/**
 * Type guards for the team store implementation
 */
export const TypeGuards = {
    /**
     * Checks if a value is a function
     */
    isFunction(value: unknown): value is Function {
        return typeof value === 'function';
    },

    /**
     * Checks if a store implements the TeamStore interface
     */
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

    /**
     * Checks if metadata conforms to TaskLogMetadata interface
     */
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

    /**
     * Checks if metadata conforms to WorkflowLogMetadata interface
     */
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

    /**
     * Checks if metadata conforms to AgentLogMetadata interface
     */
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

    /**
     * Type guard for checking if a value is a non-empty string
     */
    isNonEmptyString(value: unknown): value is string {
        return typeof value === 'string' && value.trim().length > 0;
    },

    /**
     * Type guard for checking if a value is a valid date
     */
    isValidDate(value: unknown): value is Date {
        return value instanceof Date && !isNaN(value.getTime());
    },

    /**
     * Type guard for checking if a value is a valid number
     */
    isValidNumber(value: unknown): value is number {
        return typeof value === 'number' && !isNaN(value);
    },

    /**
     * Type guard for checking if a value is a valid object
     */
    isValidObject(value: unknown): value is Record<string, unknown> {
        return typeof value === 'object' && value !== null && !Array.isArray(value);
    },

    /**
     * Type guard for checking if a value is a valid array
     */
    isValidArray(value: unknown): value is unknown[] {
        return Array.isArray(value);
    }
};

export default TypeGuards;