import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SpanManager } from './SpanManager';
import type { OpenTelemetryConfig } from '../types';

// Mock OpenTelemetry API
const mockSpan = {
  setStatus: vi.fn(),
  setAttributes: vi.fn(),
  addEvent: vi.fn(),
  end: vi.fn(),
  spanContext: vi.fn(() => ({
    spanId: 'mock-span-id',
    traceId: 'mock-trace-id',
  })),
};

const mockTracer = {
  startSpan: vi.fn(() => mockSpan),
};

vi.mock('@opentelemetry/api', () => ({
  trace: {
    getTracer: vi.fn(() => mockTracer),
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

describe('SpanManager', () => {
  let spanManager: SpanManager;
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

    spanManager = new SpanManager(config);
  });

  describe('startSpan', () => {
    it('should create a span with correct attributes', () => {
      const name = 'test.span';
      const attributes = { 'test.key': 'test.value' };

      const span = spanManager.startSpan(name, attributes);

      expect(mockTracer.startSpan).toHaveBeenCalledWith(
        name,
        expect.objectContaining({
          attributes,
          kind: expect.any(Number),
        })
      );
      expect(span).toBe(mockSpan);
    });

    it('should set span status to OK when sampling is enabled', () => {
      const _span = spanManager.startSpan('test.span', {});

      expect(mockSpan.setStatus).toHaveBeenCalledWith({ code: 1 });
    });

    it('should determine correct span kind for workflow spans', () => {
      spanManager.startSpan('workflow.test', {});

      expect(mockTracer.startSpan).toHaveBeenCalledWith(
        'workflow.test',
        expect.objectContaining({
          kind: 1, // SERVER
        })
      );
    });

    it('should determine correct span kind for task spans', () => {
      spanManager.startSpan('task.test', {});

      expect(mockTracer.startSpan).toHaveBeenCalledWith(
        'task.test',
        expect.objectContaining({
          kind: 2, // CLIENT
        })
      );
    });

    it('should determine correct span kind for agent spans', () => {
      spanManager.startSpan('agent.test', {});

      expect(mockTracer.startSpan).toHaveBeenCalledWith(
        'agent.test',
        expect.objectContaining({
          kind: 2, // CLIENT
        })
      );
    });
  });

  describe('endSpan', () => {
    it('should end span without additional attributes', () => {
      spanManager.endSpan(mockSpan as any);

      expect(mockSpan.end).toHaveBeenCalled();
      expect(mockSpan.setAttributes).not.toHaveBeenCalled();
    });

    it('should end span with additional attributes', () => {
      const attributes = { 'end.key': 'end.value' };

      spanManager.endSpan(mockSpan as any, attributes);

      expect(mockSpan.setAttributes).toHaveBeenCalledWith(attributes);
      expect(mockSpan.end).toHaveBeenCalled();
    });
  });

  describe('addEvent', () => {
    it('should add event to span', () => {
      const eventName = 'test.event';
      const attributes = { 'event.key': 'event.value' };

      spanManager.addEvent(eventName, attributes, mockSpan as any);

      expect(mockSpan.addEvent).toHaveBeenCalledWith(eventName, attributes);
    });
  });

  describe('sampling', () => {
    it('should always sample when strategy is always', () => {
      config.sampling.strategy = 'always';
      spanManager = new SpanManager(config);

      const _span = spanManager.startSpan('test.span', {});

      expect(mockSpan.setStatus).toHaveBeenCalledWith({ code: 1 });
    });

    it('should respect sampling rate for probabilistic strategy', () => {
      config.sampling.strategy = 'probabilistic';
      config.sampling.rate = 0.5;
      spanManager = new SpanManager(config);

      // Mock Math.random to return 0.3 (below threshold)
      vi.spyOn(Math, 'random').mockReturnValue(0.3);

      spanManager.startSpan('test.span', {});

      expect(mockSpan.setStatus).toHaveBeenCalledWith({ code: 1 });

      vi.restoreAllMocks();
    });
  });
});
