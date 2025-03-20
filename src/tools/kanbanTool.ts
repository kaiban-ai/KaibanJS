import { BaseTool } from './baseTool';
import { BaseAgent } from '../agents/baseAgent';

export abstract class KanbanTool extends BaseTool {
  protected agent: BaseAgent;

  constructor(agent: BaseAgent) {
    super();
    this.agent = agent;
  }
}
