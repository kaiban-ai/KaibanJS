import WorkflowExecutionStrategy from './workflowExecutionStrategy';

class ManagerLLMStrategy extends WorkflowExecutionStrategy {
  constructor(useTeamStore) {
    super(useTeamStore);
  }

  execute(_changedTasks, _allTasks) {
    // TODO: Implement ManagerLLMStrategy.execute()
    throw new Error('ManagerLLMStrategy.execute() not implemented');
  }
}

export default ManagerLLMStrategy;
