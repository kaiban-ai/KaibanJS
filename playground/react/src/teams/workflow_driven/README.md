# Workflow-Driven Teams

This directory contains examples of teams that utilize the new `WorkflowDrivenAgent` in KaibanJS. The `WorkflowDrivenAgent` executes predefined workflows instead of using LLM-based reasoning, providing deterministic, structured execution.

## Available Teams

### 1. Basic Workflow Team (`basic_workflow.js`)

- **Purpose**: Demonstrates simple sequential workflow execution
- **Workflow**: Mathematical operations (add → multiply → format)
- **Input**: `{ a: 5, b: 3 }`
- **Output**: Mathematical result with calculation details

### 2. Complex Workflow Team (`complex_workflow.js`)

- **Purpose**: Demonstrates advanced workflow patterns
- **Workflow**: Sequential → Conditional → Parallel → ForEach → Final
- **Input**: `{ a: 4, b: 5 }`
- **Output**: Complex result with multiple processing patterns

### 3. Suspension Workflow Team (`suspension_workflow.js`)

- **Purpose**: Demonstrates workflow suspension and resumption
- **Workflow**: Validate → Approval (suspends) → Process → Final
- **Input**: `{ data: 'Sample data for approval workflow' }`
- **Output**: Workflow result after validation and approval

### 4. Mixed Team (`mixed_team.js`)

- **Purpose**: Combines workflow-driven agents with LLM agents
- **Composition**:
  - Data Processor (WorkflowDrivenAgent)
  - Content Analyzer (ReactChampionAgent)
  - Summary Generator (ReactChampionAgent)
- **Input**: Sample text for analysis
- **Output**: Processed data, analysis insights, and summary

## Key Features

### WorkflowDrivenAgent Capabilities

- **Deterministic Execution**: Workflows execute the same way every time
- **Type Safety**: Full TypeScript support with Zod schema validation
- **State Management**: Built-in workflow state tracking
- **Error Handling**: Robust error handling and recovery
- **Team Integration**: Seamless integration with existing team system

### Workflow Patterns Supported

- **Sequential Processing**: Linear workflow execution
- **Parallel Processing**: Concurrent step execution
- **Conditional Logic**: Branching based on conditions
- **ForEach Operations**: Processing multiple items
- **Suspension/Resumption**: Pausing workflows for manual intervention

## Usage Examples

### Basic Workflow

```javascript
import { Agent, Task, Team } from 'kaibanjs';
import { createStep, createWorkflow } from '@kaibanjs/workflow';
import { z } from 'zod';

// Create workflow steps
const addStep = createStep({
  id: 'add',
  inputSchema: z.object({ a: z.number(), b: z.number() }),
  outputSchema: z.number(),
  execute: async ({ inputData }) => {
    const { a, b } = inputData;
    return a + b;
  },
});

// Create and build workflow
const workflow = createWorkflow({
  id: 'example-workflow',
  inputSchema: z.object({ a: z.number(), b: z.number() }),
  outputSchema: z.number(),
});

workflow.then(addStep);
workflow.commit();

// Create workflow-driven agent
const agent = new Agent({
  name: 'Workflow Agent',
  type: 'WorkflowDrivenAgent',
  workflow: workflow,
});
```

### Mixed Team

```javascript
// Workflow-driven agent for structured processing
const dataProcessor = new Agent({
  name: 'Data Processor',
  type: 'WorkflowDrivenAgent',
  workflow: dataProcessingWorkflow,
});

// LLM-based agent for intelligent analysis
const analyzer = new Agent({
  name: 'Content Analyzer',
  type: 'ReactChampionAgent',
});

// Combine in team
const team = new Team({
  name: 'Mixed Team',
  agents: [dataProcessor, analyzer],
  tasks: [processTask, analyzeTask],
});
```

## Benefits

### Workflow-Driven Agents

- **Reliability**: Deterministic execution
- **Performance**: Fast, predictable processing
- **Debugging**: Easy to trace and debug
- **Testing**: Simple to unit test
- **Cost**: No LLM API calls for processing

### Mixed Teams

- **Best of Both Worlds**: Combine reliability of workflows with creativity of LLMs
- **Optimized Processing**: Use workflows for structured tasks, LLMs for creative tasks
- **Cost Efficiency**: Minimize LLM usage where deterministic processing suffices
- **Flexibility**: Adapt to different task requirements

## Integration with Existing System

The `WorkflowDrivenAgent` integrates seamlessly with the existing KaibanJS team system:

- **Same Interface**: Uses the same Agent/Task/Team APIs
- **State Management**: Integrates with existing store system
- **Logging**: Uses existing logging infrastructure
- **Error Handling**: Follows existing error handling patterns
- **UI Components**: Works with existing React components

## Testing

Each team can be tested using the Storybook stories in `../stories/WorkflowDrivenTeam.stories.js`. The stories demonstrate:

- Different workflow patterns
- Team execution
- Result visualization
- Error handling

## Dependencies

- `@kaibanjs/workflow`: For workflow definition and execution
- `zod`: For schema validation
- `kaibanjs`: Core framework
