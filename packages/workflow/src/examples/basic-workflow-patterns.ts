import { createStep, createWorkflow } from '../';
import { z } from 'zod';

// ============================================================================
// BASIC WORKFLOW PATTERNS EXAMPLE
// ============================================================================

// Step 1: Add two numbers
const addStep = createStep({
  id: 'add',
  inputSchema: z.object({ a: z.number(), b: z.number() }),
  outputSchema: z.number(),
  execute: async ({ inputData }) => {
    const { a, b } = inputData as { a: number; b: number };
    console.log(`Adding ${a} + ${b} = ${a + b}`);
    return a + b;
  },
});

// Step 2: Multiply by a factor
const multiplyStep = createStep({
  id: 'multiply',
  inputSchema: z.number(),
  outputSchema: z.number(),
  execute: async ({ inputData, getInitData }) => {
    const sum = inputData as number;
    const { a, b } = getInitData() as { a: number; b: number };
    const result = sum * a * b;
    console.log(`Multiplying ${sum} * ${a} * ${b} = ${result}`);
    return result;
  },
});

// Step 3: Process individual items
const processItemStep = createStep({
  id: 'process-item',
  inputSchema: z.number(),
  outputSchema: z.number(),
  execute: async ({ inputData }) => {
    const item = inputData as number;
    const result = item * 2;
    console.log(`Processing item ${item} -> ${result}`);
    return result;
  },
});

// Step 4: Double a number
const doubleStep = createStep({
  id: 'double',
  inputSchema: z.number(),
  outputSchema: z.number(),
  execute: async ({ inputData }) => {
    const num = inputData as number;
    const result = num * 2;
    console.log(`Doubling ${num} -> ${result}`);
    return result;
  },
});

// Step 5: Increment a number
const incrementStep = createStep({
  id: 'increment',
  inputSchema: z.number(),
  outputSchema: z.number(),
  execute: async ({ inputData }) => {
    const num = inputData as number;
    const result = num + 1;
    console.log(`Incrementing ${num} -> ${result}`);
    return result;
  },
});

// Step 6: Sum parallel results
const sumParallelResultsStep = createStep({
  id: 'sum-results',
  inputSchema: z.any(),
  outputSchema: z.number(),
  execute: async ({ getStepResult }): Promise<number> => {
    const result1 = getStepResult('parallel1') as number;
    const result2 = getStepResult('parallel2') as number;
    const sum = result1 + result2;
    console.log(`Summing parallel results ${result1} + ${result2} = ${sum}`);
    return sum;
  },
});

// Step 7: Parallel step 1
const parallelStep1 = createStep({
  id: 'parallel1',
  inputSchema: z.number(),
  outputSchema: z.number(),
  execute: async ({ inputData }) => {
    const num = inputData as number;
    const result = num * 2;
    console.log(`Parallel step 1: ${num} * 2 = ${result}`);
    return result;
  },
});

// Step 8: Parallel step 2
const parallelStep2 = createStep({
  id: 'parallel2',
  inputSchema: z.number(),
  outputSchema: z.number(),
  execute: async ({ inputData }) => {
    const num = inputData as number;
    const result = num * 3;
    console.log(`Parallel step 2: ${num} * 3 = ${result}`);
    return result;
  },
});

// Step 9: Even number processor
const evenStep = createStep({
  id: 'even',
  inputSchema: z.number(),
  outputSchema: z.string(),
  execute: async ({ inputData }) => {
    const num = inputData as number;
    const result = `even: ${num}`;
    console.log(`Even step processing: ${result}`);
    return result;
  },
});

// Step 10: Odd number processor
const oddStep = createStep({
  id: 'odd',
  inputSchema: z.number(),
  outputSchema: z.string(),
  execute: async ({ inputData }) => {
    const num = inputData as number;
    const result = `odd: ${num}`;
    console.log(`Odd step processing: ${result}`);
    return result;
  },
});

// ============================================================================
// WORKFLOW DEFINITIONS
// ============================================================================

// 1. Sequential Workflow (then)
const createSequentialWorkflow = () => {
  const workflow = createWorkflow({
    id: 'sequential-workflow',
    inputSchema: z.object({ a: z.number(), b: z.number() }),
    outputSchema: z.number(),
  });

  workflow.then(addStep).then(multiplyStep);
  workflow.commit();

  return workflow;
};

// 2. Parallel Workflow
const createParallelWorkflow = () => {
  const workflow = createWorkflow({
    id: 'parallel-workflow',
    inputSchema: z.number(),
    outputSchema: z.number(),
  });

  workflow
    .parallel([parallelStep1, parallelStep2])
    .then(sumParallelResultsStep);
  workflow.commit();

  return workflow;
};

// 3. Conditional Workflow (branch)
const createConditionalWorkflow = () => {
  const workflow = createWorkflow({
    id: 'conditional-workflow',
    inputSchema: z.number(),
    outputSchema: z.string(),
  });

  workflow.branch([
    [async ({ inputData }) => (inputData as number) % 2 === 0, evenStep],
    [async () => true, oddStep], // fallback
  ]);
  workflow.commit();

  return workflow;
};

// 4. Foreach Workflow
const createForeachWorkflow = () => {
  const workflow = createWorkflow({
    id: 'foreach-workflow',
    inputSchema: z.array(z.number()),
    outputSchema: z.array(z.number()),
  });

  workflow.foreach(processItemStep, { concurrency: 2 });
  workflow.commit();

  return workflow;
};

// 5. Nested Workflow
const createNestedWorkflow = () => {
  // Create nested workflow
  const nestedWorkflow = createWorkflow({
    id: 'nested-workflow',
    inputSchema: z.number(),
    outputSchema: z.number(),
  });

  nestedWorkflow.then(doubleStep).then(incrementStep);
  nestedWorkflow.commit();

  // Create main workflow that uses nested workflow
  const mainWorkflow = createWorkflow({
    id: 'main-workflow',
    inputSchema: z.object({ a: z.number(), b: z.number() }),
    outputSchema: z.number(),
  });

  mainWorkflow.then(addStep).then(nestedWorkflow);
  mainWorkflow.commit();

  return mainWorkflow;
};

// 6. Sequential Workflow with Parallel Steps
const createSequentialWithParallelWorkflow = () => {
  const workflow = createWorkflow({
    id: 'sequential-with-parallel-workflow',
    inputSchema: z.object({ a: z.number(), b: z.number() }),
    outputSchema: z.number(),
  });

  workflow
    .then(addStep)
    .parallel([parallelStep1, parallelStep2])
    .then(sumParallelResultsStep);
  workflow.commit();

  return workflow;
};

const createSequentialWithBranchWorkflow = () => {
  const workflow = createWorkflow({
    id: 'sequential-with-branch-workflow',
    inputSchema: z.object({ a: z.number(), b: z.number() }),
    outputSchema: z.string(),
  });

  workflow.then(addStep).branch([
    [async ({ inputData }) => (inputData as number) % 2 === 0, evenStep],
    [async () => true, oddStep], // fallback
  ]);

  workflow.commit();

  return workflow;
};

// ============================================================================
// EXAMPLE EXECUTION
// ============================================================================

const log = (message: string, data?: any) => {
  console.log(`\n[${new Date().toISOString()}] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
};

const runSequentialExample = async () => {
  log('=== SEQUENTIAL WORKFLOW EXAMPLE ===');
  const workflow = createSequentialWorkflow();
  const run = workflow.createRun();

  const result = await run.start({ inputData: { a: 2, b: 3 } });

  log('Sequential workflow result:', result);
  // Expected: (2+3) * 2 * 3 = 30
};

const runParallelExample = async () => {
  log('=== PARALLEL WORKFLOW EXAMPLE ===');
  const workflow = createParallelWorkflow();
  const run = workflow.createRun();

  const result = await run.start({ inputData: 2 });

  log('Parallel workflow result:', result);
  // Expected: (2*2) + (2*3) = 10
};

const runConditionalExample = async () => {
  log('=== CONDITIONAL WORKFLOW EXAMPLE ===');
  const workflow = createConditionalWorkflow();

  // Test even number
  const run1 = workflow.createRun();
  const result1 = await run1.start({ inputData: 4 });
  log('Conditional workflow (even) result:', result1);

  // Test odd number
  const run2 = workflow.createRun();
  const result2 = await run2.start({ inputData: 3 });
  log('Conditional workflow (odd) result:', result2);
};

const runForeachExample = async () => {
  log('=== FOREACH WORKFLOW EXAMPLE ===');
  const workflow = createForeachWorkflow();
  const run = workflow.createRun();

  const result = await run.start({ inputData: [1, 2, 3, 4, 5] });

  log('Foreach workflow result:', result);
  // Expected: [2, 4, 6, 8, 10]
};

const runNestedExample = async () => {
  log('=== NESTED WORKFLOW EXAMPLE ===');
  const workflow = createNestedWorkflow();
  const run = workflow.createRun();

  const result = await run.start({ inputData: { a: 2, b: 3 } });

  log('Nested workflow result:', result);
  // Expected: (2+3) -> double(5) -> increment(10) = 11
};

const runSequentialWithParallelExample = async () => {
  log('=== SEQUENTIAL WITH PARALLEL WORKFLOW EXAMPLE ===');
  const workflow = createSequentialWithParallelWorkflow();
  const run = workflow.createRun();

  const result = await run.start({ inputData: { a: 2, b: 3 } });
  log('Sequential with parallel workflow result:', result);
  // Expected: (2+3) -> parallel(2*2, 2*3) -> sum(10) = 10
};

const runSequentialWithBranchExample = async () => {
  log('=== SEQUENTIAL WITH BRANCH WORKFLOW EXAMPLE ===');
  const workflow = createSequentialWithBranchWorkflow();
  const run = workflow.createRun();

  const result = await run.start({ inputData: { a: 3, b: 3 } });
  log('Sequential with branch workflow result:', result);
};

const main = async () => {
  try {
    await runSequentialExample();
    await runParallelExample();
    await runConditionalExample();
    await runForeachExample();
    await runNestedExample();
    await runSequentialWithParallelExample();
    await runSequentialWithBranchExample();
    log('=== ALL EXAMPLES COMPLETED SUCCESSFULLY ===');
  } catch (error) {
    console.error('Error running examples:', error);
  }
};

// Export for use in tests or other modules
export {
  main,
  createSequentialWorkflow,
  createParallelWorkflow,
  createConditionalWorkflow,
  createForeachWorkflow,
  createNestedWorkflow,
  createSequentialWithParallelWorkflow,
  createSequentialWithBranchWorkflow,
};

// Run the example if this file is executed directly
if (require.main === module) {
  main();
}
