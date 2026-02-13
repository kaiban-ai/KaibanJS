import { A2AClient } from '@a2a-js/sdk/client';

/**
 * Creates an A2AClient by fetching the agent card from the running test server,
 * overriding its `url` with the server's baseUrl, and constructing the client
 * from that card so RPC calls go to the test server rather than localhost:4000.
 */
export async function createClientFromServer(baseUrl: string, route: string) {
  const res = await fetch(`${baseUrl}${route}/.well-known/agent-card.json`);
  if (!res.ok) throw new Error(`Failed to fetch agent card: ${res.status}`);
  const card = await res.json();
  card.url = `${baseUrl}${route}`;
  return new A2AClient(card);
}
