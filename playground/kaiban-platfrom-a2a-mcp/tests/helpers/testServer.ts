import type { Server } from 'http';

import { createTestApp } from './createTestApp';

/**
 * Starts an ephemeral HTTP server for the test Express app.
 */
export async function startTestServer(): Promise<{
  baseUrl: string;
  server: Server;
  close: () => Promise<void>;
}> {
  const tempServer: Server = await new Promise((resolve) => {
    const s = require('http')
      .createServer()
      .listen(0, () => resolve(s));
  });
  const address = tempServer.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  const baseUrl = `http://127.0.0.1:${port}`;
  tempServer.close();

  const app = createTestApp(baseUrl);
  const server: Server = await new Promise((resolve) => {
    const s = app.listen(port, () => resolve(s));
  });

  return {
    baseUrl,
    server,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}
