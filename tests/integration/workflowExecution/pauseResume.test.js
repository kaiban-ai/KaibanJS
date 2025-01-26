import { Team, Task, Agent } from '../../../src';
import { ReactChampionAgent } from '../../../src/agents/reactChampionAgent';
import {
  TASK_STATUS_enum,
  WORKFLOW_STATUS_enum,
} from '../../../src/utils/enums';

// Mock fetch for API calls
global.fetch = jest.fn();

// Helper to create a mock response
const createMockResponse = (data) => ({
  ok: true,
  json: () => Promise.resolve(data),
  headers: new Headers({
    'content-type': 'application/json',
  }),
});

// Mock delay helper
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

describe('Workflow Pause/Resume Integration Tests', () => {
  let mockAgenticLoop;

  beforeEach(() => {
    // Reset fetch mock
    global.fetch.mockReset();

    // Mock the agenticLoop method
    mockAgenticLoop = jest.spyOn(ReactChampionAgent.prototype, 'agenticLoop');
    mockAgenticLoop.mockImplementation(async () => ({
      result: 'Mock result',
      metadata: { iterations: 1, maxAgentIterations: 5 },
    }));

    // Mock fetch with delay
    global.fetch.mockImplementation(async () => {
      await delay(100);
      return createMockResponse({
        choices: [{ message: { content: 'Mock response' } }],
      });
    });
  });

  afterEach(() => {
    mockAgenticLoop.mockRestore();
  });

  describe('Sequential Workflow', () => {
    let team;
    let citySelectorAgent;
    let localExpertAgent;
    let travelConciergeAgent;
    let tasks;
    beforeEach(() => {
      // Create agents for trip planning
      citySelectorAgent = new Agent({
        name: 'Peter Atlas',
        role: 'City Selection Expert',
        goal: 'Select the best city based on weather, season, and prices',
        background:
          'An expert in analyzing travel data to pick ideal destinations',
        llmConfig: {
          model: 'gpt-3.5-turbo',
          temperature: 0.7,
          provider: 'openai',
        },
      });

      localExpertAgent = new Agent({
        name: 'Sophia Lore',
        role: 'Local Expert at this city',
        goal: 'Provide the BEST insights about the selected city',
        background:
          'A knowledgeable local guide with extensive information about the city',
        llmConfig: {
          model: 'gpt-3.5-turbo',
          temperature: 0.7,
          provider: 'openai',
        },
      });

      travelConciergeAgent = new Agent({
        name: 'Maxwell Journey',
        role: 'Amazing Travel Concierge',
        goal: 'Create the most amazing travel itineraries with budget and packing suggestions',
        background:
          'Specialist in travel planning and logistics with decades of experience',
        llmConfig: {
          model: 'gpt-3.5-turbo',
          temperature: 0.7,
          provider: 'openai',
        },
      });

      tasks = [
        new Task({
          id: 'identifyTask',
          description:
            'Analyze and select the best city for the trip based on specific criteria',
          expectedOutput: 'Detailed report on the chosen city',
          agent: citySelectorAgent,
        }),
        new Task({
          id: 'gatherTask',
          description: 'Compile an in-depth guide for the selected city',
          expectedOutput: 'A comprehensive city guide',
          agent: localExpertAgent,
          dependencies: ['identifyTask'],
        }),
        new Task({
          id: 'planTask',
          description: 'Develop a full 7-day travel itinerary',
          expectedOutput: 'A complete expanded travel plan',
          agent: travelConciergeAgent,
          dependencies: ['gatherTask'],
        }),
      ];

      team = new Team({
        name: 'Trip Planning Team',
        agents: [citySelectorAgent, localExpertAgent, travelConciergeAgent],
        tasks,
        flowType: 'sequential',
        inputs: {
          origin: 'New York',
          cities: ['Tokyo', 'Paris', 'Berlin'],
          interests: 'Art and Culture',
          range: '2024-12-01 to 2024-12-15',
        },
      });
    });

    it('should pause and resume first task correctly', async () => {
      // Start workflow
      const workflowPromise = team.start();

      // Get store to monitor logs
      const store = team.getStore();

      // Wait for the first agent (citySelectorAgent) to start working
      await new Promise((resolve) => {
        const unsubscribe = store.subscribe(
          (state) => state.workflowLogs,
          (logs) => {
            const hasAgentStarted = logs.some(
              (log) =>
                log.logType === 'AgentStatusUpdate' &&
                log.agent.name === citySelectorAgent.name &&
                log.task.id === 'identifyTask'
            );

            if (hasAgentStarted) {
              unsubscribe();
              resolve();
            }
          }
        );
      });

      // Pause workflow
      await team.pause();

      // Get current state
      const state = store.getState();

      // Verify pause state
      expect(state.teamWorkflowStatus).toBe(WORKFLOW_STATUS_enum.PAUSED);
      expect(state.tasks[0].status).toBe(TASK_STATUS_enum.PAUSED); // identifyTask
      expect(state.taskQueue.isPaused()).toBe(true);

      // Verify agenticLoop was called before pause
      expect(mockAgenticLoop).toHaveBeenCalledTimes(1);

      // Clear mock calls
      mockAgenticLoop.mockClear();

      // Resume workflow
      await team.resume();

      // Verify resume state
      expect(state.teamWorkflowStatus).toBe(WORKFLOW_STATUS_enum.RUNNING);
      expect(state.tasks[0].status).toBe(TASK_STATUS_enum.DOING);
      expect(state.taskQueue.isPaused()).toBe(false);

      // Complete workflow
      await workflowPromise;
    });

    it('should pause and resume intermediate task correctly', async () => {
      // Start workflow
      const workflowPromise = team.start();

      // Wait for first task to complete and second to start
      await delay(300);

      // Pause workflow
      await team.pause();

      const store = team.getStore();
      const state = store.getState();

      // Verify pause state for gatherTask
      expect(state.teamWorkflowStatus).toBe(WORKFLOW_STATUS_enum.PAUSED);
      expect(state.tasks[1].status).toBe(TASK_STATUS_enum.PAUSED); // gatherTask
      expect(state.taskQueue.isPaused()).toBe(true);

      // Clear mock calls
      mockAgenticLoop.mockClear();

      // Resume workflow
      await team.resume();

      // Verify resume state
      expect(state.teamWorkflowStatus).toBe(WORKFLOW_STATUS_enum.RUNNING);
      expect(state.tasks[1].status).toBe(TASK_STATUS_enum.DOING);
      expect(state.taskQueue.isPaused()).toBe(false);

      // Complete workflow
      await workflowPromise;
    });

    it('should pause and resume last task correctly', async () => {
      // Start workflow
      const workflowPromise = team.start();

      // Wait for first two tasks to complete and last to start
      await delay(500);

      // Pause workflow
      await team.pause();

      const store = team.getStore();
      const state = store.getState();

      // Verify pause state for planTask
      expect(state.teamWorkflowStatus).toBe(WORKFLOW_STATUS_enum.PAUSED);
      expect(state.tasks[2].status).toBe(TASK_STATUS_enum.PAUSED); // planTask
      expect(state.taskQueue.isPaused()).toBe(true);

      // Clear mock calls
      mockAgenticLoop.mockClear();

      // Resume workflow
      await team.resume();

      // Verify resume state
      expect(state.teamWorkflowStatus).toBe(WORKFLOW_STATUS_enum.RUNNING);
      expect(state.tasks[2].status).toBe(TASK_STATUS_enum.DOING);
      expect(state.taskQueue.isPaused()).toBe(false);

      // Complete workflow
      await workflowPromise;
    });
  });

  describe('Hierarchy Workflow', () => {
    let team;

    beforeEach(() => {
      // Create agents with event planning roles
      const eventManagerAgent = new Agent({
        name: 'Peter Atlas',
        role: 'Oversees event planning and ensures smooth execution',
        goal: 'Coordinate tasks and ensure timely execution',
        background:
          'Expertise in event planning, resource allocation, and scheduling',
        llmConfig: {
          model: 'gpt-3.5-turbo',
          temperature: 0.7,
          provider: 'openai',
        },
      });

      const venueCoordinatorAgent = new Agent({
        name: 'Sophia Lore',
        role: 'Manages venue logistics',
        goal: 'Confirm venue availability, arrange setup, and handle issues',
        background: 'Knowledge of venue layouts, policies, and equipment setup',
        llmConfig: {
          model: 'gpt-3.5-turbo',
          temperature: 0.7,
          provider: 'openai',
        },
      });

      const marketingAgent = new Agent({
        name: 'Riley Morgan',
        role: 'Promotes the event and handles attendee registrations',
        goal: 'Drive attendance and manage guest lists',
        background:
          'Skilled in social media marketing, email campaigns, and analytics',
        llmConfig: {
          model: 'gpt-3.5-turbo',
          temperature: 0.7,
          provider: 'openai',
        },
      });

      const cateringAgent = new Agent({
        name: 'Maxwell Journey',
        role: 'Organizes food and beverages for the event',
        goal: 'Deliver a catering plan and coordinate with vendors',
        background:
          'Experience with catering contracts, menu planning, and dietary requirements',
        llmConfig: {
          model: 'gpt-3.5-turbo',
          temperature: 0.7,
          provider: 'openai',
        },
      });

      // Define tasks with dependencies
      const tasks = [
        new Task({
          id: 'selectEventDate',
          description: 'Select event date based on stakeholder availability',
          agent: eventManagerAgent,
        }),
        new Task({
          id: 'bookVenue',
          description: 'Book venue and handle logistics',
          agent: venueCoordinatorAgent,
          dependencies: ['selectEventDate'],
        }),
        new Task({
          id: 'finalizeGuestList',
          description: 'Compile and finalize guest list',
          agent: marketingAgent,
          dependencies: ['selectEventDate'],
        }),
        new Task({
          id: 'createCateringPlan',
          description: 'Create menu and select vendors',
          agent: cateringAgent,
          dependencies: ['selectEventDate', 'finalizeGuestList'],
        }),
        new Task({
          id: 'setupMarketing',
          description: 'Develop marketing plan and strategy',
          agent: marketingAgent,
          dependencies: ['bookVenue'],
        }),
        new Task({
          id: 'coordinateSetup',
          description: 'Coordinate final venue setup',
          agent: venueCoordinatorAgent,
          dependencies: ['bookVenue', 'createCateringPlan'],
        }),
        new Task({
          id: 'executeMarketing',
          description: 'Execute the marketing campaign',
          agent: marketingAgent,
          dependencies: ['setupMarketing'],
        }),
        new Task({
          id: 'finalInspection',
          description: 'Final inspection and approval',
          agent: eventManagerAgent,
          dependencies: ['coordinateSetup', 'executeMarketing'],
        }),
      ];

      team = new Team({
        name: 'Event Planning Team',
        agents: [
          eventManagerAgent,
          venueCoordinatorAgent,
          marketingAgent,
          cateringAgent,
        ],
        tasks,
        flowType: 'hierarchy',
      });
    });

    it('should pause and resume parallel tasks correctly', async () => {
      // Start workflow
      const workflowPromise = team.start();

      // Wait for first task to complete and parallel tasks to start
      await delay(300);

      // Pause workflow
      await team.pause();

      const store = team.getStore();
      const state = store.getState();

      // Verify pause state for parallel tasks (bookVenue and finalizeGuestList)
      expect(state.teamWorkflowStatus).toBe(WORKFLOW_STATUS_enum.PAUSED);
      expect(state.tasks[1].status).toBe(TASK_STATUS_enum.PAUSED); // bookVenue
      expect(state.tasks[2].status).toBe(TASK_STATUS_enum.PAUSED); // finalizeGuestList
      expect(state.taskQueue.isPaused()).toBe(true);

      // Clear mock calls
      mockAgenticLoop.mockClear();

      // Resume workflow
      await team.resume();

      // Verify resume state
      expect(state.teamWorkflowStatus).toBe(WORKFLOW_STATUS_enum.RUNNING);
      expect(state.tasks[1].status).toBe(TASK_STATUS_enum.DOING);
      expect(state.tasks[2].status).toBe(TASK_STATUS_enum.DOING);
      expect(state.taskQueue.isPaused()).toBe(false);

      // Complete workflow
      await workflowPromise;
    });

    it('should pause and resume mid-level parallel tasks correctly', async () => {
      // Start workflow
      const workflowPromise = team.start();

      // Wait for initial tasks to complete and mid-level tasks to start
      await delay(600);

      // Pause workflow
      await team.pause();

      const store = team.getStore();
      const state = store.getState();

      // Verify pause state for setupMarketing and createCateringPlan tasks
      expect(state.teamWorkflowStatus).toBe(WORKFLOW_STATUS_enum.PAUSED);
      expect(state.tasks[3].status).toBe(TASK_STATUS_enum.PAUSED); // createCateringPlan
      expect(state.tasks[4].status).toBe(TASK_STATUS_enum.PAUSED); // setupMarketing
      expect(state.taskQueue.isPaused()).toBe(true);

      // Clear mock calls
      mockAgenticLoop.mockClear();

      // Resume workflow
      await team.resume();

      // Verify resume state
      expect(state.teamWorkflowStatus).toBe(WORKFLOW_STATUS_enum.RUNNING);
      expect(state.tasks[3].status).toBe(TASK_STATUS_enum.DOING);
      expect(state.tasks[4].status).toBe(TASK_STATUS_enum.DOING);
      expect(state.taskQueue.isPaused()).toBe(false);

      // Complete workflow
      await workflowPromise;
    });

    it('should pause and resume final task correctly', async () => {
      // Start workflow
      const workflowPromise = team.start();

      // Wait for all previous tasks to complete and final task to start
      await delay(1000);

      // Pause workflow
      await team.pause();

      const store = team.getStore();
      const state = store.getState();

      // Verify pause state for final inspection task
      expect(state.teamWorkflowStatus).toBe(WORKFLOW_STATUS_enum.PAUSED);
      expect(state.tasks[7].status).toBe(TASK_STATUS_enum.PAUSED); // finalInspection
      expect(state.taskQueue.isPaused()).toBe(true);

      // Clear mock calls
      mockAgenticLoop.mockClear();

      // Resume workflow
      await team.resume();

      // Verify resume state
      expect(state.teamWorkflowStatus).toBe(WORKFLOW_STATUS_enum.RUNNING);
      expect(state.tasks[7].status).toBe(TASK_STATUS_enum.DOING);
      expect(state.taskQueue.isPaused()).toBe(false);

      // Complete workflow
      await workflowPromise;
    });
  });
});
