import { A2AExpressApp } from '@a2a-js/sdk/server/express';
import express from 'express';

import { createPilotSourcingAgentHandler } from '../../src/agents/sourcing-freelance-pilot/handler';

/**
 * Creates an Express app with the Pilot Sourcing Agent mounted under its A2A base path.
 * Used for integration testing.
 *
 * @param baseUrl - The base URL of the test server (e.g., 'http://127.0.0.1:12345')
 */
export function createTestApp(baseUrl: string) {
  const app = express();

  // CORS middleware for test environment
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS'
    );
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    );
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
  });

  // Mount Pilot Sourcing Agent
  const agentPath = '/agents/pilotSourcing/a2a';
  const agentUrl = `${baseUrl}${agentPath}`;
  const pilotSourcingAgentHandler = createPilotSourcingAgentHandler(agentUrl);
  new A2AExpressApp(pilotSourcingAgentHandler).setupRoutes(app, agentPath);

  return app;
}
