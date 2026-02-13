/**
 * @fileoverview Agent Card Configuration for A2A Protocol Discovery
 *
 * This module defines the agent card metadata that describes the Airline Group Booking Quote Agent's
 * capabilities, endpoints, and configuration following the A2A protocol specification.
 *
 * The agent card is served at: /.well-known/agent-card.json
 *
 * @module agents/airline-group-booking-quote/card
 */

import { AgentCard } from '@a2a-js/sdk';

/**
 * Agent Card for Airline Group Booking Quote Agent
 *
 * @description This function returns the agent card with discovery information for the A2A protocol:
 * - Agent identity (name, version, description)
 * - Endpoint URL for agent communication
 * - Supported input/output modes
 * - Available skills and capabilities
 * - Protocol version compatibility
 *
 * @param url - The complete agent endpoint URL (e.g., http://localhost:4000/airlineGroupBookingQuote/a2a)
 * @returns {AgentCard} The agent card configuration
 */
export const groupBookingQuoteAgentCard = (url: string): AgentCard => ({
  name: 'Airline Group Booking Quote Agent',
  description:
    'Agent that generates instant group booking quotes from unstructured inquiries: extracts and validates request details, checks availability and pricing, and returns a ready-to-send quote.',

  protocolVersion: '0.3.0',
  version: '0.1.0',
  url,

  defaultInputModes: ['text'],
  defaultOutputModes: ['text'],

  skills: [
    {
      id: 'group-booking-quote',
      name: 'Group Booking Quote',
      description:
        'Extracts and validates group booking inquiries, checks seat availability and pricing rules, and generates instant quotes for group travel requests.',
      tags: [
        'group-booking',
        'airline',
        'quote',
        'availability',
        'pricing',
        'sales',
        'revenue',
        'group-sales',
      ],
    },
  ],

  capabilities: {
    streaming: true,
    pushNotifications: false,
    stateTransitionHistory: false,
  },
});
