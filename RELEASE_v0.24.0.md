# KaibanJS v0.24.1 🚀

## 🤖 External Coding Agents: delegate tasks to Claude Code & OpenCode

KaibanJS introduces **`ExternalCodingAgent`** — a new agent type that **runs your task prompt through a local coding CLI** instead of routing inference through LangChain. Use it for headless coding workflows, repo-aware answers, and two-step “planner + reviewer” style teams where each step is a separate CLI invocation.

The agent is built for **Node / server runtimes** (it uses `child_process`; browser bundles treat `node:child_process` as external).

### What you can plug in

| Backend | Behavior |
| -------- | ---------- |
| **`claude-code`** | Non-interactive Claude Code: `claude --bare -p "…" --output-format json` ([Anthropic headless docs](https://docs.anthropic.com/en/docs/claude-code/headless)). |
| **`opencode`** | OpenCode CLI: `opencode run --format json` ([OpenCode CLI](https://opencode.ai/docs/cli/)). |
| **`mock`** | No binaries; echoes the interpolated prompt — ideal for CI and wiring checks. |

### Configuration highlights

- **`workspaceRoot`**: working directory for the CLI (usually the repo root).
- **`cliPath`**: optional executable override; env fallbacks: `KAIBAN_CLAUDE_CLI` / `CLAUDE_CLI`, `KAIBAN_OPENCODE_CLI` / `OPENCODE_CLI`.
- **`timeoutMs`**: max wait per invocation (default 10 minutes).
- **Claude Code options** (`claude`): `useBare`, `allowedTools`, `permissionMode`, `maxTurns`, `maxBudgetUsd`, `extraArgs`.
- **OpenCode options** (`opencode`): `model`, `agentName` (named `--agent` profile), `attachUrl`, `extraArgs`.
- **Structured CLI output**: parsers read Claude’s JSON (`result` + optional `structured_output`) and OpenCode’s JSON / NDJSON (last valid line wins) so downstream tasks can receive **structured** `TaskResult` when the CLI returns it.

### Minimal example

```js
import { Agent, Task, Team } from 'kaibanjs';

const agent = new Agent({
  type: 'ExternalCodingAgent',
  name: 'Coder',
  role: 'CLI worker',
  goal: 'Answer using the external coding tool',
  background: 'Runs locally',
  codingBackend: 'claude-code', // or 'opencode' | 'mock'
  workspaceRoot: process.cwd(),
  claude: {
    useBare: true,
    allowedTools: 'Read',
  },
});

const team = new Team({
  name: 'External coding team',
  agents: [agent],
  tasks: [
    new Task({
      title: 'Analyze repo',
      description: 'Question: {question}',
      expectedOutput: 'A concise answer',
      agent,
    }),
  ],
});

await team.start({ question: 'What does package.json name?' });
```

### Two-agent workflow example (explore → review)

Chain tasks the same way as LLM agents: the **second** task references the first with **`{taskResult:task1}`** (task ids follow task order: `task1`, `task2`, …).

| Step | Agent | Idea |
| ---- | ----- | ---- |
| 1 | First `ExternalCodingAgent` | Answer `inputs.question` (e.g. with Read when Claude allows it). |
| 2 | Second `ExternalCodingAgent` | Consumes `{taskResult:task1}` in the description for critique / follow-up. |

A full runnable demo lives in the repo:

- **Playground:** [`playground/external-coding-agents`](playground/external-coding-agents/README.md) — `npm start`; set `PLAYGROUND_DEFAULT_BACKEND` in `index.ts` or `KAIBAN_CODING_BACKEND` in `.env` (`mock` \| `claude-code` \| `opencode`).

### Testing

- Unit coverage for **JSON parsers** used by the Claude Code and OpenCode drivers (`tests/unit/externalCodingAgent.test.ts`).

### External Coding Agents — checklist

- ✅ `ExternalCodingAgent` with `claude-code`, `opencode`, and `mock` backends
- ✅ CLI drivers with timeout, exit-code handling, and structured/text parsing
- ✅ Per-backend options (tools, permissions, OpenCode `--agent`, etc.)
- ✅ `workOnFeedback` support for reviewer-style follow-ups
- ✅ Documented two-step playground and README section

---

## 🌐 OpenClaw ecosystem updates

This release expands the KaibanJS ecosystem around **OpenClaw** with both a **native plugin package** and an **OpenResponses-compatible adapter playground**, making it easier to expose KaibanJS Teams as tools or agent backends inside OpenClaw-based setups.

### OpenClaw plugin package

KaibanJS now includes **`@kaibanjs/kaibanjs-plugin`**, a native OpenClaw plugin that registers a **KaibanJS `Team`** as a single tool (`kaiban_run_team`) for OpenClaw's main agent.

- Loads a user-provided Team module dynamically at Gateway startup
- Reads `teamMetadata` to expose tool descriptions and optional input schema
- Registers a single OpenClaw tool that runs `createTeam(...).start()` and returns the workflow result
- Includes installation and configuration guidance for local Gateway setups

### OpenResponses adapter playground

The new **`playground/openclaw-openresponses`** example exposes a **KaibanJS Team** through an **OpenResponses-compatible HTTP API**, allowing OpenClaw to use KaibanJS as an external backend via `POST /v1/responses`.

- Supports JSON and SSE-style streaming responses
- Includes local setup instructions, auth wiring, and OpenClaw provider configuration
- Demonstrates how OpenClaw can route WhatsApp / Telegram / Discord style traffic into a KaibanJS Team

### OpenClaw ecosystem — checklist

- ✅ New OpenClaw plugin package for exposing a KaibanJS Team as a tool
- ✅ OpenResponses adapter playground for using KaibanJS as an OpenClaw backend
- ✅ End-to-end documentation for plugin install, config, and local testing

---

## 🧪 Playground & documentation updates

This release also adds new examples and documentation to make adoption easier across different integration patterns.

### New Kaiban playground

A new Kaiban playground / starter example was added to showcase **KaibanJS Team integration through MCP and SDK-oriented patterns**, including a more complete use-case-driven setup for platform-style orchestration.

### Community Projects

The main README now includes a **Community Projects** section to highlight ecosystem work built by the community and make those extensions easier to discover.

### Playground & docs — checklist

- ✅ New Kaiban playground / starter example
- ✅ README section for Community Projects
- ✅ More discoverable integration examples across the repo

---

## 💰 Model pricing & `llmCostCalculator` updates

This release **refreshes model pricing and configuration** in **`llmCostCalculator`** so cost estimates stay aligned with current provider catalogs and usage patterns.

### Pricing & calculator — checklist

- ✅ Updated rate tables and related configuration for supported models
- ✅ Consistent cost tracking when using KaibanJS agents with configured LLMs

---

## 🔗 WorkflowDrivenAgent & structured outputs (schema chaining)

Building on [v0.23.0 WorkflowDrivenAgent](https://github.com/kaiban-ai/KaibanJS/releases/tag/v0.23.0), v0.24.1 improves how **structured outputs** from one task flow into a **workflow** driven by the next.

### Automatic input shaping (single dependency)

When a task assigned to a **`WorkflowDrivenAgent`** depends on **exactly one** prior task and that dependency produced **structured output**, the runtime **validates** that object against the workflow’s **`inputSchema`** (Zod):

- If **`inputSchema.parse(...)` succeeds**, the dependency payload is **merged at the root** of the inputs passed to the workflow (in addition to team inputs), so workflow steps receive the same shape as your Zod workflow input — no manual unwrapping by task id.
- If validation **fails**, the previous behavior is preserved: structured outputs remain keyed under the **dependency task id** so nothing breaks for mismatched shapes.

This logic lives in the deterministic execution path (`subscribeDeterministicExecution` / `_executeTask`) and pairs naturally with **`ReactChampionAgent`** tasks that define matching **`outputSchema`** and **`structuredOutput`** expectations.

### Visual example & Storybook

- **Diagram + narrative:** [`playground/react/src/teams/workflow_driven/structured_output_chain.md`](playground/react/src/teams/workflow_driven/structured_output_chain.md) — “schema chaining” from Task 1 (`outputSchema`) to Task 2 workflow (`inputSchema`).
- **Team implementation:** [`playground/react/src/teams/workflow_driven/structured_output_chain.js`](playground/react/src/teams/workflow_driven/structured_output_chain.js)
- **Storybook:** `WorkflowDrivenTeam` stories in the React playground include the structured output chain scenario.

### WorkflowDrivenAgent & structured outputs — checklist

- ✅ Single-dependency `WorkflowDrivenAgent` receives root-level workflow input when schemas align
- ✅ Graceful fallback to task-id keyed structured outputs when schemas do not match
- ✅ Documentation and Storybook material for schema chaining

---

**Breaking changes:** None expected for consumers only adopting these features; new APIs are additive (`ExternalCodingAgent`, calculator updates, workflow input merge behavior).

**Migration guide:** No required migration. For External Coding Agents, install the CLI you need, set `ANTHROPIC_API_KEY` (Claude Code) or configure OpenCode, and point `workspaceRoot` at your project. For schema chaining, align `outputSchema` of the upstream task with the workflow `inputSchema` to get root-level merging.

---

**Full Changelog:** https://github.com/kaiban-ai/KaibanJS/compare/v0.23.1...v0.24.1

---

KaibanJS v0.24.1 continues to combine **LLM-driven**, **workflow-driven**, **CLI-delegated**, and **OpenClaw-integrated** agents so you can pick the right execution model per task. 🚀
