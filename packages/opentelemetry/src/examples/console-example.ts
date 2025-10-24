import { createOpenTelemetryIntegration } from '../index';
import { getTeamByName, getAvailableTeams } from './shared/teams';

/**
 * Console Export Example
 *
 * This example demonstrates how to use OpenTelemetry with console export only.
 * Perfect for development and debugging workflows.
 *
 * Features:
 * - Console export for immediate feedback
 * - Multiple team complexity levels
 * - Simple configuration
 * - No external dependencies
 */

// Configuration for console-only export
const config = {
  enabled: true,
  sampling: {
    rate: 1.0,
    strategy: 'always' as const,
  },
  attributes: {
    includeSensitiveData: false,
    customAttributes: {
      'service.name': 'kaibanjs-console-example',
      'service.version': '1.0.0',
      'service.environment': 'development',
    },
  },
  exporters: {
    console: true, // Only console export
  },
};

// Create the integration
const integration = createOpenTelemetryIntegration(config);

/**
 * Run a specific team workflow
 */
async function runTeamWorkflow(teamName: string): Promise<any> {
  console.log(`🚀 Starting ${teamName} workflow with console export...`);

  try {
    // Get the team
    const team = getTeamByName(teamName);

    // Integrate observability with the team
    integration.integrateWithTeam(team);

    console.log(`📊 Team: ${team.name}`);
    console.log(`👥 Agents: ${team.agents.length}`);
    console.log(`📋 Tasks: ${team.tasks.length}`);
    console.log(
      '🔍 Console export enabled - check the output below for traces'
    );

    // Start the workflow
    console.log('📊 Starting workflow...');
    const result = await team.start();

    console.log('✅ Workflow completed successfully!');
    console.log('📈 All traces have been exported to console');
    console.log('📊 Result summary:', {
      completedTasks: result.completedTasks?.length || 0,
      totalTasks: team.tasks.length,
      duration: result.duration || 'N/A',
    });

    return result;
  } catch (error) {
    console.error('❌ Workflow failed:', error);
    throw error;
  }
}

/**
 * Run multiple team examples
 */
async function runMultipleExamples() {
  console.log('🎯 Running multiple team examples with console export...');

  const examples = [
    { team: 'simple-data', description: 'Simple data processing' },
    { team: 'content-creation', description: 'Content creation workflow' },
    { team: 'resume-creation', description: 'Resume creation workflow' },
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
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

/**
 * Interactive team selection
 */
async function runInteractiveExample() {
  console.log('🎮 Interactive Team Selection');
  console.log('Available teams:');

  const availableTeams = getAvailableTeams();
  availableTeams.forEach((team, index) => {
    console.log(`  ${index + 1}. ${team.name} - ${team.description}`);
  });

  // For demo purposes, run the first team
  const selectedTeam = availableTeams[0];
  console.log(`\n🎯 Selected: ${selectedTeam.name}`);

  await runTeamWorkflow(selectedTeam.name);
}

/**
 * Main execution function
 */
async function main() {
  console.log('🔍 KaibanJS OpenTelemetry Console Export Example');
  console.log('================================================');

  try {
    // Check if specific team is requested via environment variable
    const requestedTeam = process.env.TEAM_NAME;

    if (requestedTeam) {
      console.log(`🎯 Running requested team: ${requestedTeam}`);
      await runTeamWorkflow(requestedTeam);
    } else if (process.env.RUN_MULTIPLE === 'true') {
      await runMultipleExamples();
    } else {
      await runInteractiveExample();
    }
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
  runInteractiveExample,
  main,
};

// Run the example if this file is executed directly
if (require.main === module) {
  console.log('🚀 Starting console export example...');
  main().catch(console.error);
}
