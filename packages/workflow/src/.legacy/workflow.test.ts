import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { createStep, createWorkflow, RunStore } from '..';

describe('Workflow', () => {
  // Test basic step execution
  it('should execute steps in sequence', async () => {
    const addStep = createStep({
      id: 'add',
      inputSchema: z.object({ a: z.number(), b: z.number() }),
      outputSchema: z.number(),
      execute: async ({ inputData }) => {
        const { a, b } = inputData as { a: number; b: number };
        return (a + b) as number;
      },
    });

    const multiplyStep = createStep({
      id: 'multiply',
      inputSchema: z.number(),
      outputSchema: z.number(),
      execute: async ({ inputData, getInitData }) => {
        const sum = inputData as number;
        const { a, b } = getInitData() as { a: number; b: number };
        return sum * a * b;
      },
    });

    const workflow = createWorkflow({
      id: 'math',
      inputSchema: z.object({ a: z.number(), b: z.number() }),
      outputSchema: z.number(),
    });

    workflow.then(addStep).then(multiplyStep);

    const result = await workflow.start({ a: 2, b: 3 });

    expect(result.status).toBe('completed');
    if (result.status === 'completed') {
      expect(result.result).toBe(30);
    }
  });

  // Test error handling
  it('should handle errors gracefully', async () => {
    const errorStep = createStep({
      id: 'error',
      inputSchema: z.any(),
      outputSchema: z.any(),
      execute: async () => {
        throw new Error('Test error');
      },
    });

    const workflow = createWorkflow({
      id: 'error-test',
      inputSchema: z.any(),
      outputSchema: z.any(),
    });

    workflow.then(errorStep);

    const result = await workflow.start({});
    expect(result.status).toBe('failed');
    if (result.status === 'failed') {
      expect(result.error?.message).toBe('Test error');
    }
  });

  // Test input/output validation
  it('should validate input and output schemas', async () => {
    const validationStep = createStep({
      id: 'validate',
      inputSchema: z.number(),
      outputSchema: z.string(),
      execute: async ({ inputData }) => {
        return (inputData as number).toString();
      },
    });

    const workflow = createWorkflow({
      id: 'validation-test',
      inputSchema: z.number(),
      outputSchema: z.string(),
    });

    workflow.then(validationStep);

    // Test invalid input
    const reject = await workflow.start({} as any);
    expect(reject.status).toBe('failed');

    // Test valid input
    const result = await workflow.start(42);
    expect(result.status).toBe('completed');
    if (result.status === 'completed') {
      expect(result.result).toBe('42');
    }
  });

  // Test parallel execution
  it('should execute steps in parallel', async () => {
    const step1 = createStep({
      id: 'step1',
      inputSchema: z.number(),
      outputSchema: z.number(),
      execute: async ({ inputData }) => (inputData as number) * 2,
    });

    const step2 = createStep({
      id: 'step2',
      inputSchema: z.number(),
      outputSchema: z.number(),
      execute: async ({ inputData }) => (inputData as number) * 3,
    });

    const sumStep = createStep({
      id: 'sum',
      inputSchema: z.any(),
      outputSchema: z.number(),
      execute: async ({ getStepResult }): Promise<number> => {
        const result1 = getStepResult(step1.id) as number;
        const result2 = getStepResult(step2.id) as number;
        return result1 + result2;
      },
    });

    const workflow = createWorkflow({
      id: 'parallel-test',
      inputSchema: z.number(),
      outputSchema: z.number(),
    });

    workflow.parallel([step1, step2]).then(sumStep);

    const result = await workflow.start(2);
    expect(result.status).toBe('completed');
    if (result.status === 'completed') {
      expect(result.result).toBe(10); // (2*2) + (2*3)
    }
  });

  // Test do-while loop
  it('should execute steps in a do-while loop', async () => {
    const counterStep = createStep({
      id: 'counter',
      inputSchema: z.number(),
      outputSchema: z.number(),
      execute: async ({ inputData }) => {
        const result = (inputData as number) + 1;
        return result;
      },
    });

    const workflow = createWorkflow({
      id: 'dowhile-test',
      inputSchema: z.number(),
      outputSchema: z.number(),
    });

    workflow.dowhile(counterStep, async ({ getStepResult }) => {
      try {
        const count = getStepResult(counterStep.id) as number;
        return count < 3;
      } catch (error) {
        console.error('Error in condition:', error);
        return false;
      }
    });

    const result = await workflow.start(0);
    expect(result.status).toBe('completed');
    if (result.status === 'completed') {
      expect(result.result).toBe(3);
    }
  });

  // Test do-until loop
  it('should execute steps in a do-until loop', async () => {
    const counterStep = createStep({
      id: 'counter',
      inputSchema: z.number(),
      outputSchema: z.number(),
      execute: async ({ inputData }) => (inputData as number) + 1,
    });

    const workflow = createWorkflow({
      id: 'dountil-test',
      inputSchema: z.number(),
      outputSchema: z.number(),
    });

    workflow.dountil(counterStep, async ({ getStepResult }) => {
      const count = getStepResult(counterStep.id) as number;
      return count >= 3;
    });

    const result = await workflow.start(0);
    expect(result.status).toBe('completed');
    if (result.status === 'completed') {
      expect(result.result).toBe(3);
    }
  });

  // // Test foreach execution
  it('should execute steps in a foreach loop', async () => {
    const processItemStep = createStep({
      id: 'process',
      inputSchema: z.number(),
      outputSchema: z.number(),
      execute: async ({ inputData }) => {
        return (inputData as number) * 2;
      },
    });

    const workflow = createWorkflow({
      id: 'foreach-test',
      inputSchema: z.array(z.number()),
      outputSchema: z.array(z.number()),
    });

    workflow.foreach(processItemStep, { concurrency: 2 });

    const result = await workflow.start([1, 2, 3, 4, 5]);
    expect(result.status).toBe('completed');
    if (result.status === 'completed') {
      expect(result.result).toEqual([2, 4, 6, 8, 10]);
    }
  });

  // // Test conditional execution (if-else)
  it('should execute steps conditionally', async () => {
    const evenStep = createStep({
      id: 'even',
      inputSchema: z.number(),
      outputSchema: z.string(),
      execute: async () => 'even',
    });

    const oddStep = createStep({
      id: 'odd',
      inputSchema: z.number(),
      outputSchema: z.string(),
      execute: async () => 'odd',
    });

    const workflow = createWorkflow({
      id: 'conditional-test',
      inputSchema: z.number(),
      outputSchema: z.string(),
    });

    workflow.branch([
      [async ({ inputData }) => (inputData as number) % 2 === 0, evenStep],
      [async () => true, oddStep],
    ]);

    // Test even number
    const evenResult = await workflow.start(4);
    expect(evenResult.status).toBe('completed');
    if (evenResult.status === 'completed') {
      expect(evenResult.result).toBe('even');
    }

    // Test odd number
    const oddResult = await workflow.start(3);
    expect(oddResult.status).toBe('completed');
    if (oddResult.status === 'completed') {
      expect(oddResult.result).toBe('odd');
    }
  });

  // // Test nested execution patterns
  it('should handle nested execution patterns', async () => {
    // Step that adds two numbers
    const addStep = createStep({
      id: 'add',
      inputSchema: z.object({ a: z.number(), b: z.number() }),
      outputSchema: z.number(),
      execute: async ({ inputData }) => {
        const { a, b } = inputData as { a: number; b: number };
        return a + b;
      },
    });

    // Step that multiplies a number by 2
    const doubleStep = createStep({
      id: 'double',
      inputSchema: z.number(),
      outputSchema: z.number(),
      execute: async ({ inputData }) => {
        return (inputData as number) * 2;
      },
    });

    // Step that increments a number
    const incrementStep = createStep({
      id: 'increment',
      inputSchema: z.number(),
      outputSchema: z.number(),
      execute: async ({ inputData }) => {
        return (inputData as number) + 1;
      },
    });

    const workflow = createWorkflow({
      id: 'nested-test',
      inputSchema: z.object({ a: z.number(), b: z.number() }),
      outputSchema: z.number(),
    });

    // Flow: add -> if(sum > 10) -> double : increment
    workflow.then(addStep).branch([
      [
        async ({ getStepResult }) => {
          const result = getStepResult(addStep.id) as number;
          if (typeof result !== 'number') {
            throw new Error('Expected number from addStep');
          }
          return result > 10;
        },
        doubleStep,
      ],
      [async () => true, incrementStep],
    ]);

    // Test case 1: a=5, b=6 -> sum=11 > 10 -> double(11)=22
    const result1 = await workflow.start({ a: 5, b: 6 });

    expect(result1.status).toBe('completed');
    if (result1.status === 'completed') {
      expect(result1.result).toBe(22);
    }

    // Test case 2: a=2, b=3 -> sum=5 < 10 -> increment(5)=6
    const result2 = await workflow.start({ a: 2, b: 3 });
    expect(result2.status).toBe('completed');
    if (result2.status === 'completed') {
      expect(result2.result).toBe(6);
    }
  });

  // // Test watch events

  // Test nested workflows
  it('should handle nested workflows as steps', async () => {
    // Create a nested workflow that processes a number
    const nestedWorkflow = createWorkflow({
      id: 'nested-workflow',
      inputSchema: z.number(),
      outputSchema: z.number(),
    });

    // Add steps to the nested workflow
    const doubleStep = createStep({
      id: 'double',
      inputSchema: z.number(),
      outputSchema: z.number(),
      execute: async ({ inputData }) => (inputData as number) * 2,
    });

    const incrementStep = createStep({
      id: 'increment',
      inputSchema: z.number(),
      outputSchema: z.number(),
      execute: async ({ inputData }) => (inputData as number) + 1,
    });

    nestedWorkflow.then(doubleStep).then(incrementStep);

    // Create the main workflow that uses the nested workflow
    const mainWorkflow = createWorkflow({
      id: 'main-workflow',
      inputSchema: z.object({ a: z.number(), b: z.number() }),
      outputSchema: z.number(),
    });

    // Add steps to the main workflow
    const addStep = createStep({
      id: 'add',
      inputSchema: z.object({ a: z.number(), b: z.number() }),
      outputSchema: z.number(),
      execute: async ({ inputData }) => {
        const { a, b } = inputData as { a: number; b: number };
        return a + b;
      },
    });

    // Flow: add -> nested-workflow -> handle-nested-result
    mainWorkflow.then(addStep).then(nestedWorkflow);

    // Test case 1: (2 + 3) -> double(5) -> increment(10) = 11
    const result1 = await mainWorkflow.start({ a: 2, b: 3 });
    expect(result1.status).toBe('completed');
    if (result1.status === 'completed') {
      expect(result1.result).toBe(11);
    }

    // Test case 2: (5 + 5) -> double(10) -> increment(20) = 21
    const result2 = await mainWorkflow.start({ a: 5, b: 5 });
    expect(result2.status).toBe('completed');
    if (result2.status === 'completed') {
      expect(result2.result).toBe(21);
    }
  });

  // Test nested workflows with conditional execution
  it('should handle nested workflows in conditional execution', async () => {
    // Create a nested workflow for even numbers
    const evenWorkflow = createWorkflow({
      id: 'even-workflow',
      inputSchema: z.number(),
      outputSchema: z.number(),
    });

    const doubleStep = createStep({
      id: 'double',
      inputSchema: z.number(),
      outputSchema: z.number(),
      execute: async ({ inputData }) => (inputData as number) * 2,
    });

    evenWorkflow.then(doubleStep);

    // Create a nested workflow for odd numbers
    const oddWorkflow = createWorkflow({
      id: 'odd-workflow',
      inputSchema: z.number(),
      outputSchema: z.number(),
    });

    const tripleStep = createStep({
      id: 'triple',
      inputSchema: z.number(),
      outputSchema: z.number(),
      execute: async ({ inputData }) => (inputData as number) * 3,
    });

    oddWorkflow.then(tripleStep);

    // Create the main workflow
    const mainWorkflow = createWorkflow({
      id: 'main-workflow',
      inputSchema: z.number(),
      outputSchema: z.number(),
    });

    // Flow: if(number % 2 === 0) -> even-workflow : odd-workflow -> handle-nested-result
    mainWorkflow.branch([
      [async ({ inputData }) => (inputData as number) % 2 === 0, evenWorkflow],
      [async () => true, oddWorkflow],
    ]);

    // Test case 1: 4 (even) -> double(4) = 8
    const result1 = await mainWorkflow.start(4);
    expect(result1.status).toBe('completed');
    if (result1.status === 'completed') {
      expect(result1.result).toBe(8);
    }

    // Test case 2: 5 (odd) -> triple(5) = 15
    const result2 = await mainWorkflow.start(5);
    expect(result2.status).toBe('completed');
    if (result2.status === 'completed') {
      expect(result2.result).toBe(15);
    }
  });

  // Test nested workflows with parallel execution
  it('should handle nested workflows in parallel execution', async () => {
    // Create a nested workflow for processing numbers
    const processWorkflow = createWorkflow({
      id: 'process-workflow',
      inputSchema: z.number(),
      outputSchema: z.number(),
    });

    const doubleStep = createStep({
      id: 'double',
      inputSchema: z.number(),
      outputSchema: z.number(),
      execute: async ({ inputData }) => (inputData as number) * 2,
    });

    processWorkflow.then(doubleStep);

    // Create the main workflow
    const mainWorkflow = createWorkflow({
      id: 'main-workflow',
      inputSchema: z.number(),
      outputSchema: z.number(),
    });

    // Create a step to handle nested workflow results
    const handleNestedResultsStep = createStep({
      id: 'handle-nested-results',
      inputSchema: z.any(),
      outputSchema: z.number(),
      execute: async ({ getStepResult }): Promise<number> => {
        const step1Result = getStepResult(processWorkflow.id) as number;
        const step2Result = getStepResult(processWorkflow.id) as number;
        return step1Result + step2Result;
      },
    });

    // Flow: parallel(process-workflow, process-workflow) -> handle-nested-results
    mainWorkflow
      .parallel([processWorkflow, processWorkflow])
      .then(handleNestedResultsStep);

    // Test case: 2 -> parallel(double(2), double(2)) -> sum(4 + 4) = 8
    const result = await mainWorkflow.start(2);
    expect(result.status).toBe('completed');
    if (result.status === 'completed') {
      expect(result.result).toBe(8);
    }
  });

  // Test map functionality
  describe('map functionality', () => {
    // Test basic mapping between steps
    it('should map data between steps', async () => {
      const userStep = createStep({
        id: 'user',
        inputSchema: z.object({ userId: z.string() }),
        outputSchema: z.object({
          user: z.object({
            id: z.string(),
            name: z.string(),
            email: z.string(),
          }),
        }),
        execute: async ({ inputData }) => ({
          user: {
            id: inputData.userId,
            name: 'John Doe',
            email: 'john@example.com',
          },
        }),
      });

      const profileStep = createStep({
        id: 'profile',
        inputSchema: z.object({
          profile: z.object({
            name: z.string(),
            email: z.string(),
          }),
        }),
        outputSchema: z.object({
          profile: z.object({
            name: z.string(),
            email: z.string(),
            displayName: z.string(),
          }),
        }),
        execute: async ({ inputData }) => ({
          profile: {
            name: inputData.profile.name,
            email: inputData.profile.email,
            displayName: `@${inputData.profile.name.toLowerCase()}`,
          },
        }),
      });

      const workflow = createWorkflow({
        id: 'mapping-test',
        inputSchema: z.object({ userId: z.string() }),
        outputSchema: z.object({
          profile: z.object({
            name: z.string(),
            email: z.string(),
            displayName: z.string(),
          }),
        }),
      });

      workflow
        .then(userStep)
        .map({
          profile: {
            step: userStep,
            path: 'user',
          },
        })
        .then(profileStep);

      const result = await workflow.start({ userId: '123' });
      expect(result.status).toBe('completed');
      if (result.status === 'completed') {
        expect(result.result).toEqual({
          profile: {
            name: 'John Doe',
            email: 'john@example.com',
            displayName: '@john doe',
          },
        });
      }
    });

    // Test mapping with static values
    it('should handle static values in mapping', async () => {
      const processStep = createStep({
        id: 'process',
        inputSchema: z.object({ data: z.string() }),
        outputSchema: z.object({
          result: z.object({
            data: z.string(),
            timestamp: z.string(),
            version: z.string(),
          }),
        }),
        execute: async ({ inputData }) => ({
          result: {
            data: inputData.data,
            timestamp: new Date().toISOString(),
            version: '1.0.0',
          },
        }),
      });

      const workflow = createWorkflow({
        id: 'static-mapping-test',
        inputSchema: z.object({ data: z.string() }),
        outputSchema: z.object({
          result: z.object({
            data: z.string(),
            timestamp: z.string(),
            version: z.string(),
          }),
        }),
      });

      workflow.then(processStep).map({
        result: {
          step: processStep,
          path: 'result',
        },
      });

      const result = await workflow.start({ data: 'test' });
      expect(result.status).toBe('completed');
      if (result.status === 'completed') {
        expect(result.result).toHaveProperty('result.data', 'test');
        expect(result.result).toHaveProperty('result.timestamp');
        expect(result.result).toHaveProperty('result.version', '1.0.0');
      }
    });

    // Test mapping with function transformation
    it('should handle function transformations in mapping', async () => {
      type DataStepOutput = {
        numbers: number[];
        sum: number;
      };

      const dataStep = createStep({
        id: 'data',
        inputSchema: z.object({ numbers: z.array(z.number()) }),
        outputSchema: z.object({
          numbers: z.array(z.number()),
          sum: z.number(),
        }),
        execute: async ({ inputData }): Promise<DataStepOutput> => {
          const sum = inputData.numbers.reduce(
            (a: number, b: number) => a + b,
            0
          );
          return {
            numbers: inputData.numbers,
            sum,
          };
        },
      });

      const workflow = createWorkflow({
        id: 'function-mapping-test',
        inputSchema: z.object({ numbers: z.array(z.number()) }),
        outputSchema: z.object({
          result: z.object({
            numbers: z.array(z.number()),
            sum: z.number(),
            average: z.number(),
          }),
        }),
      });

      workflow.then(dataStep).map(async ({ getStepResult }) => {
        const data = getStepResult(dataStep.id) as DataStepOutput;
        return {
          result: {
            numbers: data.numbers,
            sum: data.sum,
            average: data.sum / data.numbers.length,
          },
        };
      });

      const result = await workflow.start({ numbers: [1, 2, 3, 4, 5] });

      expect(result.status).toBe('completed');
      if (result.status === 'completed') {
        expect(result.result).toEqual({
          result: {
            numbers: [1, 2, 3, 4, 5],
            sum: 15,
            average: 3,
          },
        });
      }
    });

    // Test mapping with runtime context
    it('should handle runtime context in mapping', async () => {
      const processStep = createStep({
        id: 'process',
        inputSchema: z.object({ data: z.string() }),
        outputSchema: z.object({
          result: z.object({
            data: z.string(),
            context: z.any(),
          }),
        }),
        execute: async ({ inputData }) => ({
          result: {
            data: inputData.data,
            context: undefined,
          },
        }),
      });

      const workflow = createWorkflow({
        id: 'context-mapping-test',
        inputSchema: z.object({ data: z.string() }),
        outputSchema: z.object({
          result: z.object({
            data: z.string(),
            context: z.any(),
          }),
        }),
      });

      workflow.then(processStep).map({
        result: {
          step: processStep,
          path: 'result',
        },
      });

      const result = await workflow.start({ data: 'test' });
      expect(result.status).toBe('completed');
      if (result.status === 'completed') {
        expect(result.result).toEqual({
          result: {
            data: 'test',
            context: undefined,
          },
        });
      }
    });

    // Test mapping with nested paths
    it('should handle nested paths in mapping', async () => {
      const userStep = createStep({
        id: 'user',
        inputSchema: z.object({ userId: z.string() }),
        outputSchema: z.object({
          user: z.object({
            id: z.string(),
            profile: z.object({
              name: z.string(),
              address: z.object({
                city: z.string(),
                country: z.string(),
              }),
            }),
          }),
        }),
        execute: async ({ inputData }) => ({
          user: {
            id: inputData.userId,
            profile: {
              name: 'John Doe',
              address: {
                city: 'New York',
                country: 'USA',
              },
            },
          },
        }),
      });

      const workflow = createWorkflow({
        id: 'nested-mapping-test',
        inputSchema: z.object({ userId: z.string() }),
        outputSchema: z.object({
          location: z.object({
            city: z.string(),
            country: z.string(),
          }),
        }),
      });

      workflow.then(userStep).map({
        location: {
          step: userStep,
          path: 'user.profile.address',
        },
      });

      const result = await workflow.start({ userId: '123' });
      expect(result.status).toBe('completed');
      if (result.status === 'completed') {
        expect(result.result).toEqual({
          location: {
            city: 'New York',
            country: 'USA',
          },
        });
      }
    });
  });

  // Test suspend and resume functionality
  it('should handle step suspension and resumption', async () => {
    const suspendableStep = createStep({
      id: 'suspendable',
      inputSchema: z.object({ value: z.number() }),
      outputSchema: z.object({ result: z.number() }),
      resumeSchema: z.object({ continue: z.boolean(), value: z.number() }),
      suspendSchema: z.object({ reason: z.string() }),
      execute: async ({
        inputData,
        isResuming,
        resumeData,
        suspend,
      }): Promise<{ result: number }> => {
        // If resuming and continue is true, proceed with the calculation
        if (isResuming && !resumeData?.continue) {
          await suspend({ reason: 'operation_cancelled' });
          return { result: 0 }; // This won't be used since we suspended
        }

        const value = resumeData?.value ?? (inputData.value as number);

        // Otherwise, check if we should suspend
        if (value < 0) {
          await suspend({ reason: 'negative_value' });
          return { result: 0 }; // This won't be used since we suspended
        }

        return { result: value * 2 };
      },
    });

    const workflow = createWorkflow({
      id: 'suspend-test',
      inputSchema: z.object({ value: z.number() }),
      outputSchema: z.object({ result: z.number() }),
    });

    workflow.then(suspendableStep);

    // Test suspension
    const suspendResult = await workflow.start({ value: -1 });

    expect(suspendResult.status).toBe('suspended');
    if (suspendResult.status === 'suspended') {
      expect(suspendResult.suspended).toBeDefined();
      expect(suspendResult.steps['suspendable'].output).toEqual({
        reason: 'negative_value',
      });
    }

    // Test resumption
    const resumeResult = await workflow.resume({
      step: 'suspendable',
      resumeData: { continue: true, value: 1 },
    });

    expect(resumeResult.status).toBe('completed');
    if (resumeResult.status === 'completed') {
      expect(resumeResult.result).toEqual({ result: 2 });
    }
  });

  // Test suspend and resume with multiple steps
  it('should handle suspension and resumption in a chain of steps', async () => {
    const firstStep = createStep({
      id: 'first',
      inputSchema: z.object({ value: z.number() }),
      outputSchema: z.object({ result: z.number() }),
      execute: async ({ inputData }): Promise<{ result: number }> => {
        const { value } = inputData as { value: number };
        return { result: value * 2 };
      },
    });

    const suspendableStep = createStep({
      id: 'suspendable',
      inputSchema: z.object({ result: z.number() }),
      outputSchema: z.object({ final: z.number() }),
      resumeSchema: z.object({ continue: z.boolean(), result: z.number() }),
      suspendSchema: z.object({ reason: z.string() }),
      execute: async ({
        inputData,
        isResuming,
        resumeData,
        suspend,
      }): Promise<{ final: number }> => {
        const { result } = resumeData
          ? (resumeData as { result: number })
          : (inputData as { result: number });

        // If we're resuming and continue is false, suspend again
        if (isResuming && !resumeData?.continue) {
          await suspend({ reason: 'operation_cancelled' });
          return { final: 0 }; // This won't be used since we suspended
        }

        // Core logic remains the same regardless of resumption
        if (result < 0) {
          await suspend({ reason: 'negative_value' });
          return { final: 0 }; // This won't be used since we suspended
        }
        return { final: result * 3 };
      },
    });

    const workflow = createWorkflow({
      id: 'chain-suspend-test',
      inputSchema: z.object({ value: z.number() }),
      outputSchema: z.object({ final: z.number() }),
    });

    workflow.then(firstStep).then(suspendableStep);

    // Test suspension in chain
    const suspendResult = await workflow.start({ value: -1 });
    expect(suspendResult.status).toBe('suspended');

    if (suspendResult.status === 'suspended') {
      expect(suspendResult.steps['first'].output).toEqual({ result: -2 });
      expect(suspendResult.steps['suspendable'].output).toEqual({
        reason: 'negative_value',
      });
    }

    // Test resumption with continue: false
    const resumeResult1 = await workflow.resume({
      step: 'suspendable',
      resumeData: { continue: false, result: 1 },
    });
    expect(resumeResult1.status).toBe('suspended');
    if (resumeResult1.status === 'suspended') {
      expect(resumeResult1.steps['suspendable'].output).toEqual({
        reason: 'operation_cancelled',
      });
    }

    // Test successful resumption
    const resumeResult2 = await workflow.resume({
      step: 'suspendable',
      resumeData: { continue: true, result: 2 },
    });

    expect(resumeResult2.status).toBe('completed');
    if (resumeResult2.status === 'completed') {
      expect(resumeResult2.result).toEqual({ final: 6 }); // -2 * 3
    }
  });

  // // Test suspend and resume with parallel steps
  it('should handle suspension and resumption in parallel steps', async () => {
    const suspendableStep1 = createStep({
      id: 'suspendable1',
      inputSchema: z.number(),
      outputSchema: z.object({ result: z.number() }),
      resumeSchema: z.object({ continue: z.boolean(), value: z.number() }),
      suspendSchema: z.object({ reason: z.string() }),
      execute: async ({
        inputData,
        isResuming,
        resumeData,
        suspend,
      }): Promise<{ result: number }> => {
        // If we're resuming and continue is false, suspend again
        if (isResuming && !resumeData?.continue) {
          await suspend({ reason: 'operation_cancelled' });
          return { result: 0 }; // This won't be used since we suspended
        }

        const value = resumeData?.value ?? (inputData as number);
        // Core logic remains the same regardless of resumption
        if (value < 0) {
          await suspend({ reason: 'negative_value' });
          return { result: 0 }; // This won't be used since we suspended
        }
        return { result: value * 2 };
      },
    });

    const suspendableStep2 = createStep({
      id: 'suspendable2',
      inputSchema: z.number(),
      outputSchema: z.object({ result: z.number() }),
      resumeSchema: z.object({ continue: z.boolean(), value: z.number() }),
      suspendSchema: z.object({ reason: z.string() }),
      execute: async ({
        inputData,
        isResuming,
        resumeData,
        suspend,
      }): Promise<{ result: number }> => {
        // If we're resuming and continue is false, suspend again
        if (isResuming && !resumeData?.continue) {
          await suspend({ reason: 'operation_cancelled' });
          return { result: 0 }; // This won't be used since we suspended
        }
        const value = resumeData?.value ?? (inputData as number);

        // Core logic remains the same regardless of resumption
        if (value < 0) {
          await suspend({ reason: 'negative_value' });
          return { result: 0 }; // This won't be used since we suspended
        }
        return { result: value * 3 };
      },
    });

    const sumStep = createStep({
      id: 'sum',
      inputSchema: z.any(),
      outputSchema: z.number(),
      execute: async ({ getStepResult }): Promise<number> => {
        const step1Result = getStepResult(suspendableStep1.id) as {
          result: number;
        };
        const step2Result = getStepResult(suspendableStep2.id) as {
          result: number;
        };
        return step1Result.result + step2Result.result;
      },
    });

    const workflow = createWorkflow({
      id: 'parallel-suspend-test',
      inputSchema: z.number(),
      outputSchema: z.number(),
    });

    workflow.parallel([suspendableStep1, suspendableStep2]).then(sumStep);

    // Test suspension in parallel
    const suspendResult = await workflow.start(-1);

    expect(suspendResult.status).toBe('suspended');
    if (suspendResult.status === 'suspended') {
      expect(suspendResult.steps['suspendable1'].output).toEqual({
        reason: 'negative_value',
      });
      expect(suspendResult.steps['suspendable2'].output).toEqual({
        reason: 'negative_value',
      });
    }

    // Test resumption with continue: false
    const resumeResult1 = await workflow.resume({
      step: ['suspendable1', 'suspendable2'],
      resumeData: { continue: true, value: 1 },
    });

    expect(resumeResult1.status).toBe('completed');
    if (resumeResult1.status === 'completed') {
      expect(resumeResult1.steps['suspendable1'].output).toEqual({
        result: 2,
      });
      expect(resumeResult1.steps['suspendable2'].output).toEqual({
        result: 3,
      });
      expect(resumeResult1.result).toEqual(5);
    }
  });
});

// Test step and workflow states
describe('Step and Workflow States', () => {
  // Test running state
  it('should track running state of steps and workflow', async () => {
    const slowStep = createStep({
      id: 'slow-step',
      inputSchema: z.number(),
      outputSchema: z.number(),
      execute: async ({ inputData }) => {
        // await new Promise((resolve) => setTimeout(resolve, 1000));
        return (inputData as number) * 2;
      },
    });
    const workflow = createWorkflow({
      id: 'running-state-test',
      inputSchema: z.number(),
      outputSchema: z.number(),
    });
    workflow.then(slowStep);
    // Set up state monitoring
    const states: { step: string; workflow: string }[] = [];
    const unsubscribe = (state: RunStore) => {
      const lastLog = state.logs[state.logs.length - 1];
      console.log('log : ', lastLog?.type, lastLog?.stepStatus);

      if (lastLog?.type === 'step' && lastLog.stepStatus) {
        states.push({
          step: lastLog.stepStatus,
          workflow: state.status.toLowerCase(),
        });
      }
    };
    // Start execution
    const result = await workflow.start(5, unsubscribe);
    await new Promise((resolve) => setTimeout(resolve, 100));

    console.log('States:', states);
    // Verify states
    expect(states).toContainEqual({ step: 'running', workflow: 'running' });
    expect(result.status).toBe('completed');
    if (result.status === 'completed') {
      expect(result.result).toBe(10);
    }
  });
  // Test suspended state
  it('should handle suspended state correctly', async () => {
    const suspendableStep = createStep({
      id: 'suspendable',
      inputSchema: z.object({ value: z.number() }),
      outputSchema: z.number(),
      resumeSchema: z.object({ continue: z.boolean() }),
      suspendSchema: z.object({ reason: z.string() }),
      execute: async ({ inputData, suspend }) => {
        if ((inputData as { value: number }).value < 0) {
          await suspend({ reason: 'negative_value' });
          return 0;
        }
        return (inputData as { value: number }).value * 2;
      },
    });
    const workflow = createWorkflow({
      id: 'suspended-state-test',
      inputSchema: z.object({ value: z.number() }),
      outputSchema: z.number(),
    });
    workflow.then(suspendableStep);
    // Set up state monitoring
    const states: { step: string; workflow: string }[] = [];
    const unsubscribe = (state: RunStore) => {
      const lastLog = state.logs[state.logs.length - 1];
      if (lastLog?.type === 'step' && lastLog.stepStatus) {
        states.push({
          step: lastLog.stepStatus,
          workflow: state.status.toLowerCase(),
        });
      }
    };
    // Test suspension
    const suspendResult = await workflow.start({ value: -1 }, unsubscribe);
    await new Promise((resolve) => setTimeout(resolve, 100));
    // unsubscribe();
    // Verify states
    expect(states).toContainEqual({ step: 'suspended', workflow: 'running' });
    expect(suspendResult.status).toBe('suspended');
    if (suspendResult.status === 'suspended') {
      expect(suspendResult.steps['suspendable'].output).toEqual({
        reason: 'negative_value',
      });
    }
  });
  // Test failed state
  it('should handle failed state correctly', async () => {
    const failingStep = createStep({
      id: 'failing',
      inputSchema: z.number(),
      outputSchema: z.number(),
      execute: async ({ inputData }) => {
        if ((inputData as number) < 0) {
          throw new Error('Negative value not allowed');
        }
        return (inputData as number) * 2;
      },
    });
    const workflow = createWorkflow({
      id: 'failed-state-test',
      inputSchema: z.number(),
      outputSchema: z.number(),
    });
    workflow.then(failingStep);
    // Set up state monitoring
    const states: { step: string; workflow: string }[] = [];
    const unsubscribe = (state: RunStore) => {
      const lastLog = state.logs[state.logs.length - 1];
      if (lastLog?.type === 'step' && lastLog.stepStatus) {
        states.push({
          step: lastLog.stepStatus,
          workflow: state.status.toLowerCase(),
        });
      }
    };
    // Test failure
    const failResult = await workflow.start(-1, unsubscribe);
    await new Promise((resolve) => setTimeout(resolve, 100));
    // unsubscribe();
    // Verify states
    expect(states).toContainEqual({ step: 'failed', workflow: 'running' });
    expect(failResult.status).toBe('failed');
    if (failResult.status === 'failed') {
      expect(failResult.error?.message).toBe('Negative value not allowed');
    }
  });
  // Test completed state
  it('should handle completed state correctly', async () => {
    const successStep = createStep({
      id: 'success',
      inputSchema: z.number(),
      outputSchema: z.number(),
      execute: async ({ inputData }) => {
        return (inputData as number) * 2;
      },
    });
    const workflow = createWorkflow({
      id: 'completed-state-test',
      inputSchema: z.number(),
      outputSchema: z.number(),
    });
    workflow.then(successStep);
    // Set up state monitoring
    const states: { step: string; workflow: string }[] = [];
    const unsubscribe = (state: RunStore) => {
      const lastLog = state.logs[state.logs.length - 1];
      if (lastLog?.type === 'step' && lastLog.stepStatus) {
        states.push({
          step: lastLog.stepStatus,
          workflow: state.status.toLowerCase(),
        });
      }
    };
    // Test completion
    const completeResult = await workflow.start(5, unsubscribe);
    await new Promise((resolve) => setTimeout(resolve, 100));
    // unsubscribe();
    // Verify states
    expect(states).toContainEqual({ step: 'completed', workflow: 'running' });
    expect(completeResult.status).toBe('completed');
    if (completeResult.status === 'completed') {
      expect(completeResult.result).toBe(10);
    }
  });
  // Test state transitions in parallel steps
  it('should handle state transitions in parallel steps', async () => {
    const parallelStep1 = createStep({
      id: 'parallel1',
      inputSchema: z.number(),
      outputSchema: z.number(),
      execute: async ({ inputData }) => {
        // await new Promise((resolve) => setTimeout(resolve, 3000));
        return (inputData as number) * 2;
      },
    });
    const parallelStep2 = createStep({
      id: 'parallel2',
      inputSchema: z.number(),
      outputSchema: z.number(),
      execute: async ({ inputData }) => {
        // await new Promise((resolve) => setTimeout(resolve, 3000));
        return (inputData as number) * 3;
      },
    });
    const workflow = createWorkflow({
      id: 'parallel-state-test',
      inputSchema: z.number(),
      outputSchema: z.number(),
    });
    workflow.parallel([parallelStep1, parallelStep2]);
    // Monitor states with detailed logging
    const states: Array<{ step: string; workflow: string }> = [];
    const unsubscribe = (state: RunStore) => {
      const lastLog = state.logs[state.logs.length - 1];
      if (lastLog?.type === 'step' && lastLog.stepStatus) {
        const stateUpdate = {
          step: lastLog.stepStatus,
          workflow: state.status.toLowerCase(),
        };
        states.push(stateUpdate);
      }
    };
    // Start execution
    const result = await workflow.start(5, unsubscribe);
    // Clean up
    // unsubscribe();
    // Verify states
    expect(states).toContainEqual({ step: 'completed', workflow: 'running' });
    expect(result.status).toBe('completed');
    if (result.status === 'completed') {
      expect(result.result).toEqual({
        parallel1: 10,
        parallel2: 15,
      });
    }
  });
  // Test state transitions in conditional steps
  it('should handle state transitions in conditional steps', async () => {
    const evenStep = createStep({
      id: 'even',
      inputSchema: z.number(),
      outputSchema: z.string(),
      execute: async ({ inputData }) => {
        return `even: ${inputData}`;
      },
    });
    const oddStep = createStep({
      id: 'odd',
      inputSchema: z.number(),
      outputSchema: z.string(),
      execute: async ({ inputData }) => {
        return `odd: ${inputData}`;
      },
    });
    const workflow = createWorkflow({
      id: 'conditional-states-test',
      inputSchema: z.number(),
      outputSchema: z.string(),
    });
    // Use branch to create conditional execution
    workflow.branch([
      [async ({ inputData }) => (inputData as number) % 2 === 0, evenStep],
      [async ({ inputData }) => (inputData as number) % 2 !== 0, oddStep],
    ]);
    // Set up state monitoring
    const states: { step: string; workflow: string }[] = [];
    const unsubscribe = (state: RunStore) => {
      // console.log('Store Update:', state);
      const lastLog = state.logs[state.logs.length - 1];
      if (lastLog?.type === 'step' && lastLog.stepStatus) {
        states.push({
          step: lastLog.stepStatus,
          workflow: state.status.toLowerCase(),
        });
      }
    };
    // Test even number
    const evenResult = await workflow.start(4, unsubscribe);
    await new Promise((resolve) => setTimeout(resolve, 100));
    // console.log('States:', states);
    // Verify even number states
    expect(states).toContainEqual({ step: 'running', workflow: 'running' });
    expect(states).toContainEqual({ step: 'completed', workflow: 'running' });
    expect(evenResult.status).toBe('completed');
    if (evenResult.status === 'completed') {
      expect(evenResult.result).toBe('even: 4');
    }
    // Reset states for odd number test
    states.length = 0;
    //  workflow.store.getState().reset();
    // Test odd number
    const oddResult = await workflow.start(5, unsubscribe);
    await new Promise((resolve) => setTimeout(resolve, 100));
    // unsubscribe();
    // Verify odd number states
    expect(states).toContainEqual({ step: 'running', workflow: 'running' });
    expect(states).toContainEqual({ step: 'completed', workflow: 'running' });
    expect(oddResult.status).toBe('completed');
    if (oddResult.status === 'completed') {
      expect(oddResult.result).toBe('odd: 5');
    }
  });
  // Test state transitions in foreach steps
  it('should handle state transitions in foreach steps', async () => {
    const processStep = createStep({
      id: 'process',
      inputSchema: z.number(),
      outputSchema: z.number(),
      execute: async ({ inputData }) => {
        return (inputData as number) * 2;
      },
    });
    const workflow = createWorkflow({
      id: 'foreach-states-test',
      inputSchema: z.array(z.number()),
      outputSchema: z.array(z.number()),
    });
    // Use foreach with concurrency of 2
    workflow.foreach(processStep, { concurrency: 2 });
    // Set up state monitoring
    const states: { step: string; workflow: string }[] = [];
    const unsubscribe = (state: RunStore) => {
      const lastLog = state.logs[state.logs.length - 1];
      if (lastLog?.type === 'step' && lastLog.stepStatus) {
        states.push({
          step: lastLog.stepStatus,
          workflow: state.status.toLowerCase(),
        });
      }
    };
    // Test with array of numbers
    const result = await workflow.start([1, 2, 3, 4, 5], unsubscribe);
    await new Promise((resolve) => setTimeout(resolve, 100));
    // unsubscribe();
    // Verify states
    // Should have running and completed states for each item
    expect(states).toContainEqual({ step: 'running', workflow: 'running' });
    expect(states).toContainEqual({ step: 'completed', workflow: 'running' });
    // Verify final result
    expect(result.status).toBe('completed');
    if (result.status === 'completed') {
      expect(result.result).toEqual([2, 4, 6, 8, 10]);
    }
    // Verify that we have the correct number of state transitions
    // For each item: running -> completed
    const runningStates = states.filter((s) => s.step === 'running');
    const completedStates = states.filter((s) => s.step === 'completed');
    expect(runningStates.length).toBe(5); // One running state per item
    expect(completedStates.length).toBe(5); // One completed state per item
  });
});
