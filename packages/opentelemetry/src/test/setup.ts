import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';

// Mock OpenTelemetry API for testing
vi.mock('@opentelemetry/api', () => ({
  trace: {
    getTracer: vi.fn(() => ({
      startSpan: vi.fn(),
      withSpan: vi.fn(),
    })),
  },
  SpanStatusCode: {
    OK: 1,
    ERROR: 2,
    UNSET: 0,
  },
  context: {
    active: vi.fn(),
  },
}));

// Mock KaibanJS Team for testing
vi.mock('kaibanjs', () => ({
  Team: vi.fn().mockImplementation(() => ({
    onWorkflowStatusChange: vi.fn(),
    subscribeToChanges: vi.fn(),
    getStore: vi.fn(() => ({
      subscribe: vi.fn(),
      getState: vi.fn(() => ({
        teamName: 'Test Team',
        workflowLogs: [],
      })),
    })),
  })),
}));

beforeAll(() => {
  // Global test setup
});

beforeEach(() => {
  // Reset mocks before each test
  vi.clearAllMocks();
});

afterEach(() => {
  // Cleanup after each test
});

afterAll(() => {
  // Global test cleanup
});
