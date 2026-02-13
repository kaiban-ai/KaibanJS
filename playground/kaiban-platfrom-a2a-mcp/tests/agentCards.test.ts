import { A2AClient } from '@a2a-js/sdk/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from './helpers/testServer';

let baseUrl = '';
let close: () => Promise<void>;

beforeAll(async () => {
  const s = await startTestServer();
  baseUrl = s.baseUrl;
  // eslint-disable-next-line
  close = s.close;
});

afterAll(async () => {
  await close();
});

describe('Agent Cards', () => {
  it('publishes Airline Group Booking Quote agent card', async () => {
    const client = new A2AClient(`${baseUrl}/airlineGroupBookingQuote/a2a`);
    const card = await client.getAgentCard();

    expect(card).toBeTruthy();
    expect(card.name).toBe('Airline Group Booking Quote Agent');
    expect(card.description).toBe(
      'Agent that generates instant group booking quotes from unstructured inquiries: extracts and validates request details, checks availability and pricing, and returns a ready-to-send quote.'
    );
    expect(card.protocolVersion).toBe('0.3.0');
    expect(card.version).toBe('0.1.0');

    expect(card.name).toBeTypeOf('string');
    expect(card.description).toBeTypeOf('string');
    expect(card.protocolVersion).toBeTypeOf('string');
    expect(card.capabilities).toBeTypeOf('object');

    expect(card.url).toContain('/airlineGroupBookingQuote/a2a');

    expect(card.defaultInputModes).toEqual(['text']);
    expect(card.defaultOutputModes).toEqual(['text']);

    expect(card.skills).toBeDefined();
    expect(card.skills).toHaveLength(1);
    expect(card.skills[0].id).toBe('group-booking-quote');
    expect(card.skills[0].name).toBe('Group Booking Quote');

    expect(card.capabilities.streaming).toBe(true);
    expect(card.capabilities.pushNotifications).toBe(false);
    expect(card.capabilities.stateTransitionHistory).toBe(false);
  });
});
