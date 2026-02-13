import { vi } from 'vitest';

process.env.KAIBAN_TENANT = 'test-tenant';
process.env.KAIBAN_API_TOKEN = 'test-token';
process.env.KAIBAN_GROUP_BOOKING_QUOTE_AGENT_ID = 'test-agent-id';
process.env.OPENAI_API_KEY = 'test-openai-key';

vi.mock('@kaiban/sdk', () => {
  return {
    A2ADataPartType: {
      KAIBAN_ACTIVITY: 'kaiban_activity',
    },
  };
});

vi.mock(
  '../src/agents/airline-group-booking-quote/controller/kaiban-mcp-client',
  () => ({
    getKaibanTools: vi.fn(async () => []),
    getCard: vi.fn(async (cardId: string) => ({
      id: cardId,
      description: 'We need a quote for 25 people LHR to MIA, 15 March 2026.',
      column_key: 'todo',
      status: 'todo',
      board_id: 'test-board',
      team_id: 'test-team',
    })),
    moveCardToBlocked: vi.fn(async () => {}),
  })
);

vi.mock('kaibanjs', () => {
  return {
    Agent: vi.fn().mockImplementation((config: Record<string, unknown>) => ({
      ...config,
      type: config.type || 'Agent',
    })),
    Task: vi.fn().mockImplementation((config: Record<string, unknown>) => ({
      ...config,
    })),
    Team: vi.fn().mockImplementation((config: Record<string, unknown>) => ({
      ...config,
      start: vi.fn(async () => ({
        result: {
          valid: true,
          origin: 'LHR',
          destination: 'MIA',
          paxCount: 25,
          totalPrice: 12350,
          currency: 'USD',
        },
      })),
    })),
  };
});
