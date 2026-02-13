/**
 * @fileoverview A2A Request Handler Configuration for Airline Group Booking Quote Agent
 *
 * This module assembles the A2A request handler by combining:
 * - Agent Card (metadata and discovery information)
 * - Task Store (in-memory task state management)
 * - Agent Executor (business logic and execution flow)
 *
 * @module agents/airline-group-booking-quote/handler
 */

import path from 'path';
import { fileURLToPath } from 'url';

import { DefaultRequestHandler } from '@a2a-js/sdk/server';
import { A2AExpressApp } from '@a2a-js/sdk/server/express';
import express from 'express';

import { groupBookingQuoteAgentCard } from './card';
import { tasksStore, groupBookingQuoteAgentExecutor } from './executor';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const samplesDir = path.join(__dirname, '../../../samples');

export const createGroupBookingQuoteAgentHandler = (agentUrl: string) => {
  return new DefaultRequestHandler(
    groupBookingQuoteAgentCard(agentUrl),
    tasksStore,
    groupBookingQuoteAgentExecutor
  );
};

/**
 * Setup A2A routes for the Airline Group Booking Quote Agent.
 * Optionally serves sample inquiry file from samples/.
 */
export const setupGroupBookingQuoteAgentRoutes = (
  app: express.Express,
  baseUrl: string
) => {
  const agentPath = '/airlineGroupBookingQuote/a2a';
  const agentUrl = `${baseUrl}${agentPath}`;

  new A2AExpressApp(createGroupBookingQuoteAgentHandler(agentUrl)).setupRoutes(
    app,
    agentPath
  );

  const samplesPath = '/airlineGroupBookingQuote/samples';
  app.use(samplesPath, express.static(samplesDir));

  const sampleFileUrl = `${baseUrl}${samplesPath}/group-booking-inquiry-example.txt`;

  return {
    agentUrl,
    cardUrl: `${agentUrl}/.well-known/agent-card.json`,
    sampleFileUrl,
  };
};
