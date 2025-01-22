export const setupWorkflowController = (teamStore) => {
  teamStore.subscribe(
    (state) => state.tasks,
    (tasks, previousTasks) => {
      // const changedTaskIds = tasks
      //   .filter(
      //     (task) =>
      //       task.status !== previousTasks.find((t) => t.id === task.id)?.status
      //   )
      //   .map((task) => task.id);

      const changedTaskIdsWithPreviousStatus = tasks.reduce((acc, task) => {
        const previousTask = previousTasks.find((t) => t.id === task.id);
        if (previousTask && task.status !== previousTask.status) {
          acc.push({
            taskId: task.id,
            previousStatus: previousTask.status,
          });
        }
        return acc;
      }, []);

      if (changedTaskIdsWithPreviousStatus.length > 0) {
        teamStore
          .getState()
          .handleChangedTasks(changedTaskIdsWithPreviousStatus);
      }
    }
  );
};
