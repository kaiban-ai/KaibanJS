/**
 * @fileoverview KaibanJS Team for Airline Group Booking Quote A2A Agent
 *
 * Uses Kaiban MCP (not @kaiban/sdk) for card/column/activities. Sequential flow:
 * 0. Get card & move to doing (Kaiban MCP tools) → output: userMessage (card description)
 * 1. Extract & Validate inquiry
 * 2. Availability & Pricing (mock tools)
 * 3. Generate Quote
 * 4. Update card with quote & move to done (Kaiban MCP tools)
 *
 * @module agents/airline-group-booking-quote/controller/agent
 */

import { Agent, Task, Team } from 'kaibanjs';
import { z } from 'zod';

import { getKaibanTools } from './kaiban-mcp-client';

// ============================================================================
// Mock data for Availability and Pricing tools
// ============================================================================

const MOCK_AVAILABILITY_ROUTES = [
  { origin: 'LHR', destination: 'MIA', minPax: 10, maxPax: 100 },
  { origin: 'JFK', destination: 'LAX', minPax: 10, maxPax: 80 },
  { origin: 'LHR', destination: 'BCN', minPax: 15, maxPax: 150 },
];

const MOCK_PRICING: Record<
  string,
  {
    baseFarePerPax: number;
    discount10to19: number;
    discount20to49: number;
    discount50plus: number;
  }
> = {
  'LHR-MIA': {
    baseFarePerPax: 520,
    discount10to19: 5,
    discount20to49: 10,
    discount50plus: 15,
  },
  'JFK-LAX': {
    baseFarePerPax: 380,
    discount10to19: 5,
    discount20to49: 10,
    discount50plus: 15,
  },
  'LHR-BCN': {
    baseFarePerPax: 180,
    discount10to19: 5,
    discount20to49: 10,
    discount50plus: 15,
  },
};

// ============================================================================
// TOOL: Availability Tool (read-only)
// ============================================================================

interface AvailabilityToolInput {
  origin: string;
  destination: string;
  outboundDate: string;
  returnDate?: string;
  paxCount: number;
}

class AvailabilityTool {
  name = 'check_availability';
  description =
    'Checks seat availability for a group on a given route and dates. Returns availability status and flight options (mock data).';
  schema = z.object({
    origin: z.string().describe('Origin airport IATA code (e.g. LHR)'),
    destination: z
      .string()
      .describe('Destination airport IATA code (e.g. MIA)'),
    outboundDate: z.string().describe('Outbound date (YYYY-MM-DD or similar)'),
    returnDate: z.string().optional().describe('Return date if round-trip'),
    paxCount: z.number().describe('Number of passengers'),
  });

  async invoke(input: AvailabilityToolInput) {
    const origin = input.origin.toUpperCase().trim();
    const destination = input.destination.toUpperCase().trim();
    const route = `${origin}-${destination}`;
    const routeConfig = MOCK_AVAILABILITY_ROUTES.find(
      (r) => r.origin === origin && r.destination === destination
    );
    if (!routeConfig) {
      return JSON.stringify({
        available: false,
        availableSeats: 0,
        flightOptions: [],
        message: `Route ${route} not found in mock availability. Supported mock routes: LHR-MIA, JFK-LAX, LHR-BCN.`,
      });
    }
    const inRange =
      input.paxCount >= routeConfig.minPax &&
      input.paxCount <= routeConfig.maxPax;
    return JSON.stringify({
      available: inRange,
      availableSeats: inRange ? routeConfig.maxPax : 0,
      flightOptions: inRange
        ? [
            {
              flightNumber: 'AA100',
              date: input.outboundDate,
              seats: routeConfig.maxPax,
            },
            input.returnDate
              ? {
                  flightNumber: 'AA101',
                  date: input.returnDate,
                  seats: routeConfig.maxPax,
                }
              : null,
          ].filter(Boolean)
        : [],
      message: inRange
        ? 'Availability confirmed for requested dates and group size.'
        : 'Group size out of range for this route in mock data.',
    });
  }
}

// ============================================================================
// TOOL: Pricing Rules Tool (read-only)
// ============================================================================

interface PricingRulesToolInput {
  origin: string;
  destination: string;
  paxCount: number;
  cabinClass?: string;
}

class PricingRulesTool {
  name = 'get_pricing_rules';
  description =
    'Returns base fare and group discount rules for a route and group size (mock data).';
  schema = z.object({
    origin: z.string().describe('Origin airport IATA code'),
    destination: z.string().describe('Destination airport IATA code'),
    paxCount: z.number().describe('Number of passengers'),
    cabinClass: z
      .string()
      .optional()
      .describe('Cabin class (e.g. economy, premium, business)'),
  });

  async invoke(input: PricingRulesToolInput) {
    const origin = input.origin.toUpperCase().trim();
    const destination = input.destination.toUpperCase().trim();
    const routeKey = `${origin}-${destination}`;
    const rules = MOCK_PRICING[routeKey];
    if (!rules) {
      return JSON.stringify({
        baseFarePerPax: 0,
        groupDiscountPercent: 0,
        totalPrice: 0,
        currency: 'USD',
        rulesSummary: `No mock pricing for route ${routeKey}. Supported: LHR-MIA, JFK-LAX, LHR-BCN.`,
      });
    }
    let discount = 0;
    if (input.paxCount >= 50) discount = rules.discount50plus;
    else if (input.paxCount >= 20) discount = rules.discount20to49;
    else if (input.paxCount >= 10) discount = rules.discount10to19;
    const pricePerPax = rules.baseFarePerPax * (1 - discount / 100);
    const totalPrice = Math.round(pricePerPax * input.paxCount);
    return JSON.stringify({
      baseFarePerPax: rules.baseFarePerPax,
      groupDiscountPercent: discount,
      pricePerPaxAfterDiscount: pricePerPax,
      totalPrice,
      currency: 'USD',
      rulesSummary: `Base ${rules.baseFarePerPax} USD/pax; group discount ${discount}% for ${input.paxCount} pax.`,
    });
  }
}

// ============================================================================
// AGENT 1 + TASK 1: Extract and Validate
// ============================================================================

const inquiryExtractionValidationAgent = new Agent({
  name: 'Inquiry Extraction & Validation Agent',
  role: 'Group Booking Data Specialist',
  goal: 'Extract group booking details from unstructured text and validate that all required fields are present.',
  background:
    'Expert in parsing travel requests from emails, forms, and free text. Specializes in IATA codes, dates, and group size; validates completeness and reports missing fields clearly.',
});

const extractAndValidateInquiryTask = new Task({
  title: 'Extract and Validate Group Booking Inquiry',
  description: `From the user's message {userMessage}, do BOTH extraction and validation in one pass.

EXTRACTION – Extract the following (use IATA 3-letter codes for airports):
- origin: Origin airport (e.g. LHR, JFK)
- destination: Destination airport (e.g. MIA, LAX)
- outboundDate: Outbound travel date (prefer YYYY-MM-DD)
- returnDate: Return date if round-trip (optional)
- paxCount: Number of passengers (integer)
- cabinClass: Economy, premium, business, or leave empty if not stated
- groupType: e.g. corporate, leisure, event (optional)
- contactEmail: Contact email if mentioned (optional)
- notes: Any other requirements (optional)

VALIDATION – Required for a valid inquiry:
- origin and destination must be present and non-empty
- outboundDate must be present
- paxCount must be present and at least 1

Set valid to true only if all required fields are present and sensible. Otherwise set valid to false, list missing or invalid fields in missingFields (e.g. ["origin", "paxCount"]), and set validationMessage to a short, user-friendly message asking for the missing information.

Output the structured inquiry plus valid, and if not valid then missingFields and validationMessage.`,
  agent: inquiryExtractionValidationAgent,
  expectedOutput:
    'Structured inquiry object with extracted fields plus valid boolean, and if invalid: missingFields array and validationMessage.',
  outputSchema: z.object({
    origin: z.string().describe('Origin airport IATA code'),
    destination: z.string().describe('Destination airport IATA code'),
    outboundDate: z.string().describe('Outbound date'),
    returnDate: z.string().optional(),
    paxCount: z.number().describe('Number of passengers'),
    cabinClass: z.string().optional(),
    groupType: z.string().optional(),
    contactEmail: z.string().optional(),
    notes: z.string().optional(),
    valid: z
      .boolean()
      .describe('True if all required fields are present and valid'),
    missingFields: z
      .array(z.string())
      .optional()
      .describe('List of missing or invalid field names'),
    validationMessage: z
      .string()
      .optional()
      .describe('User-friendly message when valid is false'),
  }),
});

// ============================================================================
// AGENT 2 + TASK 2: Availability & Pricing
// ============================================================================

const availabilityPricingAgent = new Agent({
  name: 'Availability & Pricing Agent',
  role: 'Group Sales Specialist',
  goal: 'Check seat availability and apply group pricing rules using tools; produce availability and price summary.',
  background:
    'Expert in airline group sales: uses availability and pricing tools to confirm space and calculate group fares. Produces clear availability and price summary for the quote step.',
  // @ts-expect-error - tools typing in kaibanjs
  tools: [new AvailabilityTool(), new PricingRulesTool()],
});

const availabilityAndPricingTask = new Task({
  title: 'Check Availability and Apply Pricing',
  description: `Use the extracted and validated inquiry from the previous task.

If valid is false, do NOT call the tools. Output a short summary that availability and pricing cannot be provided until the customer supplies: {missingFields} – message: {validationMessage}.

If valid is true:
1. Call check_availability with origin, destination, outboundDate, returnDate (if present), paxCount from the inquiry.
2. Call get_pricing_rules with origin, destination, paxCount, cabinClass (if present).
3. Summarize: available (yes/no), availableSeats if any, totalPrice, currency, pricePerPaxAfterDiscount, groupDiscountPercent, and rulesSummary. If return date exists, note that the price may be for round-trip in the summary.

Use ONLY data from the tools and the inquiry. Do not invent prices or availability.`,
  agent: availabilityPricingAgent,
  expectedOutput:
    'Availability result and pricing summary, or a message asking for missing fields if inquiry was invalid.',
  outputSchema: z.union([
    z.object({
      validInquiry: z.literal(false),
      validationMessage: z.string(),
      missingFields: z.array(z.string()),
    }),
    z.object({
      validInquiry: z.literal(true),
      available: z.boolean(),
      availableSeats: z.number().optional(),
      totalPrice: z.number(),
      currency: z.string(),
      pricePerPaxAfterDiscount: z.number().optional(),
      groupDiscountPercent: z.number().optional(),
      rulesSummary: z.string().optional(),
      flightOptionsSummary: z.string().optional(),
    }),
  ]),
});

// ============================================================================
// AGENT 3 + TASK 3: Generate Quote
// ============================================================================

const quoteGenerationAgent = new Agent({
  name: 'Quote Generation Agent',
  role: 'Quote Author',
  goal: 'Produce a ready-to-send group booking quote or a clear request for missing information.',
  background:
    'Professional airline group sales communicator. Writes clear, concise quotes with itinerary summary, price, validity, and next steps; or a polite message listing missing information.',
});

const generateQuoteTask = new Task({
  title: 'Generate Group Booking Quote',
  description: `Produce the final output for the customer.

INPUTS FROM PREVIOUS TASKS:
- First task: extracted inquiry (origin, destination, dates, paxCount, cabinClass, contactEmail, notes) and valid, missingFields, validationMessage.
- Second task: either (validInquiry: false, validationMessage, missingFields) or (validInquiry: true, available, totalPrice, currency, rulesSummary, flightOptionsSummary, etc.).

If the inquiry was invalid (validInquiry false or valid false): Write a short, professional message asking the customer to provide the missing information listed in missingFields, and use validationMessage. End with how to reply (e.g. reply to this message with the details).

If the inquiry was valid and availability was confirmed: Write a formal group booking quote that includes:
- Salutation and reference to their group request (route, dates, pax count).
- Confirmation of availability.
- Total price and currency, price per passenger, and group discount if applicable.
- Validity of the quote (e.g. valid for 7 days).
- Next steps (e.g. reply to accept or contact for alternatives).
- Optional: mention alternative dates or routes if the second task suggested any.

If the inquiry was valid but availability was not confirmed: State that we could not confirm availability for the requested dates/route and suggest they contact sales for alternatives.

Output plain text suitable to send to the customer (no JSON).`,
  agent: quoteGenerationAgent,
  expectedOutput:
    'Plain-text quote or message: either a full quote with price and next steps, or a request for missing information, or an availability-not-confirmed message.',
});

// ============================================================================
// TEAM CREATION (async: needs Kaiban MCP tools)
// ============================================================================

export interface GroupBookingQuoteTeamContext {
  card_id: string;
  board_id: string;
  team_id: string;
  agent_id: string;
  agent_name: string;
}

/**
 * Creates the Group Booking Quote Team with Kaiban MCP tools for Task 0 and Task 4.
 * Sequential: Get card & move to doing → Extract & Validate → Availability & Pricing → Generate Quote → Update card & move to done.
 */
export async function createGroupBookingQuoteTeam(
  context: GroupBookingQuoteTeamContext
) {
  const kaibanTools = await getKaibanTools();
  const { card_id, board_id, team_id, agent_id, agent_name } = context;

  const kaibanCardSyncAgent = new Agent({
    name: 'Kaiban Card Sync Agent',
    role: 'Kaiban Platform Sync',
    goal: 'Use Kaiban MCP tools to get card, move card to doing/done, update card result, and create card activities.',
    background:
      'Uses get_card, move_card, update_card, and create_card_activities from the Kaiban MCP server. Follows task instructions exactly.',
    // @ts-expect-error - Kaiban MCP tools (name/description/schema/invoke) compatible with kaibanjs agent tools
    tools: kaibanTools,
  });

  const getCardAndMoveToDoingTask = new Task({
    title: 'Get Card and Move to Doing',
    description: `For card_id {card_id}, board_id {board_id}, team_id {team_id}, and actor id {agent_id} name {agent_name}:

1. Call get_card with card_id to fetch the card.
2. From the card object, extract the description field (this is the customer inquiry text). If there is no description or it is empty, return userMessage as "No inquiry text provided."
3. If the card has a description and its column_key is "todo", call move_card with card_id, column_key "doing", and actor { id: agent_id, type: "agent", name: agent_name }.
4. Optionally call create_card_activities to log the status/column change (board_id, team_id, type CARD_STATUS_CHANGED / CARD_COLUMN_CHANGED, actor, changes).
5. Return ONLY an object with one field: userMessage, set to the card description text (the inquiry). This will be used as input for the next task.`,
    agent: kaibanCardSyncAgent,
    expectedOutput:
      'Object with userMessage set to the card description (customer inquiry text).',
    outputSchema: z.object({
      userMessage: z
        .string()
        .describe('The card description text (customer inquiry).'),
    }),
  });

  const updateCardWithQuoteAndMoveToDoneTask = new Task({
    title: 'Update Card with Quote and Move to Done',
    description: `You have the final quote text from the previous task (the plain-text quote or message for the customer).

For card_id {card_id}, board_id {board_id}, team_id {team_id}, actor id {agent_id} name {agent_name}:

1. Call update_card with card_id and set the card result to the quote text (use the field name that the API accepts for the agent result, e.g. result or description). Set status to "done" if the API accepts it.
2. Call move_card with card_id, column_key "done", and actor { id: agent_id, type: "agent", name: agent_name }.
3. Call create_card_activities to log the status change to done and column change to done (two activities: CARD_STATUS_CHANGED, CARD_COLUMN_CHANGED with actor and changes).

Use the exact quote text produced by the previous task as the result to write on the card.`,
    agent: kaibanCardSyncAgent,
    expectedOutput:
      'Card updated with quote result and moved to done; activities logged.',
    outputSchema: z.object({
      success: z
        .boolean()
        .describe('True if card was updated and moved to done.'),
    }),
  });

  return new Team({
    name: 'Group Booking Quote Team',
    agents: [
      kaibanCardSyncAgent,
      inquiryExtractionValidationAgent,
      availabilityPricingAgent,
      quoteGenerationAgent,
    ],
    tasks: [
      getCardAndMoveToDoingTask,
      extractAndValidateInquiryTask,
      availabilityAndPricingTask,
      generateQuoteTask,
      updateCardWithQuoteAndMoveToDoneTask,
    ],
    inputs: {
      card_id,
      board_id,
      team_id,
      agent_id,
      agent_name,
    },
    env: {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
    },
  });
}

/**
 * Process group booking quote request using Kaiban MCP for card lifecycle.
 * Context comes from the A2A Kaiban activity (card_id, board_id, team_id, agent_id, agent_name).
 */
export async function processGroupBookingQuoteRequest(
  context: GroupBookingQuoteTeamContext
): Promise<string> {
  const team = await createGroupBookingQuoteTeam(context);
  const { result = '' } = await team.start();

  if (result && typeof result === 'object') {
    return JSON.stringify(result);
  }
  return result as string;
}
