# Playground: External coding agents (`ExternalCodingAgent`)

Runs a small **`Team`** with **two** `ExternalCodingAgent` workers. KaibanJS sends each task's prompt to **Claude Code**, **OpenCode**, **Codex**, or a **`mock`** backend (no local CLI required).

## What this example does

| Step | Agent            | Task                                                                                                                                 |
| ---- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 1    | `RepoExplorer`   | Answer `inputs.question` about the repo (may use **Read** when using Claude Code with `allowedTools: 'Read'`).                       |
| 2    | `AnswerReviewer` | Reads the first agent's output through **`{taskResult:task1}`** in the task description, then adds strengths, gaps, and a follow-up. |

**Task chaining:** Kaiban resolves `task1`, `task2`, … from the **order of tasks** in the team (see `getTaskResults` in the library). So the second prompt must use `{taskResult:task1}` to refer to the result of the first task.

**Changing the question:** edit `inputs.question` in `index.ts` (or extend the script to read `process.argv`).

**Mock vs real CLI:** with `KAIBAN_CODING_BACKEND=mock`, both agents echo the interpolated prompt (good for wiring checks). With `claude-code`, `opencode`, or `codex`, each task is a separate CLI invocation.

## How to choose the backend (three ways)

1. **In code (recommended for day-to-day)** — edit `PLAYGROUND_DEFAULT_BACKEND` at the top of `index.ts` (`'claude-code'`, `'opencode'`, `'codex'`, or `'mock'`), then run:

   ```bash
   npm start
   # same as:
   npm run dev
   ```

2. **In `.env`** (optional override) — copy `.env.example` to `.env` and set `KAIBAN_CODING_BACKEND=...` if you want to switch without editing code.

3. **One-off in the shell** (optional) — only if you need a temporary override:

   ```bash
   KAIBAN_CODING_BACKEND=mock npm start
   ```

   Must be exactly: `VAR=value` (no duplicate `VAR=` inside the value). Wrong: `KAIBAN_CODING_BACKEND=KAIBAN_CODING_BACKEND=claude-code` → the variable becomes the invalid string `KAIBAN_CODING_BACKEND=claude-code` and the agent reports an unknown backend.

## Claude Code

1. Install [Claude Code](https://docs.anthropic.com/en/docs/claude-code/setup); check `which claude`.
2. Set **`ANTHROPIC_API_KEY`** in `.env` or your shell ([headless / `--bare`](https://docs.anthropic.com/en/docs/claude-code/headless) uses the API key).
3. Set `PLAYGROUND_DEFAULT_BACKEND` to `'claude-code'` in `index.ts` (default in repo) and run `npm start`.

If `claude` is not on `PATH`, set **`KAIBAN_CLAUDE_CLI`** / **`CLAUDE_CLI`** to the full path in `.env`.

## OpenCode

1. Install [OpenCode CLI](https://opencode.ai/docs/cli/); verify `which opencode`.
2. Set `PLAYGROUND_DEFAULT_BACKEND` to `'opencode'` in `index.ts` (or use `.env`), then `npm start`.

If you see **`spawn opencode ENOENT`**, the binary was not found — install it, fix `PATH`, or set **`KAIBAN_OPENCODE_CLI`** / **`OPENCODE_CLI`** to the full path in `.env`.

## Codex

1. Install [Codex CLI](https://github.com/openai/codex); verify `which codex` (v0.1 or newer).
2. Authenticate once: `codex login` (stores your key in `~/.codex/auth.json`). Alternatively, export **`OPENAI_API_KEY`** in `.env`.
3. Set `PLAYGROUND_DEFAULT_BACKEND` to `'codex'` in `index.ts` (or use `.env`), then `npm start`.

The driver calls `codex exec --json --ephemeral --sandbox read-only <prompt>` by default. Stdin is closed by the process runner so Codex will not wait for interactive input. Key options exposed via `codex: { ... }` in the agent config:

| Option             | CLI flag                                                   | Default       |
| ------------------ | ---------------------------------------------------------- | ------------- |
| `model`            | `-m <model>`                                               | Codex default |
| `sandboxMode`      | `--sandbox read-only\|workspace-write\|danger-full-access` | `'read-only'` |
| `ephemeral`        | `--ephemeral` / omit flag                                  | `true`        |
| `skipGitRepoCheck` | `--skip-git-repo-check`                                    | `false`       |
| `extraArgs`        | appended verbatim                                          | —             |

If `codex` is not on `PATH`, set **`KAIBAN_CODEX_CLI`** / **`CODEX_CLI`** to the full path in `.env`.

## Mock (no CLI)

Set `PLAYGROUND_DEFAULT_BACKEND` to `'mock'` in `index.ts`, or `KAIBAN_CODING_BACKEND=mock` in `.env` / shell.

## Dependency

`package.json` references `kaibanjs` via `file:../..`. From repo root if needed:

```bash
npm install && npm run build
cd playground/external-coding-agents && npm install && npm start
```

## Related docs

- `out/github-issues-external-coding-agents.md` (one GitHub issue template + checklists)
- `out/external-coding-agents-implementation-log.md`
