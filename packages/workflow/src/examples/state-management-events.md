# State Management and Events Example

This example demonstrates how to monitor workflow execution in real-time using the `watch()` method and handle suspend/resume functionality.

## Overview

The example showcases:

1. **Real-time State Monitoring** - Track workflow and step status changes
2. **Event Subscription** - Subscribe to workflow events using `watch()`
3. **Suspend and Resume** - Handle interactive workflows that require user input
4. **Comprehensive Event Tracking** - Monitor all aspects of workflow execution

## Running the Example

```bash
npx tsx src/examples/state-management-events.ts
```

## Key Features Demonstrated

### 1. State Monitoring

The example provides several monitoring functions:

```typescript
// Monitor workflow status changes
const workflowMonitor = monitorWorkflowState(run);

// Monitor step status changes
const stepMonitor = monitorStepStatus(run);

// Monitor step results
const resultsMonitor = monitorStepResults(run);

// Monitor all events
const allEventsMonitor = monitorAllEvents(run);
```

### 2. Event Subscription with `watch()`

```typescript
const unsubscribe = run.watch((event) => {
  console.log('Event received:', event);
  // event contains: { type, payload, timestamp, runId, workflowId }
});
```

### 3. Suspend and Resume Functionality

```typescript
// Step that can suspend execution
const approvalStep = createStep({
  id: 'approval',
  inputSchema: z.object({ isValid: z.boolean(), errors: z.array(z.string()) }),
  outputSchema: z.object({ approved: z.boolean() }),
  resumeSchema: z.object({ approved: z.boolean() }),
  suspendSchema: z.object({ reason: z.string() }),
  execute: async ({ inputData, suspend, isResuming, resumeData }) => {
    if (isResuming) {
      return { approved: resumeData.approved };
    }

    // Suspend for manual approval
    await suspend({ reason: 'requires_manual_approval' });
    return { approved: false };
  },
});

// Resume suspended workflow
const resumeResult = await run.resume({
  step: 'approval',
  resumeData: { approved: true },
});
```

## Workflow Structure

The example workflow processes user data through several steps:

1. **user** - Process user information
2. **profile** - Create user profile with display name
3. **validation** - Validate profile data
4. **approval** - Manual approval step (can suspend)

```
user → map → profile → validation → approval
```

## Expected Output

### State Management Example

```
[timestamp] === STATE MANAGEMENT AND EVENTS EXAMPLE ===
[timestamp] Starting workflow execution...
[timestamp] Workflow status changed to: RUNNING
[timestamp] Step user status: running
[timestamp] Processing user: 123
[timestamp] Step user status: completed
[timestamp] Step user completed with result: { user: { id: "123", name: "John Doe", email: "john@example.com" } }
[timestamp] Step profile status: running
[timestamp] Processing profile for: John Doe
[timestamp] Step profile status: completed
[timestamp] Step profile completed with result: { profile: { name: "John Doe", email: "john@example.com", displayName: "@john doe" } }
[timestamp] Step validation status: running
[timestamp] Validating profile: @john doe
[timestamp] Step validation status: completed
[timestamp] Step validation completed with result: { isValid: true, errors: [] }
[timestamp] Step approval status: running
[timestamp] Suspending for manual approval
[timestamp] Step approval status: suspended
[timestamp] Workflow status changed to: SUSPENDED
[timestamp] Workflow execution completed: { status: "suspended", suspended: [["approval"]], steps: {...} }
```

### Suspend and Resume Example

```
[timestamp] === SUSPEND AND RESUME EXAMPLE ===
[timestamp] Starting workflow execution (will suspend for approval)...
[timestamp] Workflow suspended, resuming with approval...
[timestamp] Resuming approval with decision: true
[timestamp] Workflow status changed to: COMPLETED
[timestamp] Resume result: { status: "completed", result: {...} }
```

### Real-time Monitoring Example

```
[timestamp] === REAL-TIME MONITORING EXAMPLE ===
[timestamp] Monitoring workflow execution in real-time...
[timestamp] Events received so far: 8
[timestamp] Final result: { status: "suspended", suspended: [["approval"]], steps: {...} }
[timestamp] Total events captured: 12
[timestamp] Event timeline:
  1. 2024-01-01T12:00:00.000Z - WorkflowStatusUpdate: RUNNING
  2. 2024-01-01T12:00:00.100Z - StepStatusUpdate (user): running
  3. 2024-01-01T12:00:00.200Z - StepStatusUpdate (user): completed
  4. 2024-01-01T12:00:00.250Z - StepStatusUpdate (profile): running
  5. 2024-01-01T12:00:00.400Z - StepStatusUpdate (profile): completed
  6. 2024-01-01T12:00:00.450Z - StepStatusUpdate (validation): running
  7. 2024-01-01T12:00:00.500Z - StepStatusUpdate (validation): completed
  8. 2024-01-01T12:00:00.550Z - StepStatusUpdate (approval): running
  9. 2024-01-01T12:00:00.600Z - StepStatusUpdate (approval): suspended
  10. 2024-01-01T12:00:00.600Z - WorkflowStatusUpdate: SUSPENDED
```

## Key Concepts Demonstrated

### Event Types

- **WorkflowStatusUpdate**: Workflow-level status changes (RUNNING, COMPLETED, SUSPENDED, FAILED)
- **StepStatusUpdate**: Step-level status changes (running, completed, failed, suspended)

### Event Structure

```typescript
interface WorkflowEvent {
  type: 'WorkflowStatusUpdate' | 'StepStatusUpdate';
  timestamp: number;
  runId: string;
  workflowId: string;
  payload: {
    workflowState?: {
      status: string;
      result?: any;
      error?: any;
    };
    stepId?: string;
    stepStatus?: string;
    stepResult?: {
      status: string;
      output?: any;
      error?: any;
    };
  };
}
```

### Monitoring Patterns

1. **Workflow State Monitoring**: Track overall workflow progress
2. **Step Status Monitoring**: Track individual step execution
3. **Result Monitoring**: Capture step outputs as they complete
4. **Comprehensive Monitoring**: Capture all events for analysis

### Suspend/Resume Patterns

1. **Conditional Suspension**: Suspend based on validation results
2. **Manual Approval**: Suspend for human intervention
3. **Resume with Data**: Provide data when resuming execution
4. **State Preservation**: Maintain workflow state during suspension

## Use Cases

- **Real-time Dashboards**: Display workflow progress to users
- **Debugging**: Track execution flow and identify issues
- **Audit Trails**: Log all workflow activities
- **Interactive Workflows**: Handle human-in-the-loop processes
- **Progress Tracking**: Show completion percentages and ETA

## Next Steps

After understanding state management and events, explore:

- [Streaming Workflows](./streaming-workflows.md)
- [Advanced Patterns](./advanced-patterns.md)
- [Error Handling](./error-handling.md)
