/**
 * SSE helpers for OpenResponses-compatible streaming.
 */
import { Response } from 'express';

export function sendSSEEvent(
  res: Response,
  event: string,
  data: unknown
): void {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export function sendSSEDone(res: Response): void {
  res.write('data: [DONE]\n\n');
}
