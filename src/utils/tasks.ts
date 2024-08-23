/**
 * Task Utility Functions.
 *
 * This file includes utility functions for managing task properties and behaviors within the AgenticJS library. It offers
 * capabilities to interpolate task descriptions with dynamic data and retrieve concise titles for logging purposes.
 *
 * Usage:
 * Implement these utilities to dynamically manage task data and enhance logging outputs with more informative task descriptions.
 */

const getTaskTitleForLogs = (task: { title: string; description: string }) => {
  return (
    task.title ||
    (task.description
      ? task.description.split(" ").slice(0, 3).join(" ") + "..."
      : "Untitled")
  );
};

const interpolateTaskDescription = (
  description: string,
  inputs: Record<string, any>
) => {
  let result = description;

  for (const key in inputs) {
    const placeholder = `{${key}}`;
    result = result.replace(placeholder, inputs[key]);
  }

  return result;
};

export { getTaskTitleForLogs, interpolateTaskDescription };
