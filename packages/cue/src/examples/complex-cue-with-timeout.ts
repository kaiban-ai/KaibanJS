import { z } from 'zod';
import { Cue } from '../cue';
import { CUE_STATUS } from '../stores/cueStore';

// Create a simple logging utility
const log = (message: string, data?: any) => {
  console.log(`\n[${new Date().toISOString()}] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
};

// Create a monitoring utility
const monitorCue = (cue: Cue<any, any, any>) => {
  // Monitor overall Cue status
  cue.watch((event) => {
    log(`Cue Status Update: ${event.type}`, event.data);
  });

  // Monitor block results
  const unsubscribe = cue.store.subscribe((state) => {
    // Log when a new block result is added
    const lastLog = state.logs[state.logs.length - 1];
    if (lastLog?.logType === 'BlockStatusUpdate') {
      log(`Block ${lastLog.blockId} Status: ${lastLog.blockStatus}`, {
        result: lastLog.blockResult,
        executionPath: state.executionPath,
      });
    }
  });

  return unsubscribe;
};

// Create a complex cue with various block patterns
const complexCue = Cue.createCue({
  id: 'complex-cue',
  inputSchema: z.object({
    initialValue: z.number(),
    shouldFail: z.boolean().optional(),
    shouldSuspend: z.boolean().optional(),
  }),
  outputSchema: z.object({
    finalResult: z.number(),
    executionPath: z.array(z.string()),
    blockResults: z.record(z.any()),
  }),
});

// 1. Initial processing block
const initialProcessBlock = Cue.createBlock({
  id: 'initial-process',
  inputSchema: z.object({
    initialValue: z.number(),
    shouldFail: z.boolean().optional(),
    shouldSuspend: z.boolean().optional(),
  }),
  outputSchema: z.number(),
  execute: async ({ inputData }) => {
    log('Executing initial process block', inputData);
    await new Promise((resolve) => setTimeout(resolve, 3000)); // Simulating API call
    return inputData.initialValue * 2;
  },
});

// 2. Parallel processing blocks
const parallelBlock1 = Cue.createBlock({
  id: 'parallel-1',
  inputSchema: z.number(),
  outputSchema: z.number(),
  execute: async ({ inputData }) => {
    log('Executing parallel block 1', inputData);
    await new Promise((resolve) => setTimeout(resolve, 3000)); // Simulating API call
    return inputData + 10;
  },
});

const parallelBlock2 = Cue.createBlock({
  id: 'parallel-2',
  inputSchema: z.number(),
  outputSchema: z.number(),
  execute: async ({ inputData }) => {
    log('Executing parallel block 2', inputData);
    await new Promise((resolve) => setTimeout(resolve, 3000)); // Simulating API call
    return inputData * 3;
  },
});

// 3. Conditional block
const conditionalBlock = Cue.createBlock({
  id: 'conditional',
  inputSchema: z.object({
    value: z.number(),
    shouldFail: z.boolean().optional(),
  }),
  outputSchema: z.number(),
  execute: async ({ inputData }) => {
    log('Executing conditional block', inputData);
    await new Promise((resolve) => setTimeout(resolve, 3000)); // Simulating API call
    if (inputData.shouldFail) {
      throw new Error('Conditional block failed as requested');
    }
    return inputData.value + 5;
  },
});

// 4. Loop block
const loopBlock = Cue.createBlock({
  id: 'loop',
  inputSchema: z.number(),
  outputSchema: z.number(),
  execute: async ({ inputData }) => {
    log('Executing loop block', inputData);
    await new Promise((resolve) => setTimeout(resolve, 3000)); // Simulating API call
    return inputData - 2;
  },
});

// 5. Suspendable block
const suspendableBlock = Cue.createBlock({
  id: 'suspendable',
  inputSchema: z.object({
    value: z.number(),
    shouldSuspend: z.boolean().optional(),
  }),
  outputSchema: z.number(),
  execute: async ({ inputData, suspend }) => {
    log('Executing suspendable block', inputData);
    await new Promise((resolve) => setTimeout(resolve, 3000)); // Simulating API call
    if (inputData.shouldSuspend) {
      await suspend({ message: 'Block suspended as requested' });
    }
    return inputData.value * 2;
  },
});

// 6. Final processing block
const finalProcessBlock = Cue.createBlock({
  id: 'final-process',
  inputSchema: z.any(),
  outputSchema: z.object({
    finalResult: z.number(),
    executionPath: z.array(z.string()),
    blockResults: z.record(z.any()),
  }),
  execute: async ({ getBlockResult }) => {
    log('Executing final process block');
    await new Promise((resolve) => setTimeout(resolve, 3000)); // Simulating API call
    const results = {
      initial:
        (getBlockResult(initialProcessBlock) as { initialValue: number })
          .initialValue * 2,
      parallel1: getBlockResult(parallelBlock1) as number,
      parallel2: getBlockResult(parallelBlock2) as number,
      conditional:
        (getBlockResult(conditionalBlock) as { value: number }).value + 5,
      loop: getBlockResult(loopBlock) as number,
      suspendable:
        (getBlockResult(suspendableBlock) as { value: number }).value * 2,
    };

    return {
      finalResult: Object.values(results).reduce((sum, val) => sum + val, 0),
      executionPath: [
        'initial',
        'parallel',
        'conditional',
        'loop',
        'suspendable',
        'final',
      ],
      blockResults: results,
    };
  },
});

// Build the complex flow
complexCue
  .then(initialProcessBlock)
  .parallel([parallelBlock1, parallelBlock2])
  .then(conditionalBlock)
  .dowhile(loopBlock, async ({ getBlockResult }) => {
    const result = getBlockResult(loopBlock);
    return result > 0;
  })
  .then(suspendableBlock)
  .then(finalProcessBlock);

// Set up monitoring
const unsubscribe = monitorCue(complexCue);

// Test cases
async function runTestCases() {
  try {
    // Test case 1: Normal execution
    log('\n=== Test Case 1: Normal Execution ===');
    const result1 = await complexCue.start({
      initialValue: 10,
      shouldFail: false,
      shouldSuspend: false,
    });
    log('Test Case 1 Result', result1);

    // Test case 2: With failure
    log('\n=== Test Case 2: With Failure ===');
    try {
      await complexCue.start({
        initialValue: 10,
        shouldFail: true,
        shouldSuspend: false,
      });
    } catch (error) {
      log('Test Case 2 Error', error);
    }

    // Test case 3: With suspension
    log('\n=== Test Case 3: With Suspension ===');
    const result3 = await complexCue.start({
      initialValue: 10,
      shouldFail: false,
      shouldSuspend: true,
    });
    log('Test Case 3 Result', result3);

    // Example of accessing store state directly
    const finalState = complexCue.store.getState();
    log('Final Store State', {
      status: finalState.status,
      totalBlocks: finalState.blockResults.size,
      executionPath: finalState.executionPath,
      logs: finalState.logs.map((log) => ({
        type: log.logType,
        description: log.logDescription,
        timestamp: new Date(log.timestamp).toISOString(),
      })),
    });
  } finally {
    // Clean up subscription
    unsubscribe();
  }
}

// Run the test cases
runTestCases().catch(console.error);
