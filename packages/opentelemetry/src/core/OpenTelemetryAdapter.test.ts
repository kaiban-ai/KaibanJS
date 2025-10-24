import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenTelemetryAdapter } from './OpenTelemetryAdapter';
import type { OpenTelemetryConfig } from '../types';

// Mock Team
const mockStore = {
  subscribe: vi.fn(),
  getState: vi.fn(() => ({
    teamName: 'Test Team',
    workflowLogs: [],
  })),
};

const mockTeam = {
  onWorkflowStatusChange: vi.fn(),
  subscribeToChanges: vi.fn(),
  getStore: vi.fn(() => mockStore),
};

// Mock simplified task mapper
const mockTaskMapper = {
  mapTaskLogToSpan: vi.fn(),
  mapAgentThinkingToSpan: vi.fn(),
};

// Mock SpanManager
const _mockSpanManager = {
  startSpan: vi.fn(),
  endSpan: vi.fn(),
  addEvent: vi.fn(),
};

// Mock KaibanSpanContext
const mockContext = {
  teamName: 'Test Team',
  workflowId: 'Test Team-1234567890',
  taskSpans: new Map(),
  toolSpans: new Map(),
  setRootSpan: vi.fn(),
  getRootSpan: vi.fn(),
  setTaskSpan: vi.fn(),
  getTaskSpan: vi.fn(),
  removeTaskSpan: vi.fn(),
  setToolSpan: vi.fn(),
  getToolSpan: vi.fn(),
  removeToolSpan: vi.fn(),
};

vi.mock('./SpanManager');
vi.mock('./KaibanSpanContext');
// Mock the SimpleTaskMapper directly
vi.mock('../mappers/SimpleTaskMapper', () => ({
  SimpleTaskMapper: vi.fn().mockImplementation(() => mockTaskMapper),
}));

describe('OpenTelemetryAdapter', () => {
  let adapter: OpenTelemetryAdapter;
  let config: OpenTelemetryConfig;

  beforeEach(() => {
    vi.clearAllMocks();

    config = {
      enabled: true,
      sampling: {
        rate: 1.0,
        strategy: 'always',
      },
      attributes: {
        includeSensitiveData: false,
        customAttributes: {},
      },
    };

    adapter = new OpenTelemetryAdapter(config);
  });

  describe('constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(adapter).toBeInstanceOf(OpenTelemetryAdapter);
    });
  });

  describe('integrateWithTeam', () => {
    it('should integrate with team when enabled', () => {
      adapter.integrateWithTeam(mockTeam as any);

      expect(mockStore.subscribe).toHaveBeenCalled();
    });

    it('should not integrate when disabled', () => {
      config.enabled = false;
      adapter = new OpenTelemetryAdapter(config);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      adapter.integrateWithTeam(mockTeam as any);

      expect(consoleSpy).toHaveBeenCalledWith(
        '🔍 OpenTelemetry observability is disabled'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('processLogEntry', () => {
    // WorkflowStatusUpdate logs are no longer processed in simplified version

    it('should process TaskStatusUpdate logs', () => {
      const log = {
        timestamp: Date.now(),
        logDescription: 'Task started',
        logType: 'TaskStatusUpdate',
        task: { id: 'task-1', title: 'Test Task', description: 'Test' },
        agent: { name: 'Test Agent', role: 'Test' },
        taskStatus: 'DOING',
      };

      vi.spyOn(adapter as any, 'getOrCreateContext').mockReturnValue(
        mockContext
      );

      (adapter as any).processLogEntry(mockTeam, log);

      expect(mockTaskMapper.mapTaskLogToSpan).toHaveBeenCalledWith(
        mockContext,
        log
      );
    });

    it('should process AgentStatusUpdate logs', () => {
      const log = {
        timestamp: Date.now(),
        logDescription: 'Agent thinking',
        logType: 'AgentStatusUpdate',
        task: { id: 'task-1' },
        agent: {
          id: 'agent-1',
          name: 'Test Agent',
          role: 'Test',
          llmConfig: { model: 'gpt-4' },
        },
        agentStatus: 'THINKING',
      };

      vi.spyOn(adapter as any, 'getOrCreateContext').mockReturnValue(
        mockContext
      );

      (adapter as any).processLogEntry(mockTeam, log);

      expect(mockTaskMapper.mapAgentThinkingToSpan).toHaveBeenCalledWith(
        mockContext,
        log
      );
    });
  });

  describe('shutdown', () => {
    it('should shutdown gracefully', async () => {
      // Mock the span manager's getActiveSpans method
      vi.spyOn(adapter as any, 'spanManager', 'get').mockReturnValue({
        getActiveSpans: vi.fn().mockReturnValue([]),
      });

      // Mock the tracer provider's shutdown method
      vi.spyOn(adapter as any, 'tracerProvider', 'get').mockReturnValue({
        shutdown: vi.fn().mockResolvedValue(undefined),
      });

      await adapter.shutdown();

      // Verify that the tracer provider was shut down
      expect((adapter as any).tracerProvider.shutdown).toHaveBeenCalled();
    });
  });
});
