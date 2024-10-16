/**
 * Task Utility Functions.
 *
 * This file includes utility functions for managing task properties and behaviors within the KaibanJS library. It offers 
 * capabilities to interpolate task descriptions with dynamic data, retrieve concise titles for logging purposes,
 * and validate task structures to ensure data integrity.
 *
 * Usage:
 * Implement these utilities to dynamically manage task data, enhance logging outputs with more informative task descriptions,
 * and ensure the validity of task objects throughout the application.
 */

import { logger } from "./logger";

/**
 * Retrieves a concise title for a task, suitable for logging purposes.
 * 
 * @param {Object} task - The task object.
 * @returns {string} A short title derived from the task's title or description.
 */
function getTaskTitleForLogs(task) {
    return task.title || (task.description ? task.description.split(" ").slice(0, 3).join(" ") + '...' : 'Untitled');
}

/**
 * Interpolates placeholders in the task description with actual input values.
 * 
 * @param {string} description - The task description with placeholders.
 * @param {Object} inputs - An object containing input values to replace placeholders.
 * @returns {string} The interpolated task description.
 */
function interpolateTaskDescription(description, inputs) {
    let result = description;

    for (const key in inputs) {
        const placeholder = `{${key}}`;
        result = result.replace(placeholder, inputs[key]);
    }

    return result;
}

/**
 * Validates the structure and data types of a task object.
 * 
 * @param {Object} task - The task object to validate.
 * @returns {boolean} True if the task is valid, false otherwise.
 */
function validateTask(task) {
    if (!task) {
        logger.error("Task is undefined or null");
        return false;
    }

    if (!Array.isArray(task.feedbackHistory)) {
        logger.warn(`Expected feedbackHistory to be an array, but got ${typeof task.feedbackHistory}`);
        task.feedbackHistory = [];
    }

    // Add other validations as needed
    // For example:
    // if (typeof task.id !== 'string') {
    //     logger.warn(`Expected task.id to be a string, but got ${typeof task.id}`);
    //     return false;
    // }

    // if (typeof task.title !== 'string') {
    //     logger.warn(`Expected task.title to be a string, but got ${typeof task.title}`);
    //     task.title = 'Untitled Task';
    // }

    // if (typeof task.description !== 'string') {
    //     logger.warn(`Expected task.description to be a string, but got ${typeof task.description}`);
    //     task.description = '';
    // }

    return true;
}

export { getTaskTitleForLogs, interpolateTaskDescription, validateTask };