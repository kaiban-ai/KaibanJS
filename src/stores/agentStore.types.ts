import { Task } from '..';
import { BaseAgent } from '../agents';
import { BaseTool, ToolResult } from '../tools/baseTool';
import { LLMInvocationError, StopAbortError } from '../utils/errors';
import { ParsedLLMOutput, ThinkingResult } from '../utils/llm.types';
import { TaskResult } from './taskStore.types';

export interface AgentStoreState {
  handleAgentIterationStart: (params: {
    agent: BaseAgent;
    task: Task;
    iterations: number;
    maxAgentIterations: number;
  }) => void;
  handleAgentIterationEnd: (params: {
    agent: BaseAgent;
    task: Task;
    iterations: number;
    maxAgentIterations: number;
  }) => void;
  handleAgentThinkingStart: (params: {
    agent: BaseAgent;
    task: Task;
    messages: Array<{
      type: string;
      content: string;
    }>;
  }) => void;
  handleAgentThinkingEnd: (params: {
    agent: BaseAgent;
    task: Task;
    output: ThinkingResult;
  }) => void;
  handleAgentThinkingError: (params: {
    agent: BaseAgent;
    task: Task;
    error: LLMInvocationError;
  }) => void;
  handleAgentIssuesParsingLLMOutput: (params: {
    agent: BaseAgent;
    task: Task;
    output: ThinkingResult;
    error: LLMInvocationError;
  }) => void;
  handleAgentIssuesParsingSchemaOutput: (params: {
    agent: BaseAgent;
    task: Task;
    output: ThinkingResult;
    error: LLMInvocationError;
  }) => void;
  handleAgentFinalAnswer: (params: {
    agent: BaseAgent;
    task: Task;
    output: ParsedLLMOutput;
  }) => void;
  handleAgentThought: (params: {
    agent: BaseAgent;
    task: Task;
    output: ParsedLLMOutput;
  }) => void;
  handleAgentSelfQuestion: (params: {
    agent: BaseAgent;
    task: Task;
    output: ParsedLLMOutput;
  }) => void;
  handleAgentToolStart: (params: {
    agent: BaseAgent;
    task: Task;
    tool: BaseTool;
    input?: Record<string, unknown> | string;
  }) => void;
  handleAgentToolEnd: (params: {
    agent: BaseAgent;
    task: Task;
    tool: BaseTool;
    output: ToolResult;
  }) => void;
  handleAgentToolError: (params: {
    agent: BaseAgent;
    task: Task;
    tool: BaseTool;
    error: LLMInvocationError;
  }) => void;
  handleAgentToolDoesNotExist: (params: {
    agent: BaseAgent;
    task: Task;
    toolName: string;
  }) => void;
  handleAgentObservation: (params: {
    agent: BaseAgent;
    task: Task;
    output: ParsedLLMOutput;
  }) => void;
  handleWeirdOutput: (params: {
    agent: BaseAgent;
    task: Task;
    output: ParsedLLMOutput;
  }) => void;
  handleAgentLoopError: (params: {
    agent: BaseAgent;
    task: Task;
    error: LLMInvocationError;
    iterations: number;
    maxAgentIterations: number;
  }) => void;
  handleAgentMaxIterationsError: (params: {
    agent: BaseAgent;
    task: Task;
    error: LLMInvocationError;
    iterations: number;
    maxAgentIterations: number;
  }) => void;
  handleAgentTaskCompleted: (params: {
    agent: BaseAgent;
    task: Task;
    result: TaskResult;
    iterations: number;
    maxAgentIterations: number;
  }) => void;
  handleAgentBlockTask: (params: {
    agent: BaseAgent;
    task: Task;
    reason: string;
    metadata: {
      isAgentDecision: boolean;
      blockedBy: string;
    };
  }) => void;
  handleAgentTaskAborted: (params: {
    agent: BaseAgent;
    task: Task;
    error: StopAbortError | LLMInvocationError;
  }) => void;
  handleAgentTaskPaused: (params: { task: Task }) => void;
  handleAgentTaskResumed: (params: { task: Task }) => void;
}
