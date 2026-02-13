# Airline Group Booking Quote Agent (KaibanJS)

Example agent that generates **instant group booking quotes** from unstructured inquiries. Inspired by the [Kaiban use case: AI Agent for Airlines – Instant Group Booking Quote Automation](https://www.kaiban.io/use-cases/airline-group-booking-optimization).

**Kaiban integration uses Kaiban MCP** (not `@kaiban/sdk`) for card/column/activities. The KaibanJS agents call MCP tools (`get_card`, `move_card`, `update_card`, `create_card_activities`) to read and update cards on the Kaiban platform.

## Architecture

- **Sequential team** (no workflow): 5 tasks, 4 agents (one agent handles both Task 0 and Task 4 via MCP tools).
- **Kaiban MCP**: Card lifecycle (get card, move to doing/done, update result, create activities) is performed by agents using the [Kaiban MCP Server](https://docs.kaiban.io/references/kaiban-mcp) via [@langchain/mcp-adapters](https://docs.kaibanjs.com/how-to/MCP-Adapter-Integration).
- **Variant 1 error handling**: If the team throws, the executor calls MCP `move_card(card_id, 'blocked')` from Node.

### Team flow

0. **Get card & move to doing** – Kaiban Card Sync Agent uses MCP `get_card`, `move_card`, `create_card_activities`; outputs `userMessage` (card description).
1. **Extract & Validate** – Inquiry Extraction & Validation Agent parses and validates the inquiry.
2. **Availability & Pricing** – Availability & Pricing Agent uses mock tools `check_availability`, `get_pricing_rules`.
3. **Generate Quote** – Quote Generation Agent produces the final quote text.
4. **Update card & move to done** – Kaiban Card Sync Agent uses MCP `update_card`, `move_card`, `create_card_activities`.

### Agents

1. **Kaiban Card Sync Agent** – Uses Kaiban MCP tools for Task 0 (get card, move to doing) and Task 4 (update result, move to done).
2. **Inquiry Extraction & Validation Agent** – Extracts and validates group booking details from free text.
3. **Availability & Pricing Agent** – Mock tools for availability and pricing.
4. **Quote Generation Agent** – Produces the final quote or validation message.

## Setup

```bash
npm install
cp .env.example .env
# Edit .env: KAIBAN_*, KAIBAN_MCP_URL (or KAIBAN_TENANT + KAIBAN_ENVIRONMENT), OPENAI_API_KEY
npm run dev
```

### Environment (MCP)

- **KAIBAN_MCP_URL** – Optional. Defaults to `https://<tenant>-<env>.kaiban.io/mcps/kaiban/mcp` using `KAIBAN_TENANT` and `KAIBAN_ENVIRONMENT`.
- **KAIBAN_API_TOKEN** – Required for MCP auth (Bearer).
- **KAIBAN_ENVIRONMENT** – Optional: `dev` | `staging` | `prod` (default: prod).

## Endpoints

- **Card:** `GET /airlineGroupBookingQuote/a2a/.well-known/agent-card.json`
- **Agent:** `POST /airlineGroupBookingQuote/a2a`
- **Sample inquiry:** `GET /airlineGroupBookingQuote/samples/group-booking-inquiry-example.txt`

## Input from Kaiban.io

The executor receives a Kaiban activity (A2A). It validates the card via MCP `get_card` (description present, column `todo`), then starts the team with `card_id`, `board_id`, `team_id`, and the agent’s `agent_id`/`agent_name` for the actor. Task 0 fetches the card description via MCP and moves the card to doing; Task 4 writes the quote result and moves the card to done.

## Tests

```bash
npm test
```

Tests validate the agent card; Kaiban MCP and KaibanJS are mocked so no real Kaiban or OpenAI calls are made.
