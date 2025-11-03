import { Team } from 'kaibanjs';
import { OpenTelemetryAdapter } from './core/OpenTelemetryAdapter';
import type { OpenTelemetryConfig } from './types';

/**
 * Create OpenTelemetry integration instance
 */
export function createOpenTelemetryIntegration(config: OpenTelemetryConfig) {
  const adapter = new OpenTelemetryAdapter(config);

  return {
    /**
     * Integrate observability with a specific team
     */
    integrateWithTeam(team: Team): void {
      adapter.integrateWithTeam(team);
    },

    /**
     * Get the adapter instance for advanced usage
     */
    getAdapter(): OpenTelemetryAdapter {
      return adapter;
    },

    /**
     * Shutdown the observability integration
     */
    async shutdown(): Promise<void> {
      await adapter.shutdown();
    },
  };
}

/**
 * Simple function to enable OpenTelemetry observability for a team
 */
export function enableOpenTelemetry(
  team: Team,
  config: OpenTelemetryConfig
): void {
  const integration = createOpenTelemetryIntegration(config);
  integration.integrateWithTeam(team);
}

// Export types
export type { OpenTelemetryConfig, KaibanSpanContext } from './types';

// Export core classes for advanced usage
export { OpenTelemetryAdapter } from './core/OpenTelemetryAdapter';
export { SpanManager } from './core/SpanManager';
export { KaibanSpanContextImpl } from './core/KaibanSpanContext';

// Export mappers for advanced usage
export { SimpleTaskMapper } from './mappers';

// Export exporters for advanced usage
export { ConsoleExporter, OTLPExporter } from './exporters';
