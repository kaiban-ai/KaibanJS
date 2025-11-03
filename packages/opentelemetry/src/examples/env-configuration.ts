import { Team, Agent, Task } from 'kaibanjs';
import { createOpenTelemetryIntegration } from '../index';

import * as dotenv from 'dotenv';
dotenv.config();

/**
 * Example configuration using environment variables
 * This demonstrates how to configure OTLP exporters using environment variables
 *
 * Set these environment variables before running:
 *
 * # Basic OTLP configuration
 * export OTEL_EXPORTER_OTLP_ENDPOINT="https://your-service.com"
 * export OTEL_EXPORTER_OTLP_HEADERS="Authorization=Bearer your-token"
 * export OTEL_EXPORTER_OTLP_PROTOCOL="http"
 *
 * # Or use specific endpoints for traces
 * export OTEL_EXPORTER_OTLP_TRACES_ENDPOINT="https://your-service.com/v1/traces"
 * export OTEL_EXPORTER_OTLP_TRACES_HEADERS="Authorization=Bearer your-token"
 */

// Configuration using environment variables as fallback
const config = {
  enabled: true,
  sampling: {
    rate: 1.0,
    strategy: 'always' as const,
  },
  attributes: {
    includeSensitiveData: false,
    customAttributes: {
      'service.version': '1.0.0',
      'service.environment': process.env.NODE_ENV || 'development',
    },
  },
  exporters: {
    console: false, // Keep console output for debugging
    otlp: {
      endpoint: 'https://us.cloud.langfuse.com/api/public/otel/v1/traces',
      headers: {
        Authorization:
          'Basic ' +
          Buffer.from(
            `${process.env.LANGFUSE_PUBLIC_KEY}:${process.env.LANGFUSE_SECRET_KEY}`
          ).toString('base64'),
      },
      serviceName: 'kaibanjs-service',
      timeout: 30000,
      compression: 'gzip' as const,
    },
  },
};

// Create the integration
const integration = createOpenTelemetryIntegration(config);

// Create agent
const dataProcessor = new Agent({
  name: 'Data Processor',
  role: 'Process and analyze data',
  goal: 'Extract valuable insights from data',
  background: 'I am an expert data processor',
});

// Create task
const processTask = new Task({
  title: 'Process data',
  description: 'Process the provided data: {data} and extract insights',
  expectedOutput: 'Detailed insights and analysis from the data',
  agent: dataProcessor,
});

// Example team setup
const team = new Team({
  name: 'Environment Configured Team',
  agents: [dataProcessor],
  tasks: [processTask],
  inputs: {
    data: 'The current cripto market is doing great. The top 3 coins are Bitcoin, Ethereum and Solana. The market is expected to grow by 10% in the next month. The price of Bitcoin is $100,000 and the price of Ethereum is $10,000. The price of Solana is $100. The market is expected to grow by 10% in the next month. The price of Bitcoin is $100,000 and the price of Ethereum is $10,000. The price of Solana is $100.',
  },
  env: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  },
});

// Integrate observability with the team
integration.integrateWithTeam(team);

// Example workflow execution
async function runExampleWorkflow(): Promise<any> {
  console.log(
    '🚀 Starting workflow with environment-configured OTLP export...'
  );
  console.log('📊 Using environment variables for OTLP configuration');

  try {
    console.log('📊 Starting workflow...');
    const result = await team.start();
    console.log('✅ Workflow completed:', result);

    console.log('🎉 Workflow completed successfully!');
    console.log('📈 Traces have been exported using environment configuration');
  } catch (error) {
    console.error('❌ Workflow failed:', error);
  } finally {
    // Shutdown the integration
    await integration.shutdown();
  }
}

// Run the example
if (require.main === module) {
  console.log('running example workflow');
  runExampleWorkflow().catch(console.error);
  console.log('running example workflow');
}

export { config, integration, runExampleWorkflow };
