/**
 * Agent that delegates task execution to external coding CLIs
 * (Claude Code, OpenCode) or an in-process mock for tests and demos.
 */

import { Task } from '..';
import { TaskResult } from '../stores/taskStore.types';
import { AGENT_STATUS_enum } from '../utils/enums';
import { AgentLoopResult, ParsedLLMOutput } from '../utils/llm.types';
import { logger } from '../utils/logger';
import { interpolateTaskDescriptionV2 } from '../utils/tasks';
import { BaseAgent, BaseAgentParams } from './baseAgent';
import {
  runClaudeCodeCli,
  runCodexCli,
  runOpenCodeCli,
} from './externalCoding/cliCodingDrivers';

export type ExternalCodingBackend =
  | 'claude-code'
  | 'opencode'
  | 'codex'
  | 'mock';

export interface ClaudeCodeCliOptions {
  /** When true (default), passes `--bare` for reproducible scripted runs. */
  useBare?: boolean;
  allowedTools?: string;
  permissionMode?: string;
  maxTurns?: number;
  maxBudgetUsd?: number;
  extraArgs?: string[];
}

export interface OpenCodeCliOptions {
  model?: string;
  /** OpenCode `--agent` flag value (named agent in OpenCode config). */
  agentName?: string;
  attachUrl?: string;
  extraArgs?: string[];
}

export interface CodexCliOptions {
  model?: string;
  /**
   * Sandbox policy for `codex exec --sandbox`.
   * `'read-only'` (default) — safe for read-only tasks.
   * `'workspace-write'` — lets the agent edit files in `workspaceRoot`.
   * `'danger-full-access'` — no sandboxing (use only in isolated environments).
   */
  sandboxMode?: 'read-only' | 'workspace-write' | 'danger-full-access';
  /**
   * Keep the session on disk (`--no-ephemeral`).
   * Defaults to `true` (ephemeral) for reproducible scripted runs.
   */
  ephemeral?: boolean;
  /** Pass `--skip-git-repo-check` when `workspaceRoot` is not a git repo. */
  skipGitRepoCheck?: boolean;
  extraArgs?: string[];
}

export interface ExternalCodingAgentParams {
  type?: 'ExternalCodingAgent';
  name: string;
  role: string;
  goal: string;
  background: string;
  codingBackend: ExternalCodingBackend;
  /** Current working directory for the external CLI (usually the repo root). */
  workspaceRoot: string;
  /**
   * Executable name or absolute path.
   * Defaults: `claude` (Claude Code), `opencode` (OpenCode). Ignored for `mock`.
   */
  cliPath?: string;
  /** Max time for one CLI invocation (default 600_000 ms). */
  timeoutMs?: number;
  claude?: ClaudeCodeCliOptions;
  opencode?: OpenCodeCliOptions;
  codex?: CodexCliOptions;
}

export class ExternalCodingAgent extends BaseAgent {
  private readonly codingBackend: ExternalCodingBackend;
  private readonly workspaceRoot: string;
  private readonly cliPath?: string;
  private readonly timeoutMs: number;
  private readonly claude?: ClaudeCodeCliOptions;
  private readonly opencode?: OpenCodeCliOptions;
  private readonly codex?: CodexCliOptions;

  constructor(config: ExternalCodingAgentParams) {
    const base: BaseAgentParams = {
      name: config.name,
      role: config.role,
      goal: config.goal,
      background: config.background,
      tools: [],
      maxIterations: 1,
      forceFinalAnswer: true,
      llmConfig: {
        provider: 'openai',
        model: 'external-coding-agent',
        maxRetries: 0,
      },
    };
    super(base);

    this.codingBackend = config.codingBackend;
    this.workspaceRoot = config.workspaceRoot;
    this.cliPath = config.cliPath;
    this.timeoutMs = config.timeoutMs ?? 600_000;
    this.claude = config.claude;
    this.opencode = config.opencode;
    this.codex = config.codex;
  }

  async workOnTask(
    task: Task,
    inputs: Record<string, unknown>,
    context: string
  ): Promise<AgentLoopResult> {
    const prompt = this.buildPrompt(task, inputs, context);
    return this.executePrompt(task, prompt);
  }

  async workOnFeedback(
    task: Task,
    feedbackList: Array<{ content: string }>,
    context: string
  ): Promise<AgentLoopResult> {
    const inputs = task.inputs ?? {};
    const basePrompt = this.buildPrompt(task, inputs, context);
    const feedback = feedbackList.map((f) => f.content).join('\n');
    const prompt = `${basePrompt}\n\n## Reviewer feedback\n${feedback}`;
    return this.executePrompt(task, prompt);
  }

  async workOnTaskResume(task: Task): Promise<void> {
    const inputs = task.inputs ?? {};
    const context = this.store?.getState()?.workflowContext ?? '';
    await this.workOnTask(task, inputs, context);
  }

  getCleanedAgent(): Partial<BaseAgent> {
    return {
      id: '[REDACTED]',
      name: this.name,
      role: this.role,
      goal: this.goal,
      background: this.background,
      env: '[REDACTED]',
      llmConfig: {
        ...this.llmConfig,
        apiKey: '[REDACTED]',
      },
      codingBackend: this.codingBackend,
      workspaceRoot: this.workspaceRoot,
      cliPath: this.cliPath ? '[REDACTED]' : undefined,
    } as Partial<BaseAgent>;
  }

  private buildPrompt(
    task: Task,
    inputs: Record<string, unknown>,
    context: string
  ): string {
    const taskResults = this.store?.getState()?.getTaskResults() ?? {};
    const description =
      task.interpolatedTaskDescription ??
      interpolateTaskDescriptionV2(task.description, inputs, taskResults);

    const parts = [
      `## Task\n${description}`,
      context ? `## Prior output / context\n${context}` : '',
      `## Expected output\n${task.expectedOutput}`,
    ];
    return parts.filter(Boolean).join('\n\n');
  }

  private mergeEnv(): NodeJS.ProcessEnv {
    return { ...process.env, ...this.env };
  }

  private async executePrompt(
    task: Task,
    prompt: string
  ): Promise<AgentLoopResult> {
    this.setStatus(AGENT_STATUS_enum.THINKING);

    try {
      const { taskResult, errorMessage } = await this.invokeBackend(prompt);

      if (errorMessage) {
        this.setStatus(AGENT_STATUS_enum.THINKING_ERROR);
        const err = new Error(errorMessage);
        this.store?.getState()?.handleTaskError({
          agent: this,
          task,
          error: err,
        });
        return {
          error: errorMessage,
          metadata: { iterations: 1, maxAgentIterations: 1 },
        };
      }

      this.setStatus(AGENT_STATUS_enum.FINAL_ANSWER);
      this.store?.getState()?.handleAgentTaskCompleted({
        agent: this,
        task,
        result: taskResult,
        iterations: 1,
        maxAgentIterations: 1,
      });

      const parsedLLMOutput: ParsedLLMOutput = {
        finalAnswer: taskResult,
        isValidOutput: true,
      };

      return {
        result: parsedLLMOutput,
        metadata: { iterations: 1, maxAgentIterations: 1 },
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error ?? 'Unknown');
      logger.error(`ExternalCodingAgent ${this.name} failed`, error);
      this.setStatus(AGENT_STATUS_enum.THINKING_ERROR);
      this.store?.getState()?.handleTaskError({
        agent: this,
        task,
        error: error instanceof Error ? error : new Error(message),
      });
      return {
        error: message,
        metadata: { iterations: 1, maxAgentIterations: 1 },
      };
    }
  }

  private async invokeBackend(prompt: string): Promise<{
    taskResult: TaskResult;
    errorMessage: string | null;
  }> {
    if (this.codingBackend === 'mock') {
      const text = `[mock:${this.name}] ${prompt.slice(0, 500)}${
        prompt.length > 500 ? '…' : ''
      }`;
      return {
        taskResult: text,
        errorMessage: null,
      };
    }

    const env = this.mergeEnv();
    const cwd = this.workspaceRoot;

    if (this.codingBackend === 'claude-code') {
      const cliPath = this.cliPath ?? 'claude';
      const c = this.claude ?? {};
      const { run, parsed } = await runClaudeCodeCli({
        cliPath,
        prompt,
        cwd,
        env,
        timeoutMs: this.timeoutMs,
        useBare: c.useBare !== false,
        allowedTools: c.allowedTools,
        permissionMode: c.permissionMode,
        maxTurns: c.maxTurns,
        maxBudgetUsd: c.maxBudgetUsd,
        extraArgs: c.extraArgs,
      });

      if (run.exitCode !== 0) {
        const msg = formatCliFailure('Claude Code', run);
        return {
          taskResult: '',
          errorMessage: msg,
        };
      }

      const taskResult: TaskResult =
        parsed.structured !== undefined
          ? (parsed.structured as Record<string, unknown>)
          : parsed.text;
      return {
        taskResult,
        errorMessage: null,
      };
    }

    if (this.codingBackend === 'opencode') {
      const cliPath = this.cliPath ?? 'opencode';
      const o = this.opencode ?? {};
      const { run, parsed } = await runOpenCodeCli({
        cliPath,
        prompt,
        cwd,
        env,
        timeoutMs: this.timeoutMs,
        model: o.model,
        agentName: o.agentName,
        attachUrl: o.attachUrl,
        extraArgs: o.extraArgs,
      });

      if (run.exitCode !== 0) {
        const msg = formatCliFailure('OpenCode', run);
        return {
          taskResult: '',
          errorMessage: msg,
        };
      }

      const taskResult: TaskResult =
        parsed.structured !== undefined && typeof parsed.structured === 'object'
          ? (parsed.structured as Record<string, unknown>)
          : parsed.text;

      return {
        taskResult,
        errorMessage: null,
      };
    }

    if (this.codingBackend === 'codex') {
      const cliPath = this.cliPath ?? 'codex';
      const cx = this.codex ?? {};
      const { run, parsed } = await runCodexCli({
        cliPath,
        prompt,
        cwd,
        env,
        timeoutMs: this.timeoutMs,
        model: cx.model,
        sandboxMode: cx.sandboxMode,
        ephemeral: cx.ephemeral,
        skipGitRepoCheck: cx.skipGitRepoCheck,
        extraArgs: cx.extraArgs,
      });

      if (run.exitCode !== 0) {
        const msg = formatCliFailure('Codex', run);
        return { taskResult: '', errorMessage: msg };
      }

      // parsed.structured for Codex is the turn.completed telemetry (usage stats),
      // not a semantic structured result — always surface the agent's text output.
      return { taskResult: parsed.text, errorMessage: null };
    }

    return {
      taskResult: '',
      errorMessage: `Unknown coding backend: ${this.codingBackend}`,
    };
  }
}

function formatCliFailure(
  label: string,
  run: import('./externalCoding/cliCodingDrivers').CliRunResult
): string {
  const parts = [
    `${label} CLI exited with code ${run.exitCode}${
      run.signal ? ` (signal ${run.signal})` : ''
    }`,
  ];
  const err = run.stderr.trim() || run.stdout.trim();
  if (err) {
    parts.push(err.slice(0, 4000));
  }
  return parts.join('\n');
}
