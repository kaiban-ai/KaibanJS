function getTaskTitleForLogs(task) {
    return task.title || (task.description ? task.description.split(" ").slice(0, 3).join(" ") + '...' : 'Untitled');
  }

  function interpolateTaskDescription(description, inputs) {
    let result = description;

    for (const key in inputs) {
        const placeholder = `{${key}}`;
        result = result.replace(placeholder, inputs[key]);
    }

    return result;
}

export { getTaskTitleForLogs, interpolateTaskDescription };