import { StructuredTool } from 'langchain/tools';

export type ToolResult = string | Record<string, unknown>;

export abstract class BaseTool extends StructuredTool {}
