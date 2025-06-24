// import { RunExecutionEngineWithQueue } from '../runExecutionEngineWithQueue';
// import { createRunStore } from '../stores/runStore';
// import { Step, StepContext } from '../types';
// import { z } from 'zod';

// // Example steps
// const step1: Step<{ name: string }, { greeting: string }> = {
//   id: 'step1',
//   inputSchema: z.object({ name: z.string() }),
//   outputSchema: z.object({ greeting: z.string() }),
//   execute: async (context: StepContext) => {
//     console.log('Executing step1...');
//     await new Promise((resolve) => setTimeout(resolve, 1000, undefined)); // Simulate work
//     return { greeting: `Hello, ${context.inputData.name}!` };
//   },
// };

// const step2: Step<{ greeting: string }, { message: string }> = {
//   id: 'step2',
//   inputSchema: z.object({ greeting: z.string() }),
//   outputSchema: z.object({ message: z.string() }),
//   execute: async (context: StepContext) => {
//     console.log('Executing step2...');
//     await new Promise((resolve) => setTimeout(resolve, 1500, undefined)); // Simulate work
//     return {
//       message: `${context.inputData.greeting} Welcome to the queue-based workflow!`,
//     };
//   },
// };

// const step3: Step<{ message: string }, { final: string }> = {
//   id: 'step3',
//   inputSchema: z.object({ message: z.string() }),
//   outputSchema: z.object({ final: z.string() }),
//   execute: async (context: StepContext) => {
//     console.log('Executing step3...');
//     await new Promise((resolve) => setTimeout(resolve, 800, undefined)); // Simulate work
//     return { final: `${context.inputData.message} Queue execution completed!` };
//   },
// };

// // Example with suspend/resume capability
// const suspendableStep: Step<{ data: string }, { processed: string }> = {
//   id: 'suspendableStep',
//   inputSchema: z.object({ data: z.string() }),
//   outputSchema: z.object({ processed: z.string() }),
//   resumeSchema: z.object({ step: z.string() }),
//   execute: async (context: StepContext) => {
//     console.log('Executing suspendableStep...');

//     if (context.isResuming) {
//       console.log('Resuming from:', context.resumeData);
//       return { processed: `Resumed: ${context.inputData.data}` };
//     }

//     // Simulate some work that might need to suspend
//     await new Promise((resolve) => setTimeout(resolve, 500, undefined));

//     // Simulate a condition that requires suspension
//     if (context.inputData.data.includes('suspend')) {
//       await context.suspend({ step: 'processing' });
//     }

//     return { processed: `Processed: ${context.inputData.data}` };
//   },
// };

// async function runQueueExample() {
//   console.log('=== Queue-Based Workflow Execution Example ===\n');

//   // Create the store and engine
//   const store = createRunStore();
//   const engine = new RunExecutionEngineWithQueue(store, 1); // Sequential execution

//   // Define the workflow graph
//   const workflowGraph = [
//     { type: 'step' as const, step: step1 },
//     { type: 'step' as const, step: step2 },
//     { type: 'step' as const, step: step3 },
//   ];

//   console.log('Starting workflow execution...');
//   console.log('Queue stats before execution:', engine.getQueueStats());

//   const startTime = Date.now();

//   // Execute the workflow
//   const result = await engine.execute({
//     workflowId: 'example-workflow',
//     runId: 'run-1',
//     graph: workflowGraph,
//     input: { name: 'World' },
//   });

//   const endTime = Date.now();
//   const executionTime = endTime - startTime;

//   console.log('\n=== Execution Results ===');
//   console.log('Status:', result.status);
//   if (result.status === 'completed') {
//     console.log('Result:', result.result);
//   } else if (result.status === 'failed') {
//     console.log('Error:', result.error);
//   }
//   console.log('Execution time:', executionTime, 'ms');
//   console.log('Queue stats after execution:', engine.getQueueStats());
//   console.log('Step results:', Object.keys(result.steps));
// }

// async function runSuspendResumeExample() {
//   console.log('\n=== Suspend/Resume Example ===\n');

//   const store = createRunStore();
//   const engine = new RunExecutionEngineWithQueue(store, 1);

//   const workflowGraph = [{ type: 'step' as const, step: suspendableStep }];

//   console.log('Starting suspendable workflow...');

//   // First execution - should suspend
//   const result1 = await engine.execute({
//     workflowId: 'suspend-workflow',
//     runId: 'run-1',
//     graph: workflowGraph,
//     input: { data: 'suspend-this-data' },
//   });

//   console.log('First execution result:', result1.status);

//   if (result1.status === 'suspended') {
//     console.log('Workflow suspended, resuming...');

//     // Resume the workflow
//     const result2 = await engine.execute({
//       workflowId: 'suspend-workflow',
//       runId: 'run-1',
//       graph: workflowGraph,
//       input: { data: 'suspend-this-data' },
//       resume: {
//         steps: ['suspendableStep'],
//         stepResults: result1.steps,
//         resumePayload: { step: 'processing' },
//         resumePath: [0],
//       },
//     });

//     console.log('Resume result:', result2.status);
//     if (result2.status === 'completed') {
//       console.log('Final result:', result2.result);
//     } else if (result2.status === 'failed') {
//       console.log('Final error:', result2.error);
//     }
//   }
// }

// async function runParallelExample() {
//   console.log('\n=== Parallel Execution Example ===\n');

//   const store = createRunStore();
//   const engine = new RunExecutionEngineWithQueue(store, 1);

//   // Create parallel steps
//   const parallelStep1: Step<{ input: string }, { output: string }> = {
//     id: 'parallel1',
//     inputSchema: z.object({ input: z.string() }),
//     outputSchema: z.object({ output: z.string() }),
//     execute: async (context: StepContext) => {
//       console.log('Executing parallel step 1...');
//       await new Promise((resolve) => setTimeout(resolve, 1000, undefined));
//       return { output: `Parallel 1: ${context.inputData.input}` };
//     },
//   };

//   const parallelStep2: Step<{ input: string }, { output: string }> = {
//     id: 'parallel2',
//     inputSchema: z.object({ input: z.string() }),
//     outputSchema: z.object({ output: z.string() }),
//     execute: async (context: StepContext) => {
//       console.log('Executing parallel step 2...');
//       await new Promise((resolve) => setTimeout(resolve, 1200, undefined));
//       return { output: `Parallel 2: ${context.inputData.input}` };
//     },
//   };

//   const workflowGraph = [
//     {
//       type: 'parallel' as const,
//       steps: [
//         { type: 'step' as const, step: parallelStep1 },
//         { type: 'step' as const, step: parallelStep2 },
//       ],
//     },
//   ];

//   console.log('Starting parallel execution...');
//   const startTime = Date.now();

//   const result = await engine.execute({
//     workflowId: 'parallel-workflow',
//     runId: 'run-1',
//     graph: workflowGraph,
//     input: { input: 'test data' },
//   });

//   const endTime = Date.now();
//   const executionTime = endTime - startTime;

//   console.log('Parallel execution result:', result.status);
//   if (result.status === 'completed') {
//     console.log('Parallel outputs:', result.result);
//   } else if (result.status === 'failed') {
//     console.log('Parallel error:', result.error);
//   }
//   console.log('Execution time:', executionTime, 'ms');
// }

// // Run all examples
// async function runAllExamples() {
//   try {
//     await runQueueExample();
//     await runSuspendResumeExample();
//     await runParallelExample();
//   } catch (error) {
//     console.error('Error running examples:', error);
//   }
// }

// // Export for use in other files
// export {
//   runQueueExample,
//   runSuspendResumeExample,
//   runParallelExample,
//   runAllExamples,
// };

// // Run if this file is executed directly
// if (require.main === module) {
//   runAllExamples();
// }
