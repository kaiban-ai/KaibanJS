/**
 * Demo: two `ExternalCodingAgent` workers (Claude Code, OpenCode, or mock).
 *
 * Task 2 receives task 1’s result via `{taskResult:task1}` (see KaibanJS task interpolation).
 * Set `PLAYGROUND_DEFAULT_BACKEND` below and run `npm start` / `npm run dev`.
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

type WorkerIdentity = {
  name: string;
  role: string;
  goal: string;
  background: string;
};

/** Same CLI/mock settings; different persona per agent so the team reads clearly in logs. */
function createExternalCodingWorker(c: WorkerIdentity): Agent {
  return new Agent({
    type: 'ExternalCodingAgent',
    name: c.name,
    role: c.role,
    goal: c.goal,
    background: c.background,
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
}

const explorer = createExternalCodingWorker({
  name: 'RepoExplorer',
  role: 'Repository analyst',
  goal: 'Answer questions about this workspace using the external coding CLI or mock',
  background: 'Runs first; may read files when the backend allows it',
});

const reviewer = createExternalCodingWorker({
  name: 'AnswerReviewer',
  role: 'Quality check on the first answer',
  goal: 'Critique and extend the prior agent’s answer without repeating it verbatim',
  background: 'Runs second; sees task 1 output via task-result interpolation',
});

const exploreTask = new Task({
  title: 'Explore repo (task 1)',
  description: `You are the first agent in a two-step workflow.

Question (from team inputs): {question}

Instructions:
- Use the workspace (read files if your tools allow) and answer in plain text.
- Be concrete: mention relevant files or scripts when you can.
- Keep the answer under ~400 words.`,
  expectedOutput: 'Plain-text answer to the question',
  agent: explorer,
});

const reviewTask = new Task({
  title: 'Review prior answer (task 2)',
  description: `You are the second agent. Another agent already answered this question:

--- BEGIN TASK 1 ANSWER ---
{taskResult:task1}
--- END TASK 1 ANSWER ---

Original question: {question}

Instructions:
- Give **Strengths** (bullet list), **Gaps or risks** (bullet list), and **One concrete follow-up** the user could ask next.
- Do not copy task 1 verbatim; add judgment.`,
  expectedOutput: 'Structured review in plain text',
  agent: reviewer,
});

const team = new Team({
  name: 'External coding — two-agent demo',
  agents: [explorer, reviewer],
  tasks: [exploreTask, reviewTask],
  inputs: {
    question:
      'What do I need installed or configured to build and test this repo?',
  },
});

async function main() {
  console.log(`[playground] codingBackend=${codingBackend}`);
  const outcome = await team.start();
  console.log('Workflow status:', outcome.status);
  const tasks = team.getTasks();
  tasks.forEach((t, i) => {
    console.log(`\n--- Task ${i + 1}: ${t.title} (${t.agent.name}) ---`);
    console.log(String(t.result ?? '').slice(0, 2000));
    if (String(t.result ?? '').length > 2000) console.log('… [truncated]');
  });
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
