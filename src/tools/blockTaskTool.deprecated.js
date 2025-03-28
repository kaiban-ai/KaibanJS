import { z } from 'zod';
import { StructuredTool } from '@langchain/core/tools';

/**
 * Tool for blocking tasks when they cannot or should not proceed.
 * This tool allows agents to explicitly block tasks for various reasons such as:
 * - Insufficient permissions/clearance
 * - Missing prerequisites
 * - Security concerns
 * - Resource constraints
 */
export class BlockTaskTool extends StructuredTool {
  name = 'block_task';
  description =
    'Use this tool to block the current task when you cannot or should not proceed. Provide a clear reason for blocking.';
  schema = z.object({
    reason: z.string().describe('The reason for blocking the task'),
  });

  constructor(agent) {
    super();
    this.agent = agent;
  }

  /** @type {import("@langchain/core/tools").StructuredToolInterface["call"]} */
  async _call(input) {
    const { reason } = input;
    return {
      action: 'BLOCK_TASK',
      reason,
      result: `Task blocked: ${reason}`,
    };
  }
}
