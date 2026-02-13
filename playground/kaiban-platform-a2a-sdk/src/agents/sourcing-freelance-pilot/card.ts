/**
 * @fileoverview Agent Card Configuration for A2A Protocol Discovery
 *
 * This module defines the agent card metadata that describes the Pilot Sourcing Agent's
 * capabilities, endpoints, and configuration following the A2A protocol specification.
 *
 * The agent card is served at: /.well-known/agent-card.json
 *
 * @module agents/sourcing-freelance-pilot/card
 */

import { AgentCard } from '@a2a-js/sdk';

/**
 * Agent Card for Pilot Sourcing Agent
 *
 * @description This function returns the agent card with discovery information for the A2A protocol:
 * - Agent identity (name, version, description)
 * - Endpoint URL for agent communication
 * - Supported input/output modes
 * - Available skills and capabilities
 * - Protocol version compatibility
 *
 * @param url - The complete agent endpoint URL (e.g., http://localhost:4000/agents/pilotSourcing/a2a or https://tunnel-url.loca.lt/agents/pilotSourcing/a2a)
 * @returns {AgentCard} The agent card configuration
 *
 * @example
 * ```typescript
 * const card = pilotSourcingAgentCard('http://localhost:4000/agents/pilotSourcing/a2a');
 * // Returns agent card with url: 'http://localhost:4000/agents/pilotSourcing/a2a'
 * ```
 */
export const pilotSourcingAgentCard = (url: string): AgentCard => ({
  name: 'Pilot Sourcing Agent',
  description:
    'Agent that sources freelance pilots from Excel data based on flight requirements, aircraft types, and regulatory compliance. Analyzes flight requests, filters qualified pilots, calculates qualification scores, and generates personalized message templates for pilot outreach.',

  // A2A protocol version this agent supports
  protocolVersion: '0.3.0',

  // Agent version for tracking changes and updates
  version: '0.1.0',

  // Public endpoint URL - complete agent endpoint URL
  url,

  // Agent accepts text-based input from users
  defaultInputModes: ['text'],

  // Agent responds with text-based output
  defaultOutputModes: ['text'],

  // Skills define what this agent can do
  skills: [
    {
      id: 'pilot-sourcing',
      name: 'Pilot Sourcing',
      description:
        'Sources and qualifies freelance pilots from Excel data based on flight requirements, aircraft types, regulatory compliance, and operational constraints. Generates personalized message templates for pilot outreach.',
      // Tags help with agent discovery and matching user intents
      tags: [
        'pilot-sourcing',
        'aviation',
        'freelance-pilots',
        'excel-analysis',
        'pilot-qualification',
        'aircraft-matching',
        'regulatory-compliance',
        'pilot-outreach',
        'crew-sourcing',
        'aviation-operations',
      ],
    },
  ],

  // Agent capabilities for client negotiation
  capabilities: {
    streaming: true, // Supports Server-Sent Events (SSE) for real-time responses
    pushNotifications: false, // Does not support push notifications
    stateTransitionHistory: false, // Does not maintain state history
  },
});
