import { describe, it, expect, vi } from 'vitest';
import { KaibanSpanContextImpl } from './KaibanSpanContext';

// Mock span
const mockSpan = {
  setStatus: vi.fn(),
  setAttributes: vi.fn(),
  addEvent: vi.fn(),
  end: vi.fn(),
};

describe('KaibanSpanContextImpl', () => {
  let context: KaibanSpanContextImpl;

  beforeEach(() => {
    context = new KaibanSpanContextImpl('Test Team', 'workflow-123');
  });

  describe('constructor', () => {
    it('should initialize with correct team name and workflow ID', () => {
      expect(context.teamName).toBe('Test Team');
      expect(context.workflowId).toBe('workflow-123');
      expect(context.getActiveSpansCount()).toBe(0);
    });
  });

  describe('rootSpan management', () => {
    it('should set and get root span', () => {
      context.setRootSpan(mockSpan as any);

      expect(context.getRootSpan()).toBe(mockSpan);
      expect(context.getActiveSpansCount()).toBe(1);
    });

    it('should return undefined when no root span is set', () => {
      expect(context.getRootSpan()).toBeUndefined();
    });
  });

  describe('taskSpan management', () => {
    it('should set and get task span', () => {
      const taskId = 'task-456';

      context.setTaskSpan(taskId, mockSpan as any);

      expect(context.getTaskSpan(taskId)).toBe(mockSpan);
      expect(context.getActiveSpansCount()).toBe(1);
    });

    it('should remove task span', () => {
      const taskId = 'task-456';

      context.setTaskSpan(taskId, mockSpan as any);
      expect(context.getActiveSpansCount()).toBe(1);

      context.removeTaskSpan(taskId);

      expect(context.getTaskSpan(taskId)).toBeUndefined();
      expect(context.getActiveSpansCount()).toBe(0);
    });

    it('should handle multiple task spans', () => {
      context.setTaskSpan('task-1', mockSpan as any);
      context.setTaskSpan('task-2', mockSpan as any);

      expect(context.getActiveSpansCount()).toBe(2);
    });
  });

  describe('toolSpan management', () => {
    it('should set and get tool span', () => {
      const agentId = 'agent-789';

      context.setToolSpan(agentId, mockSpan as any);

      expect(context.getToolSpan(agentId)).toBe(mockSpan);
      expect(context.getActiveSpansCount()).toBe(1);
    });

    it('should remove tool span', () => {
      const agentId = 'agent-789';

      context.setToolSpan(agentId, mockSpan as any);
      expect(context.getActiveSpansCount()).toBe(1);

      context.removeToolSpan(agentId);

      expect(context.getToolSpan(agentId)).toBeUndefined();
      expect(context.getActiveSpansCount()).toBe(0);
    });
  });

  describe('mixed span management', () => {
    it('should handle multiple span types simultaneously', () => {
      context.setRootSpan(mockSpan as any);
      context.setTaskSpan('task-1', mockSpan as any);
      context.setTaskSpan('task-2', mockSpan as any);
      context.setToolSpan('agent-1', mockSpan as any);

      expect(context.getActiveSpansCount()).toBe(4);
      expect(context.getRootSpan()).toBe(mockSpan);
      expect(context.getTaskSpan('task-1')).toBe(mockSpan);
      expect(context.getTaskSpan('task-2')).toBe(mockSpan);
      expect(context.getToolSpan('agent-1')).toBe(mockSpan);
    });
  });

  describe('clear', () => {
    it('should clear all spans', () => {
      context.setRootSpan(mockSpan as any);
      context.setTaskSpan('task-1', mockSpan as any);
      context.setToolSpan('agent-1', mockSpan as any);

      expect(context.getActiveSpansCount()).toBe(3);

      context.clear();

      expect(context.getActiveSpansCount()).toBe(0);
      expect(context.getRootSpan()).toBeUndefined();
      expect(context.getTaskSpan('task-1')).toBeUndefined();
      expect(context.getToolSpan('agent-1')).toBeUndefined();
    });
  });
});
