/**
 * Task Utility Functions.
 *
 * This file includes utility functions for managing task properties and behaviors within the KaibanJS library. It offers
 * capabilities to interpolate task descriptions with dynamic data and retrieve concise titles for logging purposes.
 *
 * Usage:
 * Implement these utilities to dynamically manage task data and enhance logging outputs with more informative task descriptions.
 */

function getTaskTitleForLogs(task) {
  return (
    task.title ||
    (task.description
      ? task.description.split(' ').slice(0, 3).join(' ') + '...'
      : 'Untitled')
  );
}

function interpolateTaskDescription(description, inputs) {
  let result = description;

  for (const key in inputs) {
    const placeholder = `{${key}}`;
    result = result.replace(placeholder, inputs[key]);
  }

  return result;
}

/**
 * Enhanced version of interpolateTaskDescription that supports both input values and task results.
 * @param {string} description - The description template containing placeholders
 * @param {Object} inputs - Object containing input values to interpolate
 * @param {Object} taskResults - Object containing task results to interpolate
 * @returns {string} - The interpolated description
 */
function interpolateTaskDescriptionV2(
  description,
  inputs = {},
  taskResults = {}
) {
  let result = description;

  // Replace input placeholders
  for (const key in inputs) {
    const placeholder = `{${key}}`;
    result = result.replace(new RegExp(placeholder, 'g'), inputs[key]);
  }

  // Replace task result placeholders
  for (const key in taskResults) {
    const placeholder = `{taskResult:${key}}`;
    result = result.replace(new RegExp(placeholder, 'g'), taskResults[key]);
  }

  return result;
}

export {
  getTaskTitleForLogs,
  interpolateTaskDescription,
  interpolateTaskDescriptionV2,
};
