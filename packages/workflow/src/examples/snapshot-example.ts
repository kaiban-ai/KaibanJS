#!/usr/bin/env tsx

import { Run } from '../run';
import { RUN_STATUS } from '../stores/runStore';
import { SnapshotManager, SnapshotUtils, withSnapshots } from '../snapshot';
import type { StepFlowEntry, Step, StepContext } from '../types';
import z from 'zod';

/**
 * Executable TSX file demonstrating the snapshot system
 * Run with: tsx snapshot-example.tsx
 */

// Create sample steps for demonstration
const createSampleStep = (
  id: string,
  description: string
): Step<{ data: string }, { result: string }> => ({
  id,
  description,
  inputSchema: z.object({ data: z.string() }),
  outputSchema: z.object({ result: z.string() }),
  execute: async (context: StepContext<{ data: string }>) => {
    console.log(`Executing step: ${id}`);
    await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate work
    return { result: `Processed: ${context.inputData.data}` };
  },
});

const step1 = createSampleStep('step1', 'First processing step');
const step2 = createSampleStep('step2', 'Second processing step');
const step3 = createSampleStep('step3', 'Final processing step');

// Create sample execution graph
const executionGraph: StepFlowEntry[] = [
  { type: 'step', step: step1 },
  { type: 'step', step: step2 },
  { type: 'step', step: step3 },
];

// Create a snapshot manager instance
const snapshotManager = new SnapshotManager(5); // Keep last 5 snapshots

async function main() {
  console.log('🚀 Starting Snapshot System Demo\n');

  // Example 1: Manual snapshot creation and restoration
  console.log('📸 Example 1: Manual Snapshot Creation');
  await manualSnapshotExample();
  console.log('\n' + '='.repeat(50) + '\n');

  // Example 2: Automatic snapshot creation
  console.log('⏰ Example 2: Automatic Snapshot Creation');
  await automaticSnapshotExample();
  console.log('\n' + '='.repeat(50) + '\n');

  // Example 3: Snapshot comparison and analysis
  console.log('🔍 Example 3: Snapshot Comparison');
  await snapshotAnalysisExample();
  console.log('\n' + '='.repeat(50) + '\n');

  // Example 4: Error recovery
  console.log('🛡️ Example 4: Error Recovery');
  await errorHandlingExample();
  console.log('\n' + '='.repeat(50) + '\n');

  // Example 5: Persistence and recovery
  console.log('💾 Example 5: Persistence and Recovery');
  await persistenceExample();
  console.log('\n' + '='.repeat(50) + '\n');

  // Example 6: Batch operations
  console.log('📦 Example 6: Batch Operations');
  await batchOperationsExample();
  console.log('\n' + '='.repeat(50) + '\n');

  console.log('✅ All examples completed successfully!');
}

// Example 1: Manual snapshot creation and restoration
async function manualSnapshotExample() {
  console.log('Creating a new workflow run...');

  const run = new Run({
    workflowId: 'manual-snapshot-workflow',
    runId: `run-${Date.now()}`,
    executionGraph,
    serializedStepGraph: [],
  });

  console.log(`Run created with ID: ${run.runId}`);

  // Create initial snapshot
  console.log('Creating initial snapshot...');
  const initialSnapshot = snapshotManager.createSnapshot(
    run.runId,
    run.store.getState()
  );
  console.log(
    `Initial snapshot created at: ${new Date(
      initialSnapshot.timestamp
    ).toISOString()}`
  );

  // Start the workflow
  console.log('Starting workflow execution...');
  const startPromise = run.start({ inputData: { data: 'test input' } });

  // Create snapshot during execution
  setTimeout(() => {
    console.log('Creating snapshot during execution...');
    const midExecutionSnapshot = snapshotManager.createSnapshot(
      run.runId,
      run.store.getState()
    );
    console.log(
      `Mid-execution snapshot created at: ${new Date(
        midExecutionSnapshot.timestamp
      ).toISOString()}`
    );
    console.log(`Current status: ${midExecutionSnapshot.status}`);
    console.log(
      `Steps completed: ${Object.keys(midExecutionSnapshot.stepResults).length}`
    );
  }, 200);

  // Wait for completion
  const result = await startPromise;
  console.log(`Workflow completed with status: ${result.status}`);

  // Create final snapshot
  const finalSnapshot = snapshotManager.createSnapshot(
    run.runId,
    run.store.getState()
  );
  console.log(
    `Final snapshot created at: ${new Date(
      finalSnapshot.timestamp
    ).toISOString()}`
  );

  // Compare snapshots
  const differences = SnapshotUtils.compareSnapshots(
    initialSnapshot,
    finalSnapshot
  );
  console.log('Differences between initial and final snapshots:');
  console.log(JSON.stringify(differences, null, 2));

  return { initialSnapshot, finalSnapshot, differences };
}

// Example 2: Automatic snapshot creation
async function automaticSnapshotExample() {
  console.log('Creating Run class with automatic snapshots...');

  // Create a Run class with automatic snapshots every 2 seconds
  const RunWithSnapshots = withSnapshots(Run, snapshotManager, 2000);

  const run = new RunWithSnapshots({
    workflowId: 'auto-snapshot-workflow',
    runId: `run-auto-${Date.now()}`,
    executionGraph,
    serializedStepGraph: [],
  });

  console.log(`Auto-snapshot run created with ID: ${run.runId}`);

  // Start the workflow
  console.log('Starting workflow with automatic snapshots...');
  const startPromise = run.start({ inputData: { data: 'auto test' } });

  // Monitor snapshots being created
  let snapshotCount = 0;
  const snapshotInterval = setInterval(() => {
    const latestSnapshot = snapshotManager.getLatestSnapshot(run.runId);
    if (latestSnapshot) {
      snapshotCount++;
      console.log(
        `Auto-snapshot #${snapshotCount} created at: ${new Date(
          latestSnapshot.timestamp
        ).toISOString()}`
      );
    }
  }, 1000);

  // Wait for completion
  await startPromise;
  clearInterval(snapshotInterval);

  // Get all snapshots
  const allSnapshots = snapshotManager.getAllSnapshots(run.runId);
  console.log(`Total auto-snapshots created: ${allSnapshots.length}`);

  // Clean up
  run.destroy?.();

  return { run, snapshots: allSnapshots };
}

// Example 3: Snapshot comparison and analysis
async function snapshotAnalysisExample() {
  console.log('Creating workflow for snapshot analysis...');

  const run = new Run({
    workflowId: 'analysis-workflow',
    runId: `run-analysis-${Date.now()}`,
    executionGraph,
    serializedStepGraph: [],
  });

  // Create baseline snapshot
  console.log('Creating baseline snapshot...');
  const baselineSnapshot = snapshotManager.createSnapshot(
    run.runId,
    run.store.getState()
  );

  // Simulate workflow progress
  console.log('Simulating workflow progress...');
  run.store.getState().setStatus(RUN_STATUS.RUNNING);
  run.store.getState().updateStepResult('step1', {
    status: 'completed',
    output: { result: 'Step 1 completed' },
  });

  const progressSnapshot = snapshotManager.createSnapshot(
    run.runId,
    run.store.getState()
  );

  // Simulate more progress
  run.store.getState().updateStepResult('step2', {
    status: 'completed',
    output: { result: 'Step 2 completed' },
  });
  run.store.getState().updateStepResult('step3', {
    status: 'running',
  });

  const finalSnapshot = snapshotManager.createSnapshot(
    run.runId,
    run.store.getState()
  );

  // Compare snapshots
  console.log('Comparing snapshots...');
  const baselineVsProgress = SnapshotUtils.compareSnapshots(
    baselineSnapshot,
    progressSnapshot
  );
  const progressVsFinal = SnapshotUtils.compareSnapshots(
    progressSnapshot,
    finalSnapshot
  );
  const baselineVsFinal = SnapshotUtils.compareSnapshots(
    baselineSnapshot,
    finalSnapshot
  );

  console.log('Baseline vs Progress differences:');
  console.log(JSON.stringify(baselineVsProgress, null, 2));

  console.log('Progress vs Final differences:');
  console.log(JSON.stringify(progressVsFinal, null, 2));

  // Validate snapshots
  console.log('Validating snapshots...');
  const isValid1 = SnapshotUtils.validateSnapshot(baselineSnapshot);
  const isValid2 = SnapshotUtils.validateSnapshot(progressSnapshot);
  const isValid3 = SnapshotUtils.validateSnapshot(finalSnapshot);

  console.log(`Baseline snapshot valid: ${isValid1}`);
  console.log(`Progress snapshot valid: ${isValid2}`);
  console.log(`Final snapshot valid: ${isValid3}`);

  return {
    baselineSnapshot,
    progressSnapshot,
    finalSnapshot,
    comparisons: { baselineVsProgress, progressVsFinal, baselineVsFinal },
    validations: { isValid1, isValid2, isValid3 },
  };
}

// Example 4: Error recovery
async function errorHandlingExample() {
  console.log('Creating workflow for error recovery demonstration...');

  const run = new Run({
    workflowId: 'error-recovery-workflow',
    runId: `run-error-${Date.now()}`,
    executionGraph,
    serializedStepGraph: [],
  });

  try {
    console.log('Creating pre-operation snapshot...');

    // Simulate a risky operation that might fail
    console.log('Simulating risky operation...');
    run.store.getState().setStatus(RUN_STATUS.RUNNING);
    run.store.getState().updateStepResult('risky-step', { status: 'running' });

    // Simulate an error
    console.log('Simulating operation failure...');
    throw new Error('Operation failed due to external dependency');
  } catch (error: any) {
    console.error('Operation failed:', error.message);

    // Restore from the last known good state
    const lastSnapshot = snapshotManager.getLatestSnapshot(run.runId);
    if (lastSnapshot) {
      console.log('Restoring from last known good snapshot...');
      snapshotManager.restoreFromSnapshot(
        run.runId,
        run.store.getState(),
        lastSnapshot
      );
      console.log('Successfully restored from snapshot');
      console.log(`Restored status: ${run.store.getState().status}`);
    } else {
      console.log('No snapshot available for recovery');
    }
  }

  return run;
}

// Example 5: Persistence and recovery
async function persistenceExample() {
  console.log('Creating workflow for persistence demonstration...');

  const run = new Run({
    workflowId: 'persistence-workflow',
    runId: `run-persistence-${Date.now()}`,
    executionGraph,
    serializedStepGraph: [],
  });

  // Simulate some workflow progress
  run.store.getState().setStatus(RUN_STATUS.RUNNING);
  run.store.getState().updateStepResult('step1', {
    status: 'completed',
    output: { result: 'Step 1 completed' },
  });

  // Create a snapshot
  console.log('Creating snapshot for persistence...');
  const snapshot = snapshotManager.createSnapshot(
    run.runId,
    run.store.getState()
  );

  // Simulate saving to database/file
  console.log('Simulating saving snapshot to storage...');
  const snapshotData = {
    runId: run.runId,
    workflowId: run.workflowId,
    snapshot: snapshotManager.exportSnapshot(snapshot),
    createdAt: new Date().toISOString(),
  };

  console.log('Snapshot data structure:');
  console.log(JSON.stringify(snapshotData, null, 2));

  // Simulate loading from database/file
  console.log('Simulating loading snapshot from storage...');
  const loadedSnapshot = snapshotManager.importSnapshot(snapshotData.snapshot);

  // Create a new run instance and restore from snapshot
  console.log('Creating new run instance and restoring from snapshot...');
  const newRun = new Run({
    workflowId: snapshotData.workflowId,
    runId: snapshotData.runId,
    executionGraph,
    serializedStepGraph: [],
  });

  snapshotManager.restoreFromSnapshot(
    newRun.runId,
    newRun.store.getState(),
    loadedSnapshot
  );

  console.log('Restoration completed successfully');
  console.log(`Restored run status: ${newRun.store.getState().status}`);
  console.log(
    `Restored step results: ${
      Object.keys(newRun.store.getState().stepResults).length
    }`
  );

  return { originalRun: run, restoredRun: newRun, snapshotData };
}

// Example 6: Batch operations
async function batchOperationsExample() {
  console.log('Creating multiple workflow runs for batch operations...');

  const runs = [
    new Run({
      workflowId: 'batch-workflow-1',
      runId: `run-batch-1-${Date.now()}`,
      executionGraph,
      serializedStepGraph: [],
    }),
    new Run({
      workflowId: 'batch-workflow-2',
      runId: `run-batch-2-${Date.now()}`,
      executionGraph,
      serializedStepGraph: [],
    }),
    new Run({
      workflowId: 'batch-workflow-3',
      runId: `run-batch-3-${Date.now()}`,
      executionGraph,
      serializedStepGraph: [],
    }),
  ];

  // Simulate progress on each run
  runs.forEach((run, index) => {
    run.store.getState().setStatus(RUN_STATUS.RUNNING);
    run.store.getState().updateStepResult(`step${index + 1}`, {
      status: 'completed',
      output: { result: `Batch step ${index + 1} completed` },
    });
  });

  // Create snapshots for all runs
  console.log('Creating snapshots for all runs...');
  const snapshots = runs.map((run) =>
    snapshotManager.createSnapshot(run.runId, run.store.getState())
  );

  console.log(`Created ${snapshots.length} snapshots`);

  // Export all snapshots
  console.log('Exporting all snapshots...');
  const exportedSnapshots = snapshots.map((snapshot) => ({
    runId: snapshot.runId,
    workflowId: snapshot.workflowId,
    data: snapshotManager.exportSnapshot(snapshot),
    size: snapshotManager.exportSnapshot(snapshot).length,
  }));

  console.log('Exported snapshots:');
  exportedSnapshots.forEach(({ runId, size }) => {
    console.log(`  ${runId}: ${size} bytes`);
  });

  // Clear all snapshots
  console.log('Clearing all snapshots from memory...');
  snapshotManager.clearAllSnapshots();

  // Import and restore all snapshots
  console.log('Importing and restoring all snapshots...');
  const restoredRuns = exportedSnapshots.map(({ runId, workflowId, data }) => {
    const snapshot = snapshotManager.importSnapshot(data);
    const run = new Run({
      workflowId,
      runId,
      executionGraph,
      serializedStepGraph: [],
    });
    snapshotManager.restoreFromSnapshot(
      run.runId,
      run.store.getState(),
      snapshot
    );
    return run;
  });

  console.log(`Successfully restored ${restoredRuns.length} runs`);

  return { originalRuns: runs, restoredRuns, exportedSnapshots };
}

// Run the main function
if (require.main === module) {
  main().catch(console.error);
}

export {
  main,
  manualSnapshotExample,
  automaticSnapshotExample,
  snapshotAnalysisExample,
  errorHandlingExample,
  persistenceExample,
  batchOperationsExample,
};
