# Basic Workflow Patterns Example

This example demonstrates the fundamental workflow patterns available in the @kaibanjs/workflow engine.

## Overview

The example showcases five core workflow patterns:

1. **Sequential Execution** - Steps executed one after another
2. **Parallel Execution** - Multiple steps executed simultaneously
3. **Conditional Branching** - Different paths based on conditions
4. **Foreach Loops** - Processing arrays with concurrency control
5. **Nested Workflows** - Workflows within workflows

## Running the Example

```bash
npx tsx src/examples/basic-workflow-patterns.ts
```

## Pattern Details

### 1. Sequential Workflow (then)

```typescript
workflow.then(addStep).then(multiplyStep);
```

- Executes steps in order: `addStep` → `multiplyStep`
- Each step receives the output of the previous step
- Example: `{a: 2, b: 3}` → `add(5)` → `multiply(30)`

### 2. Parallel Workflow

```typescript
workflow.parallel([parallelStep1, parallelStep2]).then(sumParallelResultsStep);
```

- Executes multiple steps simultaneously
- Results are combined in the next step
- Example: `2` → `parallel1(4)` + `parallel2(6)` → `sum(10)`

### 3. Conditional Workflow (branch)

```typescript
workflow.branch([
  [async ({ inputData }) => (inputData as number) % 2 === 0, evenStep],
  [async () => true, oddStep], // fallback
]);
```

- Evaluates conditions in order
- Executes the first matching condition
- Last condition serves as fallback
- Example: `4` → `evenStep("even: 4")`

### 4. Foreach Workflow

```typescript
workflow.foreach(processItemStep, { concurrency: 2 });
```

- Processes each item in an array
- Configurable concurrency for performance
- Example: `[1,2,3,4,5]` → `[2,4,6,8,10]`

### 5. Nested Workflow

```typescript
const nestedWorkflow = createWorkflow({...});
nestedWorkflow.then(doubleStep).then(incrementStep);

const mainWorkflow = createWorkflow({...});
mainWorkflow.then(addStep).then(nestedWorkflow);
```

- Workflows can contain other workflows as steps
- Enables complex workflow composition
- Example: `{a: 2, b: 3}` → `add(5)` → `nested(double(10) → increment(11))`

## Expected Output

```
[timestamp] === SEQUENTIAL WORKFLOW EXAMPLE ===
Adding 2 + 3 = 5
Multiplying 5 * 2 * 3 = 30
Sequential workflow result: { status: 'completed', result: 30 }

[timestamp] === PARALLEL WORKFLOW EXAMPLE ===
Parallel step 1: 2 * 2 = 4
Parallel step 2: 2 * 3 = 6
Summing parallel results 4 + 6 = 10
Parallel workflow result: { status: 'completed', result: 10 }

[timestamp] === CONDITIONAL WORKFLOW EXAMPLE ===
Even step processing: even: 4
Conditional workflow (even) result: { status: 'completed', result: 'even: 4' }
Odd step processing: odd: 3
Conditional workflow (odd) result: { status: 'completed', result: 'odd: 3' }

[timestamp] === FOREACH WORKFLOW EXAMPLE ===
Processing item 1 -> 2
Processing item 2 -> 4
Processing item 3 -> 6
Processing item 4 -> 8
Processing item 5 -> 10
Foreach workflow result: { status: 'completed', result: [2, 4, 6, 8, 10] }

[timestamp] === NESTED WORKFLOW EXAMPLE ===
Adding 2 + 3 = 5
Doubling 5 -> 10
Incrementing 10 -> 11
Nested workflow result: { status: 'completed', result: 11 }
```

## Key Concepts Demonstrated

- **Step Creation**: Using `createStep()` with input/output schemas
- **Workflow Definition**: Using `createWorkflow()` and chaining methods
- **Workflow Commitment**: Calling `commit()` to finalize workflow definition
- **Run Creation**: Using `createRun()` to create execution instances
- **Execution**: Using `run.start()` to execute workflows
- **Data Flow**: How data flows between steps and workflows
- **Error Handling**: Built-in error handling and status reporting

## Next Steps

After understanding these basic patterns, explore:

- [State Management and Events](./state-management-events.md)
- [Streaming Workflows](./streaming-workflows.md)
- [Advanced Patterns](./advanced-patterns.md)
