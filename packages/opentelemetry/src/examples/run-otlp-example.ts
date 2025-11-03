#!/usr/bin/env tsx

/**
 * Script to run the OTLP exporter example
 * This script demonstrates how to use the OTLP exporter with different services
 *
 * Usage:
 *   npm run dev:otlp-example
 *   or
 *   tsx src/examples/run-otlp-example.ts
 */

import { Team, Agent, Task } from 'kaibanjs';
import { createOpenTelemetryIntegration } from '../index';

// Configuration for testing OTLP exporter
const config = {
  enabled: true,
  sampling: {
    rate: 1.0,
    strategy: 'always' as const,
  },
  attributes: {
    includeSensitiveData: false,
    customAttributes: {
      'service.name': 'otlp-example',
      'service.version': '1.0.0',
      'service.environment': 'development',
    },
  },
  exporters: {
    console: true, // Always show console output for debugging
    otlp: [
      // Example: SigNoz (if you have a SigNoz instance)
      ...(process.env.SIGNOZ_ACCESS_TOKEN
        ? [
            {
              endpoint: 'https://ingest.us.signoz.cloud:443',
              protocol: 'grpc' as const,
              headers: {
                'signoz-access-token': process.env.SIGNOZ_ACCESS_TOKEN,
              },
              serviceName: 'kaibanjs-example-signoz',
              timeout: 30000,
            },
          ]
        : []),

      // Example: Langfuse (if you have Langfuse credentials)
      ...(process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY
        ? [
            {
              endpoint: 'https://cloud.langfuse.com/api/public/otel',
              protocol: 'http' as const,
              headers: {
                Authorization:
                  'Basic ' +
                  Buffer.from(
                    `${process.env.LANGFUSE_PUBLIC_KEY}:${process.env.LANGFUSE_SECRET_KEY}`
                  ).toString('base64'),
              },
              serviceName: 'kaibanjs-example-langfuse',
              compression: 'gzip' as const,
            },
          ]
        : []),

      // Example: Local OTLP collector (if running locally)
      {
        endpoint: 'http://localhost:4318',
        protocol: 'http' as const,
        serviceName: 'kaibanjs-example-local',
        timeout: 5000,
      },
    ],
  },
};

// Create a simple team for testing
const team = new Team({
  name: 'OTLP Example Team',
  agents: [
    new Agent({
      name: 'Test Agent',
      role: 'Testing Agent',
      goal: 'Demonstrate OTLP exporter functionality',
      backstory:
        'I am a test agent created to demonstrate the OTLP exporter functionality.',
      model: {
        name: 'gpt-4',
        temperature: 0.7,
      },
    }),
  ],
});

// Create the integration
const integration = createOpenTelemetryIntegration(config);

// Integrate with team
integration.integrateWithTeam(team);

/**
 * Run a simple workflow to test OTLP export
 */
async function runOTLPExample(): Promise<any> {
  console.log('🚀 OTLP Exporter Example');
  console.log('========================');
  console.log('');

  // Show configuration
  console.log('📋 Configuration:');
  console.log(
    `   • Console exporter: ${
      config.exporters.console ? 'enabled' : 'disabled'
    }`
  );
  console.log(
    `   • OTLP exporters: ${config.exporters.otlp?.length || 0} configured`
  );

  if (config.exporters.otlp && config.exporters.otlp.length > 0) {
    config.exporters.otlp.forEach((otlpConfig, index) => {
      console.log(
        `   • OTLP ${index + 1}: ${
          otlpConfig.serviceName
        } (${otlpConfig.protocol?.toUpperCase()})`
      );
    });
  }
  console.log('');

  try {
    console.log('🔄 Starting workflow...');

    // Create a simple task
    const task = new Task({
      title: 'Test OTLP Export',
      description:
        'This task will demonstrate OTLP exporter functionality by processing some sample data.',
      agent: team.getAgents()[0],
    });

    // Execute the task
    const result = await task.execute(`
      Please analyze this sample text and provide insights:
      
      "The OpenTelemetry Protocol (OTLP) is a vendor-neutral protocol for sending telemetry data. 
      It supports traces, metrics, and logs, and is designed to be efficient and extensible. 
      OTLP is becoming the standard for observability data transmission."
    `);

    console.log('✅ Task completed successfully!');
    console.log('📊 Result preview:', result.substring(0, 150) + '...');
    console.log('');

    // Show what was exported
    console.log('📈 Traces exported to:');
    if (config.exporters.console) {
      console.log('   • Console (for debugging)');
    }
    if (config.exporters.otlp && config.exporters.otlp.length > 0) {
      config.exporters.otlp.forEach((otlpConfig, _index) => {
        console.log(
          `   • ${
            otlpConfig.serviceName
          } (${otlpConfig.protocol?.toUpperCase()})`
        );
      });
    }
  } catch (error) {
    console.error('❌ Example failed:', error);
    throw error;
  } finally {
    console.log('');
    console.log('🔌 Shutting down integration...');
    await integration.shutdown();
    console.log('✅ Integration shutdown completed');
  }
}

/**
 * Show environment setup instructions
 */
function showSetupInstructions() {
  console.log('🔧 Environment Setup Instructions');
  console.log('================================');
  console.log('');
  console.log('To test with real services, set these environment variables:');
  console.log('');
  console.log('For SigNoz:');
  console.log('  export SIGNOZ_ACCESS_TOKEN="your-signoz-token"');
  console.log('');
  console.log('For Langfuse:');
  console.log('  export LANGFUSE_PUBLIC_KEY="pk-lf-your-public-key"');
  console.log('  export LANGFUSE_SECRET_KEY="sk-lf-your-secret-key"');
  console.log('');
  console.log('For local OTLP collector:');
  console.log(
    '  # Run: docker run -p 4318:4318 otel/opentelemetry-collector-contrib'
  );
  console.log('');
  console.log(
    'Without environment variables, only local OTLP collector will be used.'
  );
  console.log('');
}

// Main execution
async function main() {
  try {
    showSetupInstructions();
    await runOTLPExample();

    console.log('');
    console.log('🎉 OTLP Exporter Example Completed Successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('• Check your observability platforms for the exported traces');
    console.log('• Configure environment variables for real services');
    console.log('• Explore the generated traces in your monitoring dashboards');
  } catch (error) {
    console.error('❌ Example execution failed:', error);
    process.exit(1);
  }
}

// Run the example
if (require.main === module) {
  main();
}

export { config, integration, team, runOTLPExample };
