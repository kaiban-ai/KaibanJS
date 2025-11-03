import { SpanManager } from '../core/SpanManager';
import type { TaskLog, AgentLog, KaibanSpanContext } from '../types';

/**
 * Simplified mapper that handles only task execution spans and nested agent thinking spans
 *
 * Structure:
 * - Task Span (DOING → DONE)
 *   ├── Agent Thinking Span (THINKING_END)
 *   ├── Agent Thinking Span (THINKING_END)
 *   └── Agent Thinking Span (THINKING_END)
 */
export class SimpleTaskMapper {
  constructor(private spanManager: SpanManager) {}

  /**
   * Map task log to OpenTelemetry span
   */
  public mapTaskLogToSpan(context: KaibanSpanContext, log: TaskLog): void {
    const taskId = log.task.id;

    switch (log.taskStatus) {
      case 'DOING':
        this.startTaskSpan(context, log, taskId);
        break;

      case 'DONE':
      case 'AWAITING_VALIDATION':
      case 'VALIDATED':
        this.endTaskSpan(context, log, taskId, 'completed');
        break;

      case 'ERRORED':
        this.endTaskSpan(context, log, taskId, 'errored');
        break;

      case 'ABORTED':
        this.endTaskSpan(context, log, taskId, 'aborted');
        break;
    }
  }

  /**
   * Map agent thinking log to nested span
   */
  public mapAgentThinkingToSpan(
    context: KaibanSpanContext,
    log: AgentLog
  ): void {
    const taskId = log.task.id;
    const taskSpan = context.getTaskSpan(taskId);

    if (!taskSpan) return;

    switch (log.agentStatus) {
      case 'THINKING':
        this.startThinkingSpan(context, log, taskSpan);
        break;
      case 'THINKING_END':
        this.endThinkingSpan(context, log, taskSpan);
        break;
    }
  }

  /**
   * Start task span when task begins execution
   */
  private startTaskSpan(
    context: KaibanSpanContext,
    log: TaskLog,
    taskId: string
  ): void {
    const taskSpan = this.spanManager.startSpan('task.execute', {
      // Standard OpenTelemetry attributes
      'task.id': taskId,
      'task.name': log.task.title,
      'task.description': log.task.description,
      'agent.name': log.agent.name,
      'agent.role': log.agent.role,
      'task.status': 'started',
      // Custom attributes for monitoring
      'task.start_time': new Date().toISOString(),
    });

    context.setTaskSpan(taskId, taskSpan);
    // Task span started
  }

  /**
   * End task span when task completes
   */
  private endTaskSpan(
    context: KaibanSpanContext,
    log: TaskLog,
    taskId: string,
    status: 'completed' | 'errored' | 'aborted'
  ): void {
    const span = context.getTaskSpan(taskId);
    if (!span) return;

    const attributes = this.buildTaskEndAttributes(log, status);
    this.spanManager.endSpan(span, attributes);
    context.removeTaskSpan(taskId);
    // Task span ended
  }

  /**
   * Start thinking span when agent begins thinking
   */
  private startThinkingSpan(
    context: KaibanSpanContext,
    log: AgentLog,
    _parentTaskSpan: any
  ): void {
    // Clean up any existing thinking span for this agent
    const existingSpan = context.getAgentSpan(log.agent.id);
    if (existingSpan) {
      // Cleaning up previous thinking span
      this.spanManager.endSpan(existingSpan, {
        'kaiban.llm.request.status': 'interrupted',
        'kaiban.llm.request.end_time': new Date().toISOString(),
      });
      context.removeAgentSpan(log.agent.id);
    }

    // Extract available metadata with better fallbacks
    const metadata = log.metadata || {};
    const messages =
      metadata.messages ||
      metadata.input ||
      metadata.message ||
      'No input available';

    // Create nested thinking span with proper parent relationship
    const thinkingSpan = this.spanManager.startSpan(
      'kaiban.agent.thinking',
      {
        // KaibanJS semantic conventions for LLM
        'kaiban.llm.request.messages':
          typeof messages === 'string' ? messages : JSON.stringify(messages),
        'kaiban.llm.request.model': log.agent.llmConfig?.model || 'unknown',
        'kaiban.llm.request.provider': this.extractProvider(
          log.agent.llmConfig?.model
        ),
        'kaiban.llm.request.iteration':
          metadata.iterations || metadata.iterationCount || 0,
        'kaiban.llm.request.start_time': new Date().toISOString(),
        'kaiban.llm.request.status': 'started',
        'kaiban.llm.request.input_length':
          typeof messages === 'string'
            ? messages.length
            : JSON.stringify(messages).length,

        // Agent context attributes
        'agent.id': log.agent.id,
        'agent.name': log.agent.name,
        'agent.role': log.agent.role,
        'task.id': log.task.id,
      },
      _parentTaskSpan
    );

    // Store the thinking span in context
    context.setAgentSpan(log.agent.id, thinkingSpan);

    // Thinking span started
  }

  /**
   * End thinking span when agent finishes thinking
   */
  private endThinkingSpan(
    context: KaibanSpanContext,
    log: AgentLog,
    _parentTaskSpan: any
  ): void {
    // Get the thinking span from context
    const thinkingSpan = context.getAgentSpan(log.agent.id);

    if (!thinkingSpan) {
      return;
    }

    // Extract available metadata with better fallbacks
    const metadata = log.metadata || {};

    const llmStats =
      metadata.output?.llmUsageStats || metadata.llmUsageStats || {};
    const costDetails = metadata.costDetails || {};
    const output = metadata.output.llmOutput || {};

    // End the thinking span with final attributes using semantic conventions
    this.spanManager.endSpan(thinkingSpan, {
      // KaibanJS semantic conventions for LLM usage
      'kaiban.llm.usage.input_tokens': llmStats.inputTokens || 0,
      'kaiban.llm.usage.output_tokens': llmStats.outputTokens || 0,
      'kaiban.llm.usage.total_tokens':
        (llmStats.inputTokens || 0) + (llmStats.outputTokens || 0),
      'kaiban.llm.usage.prompt_tokens': llmStats.inputTokens || 0,
      'kaiban.llm.usage.completion_tokens': llmStats.outputTokens || 0,
      'kaiban.llm.usage.cost': costDetails.totalCost || costDetails.cost || 0,

      // Response attributes
      'kaiban.llm.response.messages':
        typeof output === 'string' ? output : JSON.stringify(output),
      'kaiban.llm.response.duration':
        metadata.thinkingDuration || metadata.duration || 0,
      'kaiban.llm.response.end_time': new Date().toISOString(),
      'kaiban.llm.response.status': 'completed',
      'kaiban.llm.response.output_length':
        typeof output === 'string'
          ? output.length
          : JSON.stringify(output).length,

      // Additional context
      'kaiban.llm.request.has_metadata': Object.keys(metadata).length > 0,
      'kaiban.llm.request.metadata_keys': Object.keys(metadata).join(','),
    });

    // Remove the thinking span from context
    context.removeAgentSpan(log.agent.id);

    // Thinking span ended
  }

  /**
   * Create nested thinking span for agent (DEPRECATED - use startThinkingSpan + endThinkingSpan)
   */
  private createThinkingSpan(
    context: KaibanSpanContext,
    log: AgentLog,
    _parentTaskSpan: any
  ): void {
    console.log('createThinkingSpan called');

    // Extract available metadata with better fallbacks
    const metadata = log.metadata || {};
    const llmStats =
      log.metadata?.output?.llmUsageStats || log.metadata?.llmUsageStats || {};
    const output = log.metadata?.output?.llmOutput || {};
    // console.log('metadata', metadata);
    // // console.log('agent', log.agent);
    // console.log('output', output);
    // console.log('llmStats', llmStats);
    // Create nested thinking span with proper parent relationship
    const thinkingSpan = this.spanManager.startSpan(
      'agent.thinking',
      {
        // Standard OpenTelemetry attributes
        'agent.id': log.agent.id,
        'agent.name': log.agent.name,
        'agent.role': log.agent.role,
        'agent.model': log.agent.llmConfig?.model || 'unknown',
        'task.id': log.task.id,
        'thinking.iteration':
          metadata.iterations || metadata.iterationCount || 0,
        'thinking.start_time': new Date().toISOString(),
        // Add more context about the thinking process
        'thinking.status': 'started',
      },
      _parentTaskSpan
    );

    // End the thinking span immediately since THINKING_END is a point-in-time event
    this.spanManager.endSpan(thinkingSpan, {
      'thinking.duration_ms':
        metadata.thinkingDuration || metadata.duration || 0,
      'thinking.end_time': new Date().toISOString(),
      'thinking.tokens_input': llmStats.inputTokens || 0,
      'thinking.tokens_output': llmStats.outputTokens || 0,
      'thinking.status': 'completed',
      'thinking.output': output,
      // Add any additional metadata that might be useful
      'thinking.has_metadata': Object.keys(metadata).length > 0,
      'thinking.metadata_keys': Object.keys(metadata).join(','),
    });

    console.log(
      `🧠 Created nested thinking span for agent: ${log.agent.name} in task: ${log.task.id}`
    );
    console.log(`📊 Thinking metadata available:`, {
      iterations: metadata.iterations || metadata.iterationCount || 0,
      duration: metadata.thinkingDuration || metadata.duration || 0,
      tokens: {
        input: llmStats.inputTokens || 0,
        output: llmStats.outputTokens || 0,
      },
    });
  }

  /**
   * Build attributes for ending a task span
   */
  private buildTaskEndAttributes(
    log: TaskLog,
    status: 'completed' | 'errored' | 'aborted'
  ): Record<string, any> {
    const metadata = log.metadata || {};
    const llmStats = metadata.llmUsageStats || {};
    const costDetails = metadata.costDetails || {};
    const baseAttributes = {
      'task.status': status,
      'task.end_time': new Date().toISOString(),
      'task.duration_ms': metadata.duration || 0,
      'task.iterations': metadata.iterationCount || metadata.iterations || 0,
      'task.total_cost': costDetails.totalCost || costDetails.cost || 0,
      'task.total_tokens_input': llmStats.inputTokens || 0,
      'task.total_tokens_output': llmStats.outputTokens || 0,
      // Add additional context
      'task.has_metadata': Object.keys(metadata).length > 0,
      'task.metadata_keys': Object.keys(metadata).join(','),
    };

    // Add error information if status is error-related
    if (status === 'errored' || status === 'aborted') {
      return {
        ...baseAttributes,
        'error.message': metadata.error?.message || 'Unknown error',
        'error.type': status,
        'error.stack': metadata.error?.stack || '',
      };
    }

    return baseAttributes;
  }

  /**
   * Extract provider name from model name
   */
  private extractProvider(modelName: string | undefined): string {
    if (!modelName) return 'unknown';

    const model = modelName.toLowerCase();
    if (model.includes('gpt') || model.includes('openai')) return 'openai';
    if (model.includes('claude') || model.includes('anthropic'))
      return 'anthropic';
    if (model.includes('gemini') || model.includes('google')) return 'google';
    if (model.includes('llama') || model.includes('meta')) return 'meta';
    if (model.includes('mistral')) return 'mistral';
    if (model.includes('cohere')) return 'cohere';

    return 'unknown';
  }
}
