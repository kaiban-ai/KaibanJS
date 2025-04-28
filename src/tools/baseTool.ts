import { StructuredTool } from '@langchain/core/tools';

export type ToolResult = string | Record<string, unknown>;

// TODO: Add a BaseTool class that works as an adapter for tool from different libraries
export type BaseTool = StructuredTool;
