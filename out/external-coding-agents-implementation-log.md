# Tracking: external coding agents (implementation)

Internal log of what was implemented against the single-issue plan in `out/github-issues-external-coding-agents.md`. Update this file in follow-up PRs.

## Status

| Area | Status | Notes |
|------|--------|-------|
| `ExternalCodingAgent` + factory | Done | `type: 'ExternalCodingAgent'` |
| Claude Code CLI drivers | Done | `claude --bare -p … --output-format json` |
| OpenCode CLI drivers | Done | `opencode run --format json …` |
| `mock` backend (tests / demo without CLI) | Done | `codingBackend: 'mock'` |
| Playground | Done | `playground/external-coding-agents/` |
| Single-issue plan doc | Done | `out/github-issues-external-coding-agents.md` |
| Kaiban.io / boards | Pending | Out of agreed scope |
| OpenCode HTTP driver | Pending | Future issue |
| Claude Agent SDK (TS) in-process | Pending | Future issue |

## Files touched (quick reference)

- `src/agents/externalCodingAgent.ts` — agent and public params.
- `src/agents/externalCoding/cliCodingDrivers.ts` — spawn, timeout, parsers.
- `src/agents/index.ts` — re-export.
- `src/index.ts` — `Agent.createAgent`, constructor union type.
- `playground/external-coding-agents/` — README + sample.
- `tests/unit/externalCodingAgent.test.ts` — CLI JSON parsers; full `Team` + `mock` flow via playground.

## Changelog

### 2026-04-17

- Initial implementation: delegated agent, `claude-code`, `opencode`, and `mock` drivers.
- Single-issue plan / checklist doc: `out/github-issues-external-coding-agents.md`.
- Playground `playground/external-coding-agents` (configurable default backend; optional real CLIs).
- `rollup.config.mjs`: `node:child_process` / `child_process` marked external (UMD/ESM warn for browser; agent intended for Node).
- Root README: collapsible “External coding agents” section.
- Unit tests: JSON parsers (`parseClaudeJsonOutput`, `parseOpenCodeJsonOutput`). Full `Team` + `mock` path is validated with `npm start` in the playground (Jest does not import the `src/index` barrel because of ESM `p-queue` constraints).
