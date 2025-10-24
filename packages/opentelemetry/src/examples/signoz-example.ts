import { createOpenTelemetryIntegration } from '../index';
import {
  getTeamByName,
  getAvailableTeams as _getAvailableTeams,
} from './shared/teams';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * SigNoz Export Example
 *
 * This example demonstrates how to export KaibanJS traces to SigNoz
 * using the OTLP protocol with proper semantic conventions.
 *
 * Features:
 * - OTLP export to SigNoz
 * - KaibanJS semantic conventions (kaiban.llm.*)
 * - Environment variable configuration
 * - Multiple team complexity levels
 * - Error handling and retry logic
 *
 * Setup:
 * 1. Set SIGNOZ_ACCESS_TOKEN environment variable
 * 2. Ensure OPENAI_API_KEY is set
 * 3. Run: npm run example:signoz
 */

// Configuration for SigNoz export
const config = {
  enabled: true,
  sampling: {
    rate: 1.0,
    strategy: 'always' as const,
  },
  attributes: {
    includeSensitiveData: false,
    customAttributes: {
      'service.name': 'kaibanjs-signoz-service',
      'service.version': '1.0.0',
      'service.environment': process.env.NODE_ENV || 'development',
    },
  },
  exporters: {
    console: true, // Keep console output for debugging
    otlp: {
      endpoint: 'https://ingest.us.signoz.cloud:443',
      protocol: 'grpc' as const,
      headers: {
        'signoz-access-token': process.env.SIGNOZ_ACCESS_TOKEN || '',
      },
      serviceName: 'kaibanjs-signoz-service',
      timeout: 30000,
    },
  },
};

// Create the integration
const integration = createOpenTelemetryIntegration(config);

/**
 * Validate environment variables
 */
function validateEnvironment() {
  const requiredVars = ['SIGNOZ_ACCESS_TOKEN', 'OPENAI_API_KEY'];
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
 * Run a specific team workflow with SigNoz export
 */
async function runTeamWorkflow(teamName: string): Promise<any> {
  console.log(`🚀 Starting ${teamName} workflow with SigNoz export...`);

  try {
    // Get the team
    const team = getTeamByName(teamName);

    // Integrate observability with the team
    integration.integrateWithTeam(team);

    console.log(`📊 Team: ${team.getStore().getState().name}`);
    console.log(`👥 Agents: ${team.getStore().getState().agents.length}`);
    console.log(`📋 Tasks: ${team.getTasks().length}`);
    console.log(
      '🔍 Traces will be exported to SigNoz with kaiban.llm.* semantic conventions'
    );

    // Start the workflow
    console.log('📊 Starting workflow...');
    const startTime = Date.now();
    const result = await team.start();
    const duration = Date.now() - startTime;

    console.log('✅ Workflow completed successfully!');
    console.log('📈 Traces have been exported to SigNoz');
    console.log('📊 Result summary:', {
      completedTasks: result.stats?.taskCount || 0,
      totalTasks: team.getTasks().length,
      duration: `${duration}ms`,
      signozEndpoint: 'https://ingest.us.signoz.cloud',
    });

    return result;
  } catch (error) {
    console.error('❌ Workflow failed:', error);
    throw error;
  }
}

/**
 * Run multiple team examples with SigNoz export
 */
async function runMultipleExamples() {
  console.log('🎯 Running multiple team examples with SigNoz export...');

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
  console.log('🎯 Running complex team examples with SigNoz export...');

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
 * Demonstrate SigNoz-specific features
 */
async function demonstrateSigNozFeatures() {
  console.log('🎯 Demonstrating SigNoz-specific features...');

  const team = getTeamByName('simple-data');
  integration.integrateWithTeam(team);

  console.log('📊 This example will show:');
  console.log('  - Distributed tracing in SigNoz');
  console.log('  - Service map visualization');
  console.log('  - Performance metrics');
  console.log('  - Error tracking');
  console.log('  - Custom attributes and tags');

  await runTeamWorkflow('simple-data');
}

/**
 * Main execution function
 */
async function main() {
  console.log('🔍 KaibanJS OpenTelemetry SigNoz Export Example');
  console.log('================================================');

  try {
    // Validate environment
    validateEnvironment();

    // Check what to run
    const runType = process.env.RUN_TYPE || 'single';
    const teamName = process.env.TEAM_NAME || 'simple-data';

    switch (runType) {
      case 'multiple':
        await runMultipleExamples();
        break;
      case 'complex':
        await runComplexExamples();
        break;
      case 'signoz-features':
        await demonstrateSigNozFeatures();
        break;
      case 'single':
      default:
        console.log(`🎯 Running single team: ${teamName}`);
        await runTeamWorkflow(teamName);
        break;
    }

    console.log('\n🎉 All examples completed successfully!');
    console.log('📈 Check your SigNoz dashboard to see the exported traces');
    console.log('🔗 SigNoz Dashboard: https://us.signoz.cloud');
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
  demonstrateSigNozFeatures,
  main,
};

// Run the example if this file is executed directly
if (require.main === module) {
  console.log('🚀 Starting SigNoz export example...');
  main().catch(console.error);
}
