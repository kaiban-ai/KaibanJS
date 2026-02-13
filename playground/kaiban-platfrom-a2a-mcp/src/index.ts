/**
 * @fileoverview Main Server Entry Point for Airline Group Booking Quote Agent
 *
 * This is the main application entry point that bootstraps the Express server
 * and configures the A2A (Agent-to-Agent) protocol endpoints for the Group Booking Quote agent.
 *
 * The server provides:
 * - A2A protocol compliance for agent communication
 * - RESTful endpoints for agent card discovery
 * - CORS support for cross-origin requests
 * - Integration with Kaiban platform
 * - Sample inquiry file serving for testing
 *
 * @module index
 */

import 'dotenv/config';
import express from 'express';

import { setupGroupBookingQuoteAgentRoutes } from './agents/airline-group-booking-quote/handler';
import { createLogger } from './shared/logger';

const logger = createLogger('A2A Server');

const app = express();

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

const port = process.env.PORT || 4000;
const baseUrl = process.env.A2A_BASE_URL || `http://localhost:${port}`;

app.listen(port, async () => {
  const groupBookingQuote = setupGroupBookingQuoteAgentRoutes(app, baseUrl);

  console.log(`
   _  __     _ _                 
  | |/ /__ _(_) |__  __ _ _ _    
  | ' </ _\` | | '_ \\/ _\` | ' \\   
  |_|\\_\\__,_|_|_.__/\\__,_|_||_|  
   ___  _            _            
  / __|| |_  __ _ _ _| |_  ___  _ _ 
  \\__ \\|  _|/ _\` | '_|  _|/ -_)| '_|
  |___/ \\__|\\__,_|_|  \\__|\\___||_|  
                                v1.0.0
  
            |
      --@--(-)--@--
  
  A2A Server Endpoints:
  ------------------------------------------------------------
  Airline Group Booking Quote Agent:
    -> Card:   ${groupBookingQuote.cardUrl}
    -> Agent:  ${groupBookingQuote.agentUrl}
    -> Sample: ${groupBookingQuote.sampleFileUrl}
  ------------------------------------------------------------
  `);
  logger.info(`🚀 Listening Requests`);
});
