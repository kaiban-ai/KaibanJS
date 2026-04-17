---
title: 'Put Your Multi-Agent Pipeline on WhatsApp, Telegram, and Discord — With One HTTP Endpoint'
published: false
tags: javascript, typescript, ai, opensource, node, tutorial, agents, kaibanjs
# canonical_url: [https://dev.to/yourusername/](https://dev.to/yourusername/)...  # optional when cross-posting

# cover_image: https://...                         # optional hero image URL
---

> **TL;DR:** If you already run a multi-agent system (or any custom agent stack), you don’t need a separate bot per channel. Implement `**POST /v1/responses`** in the [OpenResponses](https://www.openresponses.org/specification) shape, register it in [OpenClaw](https://docs.openclaw.ai/) as a custom provider, and your workflow answers users on every messaging surface OpenClaw supports. **[KaibanJS](https://www.kaibanjs.com/)** is a TypeScript/JavaScript framework for building those multi-agent workflows with explicit **agents**, **tasks**, and **teams** — and the repo ships a ready-made adapter in `playground/openclaw-openresponses` so your KaibanJS **Team\*\* becomes an OpenClaw “model.” Swap the team definition; keep the HTTP contract.

---

## The problem every agent builder hits

You ship something clever: a research → write → review pipeline, a RAG agent with tools, or a DAG of specialists. It works in Node or in your IDE. Then someone asks: _“Can we talk to it on Telegram?”_

Gateways like OpenClaw exist so you don’t reimplement webhooks, auth, rate limits, and message formatting for every platform. The catch is that those gateways usually assume **one model call per turn**. Your system is not that — it’s orchestration, state, and multiple steps.

The fix is **not** to fork OpenClaw. The fix is a **thin adapter** that speaks the same language the gateway already speaks.

---

## What is KaibanJS?

**[KaibanJS](https://www.kaibanjs.com/)** is an open-source **JavaScript/TypeScript framework for multi-agent systems**. It takes inspiration from **Kanban**: you define **agents** (who does the work), **tasks** (what needs to happen, with descriptions and expected outputs), and a **Team** that wires tasks into a workflow — so orchestration stays explicit instead of hiding inside one giant prompt.

In practice you get:

- **Structured workflows** — task graphs and handoffs between agents, not only a single chat completion.
- **Observable state** — workflow status, logs, and stats (including LLM usage) you can use for UI, debugging, or **mapping into APIs** like OpenResponses.
- **Tools and LLMs** — agents can use tools in a way that fits the broader JS ecosystem; teams can pass `**env`\*\* (for example API keys) into the run.

You can explore the **[Kaiban Board playground](https://www.kaibanjs.com/playground)** (think Trello-style visibility for agents and tasks), skim the **[docs](https://docs.kaibanjs.com/)**, or install from **[npm](https://www.npmjs.com/package/kaibanjs)** / **[GitHub](https://github.com/kaiban-ai/KaibanJS)**. The OpenClaw integration does **not** require the browser board — it runs **Node-side** and calls `Team.start()` from your adapter.

---

## OpenResponses: one contract, any backend

**OpenResponses** is an open API spec (aligned with the OpenAI Responses API) for:

- Request bodies with `input` as a **string** or a **structured message list**
- Optional `**stream: true`\*\* and Server-Sent Events (SSE) for token-style delivery
- Responses with an `**output**` array of assistant messages and `**usage**` metadata

**OpenClaw** treats a server that implements this as just another **model provider**. You point `baseUrl` at your adapter, set `api: "openai-responses"`, and agents use `providerId/modelId`. No channel-specific code in your repo.

---

## How the KaibanJS ↔ OpenClaw integration is built

The integration is intentionally **two layers**: (1) **HTTP + OpenResponses** in the adapter, (2) **your Team** in a separate module. OpenClaw never imports KaibanJS — it only sees REST.

### 1. Express server (`src/index.ts`)

A minimal **Express** app:

- Parses JSON bodies (size-limited).
- Exposes `**GET /health`\*\* for probes.
- Protects `**POST /v1/responses**` with optional **Bearer** auth: if `KAIBAN_OPENRESPONSES_SECRET` is set, the `Authorization` header must match; if empty, auth is skipped for local dev.

All OpenResponses logic lives in `**handleOpenResponses`\*\* from `adapter.ts`.

### 2. From HTTP request to `Team.start()`

Inside `**handleOpenResponses**` the pipeline is:

1. `**normalizeBody(req.body)**` — OpenClaw may wrap the spec payload in a top-level `**body**` property; the adapter unwraps it so the rest of the code always sees a normal OpenResponses object.
2. `**extractUserMessage(body)**` — Reads `input`: either a **string** or an **array** of message items. For arrays, it uses the **last `user` message** and concatenates text from content parts (aligned with the OpenResponses input model).
3. `**createTeam({ topic: userMessage })`** — Builds a **fresh `Team`** instance per request (see below). The user’s text is passed as the `**topic\*\*`input, which flows into task descriptions via`{topic}` placeholders.
4. `**await team.start({ inputs: { topic: userMessage } })**` — Runs the full KaibanJS workflow and returns a `**workflowResult**` with **status**, `**result`**, and optional `**stats**`(e.g.`**llmUsageStats\*\*` for token counts).

If there is no usable user message, the adapter responds with **400** and an `invalid_request_error` payload — same spirit as other OpenResponses providers.

### 3. Mapping KaibanJS results to OpenResponses

- **Success (JSON)** — Builds a response with `object: "response"`, `status: "completed"`, an `**output`** array containing one assistant **message** whose content is `**output_text`**. The text comes from `**resultToText**`: if the workflow result is an object with a `**result**`field, that value is used; otherwise the value is stringified.`**usage**`is filled from`**workflowResult.stats.llmUsageStats**` when present.
- **Blocked workflow** — If `**workflowResult.status === "BLOCKED"`**, the adapter returns **422** with `type: "workflow_blocked"`. The message is resolved via `**extractWorkflowErrorMessage(team)`**, which walks `**workflowLogs**` on the team store so operators see something actionable, not a generic failure string.
- **Throws / errored runs** — **500** JSON (or `**response.failed`\*\* on SSE if headers were already sent), again preferring log-derived messages when available.

So OpenClaw still thinks it called a “model,” but under the hood it triggered a **multi-step KaibanJS pipeline** with proper status and usage metadata.

### 4. Streaming path

When the client sends `**stream: true`**, the adapter sets **SSE** headers, then emits the **OpenResponses event sequence**: `response.created` → `response.in_progress` (while the team runs) → `response.output_item.added` → `response.content_part.added` → `response.output_text.delta` / `done` → `response.content_part.done` → `response.output_item.done` → `response.completed`, then `**[DONE]`\*\*.

During execution it subscribes to team changes with `**team.subscribeToChanges(..., ['teamWorkflowStatus'])**` so clients get `**response.in_progress**` updates while the workflow moves. After `**team.start()**` resolves, the final text is sent as deltas/done events (the reference implementation can emit the full text as a single delta — still spec-shaped and easy for OpenClaw to forward).

### 5. Swappable team (`src/team/index.ts`)

The default **Content Creation Team** is a straight line: **ResearchBot → WriterBot → ReviewBot**, each bound to a `**Task`** that references `{topic}` in its description. The `**Team**`is created with`**inputs: { topic }**`and`**env**`(e.g.`**OPENAI_API_KEY\*\*`) for the LLM provider.

**Replacing the team** means editing only this factory (or pointing `createTeam` at another module). The adapter’s OpenResponses contract and OpenClaw `**models.providers`\*\* config stay the same — that separation is the main maintainability win.

**Important:** This stack is **server-side only** (secrets, long-running orchestration, Node APIs). Official step-by-step (env vars, troubleshooting, curl examples): [OpenClaw Integration via OpenResponses API | KaibanJS](https://docs.kaibanjs.com/how-to/OpenClaw-Integration).

---

## What the playground repo layout looks like

Path: `**playground/openclaw-openresponses`\*\*

| Piece               | Role                                                                                    |
| ------------------- | --------------------------------------------------------------------------------------- |
| `src/index.ts`      | Express app, CORS, JSON, `**/health**`, Bearer auth, `**POST /v1/responses**`           |
| `src/adapter.ts`    | `**handleOpenResponses**`: normalize → extract message → `**team.start**` → JSON or SSE |
| `src/sse.ts`        | Helpers to write SSE events and `**[DONE]**`                                            |
| `src/team/index.ts` | `**createTeam({ topic })**` — swap this for your own KaibanJS workflow                  |

---

## Architecture in one glance

```text
User (WhatsApp / Telegram / Discord / …)
  → OpenClaw gateway
  → POST https://your-adapter/v1/responses  (Bearer secret)
  → Your handler: normalize → extract message → run pipeline
  → OpenResponses JSON or SSE
  → OpenClaw → user
```

Your only long-lived integration surface with OpenClaw is **that HTTP contract**. Everything else — LangGraph, CrewAI, custom code, or KaibanJS — stays behind the adapter.

---

## Run the playground locally

Prerequisites: **Node.js 18+**, an `**OPENAI_API_KEY`\*\* (the default team uses OpenAI), and optionally OpenClaw already running for end-to-end tests.

```bash
cd playground/openclaw-openresponses
cp .env.example .env
# Set PORT, KAIBAN_OPENRESPONSES_SECRET, OPENAI_API_KEY
npm install
npm run dev
```

Defaults: server on `http://localhost:3100`, responses at `POST /v1/responses`.

Smoke-test without streaming:

```bash
curl -s -X POST http://localhost:3100/v1/responses \
  -H "Authorization: Bearer YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"model":"kaiban","input":"Write a short paragraph about TypeScript."}'
```

With streaming:

```bash
curl -N -X POST http://localhost:3100/v1/responses \
  -H "Authorization: Bearer YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"model":"kaiban","stream":true,"input":"One sentence about AI."}'
```

If `KAIBAN_OPENRESPONSES_SECRET` is empty, the playground skips auth — fine for local hacking, not for anything exposed to a network.

---

## If you reimplement the adapter elsewhere

The previous section covers how this repo does it end-to-end. For **any** language or stack, keep the same **invariants**:

- Unwrap a top-level `**body`\*\* wrapper when the gateway sends one.
- Accept `**input**` as a string **or** a message array; derive a single “user turn” text (or a structured object if you extend the contract deliberately).
- Always return a sensible `**usage`\*\* object (zeros are fine) so clients stay happy.
- Map **blocked** workflows to **422** / `workflow_blocked` and **unexpected failures** to **500** / `workflow_error`; in **SSE** mode, emit `**response.failed`** before `**[DONE]\*\*` when things go wrong after the stream started.

For KaibanJS specifically, aligning `**extractUserMessage**` with your `**Team` inputs** (today: `**topic`\*\*) is the one place HTTP meets orchestration — keep them in sync when you rename or split inputs.

---

## Wire it into OpenClaw

Config lives in `**~/.openclaw/openclaw.json**` (JSON5 is supported).

**Rule that trips people up:** do **not** put `provider`, `endpoint`, or `auth` inside `agents.list`. The backend is defined only under `**models.providers`**; agents reference `**providerId/modelId\*\*`.

### Register the provider

```json5
{
  models: {
    mode: 'merge',
    providers: {
      'kaiban-adapter': {
        baseUrl: 'http://localhost:3100/v1',
        apiKey: '${KAIBAN_OPENRESPONSES_SECRET}',
        api: 'openai-responses',
        models: [
          {
            id: 'kaiban',
            name: 'KaibanJS Team',
            reasoning: false,
            input: ['text'],
            cost: { input: 0, output: 0 },
            contextWindow: 128000,
            maxTokens: 32000,
          },
        ],
      },
    },
  },
}
```

- `**baseUrl` must include `/v1**` — OpenClaw appends `/responses`.
- `**apiKey**` must match `**KAIBAN_OPENRESPONSES_SECRET**` on the adapter.

### Point an agent at the model

```json5
{
  agents: {
    list: [
      {
        id: 'kaiban-team',
        default: true,
        model: 'kaiban-adapter/kaiban',
      },
    ],
    defaults: {
      model: { primary: 'kaiban-adapter/kaiban' },
      timeoutSeconds: 600,
    },
  },
}
```

Multi-agent runs are slow compared to a single completion. **Bump `timeoutSeconds`** (300–600s is a sensible range) so OpenClaw doesn’t cancel mid-pipeline.

After edits, **restart the OpenClaw daemon** so channel integrations pick up the new provider — don’t assume hot reload for Telegram/WhatsApp/Discord.

---

## Swapping the “model” for your own system

The pattern generalizes beyond KaibanJS:

1. **HTTP server** with `POST /v1/responses` (+ optional Bearer auth).
2. **Parse** OpenResponses `input` (and the OpenClaw `body` wrapper if present).
3. **Run** your stack — one function call, one job queue message, whatever fits.
4. **Return** OpenResponses JSON; optionally implement SSE for streaming.
5. **Map errors** to status codes your operators can grep (e.g. validation vs internal failure).

The KaibanJS playground is one **reference implementation**: replace `src/team/index.ts` with another `createTeam` (or call a different service from `handleOpenResponses`) and you keep OpenClaw config unchanged.

---

## Security and ops (the boring stuff that matters)

- Don’t expose the adapter to the public internet without hardening — treat it like a **high-privilege** endpoint that runs your full pipeline per request.
- Generate a strong secret (`openssl rand -base64 32`) and set it in **both** the adapter env and OpenClaw’s provider `apiKey`.
- **Verify with `curl`** against `/v1/responses` before debugging Telegram timeouts — isolates “adapter vs gateway vs channel”.

---

## Summary

- **[KaibanJS](https://www.kaibanjs.com/)** gives you **explicit multi-agent workflows** in TypeScript/JavaScript — agents, tasks, teams, observable runs — so a “reply” to a user can be the outcome of a whole pipeline, not one completion.
- **OpenClaw** gives you **reach** across messaging channels without per-platform bots.
- **OpenResponses** gives you a **stable HTTP contract** so the gateway treats your adapter like any other provider.
- `**playground/openclaw-openresponses`** is the **reference glue**: Express + `**handleOpenResponses`** maps OpenClaw’s requests to `**Team.start()**`, maps `**workflowResult**` and **workflow logs** back to JSON/SSE, and keeps your **team definition** in one swappable file.

If you’re building agentic backends in JavaScript/TypeScript, this is a practical path: **one HTTP surface to OpenClaw**, **KaibanJS** for orchestration and observability inside your process.

**Further reading**

- [KaibanJS](https://www.kaibanjs.com/) · [Documentation](https://docs.kaibanjs.com/) · [GitHub](https://github.com/kaiban-ai/KaibanJS) · [npm](https://www.npmjs.com/package/kaibanjs)
- [OpenClaw Integration via OpenResponses API (KaibanJS docs)](https://docs.kaibanjs.com/how-to/OpenClaw-Integration)
- [Integrate Any Agent Backend with OpenClaw (Hugging Face — pattern + motivation)](https://huggingface.co/blog/darielnoel/an-agentic-backend-openclaw-integration)
- Playground README in-repo: `playground/openclaw-openresponses/README.md`

---

_Cross-posting tip for dev.to: after publishing, add a canonical URL in front matter if you mirror this on your blog; use `#discuss` or `#watercooler` only if you want conversation rather than a straight tutorial._
