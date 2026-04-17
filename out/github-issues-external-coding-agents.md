# GitHub issue (single): external coding agents (Claude Code + OpenCode)

Copy everything under **“Paste into GitHub”** into one issue (title + body). The task lists below reflect the **current implementation** in the repo; `[x]` matches what is already in tree as of the last update note at the bottom.

---

## Paste into GitHub

**Title:** `[Feature] External coding agents (Claude Code, OpenCode) as first-class KaibanJS agents`

**Body:**

### Summary

Add a new agent type, **`ExternalCodingAgent`**, so a `Team` can delegate a task to local developer CLIs (**Claude Code**, **OpenCode**) or to an in-process **`mock`** backend, using the same task / store lifecycle as other agents.

### Goal

Orchestrate external coding tools from KaibanJS without replacing the existing LLM-based agents: one more `type` on `Agent`, CLI subprocess execution on **Node**, structured handling of CLI output where supported.

### Scope (agreed)

- **In scope:** KaibanJS library + `playground/external-coding-agents` + docs under `out/` and root README.
- **Out of scope (future):** Kaiban.io / boards serialization, OpenCode HTTP driver, in-process Claude Agent SDK.

### References

- Claude Code (scripted): [Run Claude Code programmatically](https://docs.anthropic.com/en/docs/claude-code/headless) — `claude -p`, `--bare`, `--output-format json`, `--allowedTools`, etc.
- OpenCode CLI: [CLI](https://opencode.ai/docs/cli/) — `opencode run --format json`, optional `opencode serve` + `--attach`.

---

### Core library

- [x] `ExternalCodingAgent` extends `BaseAgent` with `codingBackend`: `claude-code` | `opencode` | `mock`
- [x] `workOnTask` / `workOnFeedback` / `workOnTaskResume` implemented (mock re-run; CLI re-run with composed prompt)
- [x] Success path calls `handleAgentTaskCompleted` with `TaskResult` (string or structured object from Claude when `structured_output` is present)
- [x] Failure path calls `handleTaskError` (task `BLOCKED`) for non-zero CLI exit or thrown errors
- [x] Register `type: 'ExternalCodingAgent'` in `Agent.createAgent` (`src/index.ts`)
- [x] Export `ExternalCodingAgent`, `ExternalCodingAgentParams`, and related types from package entrypoint
- [x] Re-export from `src/agents/index.ts`

### CLI drivers (`src/agents/externalCoding/cliCodingDrivers.ts`)

- [x] `runClaudeCodeCli`: `claude` + optional `--bare`, `-p`, `--output-format json`, `--allowedTools`, `--permission-mode`, `--max-turns`, `--max-budget-usd`, `extraArgs`
- [x] `runOpenCodeCli`: `opencode run --format json` + prompt; optional `--model`, `--agent`, `--attach`, `extraArgs`
- [x] `spawn` without shell; configurable `timeoutMs`; merge `process.env` with agent / team `env`
- [x] Parse Claude JSON (`result`, `structured_output`); parse OpenCode output (NDJSON-tolerant, last JSON line)
- [x] Clearer error on missing binary (`ENOENT` → message suggesting `PATH` or `cliPath` / env overrides)
- [ ] Optional: cap captured stdout/stderr size for very large CLI output (not implemented yet)

### Build & runtime

- [x] Mark `node:child_process` / `child_process` as Rollup **externals** (`rollup.config.mjs`) so Node consumers resolve them; browser bundles warn — agent is **Node-oriented**

### Playground (`playground/external-coding-agents/`)

- [x] Sample `Team` + single `Task` + `ExternalCodingAgent`
- [x] `PLAYGROUND_DEFAULT_BACKEND` in `index.ts` for normal `npm start` / `npm run dev` without shell prefixes
- [x] Optional override: `KAIBAN_CODING_BACKEND` from env / `.env` with validation + warning on invalid values
- [x] `dotenv` + `.env.example`; optional `KAIBAN_CLAUDE_CLI` / `KAIBAN_OPENCODE_CLI` (or `CLAUDE_CLI` / `OPENCODE_CLI`) for non-`PATH` installs
- [x] `async` `main()` + `.catch()` (no unsettled top-level await warning)
- [x] README: Claude Code (`ANTHROPIC_API_KEY`), OpenCode (`which opencode`, `ENOENT`), mock, dependency on local `file:../..` build

### Tests & documentation

- [x] Unit tests for `parseClaudeJsonOutput` / `parseOpenCodeJsonOutput` (`tests/unit/externalCodingAgent.test.ts`)
- [x] Full `Team` + `mock` path validated manually via playground `npm start` (Jest does not import the `kaibanjs` barrel in unit tests due to ESM `p-queue` constraints)
- [x] Root `README.md`: collapsible “External coding agents” section with links to playground + `out/` tracking
- [x] `out/external-coding-agents-implementation-log.md` for PR / release notes follow-up

### Follow-ups (future)

- [ ] Document stricter safety defaults (tool allowlists, no user-controlled shell strings) in official docs site if/when promoted beyond playground
- [ ] Optional: stdout/stderr size limits and structured logging for long CLI runs
- [ ] Kaiban Platform: card / team schema for external agent config + executor wiring
- [ ] Optional driver: HTTP client for `opencode serve` ([server docs](https://opencode.ai/docs/server))
- [ ] Optional driver: `@anthropic-ai/claude-agent-sdk` (TypeScript) for streaming / tool approval
- [ ] Optional: Jest ESM strategy or dedicated integration test package so `Team` + `mock` can run in CI without playground-only manual check

---

_Use one GitHub issue with the sections above; open items (`[ ]`) are for follow-up PRs. More detail: `out/external-coding-agents-implementation-log.md`._

_Last updated: matches current repo implementation (KaibanJS + playground; OpenCode = opencode.ai; dev-focused CLI usage)._
