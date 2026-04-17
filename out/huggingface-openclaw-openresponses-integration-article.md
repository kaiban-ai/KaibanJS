# Integrate Any Agent Backend with OpenClaw via the OpenResponses API

**A protocol-first approach to plug your AI agents — regardless of framework or SDK — into WhatsApp, Telegram, Discord, and every channel OpenClaw supports.**

---

## TL;DR

You can expose **any** agent or multi-agent pipeline as an OpenClaw backend by implementing a single HTTP endpoint: `**POST /v1/responses`\*\* following the [OpenResponses API](https://www.openresponses.org/specification) (an open standard aligned with the OpenAI Responses API). OpenClaw then routes user messages from any messaging channel to your server and streams the result back. No per-channel code, no custom protocol — just one adapter that speaks the spec. This post walks through the pattern and a full example using [KaibanJS](https://www.kaibanjs.com/) to run a multi-agent content team behind OpenClaw.

---

## Why this approach?

**OpenClaw** is a messaging gateway: one config, many channels (WhatsApp, Telegram, Discord, Slack, etc.). It handles webhooks, auth, and platform quirks so you don’t have to. The catch: gateways usually assume a single LLM call per turn. If your logic lives in a **custom agent**, a **multi-step workflow**, or a **different SDK** (LangChain, CrewAI, AutoGen, or your own), you need a way to plug that in without rewriting everything.

The **OpenResponses API** is that bridge. It’s an open, model-agnostic spec for request/response and streaming. OpenClaw already speaks it. So the integration strategy is simple:

1. Run a small **adapter server** that implements `POST /v1/responses`.
2. Inside that endpoint, call your agent (or team, or pipeline) however you built it.
3. Map the agent’s output into the OpenResponses response shape (and optionally stream via SSE).
4. Register the adapter in OpenClaw as a **custom model provider**.

From the user’s perspective, they’re chatting on WhatsApp or Telegram. Under the hood, OpenClaw calls your adapter, your adapter runs your stack, and the reply goes back through OpenClaw to the channel. **Framework-agnostic**: it doesn’t matter whether your agent is written in Python, TypeScript, or anything else — as long as the HTTP API matches the spec.

---

## The pattern: adapter server + OpenResponses

Conceptually:

```
User (WhatsApp / Telegram / Discord)
  → OpenClaw Gateway
  → POST /v1/responses (with Bearer auth)
  → Your adapter server
  → Your agent / team / pipeline (any SDK)
  → OpenResponses JSON or SSE
  → OpenClaw → user
```

Your adapter’s job:

- **In:** Accept OpenResponses-style requests (e.g. `input` as string or message list, optional `stream`, `model`, etc.).
- **Out:** Return either a JSON body or an SSE stream that conforms to the OpenResponses spec (e.g. `output` array of message items, `usage`, and the usual event types for streaming).

OpenClaw treats the adapter as a **model provider**. You register it in `~/.openclaw/openclaw.json` under `models.providers` with:

- `baseUrl` → your server (e.g. `http://localhost:3100/v1`)
- `api: "openai-responses"`
- `apiKey` → shared secret (e.g. Bearer token)

Agents in OpenClaw then use `providerId/modelId` (e.g. `kaiban-adapter/kaiban`) as their model. No channel-specific code lives in your adapter — only the OpenResponses contract.

---

## Example: KaibanJS multi-agent team as an OpenClaw backend

[KaibanJS](https://www.kaibanjs.com/) is a TypeScript framework for multi-agent teams with explicit state, DAG-based tasks, and LangChain-compatible tools. The [OpenClaw–OpenResponses playground](https://github.com/kaiban-ai/KaibanJS/tree/main/playground/openclaw-openresponses) shows how to expose a **KaibanJS Team** as an OpenClaw backend: one Express server, one route, and a swappable team definition.

### What the example does

- **Adapter:** Express app with `POST /v1/responses` and optional Bearer auth.
- **Request handling:** Normalizes the body (including OpenClaw’s wrapper), extracts the user message from `input` (string or message array).
- **Agent execution:** Builds a KaibanJS `Team` (by default: Research → Write → Review), runs `team.start({ inputs: { topic: userMessage } })`.
- **Response:** Formats the team result as OpenResponses (e.g. `output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text }] }]`, plus `usage`).
- **Streaming:** When `stream: true`, emits the full SSE sequence (`response.created` → `response.output_text.delta` → `response.completed`, etc.) so OpenClaw can stream to the client.

So: **any** KaibanJS team (or any other agent you run inside that handler) can back an OpenClaw agent on every supported channel.

### Core adapter flow (conceptually)

```text
1. Parse/normalize body → get user message from input.
2. Instantiate your agent/team (e.g. createTeam({ topic: userMessage })).
3. If non-streaming: run agent, build OpenResponses JSON, return.
4. If streaming: set SSE headers, emit response.created, run agent,
   emit output_item.added → content_part.added → output_text.delta/done
   → output_item.done → response.completed, then [DONE].
5. On error: map to spec (e.g. 422 for workflow_blocked, 500 for workflow_error).
```

Request normalization is minimal but important: OpenClaw may send the spec payload under a `body` key, and `input` can be a string or an array of message items. The example implements both and takes the last user message.

### Snippet: handling the request and calling the team

```typescript
// Simplified from playground/openclaw-openresponses/src/adapter.ts
const body = normalizeBody(req.body);
const userMessage = extractUserMessage(body);

if (!userMessage) {
  res.status(400).json({
    error: {
      message: 'Missing or invalid input',
      type: 'invalid_request_error',
    },
  });
  return;
}

const team = createTeam({ topic: userMessage });
const workflowResult = await team.start({ inputs: { topic: userMessage } });

if (workflowResult.status === 'BLOCKED') {
  res.status(422).json({
    error: {
      message: extractWorkflowErrorMessage(team),
      type: 'workflow_blocked',
    },
  });
  return;
}

res
  .status(200)
  .json(
    buildJsonResponse(
      responseId,
      workflowResult.result,
      workflowResult.stats?.llmUsageStats
    )
  );
```

The actual playground also handles streaming, SSE events, and error extraction from workflow logs; the idea is the same: **one endpoint, your stack, OpenResponses-shaped response**.

### Default team (swappable)

The playground’s default team is a 3-agent pipeline:

1. **ResearchBot** — gathers and structures information on the given topic.
2. **WriterBot** — turns that into a draft.
3. **ReviewBot** — reviews and polishes the final text.

The user’s message is passed as `topic`. The team is defined in `src/team/index.ts`; you can replace it with any other KaibanJS `Team` (or call a different framework from the same route) without changing the adapter’s HTTP/OpenResponses logic.

---

## OpenClaw configuration (minimal)

In `~/.openclaw/openclaw.json` you add a custom provider and point an agent at it.

**1. Register the adapter as a model provider**

```json
{
  "models": {
    "mode": "merge",
    "providers": {
      "kaiban-adapter": {
        "baseUrl": "http://localhost:3100/v1",
        "apiKey": "${KAIBAN_OPENRESPONSES_SECRET}",
        "api": "openai-responses",
        "models": [
          {
            "id": "kaiban",
            "name": "KaibanJS Team",
            "reasoning": false,
            "input": ["text"],
            "cost": { "input": 0, "output": 0 },
            "contextWindow": 128000,
            "maxTokens": 32000
          }
        ]
      }
    }
  }
}
```

`baseUrl` must include `/v1`; OpenClaw appends `/responses`. The same secret you put in `apiKey` is sent as `Authorization: Bearer <secret>` and should match your adapter’s `KAIBAN_OPENRESPONSES_SECRET` (or whatever you use).

**2. Use it in an agent**

```json
{
  "agents": {
    "list": [
      {
        "id": "kaiban-team",
        "default": true,
        "model": "kaiban-adapter/kaiban"
      }
    ],
    "defaults": {
      "model": { "primary": "kaiban-adapter/kaiban" },
      "timeoutSeconds": 600
    }
  }
}
```

Use `providerId/modelId` (`kaiban-adapter/kaiban`). Do **not** put `provider`, `endpoint`, or `auth` under `agents.list`; the backend is defined only under `models.providers`. Multi-agent runs can be slow, so a higher `timeoutSeconds` (e.g. 600) is recommended.

---

## What you need to implement on your side

If you want to reuse this pattern with **your** agent (any language or SDK):

1. **HTTP server** with `POST /v1/responses` and, if you need it, Bearer token validation.
2. **Input parsing:** Read `input` (string or array of messages per OpenResponses), normalize OpenClaw’s wrapper if present, and derive the user message.
3. **Invoke your agent** with that message (or with a structured payload you build from it).
4. **Output mapping:** Build an OpenResponses response:

- `output`: array of message items, e.g. `[{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: result }] }]`.
- `usage`: at least `input_tokens`, `output_tokens`, `total_tokens` (and optional details if you have them).

5. **Optional streaming:** Emit the SSE events from the spec (`response.created`, `response.output_text.delta`, `response.completed`, etc.) so OpenClaw can stream to the client.
6. **Errors:** Use appropriate status codes and error shapes (e.g. 422 for blocked/validation, 500 for internal errors) so OpenClaw and clients can handle them.

The [KaibanJS OpenClaw–OpenResponses playground](https://github.com/kaiban-ai/KaibanJS/tree/main/playground/openclaw-openresponses) is a ready-made reference: TypeScript, Express, full non-streaming and streaming, and a drop-in KaibanJS team. You can clone it and swap the team for your own agent or keep it as a template for a different stack.

---

## Summary

- **OpenClaw** = one gateway to many messaging channels.
- **OpenResponses API** = one standard way to plug in any backend (single model or multi-agent).
- **Adapter pattern:** Implement `POST /v1/responses`, call your agent, return OpenResponses JSON or SSE.
- **KaibanJS example:** [playground/openclaw-openresponses](https://github.com/kaiban-ai/KaibanJS/tree/main/playground/openclaw-openresponses) exposes a full multi-agent team as an OpenClaw backend with streaming and auth; you can replace the team with any other KaibanJS workflow or use the structure as a template for a different framework.

For more detail on the KaibanJS side (architecture, default team, and config), see the [KaibanJS Team as OpenClaw Agent via OpenResponses](https://www.kaibanjs.com/examples/kaibanjs-team-openclaw-openresponses) example and the [playground README](https://github.com/kaiban-ai/KaibanJS/tree/main/playground/openclaw-openresponses) on GitHub.
