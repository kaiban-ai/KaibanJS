# From TypeScript Teams to Real Channels: KaibanJS as a Native OpenClaw Plugin

**How `@kaibanjs/kaibanjs-plugin` exposes one multi-agent workflow as a single tool — `kaiban_run_team` — so your OpenClaw gateway can delegate when it matters, without bolting on another HTTP service.**

---

If you build **multi-agent systems** in TypeScript, you have probably asked this question more than once: *the workflow is clear in code — but how do I get it in front of users on the channels they already use?*

**OpenClaw** is a messaging gateway that connects agents to WhatsApp, Telegram, Discord, and similar surfaces with a consistent tool and plugin model. **KaibanJS** gives you structured **Teams** (agents, tasks, optional tools like live search). The piece that used to live in “glue code” is now a **first-party plugin** in the KaibanJS repo: `packages/openclaw-plugin`, published on npm conceptually as **`@kaibanjs/kaibanjs-plugin`**.

This post walks through **what it solves**, **how it works under the hood**, and **how to wire it up** — with pointers to the official example page and a short demo video.

---

## The idea in one sentence

OpenClaw’s **main agent** decides *when* to call a tool and sends **structured arguments**. The plugin registers **one tool** — `kaiban_run_team` — that loads **your** Team module, runs `createTeam`, then `team.start()`, and returns text plus workflow details to the conversation.

That is a different shape from “expose my team as a custom HTTP API for every integration.” Here, the gateway’s **tool-calling layer** is the integration point.

---

## Why this matters for builders

1. **One tool, full workflow** — The orchestrator passes `inputs`; your Team runs tasks, agents, and tools (for example Tavily for fresh web data). No per-channel bespoke bridge.
2. **Same Team code** — You export `teamMetadata` and `createTeam` from an ordinary TypeScript file. Point `modulePath` at that file on the host running OpenClaw.
3. **Composable with the rest of OpenClaw** — KaibanJS becomes **one capability** among other tools the main agent can choose, which fits how many production gateways are designed.

The KaibanJS team has a **product-style overview** of this integration (including configuration patterns and how it compares to other integration paths) here:

**[KaibanJS Team as a Native OpenClaw Plugin](https://www.kaibanjs.com/examples/kaibanjs-openclaw-plugin)**

If you prefer to *see* the gateway invoke the tool end-to-end, there is a short walkthrough on YouTube:

**[Demo: KaibanJS Team inside OpenClaw](https://www.youtube.com/watch?v=GgRRFxhpCmk)**

---

## How the plugin works (implementation-aligned)

The runtime lives in [`packages/openclaw-plugin/index.ts`](https://github.com/kaiban-ai/KaibanJS/tree/main/packages/openclaw-plugin). At a high level:

1. **Startup** — OpenClaw loads the plugin and calls `register(api)` with the plugin id and merged config.
2. **Config** — The plugin requires `plugins.entries.<id>.config.team` with at least `modulePath` (absolute paths are safest on the gateway host). Optional: `exportName`, `metadataExportName`, `defaults`.
3. **Dynamic import** — Your module is loaded with `import()` using a `file:` URL derived from the resolved path (OpenClaw may supply `api.resolvePath` for normalization).
4. **Metadata → tool schema** — `teamMetadata.description` becomes the **tool description** for the LLM. If you define `teamMetadata.inputs` as a JSON Schema object with explicit `properties`, it is merged into the tool parameters under `inputs` so the model sends the **same keys** your factory expects. If you omit `inputs`, the plugin falls back to a permissive object schema (the README recommends defining `inputs` for real teams).
5. **Registration** — One tool: **`kaiban_run_team`**, with parameters `{ inputs: … }` and strict top-level shape (`additionalProperties: false` on the tool arguments object).
6. **Execute** — Defaults from config are merged with the tool’s `inputs`, then `createTeam({ inputs, … })` runs, then **`team.start()`** with no overrides (inputs are already applied inside your factory). The user-visible string is derived from the workflow result, preferring a string `result` field when present; structured output is also attached under `details.workflowResult`.

The manifest id is fixed in **`openclaw.plugin.json`** as `kaibanjs-plugin`, with a JSON Schema for the `team` block so invalid config fails early. Your `openclaw.json` entry key must match: `plugins.entries.kaibanjs-plugin`.

Conceptually:

```text
User → OpenClaw main agent → tool call kaiban_run_team(inputs)
  → import your module → createTeam → team.start()
  → tool result (text + workflowResult) → back to the chat
```

---

## Your Team module contract

You export two things (names configurable via `exportName` / `metadataExportName`):

### `teamMetadata`

- **`description`** (required) — Tells the main agent *when* to use `kaiban_run_team`.
- **`inputs`** (optional, strongly recommended) — JSON Schema for the `inputs` object: `type: "object"`, explicit `properties`, and `additionalProperties: false` so tool keys stay aligned with `createTeam`.

### `createTeam`

A function that returns a KaibanJS `Team` (or a Promise of one). The README documents an optional `ctx` shape for session or channel identifiers when the gateway supplies them; the current plugin `execute` handler passes `ctx: undefined`, so design your factory around `inputs` for now.

```ts
({ inputs: Record<string, unknown>, ctx?: { sessionId?, agentId?, channelId? } }) => Team | Promise<Team>
```

The bundled reference in the repo is **`examples/example.ts`**: a **Scout** agent uses **Tavily** for live web search, then a **Brief** agent summarizes — ideal for “what happened today” style questions that need current sources.

The metadata wires a single **`topic`** field into the tool schema:

```16:32:packages/openclaw-plugin/examples/example.ts
export const teamMetadata = {
  description:
    'KaibanJS multi-agent workflow: searches the live web with Tavily, then returns a short analysis and summary. Use for up-to-date news, “what happened today”, or any topic needing current sources (not static training data).',
  /** Drives `kaiban_run_team` parameter `inputs` — same keys as createTeam. */
  inputs: {
    type: 'object' as const,
    description:
      'Single field: topic — what to search and summarize (e.g. “latest SpaceX Starship launch”).',
    additionalProperties: false,
    properties: {
      topic: {
        type: 'string',
        description: 'Query or subject for live web search and briefing.',
      },
    },
    required: ['topic'],
  },
};
```

Set **`OPENAI_API_KEY`** and **`TAVILY_API_KEY`** in the **gateway process environment**, and install **`@langchain/tavily`** (and **`kaibanjs`**) where OpenClaw resolves modules for your `modulePath`.

---

## Install and configure (minimal)

On the machine running the OpenClaw gateway:

```bash
openclaw plugins install /absolute/path/to/KaibanJS/packages/openclaw-plugin
openclaw stop
openclaw start
```

You do **not** need to publish the package to npm; installing from the monorepo path (or a copy of `packages/openclaw-plugin` only — the README documents **degit**, **sparse checkout**, and zip workflows) is enough.

**`openclaw.json`** — enable the plugin and point at your module (entry key **`kaibanjs-plugin`**):

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

Allow the tool for the agent that should delegate to KaibanJS:

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

Restart the gateway after changes. Manifest details for OpenClaw plugins: **[OpenClaw plugins / manifest](https://docs.openclaw.ai/plugins/manifest)**.

Full package documentation: **[`packages/openclaw-plugin/README.md`](https://github.com/kaiban-ai/KaibanJS/blob/main/packages/openclaw-plugin/README.md)**.

---

## Plugin vs OpenResponses (both valid)

KaibanJS documents **two** ways to integrate with OpenClaw:

| Approach | What happens | Often best when |
| -------- | ------------- | ----------------- |
| **Native plugin** (`kaiban_run_team`) | Main agent **calls a tool** with structured `inputs`. | You want KaibanJS as **one tool** among many; the orchestrator chooses *when* to run the Team. |
| **OpenResponses adapter** | OpenClaw talks to your backend like a **custom model** over HTTP. | You want the **entire turn** routed to your service as a provider-style surface. |

Pick based on **routing**, not dogma. The example site contrasts these patterns in more detail on the page linked above.

---

## Troubleshooting (the fast list)

- **Plugin id mismatch** — Keep **`openclaw.plugin.json`** `"id": "kaibanjs-plugin"` aligned with **`plugins.entries.kaibanjs-plugin`**.
- **Missing config** — The plugin throws at load time if `config.team`, `modulePath`, a non-empty `description`, or a function `createTeam` is missing.
- **Wrong tool keys** — Use explicit `teamMetadata.inputs.properties` (and `additionalProperties: false`) so the LLM sends exactly what `createTeam` reads.

---

## Links to share in your Medium post

- **Official example / overview:** [https://www.kaibanjs.com/examples/kaibanjs-openclaw-plugin](https://www.kaibanjs.com/examples/kaibanjs-openclaw-plugin)
- **Demo video:** [https://www.youtube.com/watch?v=GgRRFxhpCmk](https://www.youtube.com/watch?v=GgRRFxhpCmk)
- **Source + README:** [https://github.com/kaiban-ai/KaibanJS/tree/main/packages/openclaw-plugin](https://github.com/kaiban-ai/KaibanJS/tree/main/packages/openclaw-plugin)
- **OpenClaw docs:** [https://docs.openclaw.ai/](https://docs.openclaw.ai/)

---

## Closing

If you already think in **Teams, tasks, and agents** in TypeScript, this plugin is the shortest path to letting a **production gateway** treat that work as a **first-class tool**: one registration, one tool name, one module on disk. Clone the repo (or vendor the folder), install the plugin on the gateway, allow `kaiban_run_team`, and ship.

For the narrative and UI context, start with the **[KaibanJS example page](https://www.kaibanjs.com/examples/kaibanjs-openclaw-plugin)**; for a visual pass, watch the **[YouTube demo](https://www.youtube.com/watch?v=GgRRFxhpCmk)**. Then open **`packages/openclaw-plugin`** and treat **`examples/example.ts`** as your living template.

---

*Disclaimer: This article is based on the KaibanJS monorepo at the time of writing. For the latest install steps and API details, follow the package README in the repository.*
