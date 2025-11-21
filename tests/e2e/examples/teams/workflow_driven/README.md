# WorkflowDrivenAgent E2E Test Examples

This directory contains comprehensive end-to-end test examples for the WorkflowDrivenAgent implementation in KaibanJS.

## Test Structure

### Basic Workflow Tests

- **basicWorkflow.js** - Simple addition workflow
- **multiStepWorkflow.js** - Workflow with multiple sequential steps
- **conditionalWorkflow.js** - Workflow with branching logic (even/odd)
- **parallelWorkflow.js** - Workflow with parallel execution using foreach

### Error Handling Tests

- **errorWorkflow.js** - Workflow that can fail based on input
- **suspendableWorkflow.js** - Workflow that can suspend and resume

### Mixed Agent Tests

- **mixedAgentTeam.js** - Team with both WorkflowDrivenAgent and ReactChampionAgent
- **dependentTasksTeam.js** - Team with task dependencies between different agent types

### State Management Tests

- **statefulWorkflow.js** - Workflow that maintains state across executions
- **resettableWorkflow.js** - Workflow that can be reset between executions

### Performance Tests

- **monitoredWorkflow.js** - Workflow with performance tracking and metrics

### Task Blocking Tests

- **validationWorkflow.js** - Workflow that blocks tasks based on validation
- **suspensionBlockingWorkflow.js** - Workflow that uses suspension as blocking mechanism
- **mixedBlockingTeam.js** - Mixed team with blocking between different agent types

## Test Categories

### 1. Basic Workflow Execution

Tests basic workflow functionality:

- Simple workflow execution
- Multi-step workflows
- Input/output handling
- Workflow completion

### 2. Complex Workflow Patterns

Tests advanced workflow features:

- Conditional branching
- Parallel execution
- Complex data transformations
- Workflow composition

### 3. Error Handling

Tests error scenarios:

- Workflow execution failures
- Suspension and resume functionality
- Error propagation
- Graceful error handling

### 4. Mixed Agent Teams

Tests integration between different agent types:

- WorkflowDrivenAgent + ReactChampionAgent collaboration
- Task dependencies between agent types
- Cross-agent communication
- Mixed workflow execution

### 5. Workflow State Management

Tests state persistence and management:

- State across executions
- Context management
- Reset functionality
- State cleanup

### 6. Performance and Monitoring

Tests performance tracking:

- Execution time measurement
- Iteration tracking
- Performance metrics
- Monitoring capabilities

### 7. Task Blocking

Tests blocking mechanisms:

- Validation-based blocking
- Suspension-based blocking
- Mixed agent blocking
- Block resolution

## Usage

Each test example can be run independently or as part of the comprehensive test suite. The tests follow the established patterns in the KaibanJS codebase:

1. **Mock Support**: Tests can run with mocked APIs using `TEST_ENV=mocked-llm-apis`
2. **Snapshot Testing**: State snapshots are captured for regression testing
3. **Log Verification**: Workflow logs are verified for proper execution
4. **Status Checking**: Task and team status are validated

## Mock Files

Each test has a corresponding `.requests.json` file for API mocking:

- Empty arrays for tests that don't require external API calls
- Recorded API interactions for tests that use LLM services

## Running Tests

```bash
# Run all workflow-driven agent tests
npm test -- tests/e2e/workflowDrivenAgent.test.js

# Run task blocking tests
npm test -- tests/e2e/workflowDrivenAgentTaskBlocking.test.js

# Run with mocked APIs
TEST_ENV=mocked-llm-apis npm test -- tests/e2e/workflowDrivenAgent.test.js
```

## Test Coverage

These tests provide comprehensive coverage for:

- ✅ Basic workflow execution
- ✅ Complex workflow patterns
- ✅ Error handling and recovery
- ✅ Mixed agent collaboration
- ✅ State management
- ✅ Performance monitoring
- ✅ Task blocking mechanisms
- ✅ Suspension and resume
- ✅ Workflow validation
- ✅ Cross-agent dependencies
