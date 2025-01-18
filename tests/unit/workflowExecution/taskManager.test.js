import TaskManager from '../../../src/managers/taskManager';
import SequentialExecutionStrategy from '../../../src/managers/executionStrategies/sequentialExecutionStrategy';
import HierarchyExecutionStrategy from '../../../src/managers/executionStrategies/hierarchyExecutionStrategy';
import ManagerLLMStrategy from '../../../src/managers/executionStrategies/managerLLMExecutionStrategy';
import { createTeamStore } from '../../../src/stores/teamStore';

jest.mock(
  '../../../src/managers/executionStrategies/sequentialExecutionStrategy'
);
jest.mock(
  '../../../src/managers/executionStrategies/hierarchyExecutionStrategy'
);
jest.mock(
  '../../../src/managers/executionStrategies/managerLLMExecutionStrategy'
);

describe('TaskManager', () => {
  let mockStore;

  beforeAll(() => {
    mockStore = createTeamStore({
      name: 'Test Team',
      agents: [],
      tasks: [],
      inputs: {},
      env: null,
    });
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  test('should require useTeamStore to be initialized', () => {
    expect(() => new TaskManager()).toThrow(
      new Error('useTeamStore is required')
    );
    expect(() => new TaskManager(null)).toThrow(
      new Error('useTeamStore is required')
    );
    expect(() => new TaskManager(undefined)).toThrow(
      new Error('useTeamStore is required')
    );

    expect(() => new TaskManager(mockStore)).not.toThrow();
  });

  describe('Workflow-Execution-Strategies', () => {
    beforeEach(() => {
      SequentialExecutionStrategy.mockClear();
      HierarchyExecutionStrategy.mockClear();
      ManagerLLMStrategy.mockClear();
    });

    test('should create SequentialExecutionStrategy when flowType is missing', () => {
      const teamStore = createTeamStore({
        name: 'Test Team',
        agents: [],
        tasks: [],
        inputs: {},
        env: null,
      });
      const taskManager = new TaskManager(teamStore);
      taskManager.start();

      expect(SequentialExecutionStrategy).toHaveBeenCalledTimes(1);
      expect(HierarchyExecutionStrategy).toHaveBeenCalledTimes(0);
      expect(ManagerLLMStrategy).toHaveBeenCalledTimes(0);
      expect(SequentialExecutionStrategy).toHaveBeenCalledWith(teamStore);
    });

    test('should create SequentialExecutionStrategy when flowType is sequential', () => {
      const teamStore = createTeamStore({
        name: 'Test Team',
        agents: [],
        tasks: [],
        inputs: {},
        env: null,
        flowType: 'sequential',
      });

      const taskManager = new TaskManager(teamStore);
      taskManager.start();

      expect(SequentialExecutionStrategy).toHaveBeenCalledWith(teamStore);
      expect(SequentialExecutionStrategy).toHaveBeenCalledTimes(1);
      expect(HierarchyExecutionStrategy).toHaveBeenCalledTimes(0);
      expect(ManagerLLMStrategy).toHaveBeenCalledTimes(0);
    });

    test('should create HierarchyExecutionStrategy when flowType is hierarchy', () => {
      const teamStore = createTeamStore({
        name: 'Test Team',
        agents: [],
        tasks: [],
        inputs: {},
        env: null,
        flowType: 'hierarchy',
      });

      const taskManager = new TaskManager(teamStore);
      taskManager.start();

      expect(HierarchyExecutionStrategy).toHaveBeenCalledTimes(1);
      expect(HierarchyExecutionStrategy).toHaveBeenCalledWith(teamStore);
      expect(SequentialExecutionStrategy).toHaveBeenCalledTimes(0);
      expect(ManagerLLMStrategy).toHaveBeenCalledTimes(0);
    });
  });
});
