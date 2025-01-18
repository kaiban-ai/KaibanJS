import { Agent, Task } from '../../../src/index';
import HierarchyExecutionStrategy from '../../../src/managers/executionStrategies/hierarchyExecutionStrategy';
import TaskManager from '../../../src/managers/taskManager';
import { createTeamStore } from '../../../src/stores/teamStore';
import { TASK_STATUS_enum } from '../../../src/utils/enums';

const createTeamStoreWithHierarchicalFlow = () => {
  // Agent definitions
  const eventManagerAgent = new Agent({
    name: 'Peter Atlas',
    role: 'Oversees event planning and ensures smooth execution.',
    goal: 'Coordinate tasks and ensure timely execution.',
    background:
      'Expertise in event planning, resource allocation, and scheduling.',
  });

  const venueCoordinatorAgent = new Agent({
    name: 'Sophia Lore',
    role: 'Manages venue logistics.',
    goal: 'Confirm venue availability, arrange setup, and handle issues.',
    background: 'Knowledge of venue layouts, policies, and equipment setup.',
  });

  const cateringAgent = new Agent({
    name: 'Maxwell Journey',
    role: 'Organizes food and beverages for the event',
    goal: 'Deliver a catering plan and coordinate with vendors',
    background:
      'Experience with catering contracts, menu planning, and dietary requirements',
  });

  const marketingAgent = new Agent({
    name: 'Riley Morgan',
    role: 'Promotes the event and handles attendee registrations',
    goal: 'Drive attendance and manage guest lists',
    background:
      'Skilled in social media marketing, email campaigns, and analytics',
  });

  // Task definitions with dependencies
  const selectEventDateTask = new Task({
    id: 'selectEventDateTask',
    title: 'Select Event Date',
    description: 'Evaluates possible event dates based on constraints',
    expectedOutput: 'Selected event date with rationale',
    agent: eventManagerAgent,
  });

  const bookVenueTask = new Task({
    id: 'bookVenueTask',
    title: 'Book Venue',
    description: 'Contact venue and confirm booking',
    expectedOutput: 'Venue confirmation details',
    agent: venueCoordinatorAgent,
    dependencies: ['selectEventDateTask'],
  });

  const finalizeGuestListTask = new Task({
    id: 'finalizeGuestListTask',
    title: 'Finalize Guest List',
    description: 'Compile guest list and requirements',
    expectedOutput: 'Complete guest list with details',
    agent: marketingAgent,
    dependencies: ['selectEventDateTask'],
  });

  const createCateringPlanTask = new Task({
    id: 'createCateringPlanTask',
    title: 'Create Catering Plan',
    description: 'Plan menu and select vendors',
    expectedOutput: 'Detailed catering plan',
    agent: cateringAgent,
    dependencies: ['finalizeGuestListTask'],
  });

  const agents = [
    eventManagerAgent,
    venueCoordinatorAgent,
    cateringAgent,
    marketingAgent,
  ];
  const tasks = [
    selectEventDateTask,
    bookVenueTask,
    finalizeGuestListTask,
    createCateringPlanTask,
  ];

  return createTeamStore({
    name: 'Test Team',
    agents,
    tasks,
    inputs: {},
    env: null,
    flowType: 'hierarchy',
  });
};

describe('HierarchyExecutionStrategy', () => {
  let strategy;
  let store;
  let updateStatusOfMultipleTasksSpy;
  describe('execute', () => {
    beforeEach(() => {
      store = createTeamStore({
        name: 'Test Team',
        tasks: [],
        agents: [],
        inputs: {},
        env: null,
        flowType: 'hierarchy',
      });

      strategy = new HierarchyExecutionStrategy(store);

      updateStatusOfMultipleTasksSpy = jest.spyOn(
        store.getState(),
        'updateStatusOfMultipleTasks'
      );
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    test('should execute independent tasks in parallel', async () => {
      const tasks = [
        { id: 'selectEventDateTask', status: TASK_STATUS_enum.DONE },
        {
          id: 'bookVenueTask',
          status: TASK_STATUS_enum.TODO,
          dependencies: ['selectEventDateTask'],
        },
        {
          id: 'finalizeGuestListTask',
          status: TASK_STATUS_enum.TODO,
          dependencies: ['selectEventDateTask'],
        },
      ];

      store.setState({ tasks });

      await strategy.execute(
        [store.getState().tasks[0]],
        store.getState().tasks
      );

      expect(updateStatusOfMultipleTasksSpy).toHaveBeenCalledWith(
        ['bookVenueTask', 'finalizeGuestListTask'],
        TASK_STATUS_enum.DOING
      );
    });

    test('should respect task dependencies', async () => {
      const tasks = [
        {
          id: 'createCateringPlanTask',
          status: TASK_STATUS_enum.TODO,
          dependencies: ['finalizeGuestListTask'],
        },
        {
          id: 'finalizeGuestListTask',
          status: TASK_STATUS_enum.TODO,
          dependencies: ['selectEventDateTask'],
        },
        { id: 'selectEventDateTask', status: TASK_STATUS_enum.DONE },
      ];

      store.setState({ tasks });

      const selectEventDateTask = store
        .getState()
        .tasks.find((t) => t.id === 'selectEventDateTask');

      // Start with selectEventDate
      await strategy.execute([selectEventDateTask], store.getState().tasks);

      expect(updateStatusOfMultipleTasksSpy).toHaveBeenCalledWith(
        ['finalizeGuestListTask'],
        TASK_STATUS_enum.DOING
      );

      // update finalizeGuestListTask to DONE status in the store
      const finalizeGuestListTask = store
        .getState()
        .tasks.find((t) => t.id === 'finalizeGuestListTask');
      store
        .getState()
        .updateTaskStatus(finalizeGuestListTask.id, TASK_STATUS_enum.DONE);

      await strategy.execute([finalizeGuestListTask], store.getState().tasks);

      expect(updateStatusOfMultipleTasksSpy).toHaveBeenCalledWith(
        ['createCateringPlanTask'],
        TASK_STATUS_enum.DOING
      );

      // update createCateringPlanTask to DONE status in the store
      const createCateringPlanTask = store
        .getState()
        .tasks.find((t) => t.id === 'createCateringPlanTask');
      store
        .getState()
        .updateTaskStatus(createCateringPlanTask.id, TASK_STATUS_enum.DONE);

      await strategy.execute([createCateringPlanTask], store.getState().tasks);

      expect(updateStatusOfMultipleTasksSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('full workflow', () => {
    beforeEach(() => {
      store = createTeamStoreWithHierarchicalFlow();
      const taskManager = new TaskManager(store);
      taskManager.start();
      strategy = taskManager.strategy;
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    test('should execute tasks respecting dependencies', async () => {
      const executionOrder = [];

      const workOnTaskSpy = jest
        .spyOn(store.getState(), 'workOnTask')
        .mockImplementation(async (agent, task) => {
          executionOrder.push(task.id);
          store.getState().updateTaskStatus(task.id, TASK_STATUS_enum.DONE);
        });

      // Start first task
      const tasks = store.getState().tasks;
      const firstTask = tasks.find((t) => !t.dependencies?.length);
      store.getState().workOnTask(firstTask.agent, firstTask);

      // Wait for workflow completion
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

      // Verify execution order respects dependencies
      expect(executionOrder).toContain('selectEventDateTask');
      expect(executionOrder.indexOf('bookVenueTask')).toBeGreaterThan(
        executionOrder.indexOf('selectEventDateTask')
      );
      expect(executionOrder.indexOf('finalizeGuestListTask')).toBeGreaterThan(
        executionOrder.indexOf('selectEventDateTask')
      );
      expect(executionOrder.indexOf('createCateringPlanTask')).toBeGreaterThan(
        executionOrder.indexOf('finalizeGuestListTask')
      );
      expect(executionOrder).toHaveLength(tasks.length);
      expect(workOnTaskSpy).toHaveBeenCalledTimes(tasks.length);
    });
  });
});
