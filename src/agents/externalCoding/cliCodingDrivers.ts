import { spawn } from 'node:child_process';

export type CliRunResult = {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
};

export type ParsedCodingOutput = {
  text: string;
  structured?: unknown;
};

type SpawnOptions = {
  command: string;
  args: string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
  timeoutMs: number;
};

function runChildProcess(options: SpawnOptions): Promise<CliRunResult> {
  const { command, args, cwd, env, timeoutMs } = options;

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    child.stdout?.on('data', (chunk: Buffer) => {
      stdoutChunks.push(chunk);
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      stderrChunks.push(chunk);
    });

    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      const killHard = setTimeout(() => child.kill('SIGKILL'), 5000);
      killHard.unref();
    }, timeoutMs);

    child.on('error', (err) => {
      clearTimeout(timer);
      const code = (err as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') {
        reject(
          new Error(
            `Command not found: "${command}". Install it and ensure it is on your PATH, or set ExternalCodingAgent cliPath (e.g. KAIBAN_CLAUDE_CLI / KAIBAN_OPENCODE_CLI in the playground). Original: ${
              (err as Error).message
            }`
          )
        );
        return;
      }
      reject(err);
    });

    child.on('close', (exitCode, signal) => {
      clearTimeout(timer);
      resolve({
        stdout: Buffer.concat(stdoutChunks).toString('utf8'),
        stderr: Buffer.concat(stderrChunks).toString('utf8'),
        exitCode,
        signal,
      });
    });
  });
}

export function parseClaudeJsonOutput(stdout: string): ParsedCodingOutput {
  const trimmed = stdout.trim();
  if (!trimmed) {
    return { text: '' };
  }
  try {
    const obj = JSON.parse(trimmed) as Record<string, unknown>;
    const structured = obj.structured_output;
    const result =
      typeof obj.result === 'string'
        ? obj.result
        : obj.result != null
        ? JSON.stringify(obj.result)
        : '';
    if (structured !== undefined) {
      return { text: result || JSON.stringify(structured), structured };
    }
    return { text: result || trimmed };
  } catch {
    return { text: trimmed };
  }
}

/**
 * OpenCode may emit NDJSON or a single JSON blob depending on version and flags.
 * We take the last successfully parsed object and prefer common text fields.
 */
export function parseOpenCodeJsonOutput(stdout: string): ParsedCodingOutput {
  const lines = stdout.trim().split(/\r?\n/).filter(Boolean);
  let last: Record<string, unknown> | null = null;

  for (const line of lines) {
    try {
      last = JSON.parse(line) as Record<string, unknown>;
    } catch {
      /* skip */
    }
  }

  if (last) {
    const text =
      (typeof last.text === 'string' && last.text) ||
      (typeof last.content === 'string' && last.content) ||
      (typeof last.message === 'string' && last.message) ||
      (typeof last.result === 'string' && last.result) ||
      JSON.stringify(last);
    return { text, structured: last };
  }

  return { text: stdout.trim() };
}

export type ClaudeDriverInput = {
  cliPath: string;
  prompt: string;
  cwd: string;
  env: NodeJS.ProcessEnv;
  timeoutMs: number;
  useBare: boolean;
  allowedTools?: string;
  permissionMode?: string;
  maxTurns?: number;
  maxBudgetUsd?: number;
  extraArgs?: string[];
};

export async function runClaudeCodeCli(
  input: ClaudeDriverInput
): Promise<{ run: CliRunResult; parsed: ParsedCodingOutput }> {
  const args: string[] = [];
  if (input.useBare) {
    args.push('--bare');
  }
  args.push('-p', input.prompt, '--output-format', 'json');
  if (input.allowedTools) {
    args.push('--allowedTools', input.allowedTools);
  }
  if (input.permissionMode) {
    args.push('--permission-mode', input.permissionMode);
  }
  if (input.maxTurns != null) {
    args.push('--max-turns', String(input.maxTurns));
  }
  if (input.maxBudgetUsd != null) {
    args.push('--max-budget-usd', String(input.maxBudgetUsd));
  }
  if (input.extraArgs?.length) {
    args.push(...input.extraArgs);
  }

  const run = await runChildProcess({
    command: input.cliPath,
    args,
    cwd: input.cwd,
    env: input.env,
    timeoutMs: input.timeoutMs,
  });

  const parsed =
    run.exitCode === 0 ? parseClaudeJsonOutput(run.stdout) : { text: '' };
  return { run, parsed };
}

export type OpenCodeDriverInput = {
  cliPath: string;
  prompt: string;
  cwd: string;
  env: NodeJS.ProcessEnv;
  timeoutMs: number;
  model?: string;
  agentName?: string;
  attachUrl?: string;
  extraArgs?: string[];
};

export async function runOpenCodeCli(
  input: OpenCodeDriverInput
): Promise<{ run: CliRunResult; parsed: ParsedCodingOutput }> {
  const args = ['run', '--format', 'json'];
  if (input.attachUrl) {
    args.push('--attach', input.attachUrl);
  }
  if (input.model) {
    args.push('--model', input.model);
  }
  if (input.agentName) {
    args.push('--agent', input.agentName);
  }
  if (input.extraArgs?.length) {
    args.push(...input.extraArgs);
  }
  args.push(input.prompt);

  const run = await runChildProcess({
    command: input.cliPath,
    args,
    cwd: input.cwd,
    env: input.env,
    timeoutMs: input.timeoutMs,
  });

  const parsed =
    run.exitCode === 0 ? parseOpenCodeJsonOutput(run.stdout) : { text: '' };
  return { run, parsed };
}
