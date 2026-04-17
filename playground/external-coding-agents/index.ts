/**
 * Demo: ExternalCodingAgent (Claude Code, OpenCode, or mock).
 *
 * Set the default backend in `PLAYGROUND_DEFAULT_BACKEND` below and run `npm start`
 * (or `npm run dev`). Optional: override with env or `.env` — see README.
 */

import 'dotenv/config';
import { Agent, Task, Team } from 'kaibanjs';

type CodingBackend = 'mock' | 'claude-code' | 'opencode';

/** Edit this for normal `npm start` / `npm run dev` without shell prefixes. */
const PLAYGROUND_DEFAULT_BACKEND: CodingBackend = 'claude-code';

const ALLOWED_BACKENDS = new Set<string>(['mock', 'claude-code', 'opencode']);

function resolveCodingBackend(): CodingBackend {
  const raw = process.env.KAIBAN_CODING_BACKEND?.trim();
  if (raw && ALLOWED_BACKENDS.has(raw)) {
    return raw as CodingBackend;
  }
  if (raw) {
    console.warn(
      `[playground] Invalid KAIBAN_CODING_BACKEND="${process.env.KAIBAN_CODING_BACKEND}". ` +
        `Expected one of: mock, claude-code, opencode. ` +
        `Using PLAYGROUND_DEFAULT_BACKEND (${PLAYGROUND_DEFAULT_BACKEND}). ` +
        `Tip: avoid typos like VAR=VAR=value — use VAR=value or put VAR=value in .env`
    );
  }
  return PLAYGROUND_DEFAULT_BACKEND;
}

const codingBackend = resolveCodingBackend();
const workspaceRoot = process.cwd();

const cliPathFromEnv =
  codingBackend === 'claude-code'
    ? process.env.KAIBAN_CLAUDE_CLI || process.env.CLAUDE_CLI
    : codingBackend === 'opencode'
    ? process.env.KAIBAN_OPENCODE_CLI || process.env.OPENCODE_CLI
    : undefined;

const summarizer = new Agent({
  type: 'ExternalCodingAgent',
  name: 'DevCLI',
  role: 'Coding agent delegate',
  goal: 'Execute the task via an external coding CLI or mock',
  background: 'Configured for local development only',
  codingBackend,
  workspaceRoot,
  ...(cliPathFromEnv ? { cliPath: cliPathFromEnv } : {}),
  timeoutMs: 600_000,
  ...(codingBackend === 'claude-code'
    ? {
        claude: {
          useBare: true,
          allowedTools: 'Read',
        },
      }
    : {}),
  ...(codingBackend === 'opencode'
    ? {
        opencode: {
          // model: 'anthropic/claude-3-5-sonnet-latest',
        },
      }
    : {}),
});

const task = new Task({
  title: 'External coding demo',
  description:
    'Respond to the user question about workspace of current project: Question: {question}',
  expectedOutput: 'Answer to the user question in plain text',
  agent: summarizer,
});

const team = new Team({
  name: 'External coding playground',
  agents: [summarizer],
  tasks: [task],
  inputs: { question: 'Whats dependencies are needed to run the project?' },
});

async function main() {
  console.log(`[playground] codingBackend=${codingBackend}`);
  const outcome = await team.start();
  console.log('Workflow status:', outcome.status);
  console.log('Task result:', team.getTasks()[0].result);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
