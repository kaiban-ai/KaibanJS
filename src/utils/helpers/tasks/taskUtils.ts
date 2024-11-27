/**
 * @file taskUtils.ts
 * @path C:\Users\pwalc\Documents\GroqEmailAssistant\KaibanJS\src\utils\helpers\tasks\taskUtils.ts
 * @description Task utility functions for managing task properties and behaviors.
 * Provides capabilities to interpolate task descriptions with dynamic data,
 * retrieve concise titles for logging purposes, and validate task structures.
 */

import CoreManager from '../../../managers/core/coreManager';
import type { TaskType } from '../../../types/task/taskBaseTypes';

const coreManager = CoreManager.getInstance();

/**
 * Retrieves a concise title for a task, suitable for logging purposes.
 * 
 * @param {TaskType} task - The task object.
 * @returns {string} A short title derived from the task's title or description.
 */
export function getTaskTitleForLogs(task: TaskType): string {
    return task.title ? 
        `${task.title} (ID: ${task.id})` : 
        (task.description ? task.description.split(" ").slice(0, 3).join(" ") + '...' : 'Untitled');
}

/**
 * Validates the structure and data types of a task object.
 * 
 * @param {TaskType} task - The task object to validate.
 * @returns {boolean} True if the task is valid, false otherwise.
 */
export function validateTask(task: TaskType): boolean {
    if (!task) {
        coreManager.logError("Task is undefined or null");
        return false;
    }

    if (!Array.isArray(task.feedbackHistory)) {
        coreManager.logWarning(`Expected feedbackHistory to be an array, but got ${typeof task.feedbackHistory}`);
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
        coreManager.logWarning("Task is missing required fields (id, title, description, or agent)");
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
export function interpolateTaskDescription(description: string, inputs: Record<string, string>): string {
    let result = description;

    for (const key in inputs) {
        const placeholder = `{${key}}`;
        result = result.replace(placeholder, inputs[key]);
    }

    return result;
}
