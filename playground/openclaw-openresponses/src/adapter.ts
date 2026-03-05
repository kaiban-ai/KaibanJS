/**
 * KaibanJS OpenResponses Adapter: maps OpenResponses API requests to Team.start() and formats responses.
 * Request/response shape follows the OpenResponses spec (openresponses.org / OpenAI Responses API).
 */
import { Request, Response } from 'express';
import { Team } from 'kaibanjs';
import { createTeam } from './team/index.js';
import { sendSSEDone, sendSSEEvent } from './sse.js';

// OpenResponses request body (see https://www.openresponses.org/specification)
interface OpenResponsesRequest {
  input?: string | OpenResponsesInputItem[];
  stream?: boolean;
  instructions?: string;
  model?: string;
  max_output_tokens?: number;
  tools?: unknown[];
  prompt_cache_key?: string;
  store?: boolean;
}

// Input item: message with role and content (OpenResponses ResponseInputMessageItem)
interface OpenResponsesInputItem {
  type?: 'message';
  role?: 'user' | 'system' | 'developer';
  content?: ResponseInputMessageContentList;
}

// Content list: array of input_text (and optionally input_image, input_file)
type ResponseInputMessageContentList = Array<
  { type: 'input_text'; text: string } | Record<string, unknown>
>;

/**
 * OpenClaw sends the request wrapped in .body; unwrap so we have the standard OpenResponses payload.
 */
function normalizeBody(raw: unknown): OpenResponsesRequest {
  if (
    raw &&
    typeof raw === 'object' &&
    'body' in raw &&
    typeof (raw as { body: unknown }).body === 'object'
  ) {
    return (raw as { body: OpenResponsesRequest }).body;
  }
  return raw as OpenResponsesRequest;
}

/**
 * Extract the current user message from OpenResponses `input` (spec: input is string or array of items).
 * For array input: last item with role "user" and content list; text from parts with type "input_text" and .text.
 */
function extractUserMessage(body: OpenResponsesRequest): string | null {
  const input = body.input;
  if (input == null) return null;
  if (typeof input === 'string') return input.trim() || null;

  if (!Array.isArray(input) || input.length === 0) return null;
  const lastUser = [...input].reverse().find((item) => item.role === 'user');
  if (!lastUser?.content || !Array.isArray(lastUser.content)) return null;
  const content = lastUser.content;
  console.log('content', { content });
  // Spec: content parts are { type: "input_text", text: string }
  const texts: string[] = [];
  for (const part of content) {
    if (
      part &&
      typeof part === 'object' &&
      typeof (part as { text?: string }).text === 'string'
    ) {
      const t = (part as { text: string }).text.trim();
      if (t) texts.push(t);
    }
  }
  return texts.length > 0 ? texts.join('\n') : null;
}

/**
 * Format workflow result as plain text for output_text.
 */
function resultToText(result: unknown): string {
  if (result == null) return '';
  if (typeof result === 'string') return result;
  if (
    typeof result === 'object' &&
    'result' in result &&
    result.result != null
  ) {
    return String((result as { result: unknown }).result);
  }
  return String(result);
}

/**
 * Build an OpenResponses output message item (spec: type "message", role "assistant",
 * content: [{ type: "output_text", text }]).
 */
function buildOutputMessage(
  id: string,
  text: string,
  status: 'in_progress' | 'completed' = 'completed'
) {
  return {
    id,
    type: 'message',
    role: 'assistant',
    status,
    content: [{ type: 'output_text', annotations: [], text }],
  };
}

/**
 * Extract the most relevant error message from the team's workflow logs.
 * Used when the workflow ends in BLOCKED or ERRORED state.
 */
function extractWorkflowErrorMessage(team: Team): string {
  const logs = team.getStore().getState().workflowLogs;
  const errorLog = [...logs]
    .reverse()
    .find(
      (log) =>
        log.logType === 'WorkflowStatusUpdate' &&
        (log.workflowStatus === 'BLOCKED' || log.workflowStatus === 'ERRORED')
    );

  const meta = errorLog?.metadata as Record<string, unknown> | undefined;
  if (meta && typeof meta['error'] === 'string' && meta['error']) {
    return meta['error'];
  }
  return 'The workflow could not complete due to an internal error.';
}

/**
 * Build an OpenResponses Usage object (spec: input_tokens, output_tokens, total_tokens,
 * input_tokens_details.cached_tokens, output_tokens_details.reasoning_tokens).
 */
function buildUsage(inputTokens: number, outputTokens: number) {
  return {
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    total_tokens: inputTokens + outputTokens,
    input_tokens_details: { cached_tokens: 0 },
    output_tokens_details: { reasoning_tokens: 0 },
  };
}

/**
 * Build OpenResponses JSON response (non-streaming).
 * Spec: output is array of message items, each with type "message", role "assistant",
 * and content: [{ type: "output_text", text }].
 */
function buildJsonResponse(
  id: string,
  result: unknown,
  llmStats: { inputTokens: number; outputTokens: number } | null
) {
  const text = resultToText(result);
  return {
    id,
    object: 'response',
    status: 'completed',
    output: [buildOutputMessage(`msg_${id}_0`, text)],
    usage: buildUsage(llmStats?.inputTokens ?? 0, llmStats?.outputTokens ?? 0),
  };
}

/**
 * Handle POST /v1/responses: run KaibanJS team and return OpenResponses JSON or SSE.
 */
export async function handleOpenResponses(
  req: Request,
  res: Response
): Promise<void> {
  const body = normalizeBody(req.body);
  const userMessage = extractUserMessage(body);

  if (!userMessage) {
    res.status(400).json({
      error: {
        message:
          'Missing or invalid input: expected non-empty string or message item with role "user"',
        type: 'invalid_request_error',
      },
    });
    return;
  }

  const responseId = `resp_kaiban_${Date.now()}`;
  const msgId = `msg_${responseId}_0`;
  const stream = Boolean(body.stream);
  const team = createTeam({ topic: userMessage });

  try {
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();

      // 1. response.created
      sendSSEEvent(res, 'response.created', {
        type: 'response.created',
        response: {
          id: responseId,
          object: 'response',
          status: 'in_progress',
          output: [],
        },
      });

      const unsubscribe = team.subscribeToChanges(() => {
        sendSSEEvent(res, 'response.in_progress', {
          type: 'response.in_progress',
          response: {
            id: responseId,
            object: 'response',
            status: 'in_progress',
          },
        });
      }, ['teamWorkflowStatus']);

      const workflowResult = await team.start({
        inputs: { topic: userMessage },
      });
      unsubscribe();

      if (workflowResult.status === 'BLOCKED') {
        const errorMessage = extractWorkflowErrorMessage(team);
        sendSSEEvent(res, 'response.failed', {
          type: 'response.failed',
          response: { id: responseId, object: 'response', status: 'failed' },
          error: { message: errorMessage, type: 'workflow_blocked' },
        });
        sendSSEDone(res);
        res.end();
        return;
      }

      const text = resultToText(workflowResult.result);
      const llmStats = workflowResult.stats?.llmUsageStats;
      const usage = buildUsage(
        llmStats?.inputTokens ?? 0,
        llmStats?.outputTokens ?? 0
      );

      // 2. response.output_item.added — message item starts (empty content)
      sendSSEEvent(res, 'response.output_item.added', {
        type: 'response.output_item.added',
        output_index: 0,
        item: buildOutputMessage(msgId, '', 'in_progress'),
      });

      // 3. response.content_part.added — text part starts (empty)
      sendSSEEvent(res, 'response.content_part.added', {
        type: 'response.content_part.added',
        item_id: msgId,
        output_index: 0,
        content_index: 0,
        part: { type: 'output_text', annotations: [], text: '' },
      });

      // 4. response.output_text.delta — full text as a single delta
      sendSSEEvent(res, 'response.output_text.delta', {
        type: 'response.output_text.delta',
        item_id: msgId,
        output_index: 0,
        content_index: 0,
        delta: text,
      });

      // 5. response.output_text.done
      sendSSEEvent(res, 'response.output_text.done', {
        type: 'response.output_text.done',
        item_id: msgId,
        output_index: 0,
        content_index: 0,
        text,
      });

      // 6. response.content_part.done
      sendSSEEvent(res, 'response.content_part.done', {
        type: 'response.content_part.done',
        item_id: msgId,
        output_index: 0,
        content_index: 0,
        part: { type: 'output_text', annotations: [], text },
      });

      // 7. response.output_item.done — message item completed
      sendSSEEvent(res, 'response.output_item.done', {
        type: 'response.output_item.done',
        output_index: 0,
        item: buildOutputMessage(msgId, text, 'completed'),
      });

      // 8. response.completed — full response with output and usage
      sendSSEEvent(res, 'response.completed', {
        type: 'response.completed',
        response: {
          id: responseId,
          object: 'response',
          status: 'completed',
          output: [buildOutputMessage(msgId, text, 'completed')],
          usage,
        },
      });

      sendSSEDone(res);
      res.end();
    } else {
      const workflowResult = await team.start({
        inputs: { topic: userMessage },
      });

      if (workflowResult.status === 'BLOCKED') {
        const errorMessage = extractWorkflowErrorMessage(team);
        res.status(422).json({
          error: { message: errorMessage, type: 'workflow_blocked' },
        });
        return;
      }

      const llmStats = workflowResult.stats?.llmUsageStats
        ? {
            inputTokens: workflowResult.stats.llmUsageStats.inputTokens,
            outputTokens: workflowResult.stats.llmUsageStats.outputTokens,
          }
        : null;
      res
        .status(200)
        .json(buildJsonResponse(responseId, workflowResult.result, llmStats));
    }
  } catch (err) {
    // team.start() rejects on ERRORED status — recover the real error from the logs
    const logMessage = extractWorkflowErrorMessage(team);
    const fallback = err instanceof Error ? err.message : String(err);
    const message =
      logMessage !== 'The workflow could not complete due to an internal error.'
        ? logMessage
        : fallback;

    if (stream && res.headersSent) {
      sendSSEEvent(res, 'response.failed', {
        type: 'response.failed',
        response: { id: responseId, object: 'response', status: 'failed' },
        error: { message, type: 'workflow_error' },
      });
      sendSSEDone(res);
      res.end();
    } else if (!res.headersSent) {
      res.status(500).json({ error: { message, type: 'workflow_error' } });
    }
  }
}
