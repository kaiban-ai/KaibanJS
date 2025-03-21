import { z } from 'zod';
import { KanbanTool } from './kanbanTool';
import { BaseAgent } from '../agents/baseAgent';
import { ToolResult } from './baseTool';

/**
 * Tool for blocking tasks when they cannot or should not proceed.
 * This tool allows agents to explicitly block tasks for various reasons such as:
 * - Insufficient permissions/clearance
 * - Missing prerequisites
 * - Security concerns
 * - Resource constraints
 */
export class BlockTaskTool extends KanbanTool {
  name = 'block_task';
  description =
    'Use this tool to block the current task when you cannot or should not proceed. Provide a clear reason for blocking.';
  schema = z.object({
    reason: z.string().describe('The reason for blocking the task'),
  });

  constructor(agent: BaseAgent) {
    super(agent);
  }

  async _call(input: Record<string, unknown>): Promise<ToolResult> {
    const { reason } = input;
    return {
      action: 'BLOCK_TASK',
      reason,
      result: `Task blocked: ${reason}`,
    };
  }
}
