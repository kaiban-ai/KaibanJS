/**
 * @file taskUtilsTypes.ts
 * @path src/types/task/taskUtilsTypes.ts
 * @description Task utility types and helper interfaces
 *
 * @module @types/task
 */

// ─── Task Operation Types ───────────────────────────────────────────────────────

/**
 * Task interpolation options
 */
export interface TaskInterpolationOptions {
    /** Custom template pattern */
    pattern?: string | RegExp;
    /** Whether to throw on missing variables */
    strict?: boolean;
    /** Custom transformer function */
    transform?: (value: unknown) => string;
}

/**
 * Task description template
 */
export interface TaskDescriptionTemplate {
    /** Template string */
    template: string;
    /** Variable mappings */
    variables: Record<string, unknown>;
    /** Interpolation options */
    options?: TaskInterpolationOptions;
}

// ─── Type Guards ────────────────────────────────────────────────────────────────

export const TaskUtilityGuards = {
    /**
     * Check if value is task description template
     */
    isTaskDescriptionTemplate: (value: unknown): value is TaskDescriptionTemplate => {
        if (typeof value !== 'object' || value === null) return false;
        const template = value as Partial<TaskDescriptionTemplate>;
        return (
            typeof template.template === 'string' &&
            template.variables !== undefined &&
            typeof template.variables === 'object'
        );
    }
};
