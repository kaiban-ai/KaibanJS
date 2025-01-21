export const setupWorkflowController = (teamStore) => {
  teamStore.subscribe(
    (state) => state.tasks,
    (tasks, previousTasks) => {
      const changedTaskIds = tasks
        .filter(
          (task) =>
            task.status !== previousTasks.find((t) => t.id === task.id)?.status
        )
        .map((task) => task.id);

      if (changedTaskIds.length > 0) {
        teamStore.getState().handleChangedTasks(changedTaskIds);
      }
    }
  );
};
