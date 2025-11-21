# @kaibanjs/workflow Examples

This directory contains comprehensive examples demonstrating the capabilities of the @kaibanjs/workflow engine. Each example focuses on specific features and patterns.

## Quick Start

All examples can be run using `npx tsx`:

```bash
# Run all examples
npx tsx src/examples/basic-workflow-patterns.ts
npx tsx src/examples/state-management-events.ts
npx tsx src/examples/streaming-workflows.ts
```

## Examples Overview

### 1. [Basic Workflow Patterns](./basic-workflow-patterns.md)

**File**: `basic-workflow-patterns.ts`

Demonstrates the fundamental workflow patterns:

- **Sequential Execution** - Steps executed one after another
- **Parallel Execution** - Multiple steps executed simultaneously
- **Conditional Branching** - Different paths based on conditions
- **Foreach Loops** - Processing arrays with concurrency control
- **Nested Workflows** - Workflows within workflows

**Key Learning**: Understanding the core workflow building blocks and execution patterns.

```bash
npx tsx src/examples/basic-workflow-patterns.ts
```

### 2. [State Management and Events](./state-management-events.md)

**File**: `state-management-events.ts`

Shows how to monitor workflow execution in real-time:

- **Real-time State Monitoring** - Track workflow and step status changes
- **Event Subscription** - Subscribe to workflow events using `watch()`
- **Suspend and Resume** - Handle interactive workflows that require user input
- **Comprehensive Event Tracking** - Monitor all aspects of workflow execution

**Key Learning**: Building reactive applications that respond to workflow state changes.

```bash
npx tsx src/examples/state-management-events.ts
```

### 3. [Streaming Workflows](./streaming-workflows.md)

**File**: `streaming-workflows.ts`

Demonstrates streaming capabilities using ReadableStream:

- **Basic Streaming** - Simple workflow execution with real-time event streaming
- **Parallel Streaming** - Monitoring parallel step execution
- **Conditional Streaming** - Streaming with conditional branching
- **Suspendable Streaming** - Handling suspended workflows in streams
- **Custom Stream Processing** - Processing streams with custom logic

**Key Learning**: Building real-time applications with streaming workflow data.

```bash
npx tsx src/examples/streaming-workflows.ts
```

## Example Progression

The examples are designed to be consumed in order:

1. **Start with Basic Patterns** - Learn the fundamental concepts
2. **Move to State Management** - Understand monitoring and events
3. **Explore Streaming** - Build real-time applications

## Common Patterns Across Examples

### Workflow Creation Pattern

```typescript
const workflow = createWorkflow({
  id: 'my-workflow',
  inputSchema: z.object({
    /* input schema */
  }),
  outputSchema: z.object({
    /* output schema */
  }),
});

workflow.then(step1).then(step2);
workflow.commit();
```

### Step Creation Pattern

```typescript
const step = createStep({
  id: 'my-step',
  inputSchema: z.object({
    /* input schema */
  }),
  outputSchema: z.object({
    /* output schema */
  }),
  execute: async ({ inputData }) => {
    // Step logic here
    return result;
  },
});
```

### Execution Pattern

```typescript
const run = workflow.createRun();
const result = await run.start({
  inputData: {
    /* input data */
  },
});
```

### Monitoring Pattern

```typescript
const unsubscribe = run.watch((event) => {
  console.log('Event:', event);
});
```

### Streaming Pattern

```typescript
const { stream, getWorkflowState } = run.stream({
  inputData: {
    /* input data */
  },
});
const events = await readStream(stream);
const finalResult = await getWorkflowState();
```

## Key Concepts Demonstrated

### 1. Type Safety

- Zod schemas for input/output validation
- TypeScript integration for compile-time safety
- Runtime validation with detailed error messages

### 2. Execution Patterns

- Sequential execution with `.then()`
- Parallel execution with `.parallel()`
- Conditional execution with `.branch()`
- Loop execution with `.foreach()`, `.dowhile()`, `.dountil()`

### 3. Data Flow

- Data transformation with `.map()`
- Step result access with `getStepResult()`
- Initial data access with `getInitData()`

### 4. State Management

- Real-time event subscription
- Workflow and step status tracking
- Suspend and resume functionality

### 5. Streaming

- ReadableStream integration
- Real-time event processing
- Custom stream handling

## Expected Output Structure

All examples follow a consistent output pattern:

```
[timestamp] === EXAMPLE NAME ===
[timestamp] Starting workflow execution...
[timestamp] Step execution logs...
[timestamp] Workflow result: { status: "completed", result: {...} }
[timestamp] === EXAMPLE COMPLETED ===
```

## Troubleshooting

### Common Issues

1. **TypeScript Errors**: Ensure you have the latest TypeScript version
2. **Import Errors**: Check that the workflow package is properly installed
3. **Schema Validation Errors**: Verify input data matches the defined schemas
4. **Stream Reading Errors**: Always use try/finally to release stream readers

### Debug Tips

1. **Enable Verbose Logging**: Add console.log statements in step execute functions
2. **Check Event Flow**: Use the watch() method to monitor all events
3. **Validate Schemas**: Ensure input/output schemas are correctly defined
4. **Test Step by Step**: Run individual steps to isolate issues

## Next Steps

After completing these examples:

1. **Build Your Own Workflows** - Apply the patterns to your use cases
2. **Explore Advanced Features** - Check the main documentation for more features
3. **Integrate with Your Application** - Use workflows in your existing codebase
4. **Contribute Examples** - Share your workflow patterns with the community

## Additional Resources

- [Main Documentation](../../README.md) - Complete API reference
- [Test Files](../../run.test.ts) - Comprehensive test cases
- [Type Definitions](../types.ts) - TypeScript type definitions
- [Source Code](../workflow.ts) - Implementation details

## Contributing

To add new examples:

1. Create a new TypeScript file in this directory
2. Follow the existing naming and structure patterns
3. Create a corresponding README.md file
4. Update this main README.md to include the new example
5. Ensure the example can be run with `npx tsx`

## License

MIT - Same as the main package
