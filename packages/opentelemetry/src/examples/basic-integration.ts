import { Team, Agent, Task } from 'kaibanjs';
import { enableOpenTelemetry } from '../index';
import type { OpenTelemetryConfig } from '../types';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Example of basic OpenTelemetry integration with KaibanJS
 */
async function basicIntegrationExample(): Promise<any> {
  // Create a simple team
  const contentAgent = new Agent({
    name: 'ContentExtractor',
    role: 'Content Specialist',
    goal: 'Extract and process content from input',
    background: 'Expert in article content extraction and processing',
  });

  const reviewAgent = new Agent({
    name: 'ContentReviewer',
    role: 'Quality Reviewer',
    goal: 'Review and validate extracted content',
    background: 'Expert in content quality assessment',
  });

  const extractTask = new Task({
    title: 'Extract Content',
    description:
      'Extract the main content from the given article input: {article}',
    expectedOutput: 'Clean, structured content',
    agent: contentAgent,
  });

  const reviewTask = new Task({
    title: 'Review Content',
    description: 'Review the extracted content for quality and accuracy',
    expectedOutput: 'Validated content with quality assessment',
    agent: reviewAgent,
  });

  const team = new Team({
    name: 'Content Processing Team',
    agents: [contentAgent, reviewAgent],
    tasks: [extractTask, reviewTask],
    env: {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
    },
  });

  // Configure OpenTelemetry
  const observabilityConfig: OpenTelemetryConfig = {
    enabled: true,
    sampling: {
      rate: 1.0, // Sample all traces for demo
      strategy: 'always',
    },
    attributes: {
      includeSensitiveData: false,
      customAttributes: {
        'service.name': 'kaibanjs-content-processor',
        'service.version': '1.0.0',
        environment: 'development',
      },
    },
    exporters: {
      console: true, // Enable console output for demo
    },
  };

  // Enable OpenTelemetry observability
  enableOpenTelemetry(team, observabilityConfig);

  console.log('🚀 Starting workflow with OpenTelemetry observability...');

  try {
    // Start the workflow
    const result = await team.start({
      article:
        'The current cripto market is doing great. The top 3 coins are Bitcoin, Ethereum and Solana. The market is expected to grow by 10% in the next month. The price of Bitcoin is $100,000 and the price of Ethereum is $10,000. The price of Solana is $100. The market is expected to grow by 10% in the next month. The price of Bitcoin is $100,000 and the price of Ethereum is $10,000. The price of Solana is $100.',
    });

    console.log('✅ Workflow completed successfully:', result);
  } catch (error) {
    console.error('❌ Workflow failed:', error);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  basicIntegrationExample().catch(console.error);
}

export { basicIntegrationExample };
