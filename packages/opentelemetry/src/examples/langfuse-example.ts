import { createOpenTelemetryIntegration } from '../index';
import {
  getTeamByName,
  getAvailableTeams as _getAvailableTeams,
} from './shared/teams';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Langfuse Export Example
 *
 * This example demonstrates how to export KaibanJS traces to Langfuse
 * using the OTLP protocol with proper semantic conventions.
 *
 * Features:
 * - OTLP export to Langfuse
 * - KaibanJS semantic conventions (kaiban.llm.*)
 * - Environment variable configuration
 * - Multiple team complexity levels
 * - Error handling and retry logic
 *
 * Setup:
 * 1. Set LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY environment variables
 * 2. Ensure OPENAI_API_KEY is set
 * 3. Run: npm run example:langfuse
 */

// Configuration for Langfuse export
const config = {
  enabled: true,
  sampling: {
    rate: 1.0,
    strategy: 'always' as const,
  },
  attributes: {
    includeSensitiveData: false,
    customAttributes: {
      'service.name': 'kaibanjs-langfuse-example',
      'service.version': '1.0.0',
      'service.environment': process.env.NODE_ENV || 'development',
    },
  },
  exporters: {
    console: true, // Keep console output for debugging
    otlp: {
      endpoint: 'https://us.cloud.langfuse.com/api/public/otel/v1/traces',
      headers: {
        Authorization:
          'Basic ' +
          Buffer.from(
            `${process.env.LANGFUSE_PUBLIC_KEY}:${process.env.LANGFUSE_SECRET_KEY}`
          ).toString('base64'),
      },
      serviceName: 'kaibanjs-langfuse-service',
      timeout: 30000,
      compression: 'gzip' as const,
    },
  },
};

// Create the integration
const integration = createOpenTelemetryIntegration(config);

/**
 * Validate environment variables
 */
function validateEnvironment() {
  const requiredVars = [
    'LANGFUSE_PUBLIC_KEY',
    'LANGFUSE_SECRET_KEY',
    'OPENAI_API_KEY',
  ];
  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}\n` +
        'Please set these variables before running the example.'
    );
  }

  console.log('✅ Environment variables validated');
}

/**
 * Run a specific team workflow with Langfuse export
 */
async function runTeamWorkflow(teamName: string): Promise<any> {
  console.log(`🚀 Starting ${teamName} workflow with Langfuse export...`);

  try {
    // Get the team
    const team = getTeamByName(teamName);

    // Integrate observability with the team
    integration.integrateWithTeam(team);

    console.log(`📊 Team: ${team.getStore().getState().name}`);
    console.log(`👥 Agents: ${team.getStore().getState().agents.length}`);
    console.log(`📋 Tasks: ${team.getTasks().length}`);
    console.log(
      '🔍 Traces will be exported to Langfuse with kaiban.llm.* semantic conventions'
    );

    // Start the workflow
    console.log('📊 Starting workflow...');
    const startTime = Date.now();
    const result = await team.start();
    const duration = Date.now() - startTime;

    console.log('✅ Workflow completed successfully!');
    console.log('📈 Traces have been exported to Langfuse');
    console.log('📊 Result summary:', {
      completedTasks: result.stats?.taskCount || 0,
      totalTasks: team.getTasks().length,
      duration: `${duration}ms`,
      langfuseEndpoint: 'https://us.cloud.langfuse.com',
    });

    return result;
  } catch (error) {
    console.error('❌ Workflow failed:', error);
    throw error;
  }
}

/**
 * Run multiple team examples with Langfuse export
 */
async function runMultipleExamples() {
  console.log('🎯 Running multiple team examples with Langfuse export...');

  const examples = [
    { team: 'simple-data', description: 'Simple data processing' },
    { team: 'content-creation', description: 'Content creation workflow' },
    { team: 'resume-creation', description: 'Resume creation workflow' },
    { team: 'sports-news', description: 'Sports news workflow' },
  ];

  for (const example of examples) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📋 Running: ${example.description}`);
    console.log(`${'='.repeat(60)}`);

    try {
      await runTeamWorkflow(example.team);
      console.log(`✅ ${example.description} completed successfully`);
    } catch (error) {
      console.error(`❌ ${example.description} failed:`, error);
    }

    // Small delay between examples
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

/**
 * Run complex team examples
 */
async function runComplexExamples() {
  console.log('🎯 Running complex team examples with Langfuse export...');

  const complexExamples = [
    { team: 'trip-planning', description: 'Trip planning workflow' },
    { team: 'product-spec', description: 'Product specification workflow' },
  ];

  for (const example of complexExamples) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📋 Running: ${example.description}`);
    console.log(`${'='.repeat(60)}`);

    try {
      await runTeamWorkflow(example.team);
      console.log(`✅ ${example.description} completed successfully`);
    } catch (error) {
      console.error(`❌ ${example.description} failed:`, error);
    }

    // Longer delay for complex examples
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
}

/**
 * Demonstrate semantic conventions
 */
async function demonstrateSemanticConventions() {
  console.log('🎯 Demonstrating KaibanJS semantic conventions...');

  const team = getTeamByName('simple-data');
  integration.integrateWithTeam(team);

  console.log('📊 This example will show the following semantic conventions:');
  console.log('  - kaiban.llm.request.* (LLM request attributes)');
  console.log('  - kaiban.llm.usage.* (LLM usage metrics)');
  console.log('  - kaiban.llm.response.* (LLM response attributes)');
  console.log('  - kaiban.agent.thinking (Agent thinking spans)');
  console.log('  - task.execute (Task execution spans)');

  await runTeamWorkflow('simple-data');
}

/**
 * Main execution function
 */
async function main() {
  console.log('🔍 KaibanJS OpenTelemetry Langfuse Export Example');
  console.log('==================================================');

  try {
    // Validate environment
    validateEnvironment();

    // Check what to run
    const runType = process.env.RUN_TYPE || 'single';
    const teamName = process.env.TEAM_NAME || 'product-spec';

    switch (runType) {
      case 'multiple':
        await runMultipleExamples();
        break;
      case 'complex':
        await runComplexExamples();
        break;
      case 'semantic':
        await demonstrateSemanticConventions();
        break;
      case 'single':
      default:
        console.log(`🎯 Running single team: ${teamName}`);
        await runTeamWorkflow(teamName);
        break;
    }

    console.log('\n🎉 All examples completed successfully!');
    console.log('📈 Check your Langfuse dashboard to see the exported traces');
    console.log('🔗 Langfuse Dashboard: https://us.cloud.langfuse.com');
  } catch (error) {
    console.error('❌ Example failed:', error);
    process.exit(1);
  } finally {
    // Shutdown the integration
    console.log('🔄 Shutting down OpenTelemetry integration...');
    await integration.shutdown();
    console.log('✅ Shutdown complete');
  }
}

// Export functions for external use
export {
  config,
  integration,
  runTeamWorkflow,
  runMultipleExamples,
  runComplexExamples,
  demonstrateSemanticConventions,
  main,
};

// Run the example if this file is executed directly
if (require.main === module) {
  console.log('🚀 Starting Langfuse export example...');
  main().catch(console.error);
}
