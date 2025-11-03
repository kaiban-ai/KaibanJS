import { Span } from '@opentelemetry/api';
import type { KaibanSpanContext } from '../types';

/**
 * Implementation of KaibanSpanContext for managing span relationships
 */
export class KaibanSpanContextImpl implements KaibanSpanContext {
  public readonly taskSpans: Map<string, Span> = new Map();
  public readonly toolSpans: Map<string, Span> = new Map();
  public readonly agentSpans: Map<string, Span> = new Map();

  public rootSpan?: Span;

  constructor(
    public readonly teamName: string,
    public readonly workflowId: string
  ) {}

  setRootSpan(span: Span): void {
    this.rootSpan = span;
  }

  getRootSpan(): Span | undefined {
    return this.rootSpan;
  }

  setTaskSpan(taskId: string, span: Span): void {
    this.taskSpans.set(taskId, span);
  }

  getTaskSpan(taskId: string): Span | undefined {
    return this.taskSpans.get(taskId);
  }

  removeTaskSpan(taskId: string): void {
    this.taskSpans.delete(taskId);
  }

  setToolSpan(agentId: string, span: Span): void {
    this.toolSpans.set(agentId, span);
  }

  getToolSpan(agentId: string): Span | undefined {
    return this.toolSpans.get(agentId);
  }

  removeToolSpan(agentId: string): void {
    this.toolSpans.delete(agentId);
  }

  setAgentSpan(agentId: string, span: Span): void {
    this.agentSpans.set(agentId, span);
  }

  getAgentSpan(agentId: string): Span | undefined {
    return this.agentSpans.get(agentId);
  }

  removeAgentSpan(agentId: string): void {
    this.agentSpans.delete(agentId);
  }

  /**
   * Get all active spans count
   */
  getActiveSpansCount(): number {
    let count = this.rootSpan ? 1 : 0;
    count += this.taskSpans.size;
    count += this.toolSpans.size;
    count += this.agentSpans.size;
    return count;
  }

  /**
   * Clear all spans
   */
  clear(): void {
    this.rootSpan = undefined;
    this.taskSpans.clear();
    this.toolSpans.clear();
    this.agentSpans.clear();
  }
}
