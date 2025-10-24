/**
 * KaibanJS OpenTelemetry Examples
 *
 * This module provides comprehensive examples for integrating KaibanJS
 * with various observability platforms using OpenTelemetry.
 *
 * Available Examples:
 * - Console Export (Development/Debugging)
 * - Langfuse Export (LLM Observability)
 * - SigNoz Export (Distributed Tracing)
 * - Phoenix Export (LLM Observability)
 * - Braintrust Export (LLM Observability)
 *
 * Shared Resources:
 * - Reusable teams (simple to complex)
 * - Common configurations
 * - Utility functions
 */

// Export all examples
export { main as consoleExample } from './console-example';
export { main as langfuseExample } from './langfuse-example';
export { main as signozExample } from './signoz-example';
export { main as phoenixExample } from './phoenix-example';
export { main as braintrustExample } from './braintrust-example';

// Export shared resources
export * from './shared';

// Export configurations for external use
export { config as consoleConfig } from './console-example';
export { config as langfuseConfig } from './langfuse-example';
export { config as signozConfig } from './signoz-example';
export { config as phoenixConfig } from './phoenix-example';
export { config as braintrustConfig } from './braintrust-example';

// Export integration instances
export { integration as consoleIntegration } from './console-example';
export { integration as langfuseIntegration } from './langfuse-example';
export { integration as signozIntegration } from './signoz-example';
export { integration as phoenixIntegration } from './phoenix-example';
export { integration as braintrustIntegration } from './braintrust-example';

/**
 * Run all examples (for testing purposes)
 */
export async function runAllExamples() {
  console.log('🚀 Running all OpenTelemetry examples...');

  const examples = [
    { name: 'Console', fn: consoleExample },
    { name: 'Langfuse', fn: langfuseExample },
    { name: 'SigNoz', fn: signozExample },
    { name: 'Phoenix', fn: phoenixExample },
    { name: 'Braintrust', fn: braintrustExample },
  ];

  for (const example of examples) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📋 Running ${example.name} example...`);
    console.log(`${'='.repeat(60)}`);

    try {
      await example.fn();
      console.log(`✅ ${example.name} example completed successfully`);
    } catch (error) {
      console.error(`❌ ${example.name} example failed:`, error);
    }

    // Small delay between examples
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  console.log('\n🎉 All examples completed!');
}

/**
 * Get example information
 */
export function getExampleInfo() {
  return {
    examples: [
      {
        name: 'console',
        description: 'Console export for development and debugging',
        file: 'console-example.ts',
        requirements: ['OPENAI_API_KEY'],
        features: [
          'Console output',
          'Development debugging',
          'No external dependencies',
        ],
      },
      {
        name: 'langfuse',
        description: 'Langfuse export for LLM observability',
        file: 'langfuse-example.ts',
        requirements: [
          'LANGFUSE_PUBLIC_KEY',
          'LANGFUSE_SECRET_KEY',
          'OPENAI_API_KEY',
        ],
        features: [
          'LLM observability',
          'Trace visualization',
          'Performance monitoring',
        ],
      },
      {
        name: 'signoz',
        description: 'SigNoz export for distributed tracing',
        file: 'signoz-example.ts',
        requirements: ['SIGNOZ_ACCESS_TOKEN', 'OPENAI_API_KEY'],
        features: ['Distributed tracing', 'Service map', 'Performance metrics'],
      },
      {
        name: 'phoenix',
        description: 'Phoenix export for LLM observability',
        file: 'phoenix-example.ts',
        requirements: ['PHOENIX_API_KEY', 'OPENAI_API_KEY'],
        features: [
          'LLM observability',
          'Trace visualization',
          'Error tracking',
        ],
      },
      {
        name: 'braintrust',
        description: 'Braintrust export for LLM observability',
        file: 'braintrust-example.ts',
        requirements: ['BRAINTRUST_API_KEY', 'OPENAI_API_KEY'],
        features: [
          'LLM observability',
          'Cost tracking',
          'Performance optimization',
        ],
      },
    ],
    teams: [
      {
        name: 'simple-data',
        description: 'Simple data processing (1 agent, 1 task)',
      },
      {
        name: 'content-creation',
        description: 'Content creation (2 agents, 2 tasks)',
      },
      {
        name: 'resume-creation',
        description: 'Resume creation (2 agents, 2 tasks)',
      },
      { name: 'sports-news', description: 'Sports news (2 agents, 2 tasks)' },
      {
        name: 'trip-planning',
        description: 'Trip planning (3 agents, 3 tasks)',
      },
      {
        name: 'product-spec',
        description: 'Product specification (3 agents, 3 tasks)',
      },
    ],
    semanticConventions: [
      'kaiban.llm.request.* - LLM request attributes',
      'kaiban.llm.usage.* - LLM usage metrics',
      'kaiban.llm.response.* - LLM response attributes',
      'kaiban.agent.thinking - Agent thinking spans',
      'task.execute - Task execution spans',
    ],
  };
}
