# Run KaibanJS Multi-Agent Teams Inside OpenClaw as a Native Tool

**The official `@kaibanjs/kaibanjs-plugin` registers your KaibanJS `Team` as a single OpenClaw tool — `kaiban_run_team` — so the Gateway’s main agent can delegate structured work to a full workflow without standing up a separate HTTP surface.**

---

## TL;DR

If you build **multi-agent systems** in TypeScript and want them on **real channels** (WhatsApp, Telegram, Discord, and the rest of OpenClaw’s ecosystem), you now have a **first-party OpenClaw plugin**: install `packages/openclaw-plugin` from the [KaibanJS](https://github.com/kaiban-ai/KaibanJS) repo, point OpenClaw at your Team module, and allow `kaiban_run_team` for your agent. The orchestrator decides **when** to call the tool; KaibanJS runs **how** the Team executes (tasks, agents, LangChain-compatible tools like Tavily). No adapter server required for this path — just a TypeScript module that exports `teamMetadata` and `createTeam`. For a product-style walkthrough, see the [KaibanJS OpenClaw plugin example](https://www.kaibanjs.com/examples/kaibanjs-openclaw-plugin) on the project site.

---

## Why Hugging Face builders should care

The Hugging Face community ships a lot of **agent demos** — Gradio Spaces, MCP servers, LangChain stacks, custom eval harnesses. Production users often hit the same wall: **how do you get from “cool agent in a notebook or repo” to “users can talk to it on the channels they already use”?** OpenClaw is one pragmatic answer: a **messaging gateway** with plugins, consistent tooling, and channel adapters.

KaibanJS sits in the same corner of the stack as **explicit multi-agent workflows**: Teams, Tasks, and Agents with clear structure and optional tools. The new plugin matters because it meets OpenClaw where it is strongest — **tool registration and Gateway extensions** — instead of forcing every team to expose an HTTP API unless they truly need one.

If you already publish models or tools on the Hub, think of this as **composable infrastructure**: your Team code stays ordinary TypeScript; OpenClaw handles routing, sessions, and channels. That keeps your agent logic **portable** (same module could back a Space, a CLI, or a Gateway) while the Gateway stays the single integration point for messaging.

---

## Plugin vs OpenResponses: two valid doors into OpenClaw

KaibanJS documents **two** OpenClaw integration shapes:


| Approach                                        | What it is                                                                                              | Best when                                                                                           |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **Native plugin (`@kaibanjs/kaibanjs-plugin`)** | One tool, `kaiban_run_team`; main agent **calls** your Team with structured `inputs`.                   | You want the **orchestrator** to decide *when* to spin up a multi-agent run, alongside other tools. |
| **OpenResponses adapter**                       | Your Team is exposed as a **custom model provider**; OpenClaw sends chat turns to `POST /v1/responses`. | You want the **entire turn** to be handled by your backend as if it were a model.                   |


Both are valid. Choose based on **routing**: tool-calling delegation vs full “model replacement.” The OpenResponses path is a great fit when you already think in terms of a single HTTP surface; the plugin path is ideal when KaibanJS is **one capability** among many tools the main agent can use. For the HTTP/OpenResponses pattern with KaibanJS, see the [Team as OpenClaw agent via OpenResponses](https://www.kaibanjs.com/examples/kaibanjs-team-openclaw-openresponses) example and the [openclaw-openresponses playground](https://github.com/kaiban-ai/KaibanJS/tree/main/playground/openclaw-openresponses) in the repo.

---

## How the plugin works (under the hood)

At startup, OpenClaw loads the plugin entrypoint and calls `register(api)`. The runtime (`[packages/openclaw-plugin/index.ts](https://github.com/kaiban-ai/KaibanJS/tree/main/packages/openclaw-plugin/index.ts)`):

1. Reads `plugins.entries.<id>.config.team` (manifest id: `**kaibanjs-plugin`**, validated by `[openclaw.plugin.json](https://github.com/kaiban-ai/KaibanJS/blob/main/packages/openclaw-plugin/openclaw.plugin.json)`).
2. Resolves `team.modulePath` (absolute paths are safest on the Gateway host) and dynamically imports your module via a `file:` URL (with optional `api.resolvePath`).
3. Loads `**teamMetadata**`: `description` becomes the **tool description** for the LLM; optional `inputs` is merged into the tool schema so the model sends the **same keys** your factory expects.
4. Loads `**createTeam`**, registers `**kaiban_run_team**` with parameters `{ inputs: … }`.
5. On execute: merges `config.team.defaults` with the tool’s `inputs`, calls `createTeam({ inputs, ctx })`, then `team.start()`. User-visible text is derived from the workflow result (preferring a string `result` field when present); structured output is also attached under `details.workflowResult`.

Conceptually:

```text
User message → OpenClaw main agent → tool call kaiban_run_team
  → dynamic import of your Team module → createTeam → team.start()
  → tool result (text + workflow details) → back to the conversation
```

---

## Your Team module contract

Export two things (names are configurable in `openclaw.json`):

**1. `teamMetadata`**

- `**description**` (required) — When the main agent should use `kaiban_run_team`.
- `**inputs**` (optional but recommended) — JSON Schema for the `inputs` object: `type: "object"`, explicit `properties`, and `additionalProperties: false` so tool arguments stay aligned with `createTeam`.

**2. `createTeam`**

Signature shape:

```ts
({ inputs, ctx }) => Team | Promise<Team>
```

`ctx` may include session, agent, or channel identifiers when OpenClaw supplies them. Return a KaibanJS `Team`; the plugin starts it after your factory returns.

The bundled reference (`[examples/example.ts](https://github.com/kaiban-ai/KaibanJS/blob/main/packages/openclaw-plugin/examples/example.ts)`) is a **Tavily + briefing** team: a Scout agent searches the live web, a Brief agent summarizes — useful for “what happened today” style queries that need **current** sources rather than static training data. It expects `OPENAI_API_KEY` and `TAVILY_API_KEY` in the Gateway environment, and illustrates how `teamMetadata.inputs` maps to a single `topic` field.

---

## Install and configure (Gateway host)

You do **not** need to publish to npm. From the machine running OpenClaw:

```bash
openclaw plugins install /absolute/path/to/KaibanJS/packages/openclaw-plugin
openclaw stop
openclaw start
```

Install any extra dependencies your Team needs (e.g. `@langchain/tavily` for the example) in the environment where OpenClaw resolves modules for your `modulePath`.

**Enable the plugin** in `openclaw.json` — entry key must match the manifest: `kaibanjs-plugin`:

```json
{
  "plugins": {
    "enabled": true,
    "entries": {
      "kaibanjs-plugin": {
        "enabled": true,
        "config": {
          "team": {
            "modulePath": "/absolute/path/to/your/team.ts",
            "exportName": "createTeam",
            "metadataExportName": "teamMetadata",
            "defaults": {}
          }
        }
      }
    }
  }
}
```

**Allow the tool** for the agent that should invoke KaibanJS:

```json
{
  "agents": {
    "list": [
      {
        "id": "default",
        "tools": {
          "allow": ["kaiban_run_team"]
        }
      }
    ]
  }
}
```

Restart the Gateway after changes. Official OpenClaw plugin manifest details: [OpenClaw plugins / manifest](https://docs.openclaw.ai/plugins/manifest).

---

## Getting only the plugin folder

If you do not need the full monorepo, you can still vendor `packages/openclaw-plugin` via **degit**, **sparse checkout**, or by downloading the repo and extracting that path — all documented in the [package README](https://github.com/kaiban-ai/KaibanJS/blob/main/packages/openclaw-plugin/README.md).

---

## Troubleshooting (quick)

- **Plugin id mismatch** — Keep `openclaw.plugin.json` `"id": "kaibanjs-plugin"` aligned with `plugins.entries.kaibanjs-plugin`.
- **Missing or invalid config** — The plugin fails fast if `config.team`, `modulePath`, `teamMetadata.description`, or `createTeam` are missing or wrong at load time.
- **Wrong tool keys** — Define `teamMetadata.inputs` with explicit `properties` so the main agent sends exactly what `createTeam` reads.

---

## Summary

- `**@kaibanjs/kaibanjs-plugin`** exposes a KaibanJS **Team** as OpenClaw tool `**kaiban_run_team`**, with schema driven by `**teamMetadata**` and execution via `**createTeam**`.
- It complements the **OpenResponses** integration: use the plugin for **tool delegation**, use OpenResponses when the Team should act as a **full model backend**.
- Install from disk, configure `modulePath`, allow the tool, set secrets in the Gateway environment — then ship multi-agent workflows to the channels OpenClaw already supports.

**Further reading**

- [KaibanJS — KaibanJS Team as OpenClaw plugin](https://www.kaibanjs.com/examples/kaibanjs-openclaw-plugin) (overview and demo context)
- [KaibanJS repository — `packages/openclaw-plugin](https://github.com/kaiban-ai/KaibanJS/tree/main/packages/openclaw-plugin)` (source, README, example Team)
- [OpenClaw documentation](https://docs.openclaw.ai/) (Gateway, plugins, configuration)

---

*This article describes the native OpenClaw plugin shipped in the KaibanJS monorepo. For questions and improvements, open an issue or discussion on the [KaibanJS GitHub](https://github.com/kaiban-ai/KaibanJS).*