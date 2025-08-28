/**
 * Tests for WorkflowDrivenAgent
 */

// import { WorkflowDrivenAgent } from './workflowDrivenAgent';
import { createStep, createWorkflow } from '@kaibanjs/workflow';
import type { Workflow, Step } from '@kaibanjs/workflow';
import { Agent, Task, Team } from '../../';
import { z } from 'zod';

describe('WorkflowDrivenAgent', () => {
  let simpleWorkflow: Workflow<any, any, any>;
  let workflowAgent: any;

  beforeEach(() => {
    // Create a simple workflow for testing
    const addStep: Step<any, any, any> = createStep({
      id: 'add',
      inputSchema: z.object({ a: z.number(), b: z.number() }) as any,
      outputSchema: z.number() as any,
      execute: async ({ inputData }) => {
        const { a, b } = inputData as { a: number; b: number };
        return a + b;
      },
    });

    simpleWorkflow = createWorkflow({
      id: 'test-workflow',
      inputSchema: z.object({ a: z.number(), b: z.number() }) as any,
      outputSchema: z.number() as any,
    });

    simpleWorkflow.then(addStep);
    simpleWorkflow.commit();

    workflowAgent = new Agent({
      type: 'WorkflowDrivenAgent',
      name: 'Test Agent',
      workflow: simpleWorkflow,
    });
  });

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

    it('should work with complex workflow including parallel, conditional, and foreach steps', async () => {
      // Create a simpler complex workflow that demonstrates multiple patterns
      const addStep = createStep({
        id: 'add',
        inputSchema: z.object({ a: z.number(), b: z.number() }) as any,
        outputSchema: z.number() as any,
        execute: async ({ inputData }) => {
          const { a, b } = inputData as { a: number; b: number };
          return a + b;
        },
      });

      const multiplyStep = createStep({
        id: 'multiply',
        inputSchema: z.number() as any,
        outputSchema: z.number() as any,
        execute: async ({ inputData, getInitData }) => {
          const sum = inputData as number;
          const { a, b } = getInitData() as { a: number; b: number };
          return sum * a * b;
        },
      });

      const evenStep = createStep({
        id: 'even',
        inputSchema: z.number() as any,
        outputSchema: z.string() as any,
        execute: async ({ inputData }) => {
          const num = inputData as number;
          return `even: ${num}`;
        },
      });

      const oddStep = createStep({
        id: 'odd',
        inputSchema: z.number() as any,
        outputSchema: z.string() as any,
        execute: async ({ inputData }) => {
          const num = inputData as number;
          return `odd: ${num}`;
        },
      });

      const finalStep = createStep({
        id: 'final',
        inputSchema: z.any() as any,
        outputSchema: z.object({
          sequentialResult: z.number(),
          conditionalResult: z.string(),
          finalResult: z.number(),
        }) as any,
        execute: async ({ getStepResult }) => {
          const sequentialResult = getStepResult('multiply') as number;
          const conditionalResult =
            getStepResult('even') || (getStepResult('odd') as string);
          const finalResult = sequentialResult as number;

          return {
            sequentialResult,
            conditionalResult,
            finalResult,
          };
        },
      });

      // Create complex workflow with multiple patterns

      const complexWorkflow = createWorkflow({
        id: 'complex-workflow',
        inputSchema: z.object({
          a: z.number(),
          b: z.number(),
        }) as any,
        outputSchema: z.object({
          sequentialResult: z.number(),
          conditionalResult: z.string(),
          finalResult: z.number(),
        }) as any,
      });

      // Build complex workflow: sequential -> parallel -> conditional -> foreach -> final
      complexWorkflow
        .then(addStep)
        .then(multiplyStep)
        .branch([
          [
            async ({ inputData }) => {
              return (inputData as number) % 2 === 0;
            },
            evenStep,
          ],
          [async () => true, oddStep], // fallback
        ])
        // .foreach(processItemStep, { concurrency: 2 })
        .then(finalStep);

      complexWorkflow.commit();

      const complexWorkflowAgent = new Agent({
        type: 'WorkflowDrivenAgent',
        name: 'Complex Workflow Agent',
        workflow: complexWorkflow,
      });

      const task = new Task({
        description: 'Execute complex workflow with multiple patterns',
        expectedOutput: 'The complex workflow result',
        agent: complexWorkflowAgent,
      });

      const team = new Team({
        name: 'Complex Workflow Team',
        agents: [complexWorkflowAgent],
        tasks: [task],
      });

      const result = await team.start({
        a: 2,
        b: 3,
      });

      // Verify the result structure and expected values
      expect(result.result).toBeDefined();
      expect((result.result as any).sequentialResult).toBe(30); // (2+3) * 2 * 3
      expect((result.result as any).conditionalResult).toMatch(
        /^(even|odd): \d+$/
      );
      expect((result.result as any).finalResult).toBe(30); // parallel result
    });
  });

  describe('Team state management', () => {
    it('should log workflow execution steps in real-time', async () => {
      // Create a simple workflow for testing
      const step1 = createStep({
        id: 'step1',
        inputSchema: z.object({ data: z.string() }) as any,
        outputSchema: z.string() as any,
        execute: async ({ inputData }) =>
          `processed: ${(inputData as any).data}`,
      });

      const step2 = createStep({
        id: 'step2',
        inputSchema: z.string() as any,
        outputSchema: z.string() as any,
        execute: async ({ inputData }) => `final: ${inputData}`,
      });

      const simpleWorkflow = createWorkflow({
        id: 'simple-workflow',
        inputSchema: z.object({ data: z.string() }) as any,
        outputSchema: z.string() as any,
      });

      simpleWorkflow.then(step1).then(step2);
      simpleWorkflow.commit();

      const loggingAgent = new Agent({
        type: 'WorkflowDrivenAgent',
        name: 'Logging Workflow Agent',
        workflow: simpleWorkflow,
      });

      const task = new Task({
        description: 'Execute workflow with logging',
        expectedOutput: 'Should complete successfully',
        agent: loggingAgent,
      });

      const team = new Team({
        name: 'Logging Workflow Team',
        agents: [loggingAgent],
        tasks: [task],
      });

      // Execute the workflow
      const result = await team.start({ data: 'test' });

      // Verify successful completion
      expect(result.status).toBe('FINISHED');
      expect(result.result).toBe('final: processed: test');

      // Verify workflow logs contain step execution information
      const workflowLogs = team.store.getState().workflowLogs;

      // Verify that workflow logs were generated
      expect(workflowLogs.length).toBeGreaterThan(0);

      // Check for WorkflowAgentStatusUpdate logs
      const workflowAgentLogs = workflowLogs.filter(
        (log) => log.logType === 'WorkflowAgentStatusUpdate'
      );
      expect(workflowAgentLogs.length).toBeGreaterThan(0);

      // Verify that we have logs for the specific agent
      const agentLogs = workflowAgentLogs.filter(
        (log) => log.agentName === 'Logging Workflow Agent'
      );
      expect(agentLogs.length).toBeGreaterThan(0);

      // Verify that we have step-related logs
      const stepLogs = workflowAgentLogs.filter(
        (log) =>
          log.logDescription.includes('started step:') ||
          log.logDescription.includes('completed step:')
      );
      expect(stepLogs.length).toBeGreaterThan(0);
    });

    // it('should handle workflow errors', async () => {
    //   const errorStep = createStep({
    //     id: 'error',
    //     inputSchema: z.any() as any,
    //     outputSchema: z.any() as any,
    //     execute: async () => {
    //       throw new Error('Test error simulating an LLM error');
    //     },
    //   });

    //   const errorWorkflow = createWorkflow({
    //     id: 'error-workflow',
    //     inputSchema: z.object({ shouldFail: z.boolean() }) as any,
    //     outputSchema: z.string() as any,
    //   });

    //   errorWorkflow.then(errorStep);
    //   errorWorkflow.commit();

    //   const errorWorkflowAgent = new Agent({
    //     type: 'WorkflowDrivenAgent',
    //     name: 'Error Workflow Agent',
    //     workflow: errorWorkflow,
    //   });

    //   const task = new Task({
    //     description: 'Execute error workflow',
    //     expectedOutput: 'Should complete successfully',
    //     agent: errorWorkflowAgent,
    //   });

    //   const team = new Team({
    //     name: 'Error Workflow Team',
    //     agents: [errorWorkflowAgent],
    //     tasks: [task],
    //   });
    //   try {
    //     const result = await team.start({ shouldFail: true });
    //     console.log('result', result);
    //   } catch (error) {
    //     console.log('error', error);
    //   }
    //   const store = team.useStore();
    //   //@ts-expect-error - getCleanedState is not a method of the store
    //   const state = store.getState().getCleanedState();
    //   console.log('state log length', state.workflowLogs.length);
    //   console.log('state workflow status', state.teamWorkflowStatus);
    //   console.log('state workflow logs', state.workflowLogs);
    //   // const result = await team.start({ shouldFail: true });

    //   // expect(result.status).toBe('ERROR');
    //   // expect((result as any).error).toContain(
    //   //   'Test error simulating an LLM error'
    //   // );
    // });
  });
});
