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

const processCue = Cue.createCue({
  id: 'process-cue',
  inputSchema: z.number(),
  outputSchema: z.number(),
});

const doubleBlock = Cue.createBlock({
  id: 'double',
  inputSchema: z.number(),
  outputSchema: z.number(),
  execute: async ({ inputData }) => {
    log('Executing double block with input:', inputData);
    // Simulate some processing time
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return (inputData as number) * 2;
  },
});

processCue.then(doubleBlock);

// Create the main cue
const mainCue = Cue.createCue({
  id: 'main-cue',
  inputSchema: z.number(),
  outputSchema: z.number(),
});

// Create a block to handle nested cue results
const handleNestedResultsBlock = Cue.createBlock({
  id: 'handle-nested-results',
  inputSchema: z.any(),
  outputSchema: z.number(),
  execute: async ({ getBlockResult }) => {
    log('Handling nested results');
    const result1 = getBlockResult(processCue);
    const result2 = getBlockResult(processCue);
    return result1 + result2;
  },
});

// Flow: parallel(process-cue, process-cue) -> handle-nested-results
mainCue.parallel([processCue, processCue]).then(handleNestedResultsBlock);

// Set up monitoring for both cues
const unsubscribeMain = monitorCue(mainCue);
// const unsubscribeProcess = monitorCue(processCue);

// Test case: 2 -> parallel(double(2), double(2)) -> sum(4 + 4) = 8
log('Starting execution with input: 2');
const result = await mainCue.start(2);

log('Final Result', result);

// Example of accessing store state directly
const mainCueState = mainCue.store.getState();
log('Main Cue Final State', {
  status: mainCueState.status,
  totalBlocks: mainCueState.blockResults.size,
  executionPath: mainCueState.executionPath,
  logs: mainCueState.logs.map((log) => ({
    type: log.logType,
    description: log.logDescription,
    timestamp: new Date(log.timestamp).toISOString(),
  })),
});

// Clean up subscriptions
unsubscribeMain();
// unsubscribeProcess();
