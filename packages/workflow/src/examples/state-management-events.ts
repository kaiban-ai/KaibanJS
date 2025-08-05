import { createStep, createWorkflow } from '../';
import { z } from 'zod';

// ============================================================================
// STATE MANAGEMENT AND EVENTS EXAMPLE
// ============================================================================

// Step 1: Process user data
const userStep = createStep({
  id: 'user',
  inputSchema: z.object({ userId: z.string() }),
  outputSchema: z.object({
    user: z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
    }),
  }),
  execute: async ({ inputData }) => {
    const { userId } = inputData as { userId: string };
    console.log(`Processing user: ${userId}`);

    // Simulate some processing time
    await new Promise((resolve) => setTimeout(resolve, 100));

    return {
      user: {
        id: userId,
        name: 'John Doe',
        email: 'john@example.com',
      },
    };
  },
});

// Step 2: Process profile data
const profileStep = createStep({
  id: 'profile',
  inputSchema: z.object({
    profile: z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
    }),
  }),
  outputSchema: z.object({
    profile: z.object({
      name: z.string(),
      email: z.string(),
      displayName: z.string(),
    }),
  }),
  execute: async ({ inputData }) => {
    const { profile } = inputData as {
      profile: { id: string; name: string; email: string };
    };
    console.log(`Processing profile for: ${profile.name}`);

    // Simulate some processing time
    await new Promise((resolve) => setTimeout(resolve, 150));

    return {
      profile: {
        name: profile.name,
        email: profile.email,
        displayName: `@${profile.name.toLowerCase()}`,
      },
    };
  },
});

// Step 3: Validate data
const validationStep = createStep({
  id: 'validation',
  inputSchema: z.object({
    profile: z.object({
      name: z.string(),
      email: z.string(),
      displayName: z.string(),
    }),
  }),
  outputSchema: z.object({
    isValid: z.boolean(),
    errors: z.array(z.string()),
  }),
  execute: async ({ inputData }) => {
    const { profile } = inputData as {
      profile: { name: string; email: string; displayName: string };
    };
    console.log(`Validating profile: ${profile.displayName}`);

    const errors: string[] = [];

    if (profile.name.length < 2) {
      errors.push('Name too short');
    }

    if (!profile.email.includes('@')) {
      errors.push('Invalid email format');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },
});

// Step 4: Suspendable approval step
const approvalStep = createStep({
  id: 'approval',
  inputSchema: z.object({
    isValid: z.boolean(),
    errors: z.array(z.string()),
  }),
  outputSchema: z.object({ approved: z.boolean() }),
  resumeSchema: z.object({ approved: z.boolean() }),
  suspendSchema: z.object({ reason: z.string() }),
  execute: async ({ inputData, suspend, isResuming, resumeData }) => {
    const { isValid, errors } = inputData as {
      isValid: boolean;
      errors: string[];
    };

    if (isResuming) {
      console.log(`Resuming approval with decision: ${resumeData.approved}`);
      return { approved: resumeData.approved };
    }

    if (!isValid) {
      console.log(
        `Suspending approval due to validation errors: ${errors.join(', ')}`
      );
      await suspend({ reason: 'validation_failed' });
      return { approved: false };
    }

    // Simulate manual approval requirement
    console.log('Suspending for manual approval');
    await suspend({ reason: 'requires_manual_approval' });
    return { approved: false };
  },
});

// ============================================================================
// WORKFLOW DEFINITION
// ============================================================================

const createStateManagementWorkflow = () => {
  const workflow = createWorkflow({
    id: 'state-management-workflow',
    inputSchema: z.object({ userId: z.string() }),
    outputSchema: z.object({
      profile: z.object({
        name: z.string(),
        email: z.string(),
        displayName: z.string(),
      }),
      isValid: z.boolean(),
      errors: z.array(z.string()),
      approved: z.boolean(),
    }),
  });

  workflow
    .then(userStep)
    .map(async ({ getStepResult }) => {
      const userResult = getStepResult(userStep.id) as any;
      return {
        profile: {
          id: userResult.user.id,
          name: userResult.user.name,
          email: userResult.user.email,
        },
      };
    })
    .then(profileStep)
    .then(validationStep)
    .then(approvalStep);

  workflow.commit();

  return workflow;
};

// ============================================================================
// STATE MONITORING FUNCTIONS
// ============================================================================

const log = (message: string, data?: any) => {
  console.log(`\n[${new Date().toISOString()}] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
};

// Monitor workflow state changes
const monitorWorkflowState = (run: any) => {
  const states: string[] = [];

  const unsubscribe = run.watch((event: any) => {
    if (event.payload.workflowState?.status) {
      const status = event.payload.workflowState.status;
      states.push(status);
      log(`Workflow status changed to: ${status}`);
    }
  });

  return { unsubscribe, states };
};

// Monitor step status changes
const monitorStepStatus = (run: any) => {
  const stepEvents: Array<{
    stepId: string;
    status: string;
    timestamp: number;
  }> = [];

  const unsubscribe = run.watch((event: any) => {
    if (event.payload.stepId && event.payload.stepStatus) {
      const stepEvent = {
        stepId: event.payload.stepId,
        status: event.payload.stepStatus,
        timestamp: event.timestamp,
      };
      stepEvents.push(stepEvent);
      log(`Step ${stepEvent.stepId} status: ${stepEvent.status}`);
    }
  });

  return { unsubscribe, stepEvents };
};

// Monitor step results
const monitorStepResults = (run: any) => {
  const results: Record<string, any> = {};

  const unsubscribe = run.watch((event: any) => {
    if (event.payload.stepId && event.payload.stepResult?.output) {
      results[event.payload.stepId] = event.payload.stepResult.output;
      log(
        `Step ${event.payload.stepId} completed with result:`,
        event.payload.stepResult.output
      );
    }
  });

  return { unsubscribe, results };
};

// Monitor all events
const monitorAllEvents = (run: any) => {
  const allEvents: any[] = [];

  const unsubscribe = run.watch((event: any) => {
    allEvents.push(event);
    log(`Event received:`, {
      type: event.type,
      stepId: event.payload.stepId,
      stepStatus: event.payload.stepStatus,
      workflowStatus: event.payload.workflowState?.status,
    });
  });

  return { unsubscribe, allEvents };
};

// ============================================================================
// EXAMPLE EXECUTION
// ============================================================================

const runStateManagementExample = async () => {
  log('=== STATE MANAGEMENT AND EVENTS EXAMPLE ===');

  const workflow = createStateManagementWorkflow();
  const run = workflow.createRun({ runId: 'state-management-example' });

  // Set up monitoring
  const workflowMonitor = monitorWorkflowState(run);
  const stepMonitor = monitorStepStatus(run);
  const resultsMonitor = monitorStepResults(run);
  const allEventsMonitor = monitorAllEvents(run);

  log('Starting workflow execution...');

  try {
    const result = await run.start({ inputData: { userId: '123' } });

    log('Workflow execution completed:', result);
    log('Final workflow states:', workflowMonitor.states);
    log('Step events:', stepMonitor.stepEvents);
    log('Step results:', resultsMonitor.results);
    log('Total events received:', allEventsMonitor.allEvents.length);
  } catch (error) {
    log('Workflow execution failed:', error);
  } finally {
    // Clean up monitors
    workflowMonitor.unsubscribe();
    stepMonitor.unsubscribe();
    resultsMonitor.unsubscribe();
    allEventsMonitor.unsubscribe();
  }
};

const runSuspendResumeExample = async () => {
  log('=== SUSPEND AND RESUME EXAMPLE ===');

  const workflow = createStateManagementWorkflow();
  const run = workflow.createRun({ runId: 'suspend-resume-example' });

  // Set up monitoring
  const workflowMonitor = monitorWorkflowState(run);
  const stepMonitor = monitorStepStatus(run);

  log('Starting workflow execution (will suspend for approval)...');

  try {
    const result = await run.start({ inputData: { userId: '456' } });

    if (result.status === 'suspended') {
      log('Workflow suspended, resuming with approval...');

      // Resume the workflow with approval
      const resumeResult = await run.resume({
        step: 'approval',
        resumeData: { approved: true },
      });

      log('Resume result:', resumeResult);
    } else {
      log('Unexpected result:', result);
    }
  } catch (error) {
    log('Workflow execution failed:', error);
  } finally {
    // Clean up monitors
    workflowMonitor.unsubscribe();
    stepMonitor.unsubscribe();
  }
};

const runRealTimeMonitoringExample = async () => {
  log('=== REAL-TIME MONITORING EXAMPLE ===');

  const workflow = createStateManagementWorkflow();
  const run = workflow.createRun({ runId: 'realtime-monitoring-example' });

  // Set up comprehensive monitoring
  const allEventsMonitor = monitorAllEvents(run);

  // Start execution in background
  const executionPromise = run.start({ inputData: { userId: '789' } });

  // Monitor in real-time
  log('Monitoring workflow execution in real-time...');

  // Wait a bit to see some events
  await new Promise((resolve) => setTimeout(resolve, 500));

  log(`Events received so far: ${allEventsMonitor.allEvents.length}`);

  // Wait for completion
  const result = await executionPromise;

  log('Final result:', result);
  log('Total events captured:', allEventsMonitor.allEvents.length);

  // Show event timeline
  log('Event timeline:');
  allEventsMonitor.allEvents.forEach((event, index) => {
    const time = new Date(event.timestamp).toISOString();
    const stepInfo = event.payload.stepId ? ` (${event.payload.stepId})` : '';
    const status =
      event.payload.stepStatus || event.payload.workflowState?.status;
    console.log(
      `  ${index + 1}. ${time} - ${event.type}${stepInfo}: ${status}`
    );
  });

  allEventsMonitor.unsubscribe();
};

const main = async () => {
  try {
    await runStateManagementExample();
    await runSuspendResumeExample();
    await runRealTimeMonitoringExample();

    log('=== ALL STATE MANAGEMENT EXAMPLES COMPLETED SUCCESSFULLY ===');
  } catch (error) {
    console.error('Error running state management examples:', error);
  }
};

// Export for use in tests or other modules
export {
  main,
  createStateManagementWorkflow,
  monitorWorkflowState,
  monitorStepStatus,
  monitorStepResults,
  monitorAllEvents,
};

// Run the example if this file is executed directly
if (require.main === module) {
  main();
}
