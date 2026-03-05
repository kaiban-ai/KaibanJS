# KaibanJS OpenResponses Adapter (Playground)

This playground exposes a **KaibanJS Team** as an OpenResponses-compatible HTTP API so that **OpenClaw** can use it as an agent backend. Messages from WhatsApp, Telegram, Discord, etc. are sent by OpenClaw to this server; the server runs the Team and returns the result in OpenResponses format.

## Flow

```
User (WhatsApp / Telegram / Discord)
  → OpenClaw Gateway
  → POST http://<this-server>:3100/v1/responses
  → KaibanJS Team.start({ inputs: { topic: userMessage } })
  → OpenResponses JSON or SSE response
  → OpenClaw forwards the response to the user
```

## Prerequisites

- Node.js 18+
- `OPENAI_API_KEY` (the built-in Content Creation Team uses OpenAI)
- OpenClaw gateway already running

## Setup

```bash
cd playground/openclaw-openresponses
cp .env.example .env
# Edit .env: set PORT, KAIBAN_OPENRESPONSES_SECRET, OPENAI_API_KEY
npm install
```

## Run

```bash
npm run dev
```

The server listens on `http://localhost:3100` (or the `PORT` from `.env`).

## Endpoints

| Method | Path            | Description                           |
|--------|-----------------|---------------------------------------|
| GET    | `/health`       | Health check (no auth)                |
| POST   | `/v1/responses` | OpenResponses API (Bearer token auth) |

## Test with curl

**Health (no auth):**
```bash
curl -s http://localhost:3100/health
```

**Non-streaming (replace `YOUR_SECRET` with `KAIBAN_OPENRESPONSES_SECRET`):**
```bash
curl -s -X POST http://localhost:3100/v1/responses \
  -H "Authorization: Bearer YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"model":"kaiban","input":"Write a short paragraph about TypeScript."}'
```

**Streaming:**
```bash
curl -N -X POST http://localhost:3100/v1/responses \
  -H "Authorization: Bearer YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"model":"kaiban","stream":true,"input":"Write one sentence about AI."}'
```

## Team

The default team is the **Content Creation Team**: Research → Write → Review. The user message is passed as the `topic` input. You can replace `src/team/index.ts` with another Team factory if needed.

---

## OpenClaw Setup

> **Important:** OpenClaw does **not** use `provider`, `endpoint`, or `auth` inside `agents.list`. Those keys cause "Unrecognized keys" errors. External backends are defined under **`models.providers`**; agents in `agents.list` only reference a model as `providerId/modelId`.

### Overview

1. **KaibanJS adapter** runs as a separate HTTP server and implements the OpenResponses API at `POST /v1/responses`.
2. **OpenClaw** treats it as a **custom model provider**: you add it under `models.providers` with `baseUrl`, `apiKey`, and `api: "openai-responses"`, then reference the model as `kaiban-adapter/kaiban` in an agent's `model` field.
3. When a user sends a message to an agent that uses that model, OpenClaw calls the adapter, which runs the KaibanJS Team and returns the answer.

Config file location: **`~/.openclaw/openclaw.json`** (JSON5 — comments and trailing commas allowed).

### Step 1 — Add the custom provider (`models.providers`)

Add a top-level `models` section (or merge into your existing one):

```json5
{
  "models": {
    "mode": "merge",
    "providers": {
      "kaiban-adapter": {
        "baseUrl": "http://localhost:3100/v1",
        "apiKey": "YOUR_KAIBAN_OPENRESPONSES_SECRET_VALUE",
        "api": "openai-responses",
        "models": [
          {
            "id": "kaiban",
            "name": "KaibanJS Team",
            "reasoning": false,
            "input": ["text"],
            "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 },
            "contextWindow": 128000,
            "maxTokens": 32000
          }
        ]
      }
    }
  }
}
```

Replace `YOUR_KAIBAN_OPENRESPONSES_SECRET_VALUE` with the same value as `KAIBAN_OPENRESPONSES_SECRET` in the adapter's `.env`. OpenClaw sends it as `Authorization: Bearer <apiKey>`.

If the adapter runs on a different host, change `baseUrl` to the adapter's IP/hostname (e.g. `http://192.168.1.10:3100/v1`). The URL **must** include `/v1`; OpenClaw appends `/responses` automatically.

| Key | Required | Description |
|-----|----------|-------------|
| `models.mode` | Yes | Use `"merge"` to add this provider alongside the existing catalog. |
| `baseUrl` | Yes | Adapter base URL including `/v1`. |
| `apiKey` | Yes | Same value as `KAIBAN_OPENRESPONSES_SECRET`. Supports env substitution: `"${KAIBAN_OPENRESPONSES_SECRET}"`. |
| `api` | Yes | Must be `"openai-responses"` for the OpenResponses API. |
| `models[].id` | Yes | Model id used in the model reference: `kaiban-adapter/<id>`. |

### Step 2 — Allowlist the model and add an agent

**Allowlist** the model in `agents.defaults.models`:

```json5
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "kaiban-adapter/kaiban"
      },
      "models": {
        "kaiban-adapter/kaiban": { "alias": "KaibanJS" }
      },
      "timeoutSeconds": 600
    }
  }
}
```

**Add an agent** in `agents.list` (only allowed keys — no `provider`, `endpoint`, or `auth`):

```json5
{
  "agents": {
    "list": [
      {
        "id": "kaiban-team",
        "default": true,
        "model": "kaiban-adapter/kaiban",
        "workspace": "/Users/<you>/.openclaw/workspace"
      }
    ]
  }
}
```

| Key | Description |
|-----|-------------|
| `id` | Stable agent id (used for routing). |
| `default` | Set `true` so this agent handles traffic without explicit routing. |
| `model` | `"<providerId>/<modelId>"` — must match what you defined in Step 1. |
| `workspace` | Agent workspace path (optional). |

### Step 3 — Set a longer timeout

KaibanJS Teams can take time. Increase the timeout so OpenClaw doesn't cancel the request:

```json5
{
  "agents": {
    "defaults": {
      "timeoutSeconds": 600
    }
  }
}
```

### Step 4 — Generating the shared secret (`KAIBAN_OPENRESPONSES_SECRET`)

The secret is just a strong random string shared between the adapter and OpenClaw. Generate one with:

```bash
openssl rand -base64 32
```

Set it in two places:

1. **Adapter** — `playground/openclaw-openresponses/.env`:
   ```
   KAIBAN_OPENRESPONSES_SECRET=<generated-value>
   ```

2. **OpenClaw** — `~/.openclaw/openclaw.json` under `models.providers["kaiban-adapter"].apiKey`:
   ```json
   "apiKey": "<generated-value>"
   ```

If you leave `KAIBAN_OPENRESPONSES_SECRET` empty in the adapter's `.env`, the adapter skips authentication (useful for local testing only).

### Step 5 — Applying config changes (restart required)

OpenClaw advertises hot-reload for `agents.*` and `models.*`, but in practice **channel integrations (Telegram, WhatsApp, Discord) do not pick up a new model/agent without a full daemon restart**. After editing `openclaw.json`, stop and start the OpenClaw daemon:

```bash
# stop
openclaw stop   # or Ctrl+C if running in foreground

# start
openclaw start
```

Then verify the Telegram bot responds through the new agent before testing further.

### Step 6 — Verify

1. **Call the adapter directly:**
   ```bash
   curl -s -X POST http://localhost:3100/v1/responses \
     -H "Authorization: Bearer YOUR_KAIBAN_OPENRESPONSES_SECRET" \
     -H "Content-Type: application/json" \
     -d '{"model":"kaiban","input":"Say hello in one sentence."}'
   ```
   Expect a JSON response with an `output` array.

2. **Send a message via OpenClaw** (e.g. Telegram) to the agent that uses `kaiban-adapter/kaiban`. The reply should be the Content Creation Team's response.

**Common errors:**
- `401` — the `apiKey` in `models.providers["kaiban-adapter"]` does not match `KAIBAN_OPENRESPONSES_SECRET`.
- Request timeout — increase `agents.defaults.timeoutSeconds`.
- `"Unrecognized keys"` — you have `provider`, `endpoint`, or `auth` inside `agents.list[]`. Remove them; the model is set via `model: "kaiban-adapter/kaiban"` only.

### Checklist

- [ ] `models.providers["kaiban-adapter"]` with correct `baseUrl`, `apiKey`, `api: "openai-responses"`, and `models`.
- [ ] `agents.defaults.models["kaiban-adapter/kaiban"]` allowlisted.
- [ ] Agent in `agents.list` with `model: "kaiban-adapter/kaiban"` and `default: true`.
- [ ] `agents.defaults.model.primary` set to `"kaiban-adapter/kaiban"`.
- [ ] `agents.defaults.timeoutSeconds` ≥ 300.
- [ ] Adapter tested with `curl` before testing on the channel.

### Security notes

- Do not expose the adapter to the public internet. Keep it on localhost or a private network.
- Use a strong random value for `KAIBAN_OPENRESPONSES_SECRET` and keep it only in `.env` and `openclaw.json`.
- The adapter runs the full KaibanJS Team on every request — treat it as a high-privilege endpoint.

**References:** [OpenClaw Configuration](https://docs.openclaw.ai/gateway/configuration) · [Custom Providers](https://docs.openclaw.ai/gateway/configuration-reference#custom-providers-and-base-urls) · [OpenResponses API](https://docs.openclaw.ai/gateway/openresponses-http-api)
