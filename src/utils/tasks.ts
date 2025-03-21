/**
 * Task Utility Functions.
 *
 * This module provides utility functions for managing task properties and behaviors.
 * It includes functions for interpolating task descriptions with dynamic data and
 * retrieving concise titles for logging purposes.
 *
 * @module tasks
 */

import { Task } from '../index';

/** Generic type for key-value pairs */
export type KeyValuePairs = Record<string, string | number | boolean>;

/**
 * Gets a concise title for a task suitable for logging
 * @param task - The task object containing title and/or description
 * @returns A short title string for the task
 */
export function getTaskTitleForLogs(task: Task): string {
  return (
    task.title ||
    (task.description
      ? task.description.split(' ').slice(0, 3).join(' ') + '...'
      : 'Untitled')
  );
}

/**
 * Interpolates placeholders in a task description with input values
 * @param description - The description template containing placeholders
 * @param inputs - Object containing input values to interpolate
 * @returns The interpolated description
 * @deprecated Use interpolateTaskDescriptionV2 instead
 */
export function interpolateTaskDescription(
  description: string,
  inputs: KeyValuePairs
): string {
  let result = description;

  for (const key in inputs) {
    const placeholder = `{${key}}`;
    result = result.replace(placeholder, String(inputs[key]));
  }

  return result;
}

/**
 * Enhanced version of interpolateTaskDescription that supports both input values and task results
 * @param description - The description template containing placeholders
 * @param inputs - Object containing input values to interpolate
 * @param taskResults - Object containing task results to interpolate
 * @returns The interpolated description
 */
export function interpolateTaskDescriptionV2(
  description: string,
  inputs: Record<string, unknown> = {},
  taskResults: Record<string, unknown> = {}
): string {
  let result = description;

  // Replace input placeholders
  for (const key in inputs) {
    const placeholder = `{${key}}`;
    result = result.replace(new RegExp(placeholder, 'g'), String(inputs[key]));
  }

  // Replace task result placeholders
  for (const key in taskResults) {
    const placeholder = `{taskResult:${key}}`;
    result = result.replace(
      new RegExp(placeholder, 'g'),
      String(taskResults[key])
    );
  }

  return result;
}
