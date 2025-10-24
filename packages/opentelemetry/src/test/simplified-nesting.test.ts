import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SimpleTaskMapper } from '../mappers/SimpleTaskMapper';
import { SpanManager } from '../core/SpanManager';
import type {
  OpenTelemetryConfig,
  KaibanSpanContext,
  TaskLog,
  AgentLog,
} from '../types';

/**
 * Test to verify that thinking spans are properly nested under task spans
 */
describe('SimpleTaskMapper - Span Nesting', () => {
  let taskMapper: SimpleTaskMapper;
  let spanManager: SpanManager;
  let mockContext: KaibanSpanContext;
  let mockConfig: OpenTelemetryConfig;

  beforeEach(() => {
    mockConfig = {
      enabled: true,
      sampling: { rate: 1.0, strategy: 'always' },
      attributes: { includeSensitiveData: false, customAttributes: {} },
      exporters: { console: true },
    };

    spanManager = new SpanManager(mockConfig);
    taskMapper = new SimpleTaskMapper(spanManager);

    // Mock context
    mockContext = {
      teamName: 'Test Team',
      workflowId: 'test-workflow',
      taskSpans: new Map(),
      toolSpans: new Map(),
      agentSpans: new Map(),
      setRootSpan: vi.fn(),
      getRootSpan: vi.fn(),
      setTaskSpan: vi.fn(),
      getTaskSpan: vi.fn(),
      removeTaskSpan: vi.fn(),
      setToolSpan: vi.fn(),
      getToolSpan: vi.fn(),
      removeToolSpan: vi.fn(),
      setAgentSpan: vi.fn(),
      getAgentSpan: vi.fn(),
      removeAgentSpan: vi.fn(),
    };
  });

  it('should create task span when task starts (DOING)', () => {
    const taskLog: TaskLog = {
      timestamp: Date.now(),
      logDescription: 'Task started',
      logType: 'TaskStatusUpdate',
      task: {
        id: 'task-1',
        title: 'Test Task',
        description: 'Test task description',
      },
      agent: {
        name: 'Test Agent',
        role: 'Test Role',
      },
      taskStatus: 'DOING',
      metadata: {},
    };

    // Mock the span manager to return a mock span
    const mockSpan = {
      spanContext: () => ({ spanId: 'span-1', traceId: 'trace-1' }),
      setAttributes: vi.fn(),
      end: vi.fn(),
      addEvent: vi.fn(),
    };

    vi.spyOn(spanManager, 'startSpan').mockReturnValue(mockSpan as any);

    taskMapper.mapTaskLogToSpan(mockContext, taskLog);

    expect(spanManager.startSpan).toHaveBeenCalledWith(
      'task.execute',
      expect.objectContaining({
        'task.id': 'task-1',
        'task.name': 'Test Task',
        'agent.name': 'Test Agent',
        'task.status': 'started',
      })
    );

    expect(mockContext.setTaskSpan).toHaveBeenCalledWith('task-1', mockSpan);
  });

  it('should end thinking span when agent thinking ends', () => {
    const taskLog: TaskLog = {
      timestamp: Date.now(),
      logDescription: 'Task started',
      logType: 'TaskStatusUpdate',
      task: {
        id: 'task-1',
        title: 'Test Task',
        description: 'Test task description',
      },
      agent: {
        name: 'Test Agent',
        role: 'Test Role',
      },
      taskStatus: 'DOING',
      metadata: {},
    };

    const agentLog: AgentLog = {
      timestamp: Date.now(),
      logDescription: 'Agent thinking ended',
      logType: 'AgentStatusUpdate',
      task: { id: 'task-1' },
      agent: {
        id: 'agent-1',
        name: 'Test Agent',
        role: 'Test Role',
        llmConfig: { model: 'gpt-4' },
      },
      agentStatus: 'THINKING_END',
      metadata: {
        iterations: 1,
        thinkingDuration: 1500,
        llmUsageStats: {
          inputTokens: 100,
          outputTokens: 50,
        },
        costDetails: { totalCost: 0.01 },
        output: {
          llmOutput: 'I should analyze this data and provide insights',
        },
      },
    };

    // Mock spans
    const mockTaskSpan = {
      spanContext: () => ({ spanId: 'task-span-1', traceId: 'trace-1' }),
      setAttributes: vi.fn(),
      end: vi.fn(),
      addEvent: vi.fn(),
    };

    const mockThinkingSpan = {
      spanContext: () => ({ spanId: 'thinking-span-1', traceId: 'trace-1' }),
      setAttributes: vi.fn(),
      end: vi.fn(),
      addEvent: vi.fn(),
    };

    // Mock context to return the task span and existing thinking span
    vi.mocked(mockContext.getTaskSpan).mockReturnValue(mockTaskSpan as any);
    vi.mocked(mockContext.getAgentSpan).mockReturnValue(
      mockThinkingSpan as any
    );

    // Mock span manager
    vi.spyOn(spanManager, 'endSpan').mockImplementation(() => {});

    // First create the task span
    taskMapper.mapTaskLogToSpan(mockContext, taskLog);

    // Clear the mock to focus on the thinking span end call
    vi.clearAllMocks();

    // Reconfigure the mock for the end span call
    vi.spyOn(spanManager, 'endSpan').mockImplementation(() => {});

    // Then end the thinking span
    taskMapper.mapAgentThinkingToSpan(mockContext, agentLog);

    // Verify that the thinking span was ended with the correct attributes
    expect(spanManager.endSpan).toHaveBeenCalledWith(
      mockThinkingSpan,
      expect.objectContaining({
        'kaiban.llm.response.duration': 1500,
        'kaiban.llm.usage.input_tokens': 100,
        'kaiban.llm.usage.output_tokens': 50,
        'kaiban.llm.usage.cost': 0.01,
        'kaiban.llm.response.messages':
          'I should analyze this data and provide insights',
      })
    );

    // Verify that the thinking span was removed from context
    expect(mockContext.removeAgentSpan).toHaveBeenCalledWith('agent-1');
  });

  it('should end task span when task completes (DONE)', () => {
    const taskLog: TaskLog = {
      timestamp: Date.now(),
      logDescription: 'Task completed',
      logType: 'TaskStatusUpdate',
      task: {
        id: 'task-1',
        title: 'Test Task',
        description: 'Test task description',
      },
      agent: {
        name: 'Test Agent',
        role: 'Test Role',
      },
      taskStatus: 'DONE',
      metadata: {
        duration: 5000,
        iterationCount: 3,
        costDetails: { totalCost: 0.05 },
        llmUsageStats: {
          inputTokens: 500,
          outputTokens: 200,
        },
      },
    };

    const mockTaskSpan = {
      spanContext: () => ({ spanId: 'task-span-1', traceId: 'trace-1' }),
      setAttributes: vi.fn(),
      end: vi.fn(),
      addEvent: vi.fn(),
    };

    vi.mocked(mockContext.getTaskSpan).mockReturnValue(mockTaskSpan as any);
    vi.spyOn(spanManager, 'endSpan').mockImplementation(() => {});

    taskMapper.mapTaskLogToSpan(mockContext, taskLog);

    expect(spanManager.endSpan).toHaveBeenCalledWith(
      mockTaskSpan,
      expect.objectContaining({
        'task.status': 'completed',
        'task.duration_ms': 5000,
        'task.iterations': 3,
        'task.total_cost': 0.05,
        'task.total_tokens_input': 500,
        'task.total_tokens_output': 200,
      })
    );

    expect(mockContext.removeTaskSpan).toHaveBeenCalledWith('task-1');
  });

  it('should handle task errors correctly', () => {
    const taskLog: TaskLog = {
      timestamp: Date.now(),
      logDescription: 'Task failed',
      logType: 'TaskStatusUpdate',
      task: {
        id: 'task-1',
        title: 'Test Task',
        description: 'Test task description',
      },
      agent: {
        name: 'Test Agent',
        role: 'Test Role',
      },
      taskStatus: 'ERRORED',
      metadata: {
        duration: 3000,
        error: {
          message: 'Test error message',
          stack: 'Error stack trace',
        },
      },
    };

    const mockTaskSpan = {
      spanContext: () => ({ spanId: 'task-span-1', traceId: 'trace-1' }),
      setAttributes: vi.fn(),
      end: vi.fn(),
      addEvent: vi.fn(),
    };

    vi.mocked(mockContext.getTaskSpan).mockReturnValue(mockTaskSpan as any);
    vi.spyOn(spanManager, 'endSpan').mockImplementation(() => {});

    taskMapper.mapTaskLogToSpan(mockContext, taskLog);

    expect(spanManager.endSpan).toHaveBeenCalledWith(
      mockTaskSpan,
      expect.objectContaining({
        'task.status': 'errored',
        'error.message': 'Test error message',
        'error.type': 'errored',
        'error.stack': 'Error stack trace',
      })
    );
  });

  it('should handle complete thinking cycle (THINKING -> THINKING_END)', () => {
    const taskLog: TaskLog = {
      timestamp: Date.now(),
      logDescription: 'Task started',
      logType: 'TaskStatusUpdate',
      task: {
        id: 'task-1',
        title: 'Test Task',
        description: 'Test task description',
      },
      agent: {
        name: 'Test Agent',
        role: 'Test Role',
      },
      taskStatus: 'DOING',
      metadata: {},
    };

    const thinkingStartLog: AgentLog = {
      timestamp: Date.now(),
      logDescription: 'Agent started thinking',
      logType: 'AgentStatusUpdate',
      task: { id: 'task-1' },
      agent: {
        id: 'agent-1',
        name: 'Test Agent',
        role: 'Test Role',
        llmConfig: { model: 'gpt-4' },
      },
      agentStatus: 'THINKING',
      metadata: {
        messages: 'What should I do with this data?',
        iterations: 1,
      },
    };

    const thinkingEndLog: AgentLog = {
      timestamp: Date.now(),
      logDescription: 'Agent thinking ended',
      logType: 'AgentStatusUpdate',
      task: { id: 'task-1' },
      agent: {
        id: 'agent-1',
        name: 'Test Agent',
        role: 'Test Role',
        llmConfig: { model: 'gpt-4' },
      },
      agentStatus: 'THINKING_END',
      metadata: {
        iterations: 1,
        thinkingDuration: 1500,
        llmUsageStats: {
          inputTokens: 100,
          outputTokens: 50,
        },
        costDetails: { totalCost: 0.01 },
        output: {
          llmOutput: 'I should analyze this data and provide insights',
        },
      },
    };

    // Mock spans
    const mockTaskSpan = {
      spanContext: () => ({ spanId: 'task-span-1', traceId: 'trace-1' }),
      setAttributes: vi.fn(),
      end: vi.fn(),
      addEvent: vi.fn(),
    };

    const mockThinkingSpan = {
      spanContext: () => ({ spanId: 'thinking-span-1', traceId: 'trace-1' }),
      setAttributes: vi.fn(),
      end: vi.fn(),
      addEvent: vi.fn(),
    };

    // Mock context to return the task span
    vi.mocked(mockContext.getTaskSpan).mockReturnValue(mockTaskSpan as any);
    vi.mocked(mockContext.getAgentSpan).mockReturnValue(
      mockThinkingSpan as any
    );

    // Mock span manager
    vi.spyOn(spanManager, 'startSpan').mockReturnValue(mockThinkingSpan as any);
    vi.spyOn(spanManager, 'endSpan').mockImplementation(() => {});

    // First create the task span
    taskMapper.mapTaskLogToSpan(mockContext, taskLog);

    // Clear the mock to focus on the thinking span calls
    vi.clearAllMocks();

    // Reconfigure the mock for the thinking span
    vi.spyOn(spanManager, 'startSpan').mockReturnValue(mockThinkingSpan as any);
    vi.spyOn(spanManager, 'endSpan').mockImplementation(() => {});

    // Start thinking
    taskMapper.mapAgentThinkingToSpan(mockContext, thinkingStartLog);

    // Verify that the thinking span was started with input
    expect(spanManager.startSpan).toHaveBeenCalledWith(
      'kaiban.agent.thinking',
      expect.objectContaining({
        'agent.id': 'agent-1',
        'agent.name': 'Test Agent',
        'task.id': 'task-1',
        'kaiban.llm.request.iteration': 1,
        'kaiban.llm.request.messages': 'What should I do with this data?',
        'kaiban.llm.request.input_length': 32,
      }),
      mockTaskSpan
    );

    // Clear the mock again to focus on the end span call
    vi.clearAllMocks();

    // Reconfigure the mock for the end span call
    vi.spyOn(spanManager, 'endSpan').mockImplementation(() => {});

    // End thinking
    taskMapper.mapAgentThinkingToSpan(mockContext, thinkingEndLog);

    // Verify that the thinking span was ended with output
    expect(spanManager.endSpan).toHaveBeenCalledWith(
      mockThinkingSpan,
      expect.objectContaining({
        'kaiban.llm.response.duration': 1500,
        'kaiban.llm.usage.input_tokens': 100,
        'kaiban.llm.usage.output_tokens': 50,
        'kaiban.llm.usage.cost': 0.01,
        'kaiban.llm.response.messages':
          'I should analyze this data and provide insights',
        'kaiban.llm.response.output_length': 47, // Actual length of the message
        'kaiban.llm.response.status': 'completed',
        'kaiban.llm.usage.completion_tokens': 50,
        'kaiban.llm.usage.prompt_tokens': 100,
        'kaiban.llm.usage.total_tokens': 150,
        'kaiban.llm.request.has_metadata': true,
        'kaiban.llm.request.metadata_keys':
          expect.stringContaining('iterations'),
      })
    );
  });
});
