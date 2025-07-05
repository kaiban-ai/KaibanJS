import { createStep, createWorkflow } from '../';
import { z } from 'zod';

// ============================================================================
// STREAMING WORKFLOWS EXAMPLE
// ============================================================================

// Step 1: Process data with streaming updates
const dataProcessingStep = createStep({
  id: 'data-processing',
  inputSchema: z.object({ data: z.string() }),
  outputSchema: z.object({
    processed: z.string(),
    metadata: z.object({ length: z.number(), timestamp: z.string() }),
  }),
  execute: async ({ inputData }) => {
    const { data } = inputData as { data: string };
    console.log(`Processing data: ${data}`);

    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 200));

    return {
      processed: data.toUpperCase(),
      metadata: {
        length: data.length,
        timestamp: new Date().toISOString(),
      },
    };
  },
});

// Step 2: Validate processed data
const validationStep = createStep({
  id: 'validation',
  inputSchema: z.object({
    processed: z.string(),
    metadata: z.object({ length: z.number(), timestamp: z.string() }),
  }),
  outputSchema: z.object({ isValid: z.boolean(), score: z.number() }),
  execute: async ({ inputData }) => {
    const { processed } = inputData as {
      processed: string;
      metadata: { length: number; timestamp: string };
    };
    console.log(`Validating processed data: ${processed}`);

    // Simulate validation time
    await new Promise((resolve) => setTimeout(resolve, 150));

    const score = processed.length * 0.1;
    const isValid = score > 0.5;

    return {
      isValid,
      score,
    };
  },
});

// Step 3: Parallel processing steps
const parallelStep1 = createStep({
  id: 'parallel1',
  inputSchema: z.object({ data: z.string() }),
  outputSchema: z.object({ result: z.string() }),
  execute: async ({ inputData }) => {
    const { data } = inputData as { data: string };
    console.log(`Parallel step 1 processing: ${data}`);

    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 300));

    return { result: `processed_1_${data}` };
  },
});

const parallelStep2 = createStep({
  id: 'parallel2',
  inputSchema: z.object({ data: z.string() }),
  outputSchema: z.object({ result: z.string() }),
  execute: async ({ inputData }) => {
    const { data } = inputData as { data: string };
    console.log(`Parallel step 2 processing: ${data}`);

    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 250));

    return { result: `processed_2_${data}` };
  },
});

// Step 4: Combine parallel results
const combineStep = createStep({
  id: 'combine',
  inputSchema: z.any(),
  outputSchema: z.object({ combined: z.string(), count: z.number() }),
  execute: async ({ getStepResult }) => {
    const result1 = getStepResult('parallel1') as { result: string };
    const result2 = getStepResult('parallel2') as { result: string };

    console.log(`Combining results: ${result1.result} + ${result2.result}`);

    return {
      combined: `${result1.result}_${result2.result}`,
      count: 2,
    };
  },
});

// Step 5: Suspendable step for streaming demonstration
const suspendableStep = createStep({
  id: 'suspendable',
  inputSchema: z.object({ value: z.number() }),
  outputSchema: z.object({ result: z.number() }),
  resumeSchema: z.object({ continue: z.boolean(), value: z.number() }),
  suspendSchema: z.object({ reason: z.string() }),
  execute: async ({ inputData, suspend, isResuming, resumeData }) => {
    if (isResuming) {
      console.log(`Resuming with value: ${resumeData.value}`);
      return { result: resumeData.value * 2 };
    }

    const { value } = inputData as { value: number };

    if (value < 0) {
      console.log('Suspending due to negative value');
      await suspend({ reason: 'negative_value' });
      return { result: 0 };
    }

    return { result: value * 2 };
  },
});

// ============================================================================
// WORKFLOW DEFINITIONS
// ============================================================================

// 1. Basic Streaming Workflow
const createBasicStreamingWorkflow = () => {
  const workflow = createWorkflow({
    id: 'basic-streaming-workflow',
    inputSchema: z.object({ data: z.string() }),
    outputSchema: z.object({
      processed: z.string(),
      isValid: z.boolean(),
      score: z.number(),
    }),
  });

  workflow.then(dataProcessingStep).then(validationStep);
  workflow.commit();

  return workflow;
};

// 2. Parallel Streaming Workflow
const createParallelStreamingWorkflow = () => {
  const workflow = createWorkflow({
    id: 'parallel-streaming-workflow',
    inputSchema: z.object({ data: z.string() }),
    outputSchema: z.object({ combined: z.string(), count: z.number() }),
  });

  workflow.parallel([parallelStep1, parallelStep2]).then(combineStep);
  workflow.commit();

  return workflow;
};

// 3. Conditional Streaming Workflow
const createConditionalStreamingWorkflow = () => {
  const evenStep = createStep({
    id: 'even',
    inputSchema: z.number(),
    outputSchema: z.object({ result: z.string() }),
    execute: async ({ inputData }) => {
      const num = inputData as number;
      console.log(`Processing even number: ${num}`);
      return { result: `even_${num}` };
    },
  });

  const oddStep = createStep({
    id: 'odd',
    inputSchema: z.number(),
    outputSchema: z.object({ result: z.string() }),
    execute: async ({ inputData }) => {
      const num = inputData as number;
      console.log(`Processing odd number: ${num}`);
      return { result: `odd_${num}` };
    },
  });

  const workflow = createWorkflow({
    id: 'conditional-streaming-workflow',
    inputSchema: z.number(),
    outputSchema: z.object({ result: z.string() }),
  });

  workflow.branch([
    [async ({ inputData }) => (inputData as number) % 2 === 0, evenStep],
    [async () => true, oddStep],
  ]);
  workflow.commit();

  return workflow;
};

// 4. Suspendable Streaming Workflow
const createSuspendableStreamingWorkflow = () => {
  const workflow = createWorkflow({
    id: 'suspendable-streaming-workflow',
    inputSchema: z.object({ value: z.number() }),
    outputSchema: z.object({ result: z.number() }),
  });

  workflow.then(suspendableStep);
  workflow.commit();

  return workflow;
};

// ============================================================================
// STREAMING UTILITIES
// ============================================================================

const log = (message: string, data?: any) => {
  console.log(`\n[${new Date().toISOString()}] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
};

// Read stream and collect events
const readStream = async (stream: ReadableStream<any>) => {
  const events: any[] = [];
  const reader = stream.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      if (value !== undefined) {
        events.push(value);
        log('Stream event received:', {
          type: value.type,
          stepId: value.payload.stepId,
          stepStatus: value.payload.stepStatus,
          workflowStatus: value.payload.workflowState?.status,
        });
      }
    }
  } finally {
    reader.releaseLock();
  }

  return events;
};

// Process stream with custom logic
const processStreamWithCallback = async (
  stream: ReadableStream<any>,
  onEvent?: (event: any) => void
) => {
  const reader = stream.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      if (value !== undefined && onEvent) {
        onEvent(value);
      }
    }
  } finally {
    reader.releaseLock();
  }
};

// ============================================================================
// EXAMPLE EXECUTION
// ============================================================================

const runBasicStreamingExample = async () => {
  log('=== BASIC STREAMING WORKFLOW EXAMPLE ===');

  const workflow = createBasicStreamingWorkflow();
  const run = workflow.createRun({ runId: 'basic-streaming-example' });

  const { stream, getWorkflowState } = run.stream({
    inputData: { data: 'hello world' },
  });

  log('Starting streaming workflow...');

  const events = await readStream(stream);
  const finalResult = await getWorkflowState();

  log('Streaming completed');
  log('Total events received:', events.length);
  log('Final result:', finalResult);

  // Show event summary
  log('Event summary:');
  events.forEach((event, index) => {
    const stepInfo = event.payload.stepId ? ` (${event.payload.stepId})` : '';
    const status =
      event.payload.stepStatus || event.payload.workflowState?.status;
    console.log(`  ${index + 1}. ${event.type}${stepInfo}: ${status}`);
  });
};

const runParallelStreamingExample = async () => {
  log('=== PARALLEL STREAMING WORKFLOW EXAMPLE ===');

  const workflow = createParallelStreamingWorkflow();
  const run = workflow.createRun({ runId: 'parallel-streaming-example' });

  const { stream, getWorkflowState } = run.stream({
    inputData: { data: 'test' },
  });

  log('Starting parallel streaming workflow...');

  const events = await readStream(stream);
  const finalResult = await getWorkflowState();

  log('Parallel streaming completed');
  log('Total events received:', events.length);
  log('Final result:', finalResult);

  // Verify parallel execution
  const parallelEvents = events.filter(
    (event) =>
      event.payload.stepId === 'parallel1' ||
      event.payload.stepId === 'parallel2'
  );
  log('Parallel step events:', parallelEvents.length);
};

const runConditionalStreamingExample = async () => {
  log('=== CONDITIONAL STREAMING WORKFLOW EXAMPLE ===');

  const workflow = createConditionalStreamingWorkflow();

  // Test even number
  log('Testing with even number (4)...');
  const run1 = workflow.createRun({ runId: 'conditional-streaming-even' });
  const { stream: stream1, getWorkflowState: getState1 } = run1.stream({
    inputData: 4,
  });

  const events1 = await readStream(stream1);
  const result1 = await getState1();

  log('Even number result:', result1);
  log('Events for even number:', events1.length);

  // Test odd number
  log('Testing with odd number (3)...');
  const run2 = workflow.createRun({ runId: 'conditional-streaming-odd' });
  const { stream: stream2, getWorkflowState: getState2 } = run2.stream({
    inputData: 3,
  });

  const events2 = await readStream(stream2);
  const result2 = await getState2();

  log('Odd number result:', result2);
  log('Events for odd number:', events2.length);
};

const runSuspendableStreamingExample = async () => {
  log('=== SUSPENDABLE STREAMING WORKFLOW EXAMPLE ===');

  const workflow = createSuspendableStreamingWorkflow();
  const run = workflow.createRun({ runId: 'suspendable-streaming-example' });

  // Start with negative value to trigger suspension
  const { stream } = run.stream({ inputData: { value: -1 } });

  log('Starting suspendable streaming workflow...');

  // Read stream until suspension
  const events: any[] = [];
  const reader = stream.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      if (value !== undefined) {
        events.push(value);
        log('Stream event:', {
          type: value.type,
          stepId: value.payload.stepId,
          stepStatus: value.payload.stepStatus,
        });

        // Check if workflow is suspended
        if (value.payload.stepStatus === 'suspended') {
          log('Workflow suspended, resuming...');
          break;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  // Resume the workflow
  const resumeResult = await run.resume({
    step: 'suspendable',
    resumeData: { continue: true, value: 5 },
  });

  log('Resume result:', resumeResult);
  log('Total events before resume:', events.length);
};

const runCustomStreamProcessingExample = async () => {
  log('=== CUSTOM STREAM PROCESSING EXAMPLE ===');

  const workflow = createBasicStreamingWorkflow();
  const run = workflow.createRun({ runId: 'custom-streaming-example' });

  const { stream, getWorkflowState } = run.stream({
    inputData: { data: 'custom processing' },
  });

  log('Starting custom stream processing...');

  let stepCount = 0;
  let workflowStatus = '';

  await processStreamWithCallback(stream, (event) => {
    if (event.payload.stepId) {
      stepCount++;
      log(
        `Step ${stepCount}: ${event.payload.stepId} - ${event.payload.stepStatus}`
      );
    }

    if (event.payload.workflowState?.status) {
      workflowStatus = event.payload.workflowState.status;
      log(`Workflow status: ${workflowStatus}`);
    }
  });

  const finalResult = await getWorkflowState();

  log('Custom processing completed');
  log('Steps processed:', stepCount);
  log('Final workflow status:', workflowStatus);
  log('Final result:', finalResult);
};

const main = async () => {
  try {
    await runBasicStreamingExample();
    await runParallelStreamingExample();
    await runConditionalStreamingExample();
    await runSuspendableStreamingExample();
    await runCustomStreamProcessingExample();

    log('=== ALL STREAMING EXAMPLES COMPLETED SUCCESSFULLY ===');
  } catch (error) {
    console.error('Error running streaming examples:', error);
  }
};

// Export for use in tests or other modules
export {
  main,
  createBasicStreamingWorkflow,
  createParallelStreamingWorkflow,
  createConditionalStreamingWorkflow,
  createSuspendableStreamingWorkflow,
  readStream,
  processStreamWithCallback,
};

// Run the example if this file is executed directly
if (require.main === module) {
  main();
}
