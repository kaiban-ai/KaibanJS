import { Agent, Task } from '../../../src/index';
import SequentialExecutionStrategy from '../../../src/managers/executionStrategies/sequentialExecutionStrategy';
import TaskManager from '../../../src/managers/taskManager';
import { createTeamStore } from '../../../src/stores/teamStore';
import { TASK_STATUS_enum } from '../../../src/utils/enums';
const createTeamStoreWithSequentialFlow = () => {
  // Agent definitions
  const researchAgent = new Agent({
    name: 'Research Agent',
    role: 'Research Specialist',
    goal: 'Gather and analyze initial requirements',
    background: 'Expert in requirements gathering and analysis',
  });

  const designAgent = new Agent({
    name: 'Design Agent',
    role: 'System Designer',
    goal: 'Create system architecture and design',
    background: 'Experienced software architect',
  });

  const developAgent = new Agent({
    name: 'Development Agent',
    role: 'Developer',
    goal: 'Implement core functionality',
    background: 'Senior software developer',
  });

  const testAgent = new Agent({
    name: 'Test Agent',
    role: 'QA Engineer',
    goal: 'Verify system functionality',
    background: 'Quality assurance specialist',
  });

  const deployAgent = new Agent({
    name: 'Deploy Agent',
    role: 'DevOps Engineer',
    goal: 'Deploy and configure system',
    background: 'DevOps and deployment expert',
  });

  // Task definitions
  const task1 = new Task({
    title: 'Requirements Analysis',
    description: 'Gather and analyze project requirements',
    expectedOutput: 'Detailed requirements document',
    agent: researchAgent,
    id: 'task1',
  });

  const task2 = new Task({
    title: 'System Design',
    description: 'Create system architecture and design specifications',
    expectedOutput: 'Architecture and design documents',
    agent: designAgent,
    id: 'task2',
  });

  const task3 = new Task({
    title: 'Implementation',
    description: 'Develop core system functionality',
    expectedOutput: 'Working code implementation',
    agent: developAgent,
    id: 'task3',
  });

  const task4 = new Task({
    title: 'Testing',
    description: 'Perform system testing and validation',
    expectedOutput: 'Test results and bug reports',
    agent: testAgent,
    id: 'task4',
  });

  const task5 = new Task({
    title: 'Deployment',
    description: 'Deploy and configure the system',
    expectedOutput: 'Deployed and running system',
    agent: deployAgent,
    id: 'task5',
  });

  const agents = [
    researchAgent,
    designAgent,
    developAgent,
    testAgent,
    deployAgent,
  ];
  const tasks = [task1, task2, task3, task4, task5];

  const teamStore = createTeamStore({
    name: 'Test Team',
    agents,
    tasks,
    inputs: {},
    env: null,
    flowType: 'sequential',
  });

  return teamStore;
};

describe('SequentialExecutionStrategy', () => {
  let strategy;
  let store;

  describe('execute', () => {
    beforeEach(() => {
      store = createTeamStore({
        name: 'Test Team',
        tasks: [],
        agents: [],
        inputs: {},
        env: null,
        flowType: 'sequential',
      });

      strategy = new SequentialExecutionStrategy(store);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    test('should queue task when status changes to DOING', async () => {
      const tasks = [
        { id: 'task1', status: TASK_STATUS_enum.TODO },
        { id: 'task2', status: TASK_STATUS_enum.TODO },
        { id: 'task3', status: TASK_STATUS_enum.TODO },
        { id: 'task4', status: TASK_STATUS_enum.TODO },
      ];

      store.setState({ tasks });

      const task1 = store.getState().tasks.find((t) => t.id === 'task1');
      task1.status = TASK_STATUS_enum.DOING;

      const taskQueuePushSpy = jest.spyOn(strategy.taskQueue, 'push');

      await strategy.execute([task1], store.getState().tasks);

      expect(taskQueuePushSpy).toHaveBeenCalledWith(task1);
    });

    test('should move subsequent tasks to TODO when task is revised', async () => {
      const tasks = [
        { id: 'task1', status: TASK_STATUS_enum.DONE },
        { id: 'task2', status: TASK_STATUS_enum.REVISE },
        { id: 'task3', status: TASK_STATUS_enum.DOING },
        { id: 'task4', status: TASK_STATUS_enum.TODO },
      ];

      store.setState({ tasks });

      const changedTask = tasks[1]; // task2 in REVISE status

      const updateTaskStatusSpy = jest.spyOn(
        store.getState(),
        'updateTaskStatus'
      );

      await strategy.execute([changedTask], tasks);

      // Verify subsequent tasks were moved to TODO
      expect(updateTaskStatusSpy).toHaveBeenCalledWith(
        'task3',
        TASK_STATUS_enum.TODO
      );
      expect(updateTaskStatusSpy).toHaveBeenCalledWith(
        'task4',
        TASK_STATUS_enum.TODO
      );
    });

    test('should queue next TODO task when current task is done', async () => {
      const tasks = [
        { id: 'task1', status: TASK_STATUS_enum.DONE },
        { id: 'task2', status: TASK_STATUS_enum.TODO },
        { id: 'task3', status: TASK_STATUS_enum.TODO },
      ];

      store.setState({ tasks });

      const changedTask = tasks[0]; // Completed task

      const updateTaskStatusSpy = jest.spyOn(
        store.getState(),
        'updateTaskStatus'
      );

      await strategy.execute([changedTask], tasks);

      // Should queue the next TODO task (task2)
      expect(updateTaskStatusSpy).toHaveBeenCalledWith(
        'task2',
        TASK_STATUS_enum.DOING
      );
    });

    test('should not queue next task if no TODO tasks remain', async () => {
      const tasks = [
        { id: 'task1', status: TASK_STATUS_enum.DONE },
        { id: 'task2', status: TASK_STATUS_enum.DONE },
        { id: 'task3', status: TASK_STATUS_enum.DONE },
      ];

      store.setState({ tasks });

      const changedTask = tasks[2]; // Last completed task
      const taskQueuePushSpy = jest.spyOn(strategy.taskQueue, 'push');

      await strategy.execute([changedTask], tasks);

      expect(taskQueuePushSpy).not.toHaveBeenCalled();
    });
  });

  describe('full workflow', () => {
    let strategyExecuteSpy;

    beforeEach(() => {
      store = createTeamStoreWithSequentialFlow();
      const taskManager = new TaskManager(store);
      taskManager.start();
      strategy = taskManager.strategy;
      strategyExecuteSpy = jest.spyOn(strategy, 'execute');
    });

    afterEach(() => {
      strategyExecuteSpy.mockRestore();
      jest.clearAllMocks();
    });

    test('should execute all tasks sequentially', async function () {
      const executionOrder = [];

      const workOnTaskSpy = jest
        .spyOn(store.getState(), 'workOnTask')
        .mockImplementation(async (agent, task) => {
          executionOrder.push(task.id);
          store.getState().updateTaskStatus(task.id, TASK_STATUS_enum.DONE);
        });

      // Start first task
      const tasks = store.getState().tasks;
      const firstTask = tasks[0];
      store.getState().workOnTask(firstTask.agent, firstTask);

      // Wait for workflow to complete by checking status every 100ms
      await new Promise((resolve) => {
        const checkWorkflow = setInterval(() => {
          const tasks = store.getState().tasks;
          const allDone = tasks.every(
            (task) => task.status === TASK_STATUS_enum.DONE
          );
          if (allDone) {
            clearInterval(checkWorkflow);
            resolve();
          }
        }, 200);
      });

      expect(executionOrder).toEqual(tasks.map((task) => task.id));
      expect(workOnTaskSpy).toHaveBeenCalledTimes(tasks.length);
    });

    test('should handle task revision correctly', async () => {
      const executionOrder = [];

      // Mock workOnTask to track execution and trigger revision
      let task3Updated = false;

      const workOnTaskSpy = jest
        .spyOn(store.getState(), 'workOnTask')
        .mockImplementation(async (agent, task) => {
          executionOrder.push(task.id);

          // Trigger revision for task3
          if (task.id === 'task3' && !task3Updated) {
            store.getState().updateTaskStatus(task.id, TASK_STATUS_enum.REVISE);
            task3Updated = true;
          } else {
            store.getState().updateTaskStatus(task.id, TASK_STATUS_enum.DONE);
          }
        });

      // Start first task
      const tasks = store.getState().tasks;
      const firstTask = tasks[0];
      store.getState().workOnTask(firstTask.agent, firstTask);

      // Wait for workflow to complete by checking status every 100ms
      await new Promise((resolve) => {
        const checkWorkflow = setInterval(() => {
          const tasks = store.getState().tasks;
          const allDone = tasks.every(
            (task) => task.status === TASK_STATUS_enum.DONE
          );
          if (allDone) {
            clearInterval(checkWorkflow);
            resolve();
          }
        }, 200);
      });

      expect(executionOrder).toEqual([
        'task1',
        'task2',
        'task3',
        'task3',
        'task4',
        'task5',
      ]);
      expect(workOnTaskSpy).toHaveBeenCalledTimes(tasks.length + 1);
    });
  });
});
