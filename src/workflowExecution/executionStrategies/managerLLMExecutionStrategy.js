import WorkflowExecutionStrategy from './workflowExecutionStrategy';

class ManagerLLMStrategy extends WorkflowExecutionStrategy {
  executeFromChangedTasks(_teamStore, _changedTaskIds) {
    // TODO: Implement ManagerLLMStrategy.execute()
    throw new Error('ManagerLLMStrategy.execute() not implemented');
  }
}

export default ManagerLLMStrategy;
