/**
 * @file tracking.ts
 * @path src/utils/types/task/tracking.ts
 * @description Task tracking and monitoring interfaces
 */

import { TASK_STATUS_enum } from "../common/enums";
import { LLMUsageStats } from "../llm/responses";
import { TaskType } from "./base";

/**
 * Task progress interface
 */
export interface TaskProgress {
    /** Task identifier */
    taskId: string;
    
    /** Current status */
    status: keyof typeof TASK_STATUS_enum;
    
    /** Progress percentage */
    progress: number;
    
    /** Time elapsed */
    timeElapsed: number;
    
    /** Estimated time remaining */
    estimatedTimeRemaining?: number;
    
    /** Current iteration */
    currentIteration?: number;
    
    /** Resource usage */
    resourceUsage?: {
        memory: number;
        cpu: number;
        tokens: number;
    };
}

/**
 * Task metrics interface
 */
export interface TaskMetrics {
    /** Total execution time */
    executionTime: number;
    
    /** Token usage */
    tokenUsage: {
        input: number;
        output: number;
        total: number;
    };
    
    /** Cost breakdown */
    costs: {
        input: number;
        output: number;
        total: number;
        currency: string;
    };
    
    /** Performance metrics */
    performance: {
        averageIterationTime: number;
        averageTokensPerSecond: number;
        peakMemoryUsage: number;
    };
    
    /** Error metrics */
    errors: {
        count: number;
        types: Record<string, number>;
        retries: number;
    };
}

/**
 * Task history entry
 */
export interface TaskHistoryEntry {
    /** Timestamp */
    timestamp: number;
    
    /** Event type */
    eventType: string;
    
    /** Status change */
    statusChange?: {
        from: keyof typeof TASK_STATUS_enum;
        to: keyof typeof TASK_STATUS_enum;
    };
    
    /** Associated agent */
    agent?: string;
    
    /** Event details */
    details?: Record<string, unknown>;
    
    /** Resource usage */
    resourceUsage?: {
        llmStats: LLMUsageStats;
        memory: number;
        tokens: number;
    };
}

/**
 * Task dependency tracking
 */
export interface TaskDependencyTracking {
    /** Task identifier */
    taskId: string;
    
    /** Dependencies */
    dependencies: {
        taskId: string;
        status: keyof typeof TASK_STATUS_enum;
        required: boolean;
    }[];
    
    /** Dependent tasks */
    dependents: {
        taskId: string;
        status: keyof typeof TASK_STATUS_enum;
        blocking: boolean;
    }[];
    
    /** Dependency status */
    status: 'pending' | 'satisfied' | 'blocked';
}

/**
 * Task audit record
 */
export interface TaskAuditRecord {
    /** Task identifier */
    taskId: string;
    
    /** Timestamp */
    timestamp: number;
    
    /** Action performed */
    action: string;
    
    /** Actor (agent/user) */
    actor: string;
    
    /** Changes made */
    changes: {
        field: string;
        oldValue: unknown;
        newValue: unknown;
    }[];
    
    /** Context */
    context?: Record<string, unknown>;
}

/**
 * Task tracking utilities
 */
export const TaskTrackingUtils = {
    /**
     * Calculate task progress
     */
    calculateProgress: (task: TaskType): number => {
        if (task.status === TASK_STATUS_enum.DONE) return 100;
        if (task.status === TASK_STATUS_enum.PENDING) return 0;
        
        // Calculate progress based on iterations if available
        if (task.iterationCount !== undefined) {
            const maxIterations = 10; // Default max iterations
            return Math.min((task.iterationCount / maxIterations) * 100, 99);
        }
        
        // Default progress based on status
        const statusProgress: Record<keyof typeof TASK_STATUS_enum, number> = {
            PENDING: 0,
            TODO: 10,
            DOING: 50,
            BLOCKED: 25,
            REVISE: 75,
            DONE: 100,
            ERROR: 0,
            AWAITING_VALIDATION: 90,
            VALIDATED: 100
        };
        
        return statusProgress[task.status] || 0;
    },

    /**
     * Calculate resource utilization
     */
    calculateResourceUtilization: (task: TaskType): Record<string, number> => {
        return {
            tokens: (task.llmUsageStats?.inputTokens || 0) + (task.llmUsageStats?.outputTokens || 0),
            cost: task.llmUsageStats?.costBreakdown?.total || 0,
            time: task.duration || 0,
            memory: task.llmUsageStats?.memoryUtilization?.peakMemoryUsage || 0
        };
    },

    /**
     * Format duration for display
     */
    formatDuration: (milliseconds: number): string => {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        }
        if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        }
        return `${seconds}s`;
    }
};

/**
 * Task tracking type guards
 */
export const TaskTrackingTypeGuards = {
    /**
     * Check if value is task progress
     */
    isTaskProgress: (value: unknown): value is TaskProgress => {
        return (
            typeof value === 'object' &&
            value !== null &&
            'taskId' in value &&
            'status' in value &&
            'progress' in value &&
            'timeElapsed' in value
        );
    },

    /**
     * Check if value is task history entry
     */
    isTaskHistoryEntry: (value: unknown): value is TaskHistoryEntry => {
        return (
            typeof value === 'object' &&
            value !== null &&
            'timestamp' in value &&
            'eventType' in value
        );
    },

    /**
     * Check if value is task dependency tracking
     */
    isTaskDependencyTracking: (value: unknown): value is TaskDependencyTracking => {
        return (
            typeof value === 'object' &&
            value !== null &&
            'taskId' in value &&
            'dependencies' in value &&
            'dependents' in value &&
            'status' in value
        );
    }
};