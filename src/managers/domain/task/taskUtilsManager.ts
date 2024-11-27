/**
 * @file taskUtilsManager.ts
 * @path src/managers/domain/task/taskUtilsManager.ts
 * @description Task utility manager providing task-related helper functions
 */

import CoreManager from '../../core/coreManager';
import type { ITaskType } from '../../../types/task/taskBaseTypes';

export class TaskUtilsManager extends CoreManager {
    private static instance: TaskUtilsManager;

    private constructor() {
        super();
        this.registerDomainManager('TaskUtilsManager', this);
    }

    public static override getInstance(): TaskUtilsManager {
        if (!TaskUtilsManager.instance) {
            TaskUtilsManager.instance = new TaskUtilsManager();
        }
        return TaskUtilsManager.instance;
    }

    /**
     * Retrieves a concise title for a task, suitable for logging purposes.
     * 
     * @param {ITaskType} task - The task object.
     * @returns {string} A short title derived from the task's title or description.
     */
    public getTaskTitleForLogs(task: ITaskType): string {
        return task.title ? 
            `${task.title} (ID: ${task.id})` : 
            (task.description ? task.description.split(" ").slice(0, 3).join(" ") + '...' : 'Untitled');
    }

    /**
     * Validates the structure and data types of a task object.
     * 
     * @param {ITaskType} task - The task object to validate.
     * @returns {boolean} True if the task is valid, false otherwise.
     */
    public validateTask(task: ITaskType): boolean {
        if (!task) {
            this.logError("Task is undefined or null");
            return false;
        }

        if (!Array.isArray(task.feedbackHistory)) {
            this.logWarn(`Expected feedbackHistory to be an array, but got ${typeof task.feedbackHistory}`);
            task.feedbackHistory = [];
        }

        // Validate required fields
        const isValid = !!(
            task &&
            task.id &&
            task.title &&
            task.description &&
            task.agent
        );

        if (!isValid) {
            this.logWarn("Task is missing required fields (id, title, description, or agent)");
        }

        return isValid;
    }

    /**
     * Interpolates placeholders in the task description with actual input values.
     * 
     * @param {string} description - The task description with placeholders.
     * @param {Record<string, string>} inputs - An object containing input values to replace placeholders.
     * @returns {string} The interpolated task description.
     */
    public interpolateTaskDescription(description: string, inputs: Record<string, string>): string {
        let result = description;

        for (const key in inputs) {
            const placeholder = `{${key}}`;
            result = result.replace(placeholder, inputs[key]);
        }

        return result;
    }
}

export default TaskUtilsManager.getInstance();
