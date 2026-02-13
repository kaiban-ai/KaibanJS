import { vi } from 'vitest';

/**
 * Setup test environment variables
 *
 * These variables are required by PilotSourcingKaibanController.build() but are not
 * needed in tests since we mock the Kaiban SDK and KaibanJS.
 */
process.env.KAIBAN_TENANT = 'test-tenant';
process.env.KAIBAN_API_TOKEN = 'test-token';
process.env.KAIBAN_PILOT_SOURCING_AGENT_ID = 'test-agent-id';
process.env.OPENAI_API_KEY = 'test-openai-key';

/**
 * Mock @kaiban/sdk to avoid requiring Kaiban platform runtime in tests.
 *
 * This mock provides stub implementations of all KaibanClient methods
 * used by the Pilot Sourcing Agent, allowing tests to run without
 * connecting to a real Kaiban platform instance.
 */
vi.mock('@kaiban/sdk', () => {
  return {
    createKaibanClient: vi.fn(() => ({
      // Agent operations
      agents: {
        get: vi.fn(async (id: string) => ({
          id,
          name: 'Pilot Sourcing Agent',
          type: 'agent',
        })),
      },

      // Card operations
      cards: {
        get: vi.fn(async (id: string) => ({
          id,
          description: 'Test card description',
          column_key: 'todo',
          status: 'todo',
          board_id: 'test-board',
          team_id: 'test-team',
        })),
        update: vi.fn(async () => ({})),
        createBatchActivities: vi.fn(async () => ({})),
      },
    })),

    // Export enums and types used in the code
    ActivityType: {
      CARD_CREATED: 'CARD_CREATED',
      CARD_CLONED: 'CARD_CLONED',
      CARD_AGENT_ADDED: 'CARD_AGENT_ADDED',
      CARD_COLUMN_CHANGED: 'CARD_COLUMN_CHANGED',
      CARD_STATUS_CHANGED: 'CARD_STATUS_CHANGED',
    },

    CardStatus: {
      TODO: 'todo',
      DOING: 'doing',
      DONE: 'done',
      BLOCKED: 'blocked',
    },

    A2ADataPartType: {
      KAIBAN_ACTIVITY: 'kaiban_activity',
    },
  };
});

/**
 * Mock kaibanjs to avoid requiring actual KaibanJS execution in tests
 */
vi.mock('kaibanjs', () => {
  return {
    Agent: vi.fn().mockImplementation((config: any) => ({
      ...config,
      type: config.type || 'Agent',
    })),
    Task: vi.fn().mockImplementation((config: any) => ({
      ...config,
    })),
    Team: vi.fn().mockImplementation((config: any) => ({
      ...config,
      start: vi.fn(async () => ({
        result: {
          excelUrl: 'http://example.com/sample.xlsx',
          flightRequest: 'Test flight request',
          filters: {},
        },
      })),
    })),
  };
});
