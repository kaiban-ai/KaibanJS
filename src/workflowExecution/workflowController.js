import DeterministicExecutionStrategy from './executionStrategies/deterministicExecutionStrategy';

export const setupWorkflowController = (teamStore) => {
  // create execution strategy
  const executionStrategy = new DeterministicExecutionStrategy(teamStore);

  teamStore.getState().setWorkflowExecutionStrategy(executionStrategy);
};
