/**
 * Tests for WorkflowDrivenAgent
 */

// import { WorkflowDrivenAgent } from './workflowDrivenAgent';
import { createStep, createWorkflow } from '../../packages/workflow/';
import { Agent, Task, Team } from '../../';
import { z } from 'zod';

describe('WorkflowDrivenAgent', () => {
  let simpleWorkflow: any;
  let workflowAgent: Agent;

  beforeEach(() => {
    // Create a simple workflow for testing
    const addStep = createStep({
      id: 'add',
      inputSchema: z.object({ a: z.number(), b: z.number() }),
      outputSchema: z.number(),
      execute: async ({ inputData }) => {
        const { a, b } = inputData as { a: number; b: number };
        return a + b;
      },
    });

    simpleWorkflow = createWorkflow({
      id: 'test-workflow',
      inputSchema: z.object({ a: z.number(), b: z.number() }),
      outputSchema: z.number(),
    });

    simpleWorkflow.then(addStep);
    simpleWorkflow.commit();

    workflowAgent = new Agent({
      type: 'WorkflowDrivenAgent',
      name: 'Test Agent',
      role: 'Test workflow execution',
      goal: 'Execute test workflows',
      background: 'Test agent for workflow execution',
      workflow: simpleWorkflow,
    });
  });

  // describe('workOnTask', () => {
  //   it('should execute workflow successfully', async () => {
  //     const task = {
  //       id: 'test-task',
  //       description: 'Add two numbers',
  //       status: 'pending',
  //       inputs: { a: 2, b: 3 },
  //     };

  //     const result = await workflowAgent.workOnTask(
  //       task as any,
  //       { a: 2, b: 3 },
  //       'Test context'
  //     );

  //     expect(result.result).toBe(5);
  //     expect(result.metadata.iterations).toBe(1);
  //   });

  //   it('should handle workflow errors', async () => {
  //     // Create a workflow that will fail
  //     const failingStep = createStep({
  //       id: 'fail',
  //       inputSchema: z.object({ data: z.string() }),
  //       outputSchema: z.string(),
  //       execute: async () => {
  //         throw new Error('Test error');
  //       },
  //     });

  //     const failingWorkflow = createWorkflow({
  //       id: 'failing-workflow',
  //       inputSchema: z.object({ data: z.string() }),
  //       outputSchema: z.string(),
  //     });

  //     failingWorkflow.then(failingStep);
  //     failingWorkflow.commit();

  //     const failingAgent = new WorkflowDrivenAgent({
  //       name: 'Failing Agent',
  //       role: 'Test failing workflows',
  //       goal: 'Test error handling',
  //       background: 'Test agent',
  //       workflow: failingWorkflow,
  //     });

  //     const task = {
  //       id: 'failing-task',
  //       description: 'This will fail',
  //       status: 'pending',
  //       inputs: { data: 'test' },
  //     };

  //     const result = await failingAgent.workOnTask(
  //       task as any,
  //       { data: 'test' },
  //       'Test context'
  //     );

  //     expect(result.error).toContain('Workflow execution failed');
  //     expect(failingAgent['workflowState'].workflowStatus).toBe('failed');
  //   });
  // });

  // describe('workOnFeedback', () => {
  //   it('should return error for feedback processing', async () => {
  //     const task = {
  //       id: 'feedback-task',
  //       description: 'Test feedback',
  //       status: 'pending',
  //     };

  //     const result = await workflowAgent.workOnFeedback(
  //       task as any,
  //       [{ content: 'Test feedback' }],
  //       'Test context'
  //     );

  //     expect(result.error).toContain('Feedback processing is not implemented');
  //   });
  // });

  // describe('workOnTaskResume', () => {
  //   it('should throw error when no active run', async () => {
  //     const task = {
  //       id: 'resume-task',
  //       description: 'Test resume',
  //       status: 'pending',
  //     };

  //     await expect(workflowAgent.workOnTaskResume(task as any)).rejects.toThrow(
  //       'No active workflow run to resume'
  //     );
  //   });

  //   it('should throw error when workflow is not suspended', async () => {
  //     // First execute a task to create a run
  //     const task = {
  //       id: 'resume-task',
  //       description: 'Test resume',
  //       status: 'pending',
  //       inputs: { a: 1, b: 2 },
  //     };

  //     await workflowAgent.workOnTask(
  //       task as any,
  //       { a: 1, b: 2 },
  //       'Test context'
  //     );

  //     // Try to resume when not suspended
  //     await expect(workflowAgent.workOnTaskResume(task as any)).rejects.toThrow(
  //       'Workflow is not in suspended state'
  //     );
  //   });
  // });

  describe('Works with teams', () => {
    it('should work with teams', async () => {
      const task = new Task({
        description: `Execute the workflow`,
        expectedOutput: 'The workflow result',
        agent: workflowAgent,
      });

      const team = new Team({
        name: 'Test Team',
        agents: [workflowAgent],
        tasks: [task],
      });

      const result = await team.start({ a: 1, b: 2 });
      expect(result.result).toBe(3);
    });
  });
});
