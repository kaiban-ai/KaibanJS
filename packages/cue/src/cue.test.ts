import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { Cue } from './cue';
import type { CueResult } from './types';

describe('Cue', () => {
  // Test basic block execution
  it('should execute blocks in sequence', async () => {
    const addBlock = Cue.createBlock({
      id: 'add',
      inputSchema: z.object({ a: z.number(), b: z.number() }),
      outputSchema: z.number(),
      execute: async ({ inputData }) => {
        const { a, b } = inputData as { a: number; b: number };
        return (a + b) as number;
      },
    });

    const multiplyBlock = Cue.createBlock({
      id: 'multiply',
      inputSchema: z.number(),
      outputSchema: z.number(),
      execute: async ({ inputData, getInitData }) => {
        const sum = inputData as number;
        const { a, b } = getInitData() as { a: number; b: number };
        return sum * a * b;
      },
    });

    const cue = Cue.createCue({
      id: 'math',
      inputSchema: z.object({ a: z.number(), b: z.number() }),
      outputSchema: z.number(),
    });

    cue.then(addBlock).then(multiplyBlock);

    const result = await cue.start({ a: 2, b: 3 });

    expect(result.status).toBe('completed');
    if (result.status === 'completed') {
      expect(result.result).toBe(30);
    }
  });

  // Test error handling
  it('should handle errors gracefully', async () => {
    const errorBlock = Cue.createBlock({
      id: 'error',
      inputSchema: z.any(),
      outputSchema: z.any(),
      execute: async () => {
        throw new Error('Test error');
      },
    });

    const cue = Cue.createCue({
      id: 'error-test',
      inputSchema: z.any(),
      outputSchema: z.any(),
    });

    cue.then(errorBlock);

    const result = await cue.start({});
    expect(result.status).toBe('failed');
    if (result.status === 'failed') {
      expect(result.error?.message).toBe('Test error');
    }
  });

  // Test input/output validation
  it('should validate input and output schemas', async () => {
    const validationBlock = Cue.createBlock({
      id: 'validate',
      inputSchema: z.number(),
      outputSchema: z.string(),
      execute: async ({ inputData }) => {
        return (inputData as number).toString();
      },
    });

    const cue = Cue.createCue({
      id: 'validation-test',
      inputSchema: z.number(),
      outputSchema: z.string(),
    });

    cue.then(validationBlock);

    // Test invalid input
    const reject = await cue.start({} as any);
    expect(reject.status).toBe('failed');

    // Test valid input
    const result = await cue.start(42);
    expect(result.status).toBe('completed');
    if (result.status === 'completed') {
      expect(result.result).toBe('42');
    }
  });

  // Test parallel execution
  it('should execute blocks in parallel', async () => {
    const block1 = Cue.createBlock({
      id: 'block1',
      inputSchema: z.number(),
      outputSchema: z.number(),
      execute: async ({ inputData }) => (inputData as number) * 2,
    });

    const block2 = Cue.createBlock({
      id: 'block2',
      inputSchema: z.number(),
      outputSchema: z.number(),
      execute: async ({ inputData }) => (inputData as number) * 3,
    });

    const sumBlock = Cue.createBlock({
      id: 'sum',
      inputSchema: z.number(),
      outputSchema: z.number(),
      execute: async ({ getBlockResult }) => {
        const result1 = getBlockResult(block1);
        const result2 = getBlockResult(block2);
        return result1 + result2;
      },
    });

    const cue = Cue.createCue({
      id: 'parallel-test',
      inputSchema: z.number(),
      outputSchema: z.number(),
    });

    cue.parallel([block1, block2]).then(sumBlock);

    const result = await cue.start(2);
    expect(result.status).toBe('completed');
    if (result.status === 'completed') {
      expect(result.result).toBe(10); // (2*2) + (2*3)
    }
  });

  // Test do-while loop
  it('should execute blocks in a do-while loop', async () => {
    const counterBlock = Cue.createBlock({
      id: 'counter',
      inputSchema: z.number(),
      outputSchema: z.number(),
      execute: async ({ inputData, getBlockResult }) => {
        const result = (inputData as number) + 1;
        return result;
      },
    });

    const cue = Cue.createCue({
      id: 'dowhile-test',
      inputSchema: z.number(),
      outputSchema: z.number(),
    });

    cue.dowhile(counterBlock, async ({ inputData, getBlockResult }) => {
      try {
        const count = getBlockResult(counterBlock);
        return count < 3;
      } catch (error) {
        console.error('Error in condition:', error);
        return false;
      }
    });

    const result = await cue.start(0);
    expect(result.status).toBe('completed');
    if (result.status === 'completed') {
      expect(result.result).toBe(3);
    }
  });

  // Test do-until loop
  it('should execute blocks in a do-until loop', async () => {
    const counterBlock = Cue.createBlock({
      id: 'counter',
      inputSchema: z.number(),
      outputSchema: z.number(),
      execute: async ({ inputData }) => (inputData as number) + 1,
    });

    const cue = Cue.createCue({
      id: 'dountil-test',
      inputSchema: z.number(),
      outputSchema: z.number(),
    });

    cue.dountil(counterBlock, async ({ getBlockResult }) => {
      const count = getBlockResult(counterBlock);
      return count >= 3;
    });

    const result = await cue.start(0);
    expect(result.status).toBe('completed');
    if (result.status === 'completed') {
      expect(result.result).toBe(3);
    }
  });

  // // Test foreach execution
  it('should execute blocks in a foreach loop', async () => {
    const processItemBlock = Cue.createBlock({
      id: 'process',
      inputSchema: z.number(),
      outputSchema: z.number(),
      execute: async ({ inputData }) => {
        return (inputData as number) * 2;
      },
    });

    const cue = Cue.createCue({
      id: 'foreach-test',
      inputSchema: z.array(z.number()),
      outputSchema: z.array(z.number()),
    });

    cue.foreach(processItemBlock, { concurrency: 2 });

    const result = await cue.start([1, 2, 3, 4, 5]);
    expect(result.status).toBe('completed');
    if (result.status === 'completed') {
      expect(result.result).toEqual([2, 4, 6, 8, 10]);
    }
  });

  // // Test conditional execution (if-else)
  it('should execute blocks conditionally', async () => {
    const evenBlock = Cue.createBlock({
      id: 'even',
      inputSchema: z.number(),
      outputSchema: z.string(),
      execute: async () => 'even',
    });

    const oddBlock = Cue.createBlock({
      id: 'odd',
      inputSchema: z.number(),
      outputSchema: z.string(),
      execute: async () => 'odd',
    });

    const cue = Cue.createCue({
      id: 'conditional-test',
      inputSchema: z.number(),
      outputSchema: z.string(),
    });

    cue.branch([
      [async ({ inputData }) => (inputData as number) % 2 === 0, evenBlock],
      [async () => true, oddBlock],
    ]);

    // Test even number
    const evenResult = await cue.start(4);
    expect(evenResult.status).toBe('completed');
    if (evenResult.status === 'completed') {
      expect(evenResult.result).toBe('even');
    }

    // Test odd number
    const oddResult = await cue.start(3);
    expect(oddResult.status).toBe('completed');
    if (oddResult.status === 'completed') {
      expect(oddResult.result).toBe('odd');
    }
  });

  // // Test nested execution patterns
  it('should handle nested execution patterns', async () => {
    // Block that adds two numbers
    const addBlock = Cue.createBlock({
      id: 'add',
      inputSchema: z.object({ a: z.number(), b: z.number() }),
      outputSchema: z.number(),
      execute: async ({ inputData }) => {
        const { a, b } = inputData as { a: number; b: number };
        return a + b;
      },
    });

    // Block that multiplies a number by 2
    const doubleBlock = Cue.createBlock({
      id: 'double',
      inputSchema: z.number(),
      outputSchema: z.number(),
      execute: async ({ inputData }) => {
        return (inputData as number) * 2;
      },
    });

    // Block that increments a number
    const incrementBlock = Cue.createBlock({
      id: 'increment',
      inputSchema: z.number(),
      outputSchema: z.number(),
      execute: async ({ inputData }) => {
        return (inputData as number) + 1;
      },
    });

    const cue = Cue.createCue({
      id: 'nested-test',
      inputSchema: z.object({ a: z.number(), b: z.number() }),
      outputSchema: z.number(),
    });

    // Flow: add -> if(sum > 10) -> double : increment
    cue.then(addBlock).branch([
      [
        async ({ getBlockResult }) => {
          const result = getBlockResult(addBlock);
          if (typeof result !== 'number') {
            throw new Error('Expected number from addBlock');
          }
          return result > 10;
        },
        doubleBlock,
      ],
      [async () => true, incrementBlock],
    ]);

    // Test case 1: a=5, b=6 -> sum=11 > 10 -> double(11)=22
    const result1 = await cue.start({ a: 5, b: 6 });

    expect(result1.status).toBe('completed');
    if (result1.status === 'completed') {
      expect(result1.result).toBe(22);
    }

    // Test case 2: a=2, b=3 -> sum=5 < 10 -> increment(5)=6
    const result2 = await cue.start({ a: 2, b: 3 });
    expect(result2.status).toBe('completed');
    if (result2.status === 'completed') {
      expect(result2.result).toBe(6);
    }
  });

  // // Test watch events

  // Test nested cues
  it('should handle nested cues as blocks', async () => {
    // Create a nested cue that processes a number
    const nestedCue = Cue.createCue({
      id: 'nested-cue',
      inputSchema: z.number(),
      outputSchema: z.number(),
    });

    // Add blocks to the nested cue
    const doubleBlock = Cue.createBlock({
      id: 'double',
      inputSchema: z.number(),
      outputSchema: z.number(),
      execute: async ({ inputData }) => (inputData as number) * 2,
    });

    const incrementBlock = Cue.createBlock({
      id: 'increment',
      inputSchema: z.number(),
      outputSchema: z.number(),
      execute: async ({ inputData }) => (inputData as number) + 1,
    });

    nestedCue.then(doubleBlock).then(incrementBlock);

    // Create the main cue that uses the nested cue
    const mainCue = Cue.createCue({
      id: 'main-cue',
      inputSchema: z.object({ a: z.number(), b: z.number() }),
      outputSchema: z.number(),
    });

    // Add blocks to the main cue
    const addBlock = Cue.createBlock({
      id: 'add',
      inputSchema: z.object({ a: z.number(), b: z.number() }),
      outputSchema: z.number(),
      execute: async ({ inputData }) => {
        const { a, b } = inputData as { a: number; b: number };
        return a + b;
      },
    });

    // Flow: add -> nested-cue -> handle-nested-result
    mainCue.then(addBlock).then(nestedCue);

    // Test case 1: (2 + 3) -> double(5) -> increment(10) = 11
    const result1 = await mainCue.start({ a: 2, b: 3 });
    expect(result1.status).toBe('completed');
    if (result1.status === 'completed') {
      expect(result1.result).toBe(11);
    }

    // Test case 2: (5 + 5) -> double(10) -> increment(20) = 21
    const result2 = await mainCue.start({ a: 5, b: 5 });
    expect(result2.status).toBe('completed');
    if (result2.status === 'completed') {
      expect(result2.result).toBe(21);
    }
  });

  // Test nested cues with conditional execution
  it('should handle nested cues in conditional execution', async () => {
    // Create a nested cue for even numbers
    const evenCue = Cue.createCue({
      id: 'even-cue',
      inputSchema: z.number(),
      outputSchema: z.number(),
    });

    const doubleBlock = Cue.createBlock({
      id: 'double',
      inputSchema: z.number(),
      outputSchema: z.number(),
      execute: async ({ inputData }) => (inputData as number) * 2,
    });

    evenCue.then(doubleBlock);

    // Create a nested cue for odd numbers
    const oddCue = Cue.createCue({
      id: 'odd-cue',
      inputSchema: z.number(),
      outputSchema: z.number(),
    });

    const tripleBlock = Cue.createBlock({
      id: 'triple',
      inputSchema: z.number(),
      outputSchema: z.number(),
      execute: async ({ inputData }) => (inputData as number) * 3,
    });

    oddCue.then(tripleBlock);

    // Create the main cue
    const mainCue = Cue.createCue({
      id: 'main-cue',
      inputSchema: z.number(),
      outputSchema: z.number(),
    });

    // Flow: if(number % 2 === 0) -> even-cue : odd-cue -> handle-nested-result
    mainCue.branch([
      [async ({ inputData }) => (inputData as number) % 2 === 0, evenCue],
      [async () => true, oddCue],
    ]);

    // Test case 1: 4 (even) -> double(4) = 8
    const result1 = await mainCue.start(4);
    expect(result1.status).toBe('completed');
    if (result1.status === 'completed') {
      expect(result1.result).toBe(8);
    }

    // Test case 2: 5 (odd) -> triple(5) = 15
    const result2 = await mainCue.start(5);
    expect(result2.status).toBe('completed');
    if (result2.status === 'completed') {
      expect(result2.result).toBe(15);
    }
  });

  // Test nested cues with parallel execution
  it('should handle nested cues in parallel execution', async () => {
    // Create a nested cue for processing numbers
    const processCue = Cue.createCue({
      id: 'process-cue',
      inputSchema: z.number(),
      outputSchema: z.number(),
    });

    const doubleBlock = Cue.createBlock({
      id: 'double',
      inputSchema: z.number(),
      outputSchema: z.number(),
      execute: async ({ inputData }) => (inputData as number) * 2,
    });

    processCue.then(doubleBlock);

    // Create the main cue
    const mainCue = Cue.createCue({
      id: 'main-cue',
      inputSchema: z.number(),
      outputSchema: z.number(),
    });

    // Create a block to handle nested cue results
    const handleNestedResultsBlock = Cue.createBlock({
      id: 'handle-nested-results',
      inputSchema: z.any(),
      outputSchema: z.number(),
      execute: async ({ getBlockResult }) => {
        const result1 = getBlockResult(processCue);
        const result2 = getBlockResult(processCue);
        return result1 + result2;
      },
    });

    // Flow: parallel(process-cue, process-cue) -> handle-nested-results
    mainCue.parallel([processCue, processCue]).then(handleNestedResultsBlock);

    // Test case: 2 -> parallel(double(2), double(2)) -> sum(4 + 4) = 8
    const result = await mainCue.start(2);
    expect(result.status).toBe('completed');
    if (result.status === 'completed') {
      expect(result.result).toBe(8);
    }
  });

  // Test map functionality
  describe('map functionality', () => {
    // Test basic mapping between blocks
    it('should map data between blocks', async () => {
      const userBlock = Cue.createBlock({
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

      const profileBlock = Cue.createBlock({
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

      const cue = Cue.createCue({
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

      cue
        .then(userBlock)
        .map({
          profile: {
            block: userBlock,
            path: 'user',
          },
        })
        .then(profileBlock);

      const result = await cue.start({ userId: '123' });
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
      const processBlock = Cue.createBlock({
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

      const cue = Cue.createCue({
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

      cue.then(processBlock).map({
        result: {
          block: processBlock,
          path: 'result',
        },
      });

      const result = await cue.start({ data: 'test' });
      expect(result.status).toBe('completed');
      if (result.status === 'completed') {
        expect(result.result).toHaveProperty('result.data', 'test');
        expect(result.result).toHaveProperty('result.timestamp');
        expect(result.result).toHaveProperty('result.version', '1.0.0');
      }
    });

    // Test mapping with function transformation
    it('should handle function transformations in mapping', async () => {
      type DataBlockOutput = {
        numbers: number[];
        sum: number;
      };

      const dataBlock = Cue.createBlock({
        id: 'data',
        inputSchema: z.object({ numbers: z.array(z.number()) }),
        outputSchema: z.object({
          numbers: z.array(z.number()),
          sum: z.number(),
        }),
        execute: async ({ inputData }): Promise<DataBlockOutput> => {
          const sum = inputData.numbers.reduce((a, b) => a + b, 0);
          return {
            numbers: inputData.numbers,
            sum,
          };
        },
      });

      const cue = Cue.createCue({
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

      cue.then(dataBlock).map(async ({ getBlockResult }) => {
        const data = getBlockResult(dataBlock) as DataBlockOutput;
        return {
          result: {
            numbers: data.numbers,
            sum: data.sum,
            average: data.sum / data.numbers.length,
          },
        };
      });

      const result = await cue.start({ numbers: [1, 2, 3, 4, 5] });

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
      const processBlock = Cue.createBlock({
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

      const cue = Cue.createCue({
        id: 'context-mapping-test',
        inputSchema: z.object({ data: z.string() }),
        outputSchema: z.object({
          result: z.object({
            data: z.string(),
            context: z.any(),
          }),
        }),
      });

      cue.then(processBlock).map({
        result: {
          block: processBlock,
          path: 'result',
        },
      });

      const result = await cue.start({ data: 'test' });
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
      const userBlock = Cue.createBlock({
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

      const cue = Cue.createCue({
        id: 'nested-mapping-test',
        inputSchema: z.object({ userId: z.string() }),
        outputSchema: z.object({
          location: z.object({
            city: z.string(),
            country: z.string(),
          }),
        }),
      });

      cue.then(userBlock).map({
        location: {
          block: userBlock,
          path: 'user.profile.address',
        },
      });

      const result = await cue.start({ userId: '123' });
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
  it('should handle block suspension and resumption', async () => {
    const suspendableBlock = Cue.createBlock({
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

    const cue = Cue.createCue({
      id: 'suspend-test',
      inputSchema: z.object({ value: z.number() }),
      outputSchema: z.object({ result: z.number() }),
    });

    cue.then(suspendableBlock);

    // Test suspension
    const suspendResult = await cue.start({ value: -1 });

    expect(suspendResult.status).toBe('suspended');
    if (suspendResult.status === 'suspended') {
      expect(suspendResult.suspended).toBeDefined();
      expect(suspendResult.steps['suspendable'].output).toEqual({
        reason: 'negative_value',
      });
    }

    // Test resumption
    const resumeResult = await cue.resume({
      block: 'suspendable',
      resumeData: { continue: true, value: 1 },
    });

    expect(resumeResult.status).toBe('completed');
    if (resumeResult.status === 'completed') {
      expect(resumeResult.result).toEqual({ result: 2 });
    }
  });

  // Test suspend and resume with multiple blocks
  it('should handle suspension and resumption in a chain of blocks', async () => {
    const firstBlock = Cue.createBlock({
      id: 'first',
      inputSchema: z.object({ value: z.number() }),
      outputSchema: z.object({ result: z.number() }),
      execute: async ({ inputData }): Promise<{ result: number }> => {
        const { value } = inputData as { value: number };
        return { result: value * 2 };
      },
    });

    const suspendableBlock = Cue.createBlock({
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

    const cue = Cue.createCue({
      id: 'chain-suspend-test',
      inputSchema: z.object({ value: z.number() }),
      outputSchema: z.object({ final: z.number() }),
    });

    cue.then(firstBlock).then(suspendableBlock);

    // Test suspension in chain
    const suspendResult = await cue.start({ value: -1 });
    expect(suspendResult.status).toBe('suspended');

    if (suspendResult.status === 'suspended') {
      expect(suspendResult.steps['first'].output).toEqual({ result: -2 });
      expect(suspendResult.steps['suspendable'].output).toEqual({
        reason: 'negative_value',
      });
    }

    // Test resumption with continue: false
    const resumeResult1 = await cue.resume({
      block: 'suspendable',
      resumeData: { continue: false, result: 1 },
    });
    expect(resumeResult1.status).toBe('suspended');
    if (resumeResult1.status === 'suspended') {
      expect(resumeResult1.steps['suspendable'].output).toEqual({
        reason: 'operation_cancelled',
      });
    }

    // Test successful resumption
    const resumeResult2 = await cue.resume({
      block: 'suspendable',
      resumeData: { continue: true, result: 2 },
    });

    expect(resumeResult2.status).toBe('completed');
    if (resumeResult2.status === 'completed') {
      expect(resumeResult2.result).toEqual({ final: 6 }); // -2 * 3
    }
  });

  // // Test suspend and resume with parallel blocks
  it('should handle suspension and resumption in parallel blocks', async () => {
    const suspendableBlock1 = Cue.createBlock({
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

    const suspendableBlock2 = Cue.createBlock({
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

    const sumBlock = Cue.createBlock({
      id: 'sum',
      inputSchema: z.any(),
      outputSchema: z.number(),
      execute: async ({ getBlockResult }): Promise<number> => {
        const result1 = getBlockResult(suspendableBlock1) as unknown as {
          result: number;
        };
        const result2 = getBlockResult(suspendableBlock2) as unknown as {
          result: number;
        };
        return result1.result + result2.result;
      },
    });

    const cue = Cue.createCue({
      id: 'parallel-suspend-test',
      inputSchema: z.number(),
      outputSchema: z.number(),
    });

    cue.parallel([suspendableBlock1, suspendableBlock2]).then(sumBlock);

    // Test suspension in parallel
    const suspendResult = await cue.start(-1);

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
    const resumeResult1 = await cue.resume({
      block: ['suspendable1', 'suspendable2'],
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

// Test block and cue states
describe('Block and Cue States', () => {
  // Test running state
  it('should track running state of blocks and cue', async () => {
    const slowBlock = Cue.createBlock({
      id: 'slow-block',
      inputSchema: z.number(),
      outputSchema: z.number(),
      execute: async ({ inputData }) => {
        // await new Promise((resolve) => setTimeout(resolve, 1000));
        return (inputData as number) * 2;
      },
    });

    const cue = Cue.createCue({
      id: 'running-state-test',
      inputSchema: z.number(),
      outputSchema: z.number(),
    });

    cue.then(slowBlock);

    // Set up state monitoring
    const states: { block: string; cue: string }[] = [];
    const unsubscribe = cue.store.subscribe((state) => {
      const lastLog = state.logs[state.logs.length - 1];
      if (lastLog?.logType === 'BlockStatusUpdate' && lastLog.blockStatus) {
        states.push({
          block: lastLog.blockStatus,
          cue: state.status.toLowerCase(),
        });
      }
    });

    // Start execution
    const result = await cue.start(5);

    await new Promise((resolve) => setTimeout(resolve, 100));
    unsubscribe();
    // console.log('States:', states);

    // Verify states
    expect(states).toContainEqual({ block: 'running', cue: 'running' });
    expect(result.status).toBe('completed');
    if (result.status === 'completed') {
      expect(result.result).toBe(10);
    }
  });

  // Test suspended state
  it('should handle suspended state correctly', async () => {
    const suspendableBlock = Cue.createBlock({
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

    const cue = Cue.createCue({
      id: 'suspended-state-test',
      inputSchema: z.object({ value: z.number() }),
      outputSchema: z.number(),
    });

    cue.then(suspendableBlock);

    // Set up state monitoring
    const states: { block: string; cue: string }[] = [];
    const unsubscribe = cue.store.subscribe((state) => {
      const lastLog = state.logs[state.logs.length - 1];
      if (lastLog?.logType === 'BlockStatusUpdate' && lastLog.blockStatus) {
        states.push({
          block: lastLog.blockStatus,
          cue: state.status.toLowerCase(),
        });
      }
    });

    // Test suspension
    const suspendResult = await cue.start({ value: -1 });
    await new Promise((resolve) => setTimeout(resolve, 100));
    unsubscribe();

    // Verify states
    expect(states).toContainEqual({ block: 'suspended', cue: 'running' });
    expect(suspendResult.status).toBe('suspended');
    if (suspendResult.status === 'suspended') {
      expect(suspendResult.steps['suspendable'].output).toEqual({
        reason: 'negative_value',
      });
    }
  });

  // Test failed state
  it('should handle failed state correctly', async () => {
    const failingBlock = Cue.createBlock({
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

    const cue = Cue.createCue({
      id: 'failed-state-test',
      inputSchema: z.number(),
      outputSchema: z.number(),
    });

    cue.then(failingBlock);

    // Set up state monitoring
    const states: { block: string; cue: string }[] = [];
    const unsubscribe = cue.store.subscribe((state) => {
      const lastLog = state.logs[state.logs.length - 1];
      if (lastLog?.logType === 'BlockStatusUpdate' && lastLog.blockStatus) {
        states.push({
          block: lastLog.blockStatus,
          cue: state.status.toLowerCase(),
        });
      }
    });

    // Test failure
    const failResult = await cue.start(-1);
    await new Promise((resolve) => setTimeout(resolve, 100));
    unsubscribe();

    // Verify states
    expect(states).toContainEqual({ block: 'failed', cue: 'running' });
    expect(failResult.status).toBe('failed');
    if (failResult.status === 'failed') {
      expect(failResult.error?.message).toBe('Negative value not allowed');
    }
  });

  // Test completed state
  it('should handle completed state correctly', async () => {
    const successBlock = Cue.createBlock({
      id: 'success',
      inputSchema: z.number(),
      outputSchema: z.number(),
      execute: async ({ inputData }) => {
        return (inputData as number) * 2;
      },
    });

    const cue = Cue.createCue({
      id: 'completed-state-test',
      inputSchema: z.number(),
      outputSchema: z.number(),
    });

    cue.then(successBlock);

    // Set up state monitoring
    const states: { block: string; cue: string }[] = [];
    const unsubscribe = cue.store.subscribe((state) => {
      const lastLog = state.logs[state.logs.length - 1];
      if (lastLog?.logType === 'BlockStatusUpdate' && lastLog.blockStatus) {
        states.push({
          block: lastLog.blockStatus,
          cue: state.status.toLowerCase(),
        });
      }
    });

    // Test completion
    const completeResult = await cue.start(5);
    await new Promise((resolve) => setTimeout(resolve, 100));
    unsubscribe();

    // Verify states
    expect(states).toContainEqual({ block: 'completed', cue: 'running' });
    expect(completeResult.status).toBe('completed');
    if (completeResult.status === 'completed') {
      expect(completeResult.result).toBe(10);
    }
  });

  // Test state transitions in parallel blocks
  it('should handle state transitions in parallel blocks', async () => {
    const parallelBlock1 = Cue.createBlock({
      id: 'parallel1',
      inputSchema: z.number(),
      outputSchema: z.number(),
      execute: async ({ inputData }) => {
        // await new Promise((resolve) => setTimeout(resolve, 3000));
        return (inputData as number) * 2;
      },
    });

    const parallelBlock2 = Cue.createBlock({
      id: 'parallel2',
      inputSchema: z.number(),
      outputSchema: z.number(),
      execute: async ({ inputData }) => {
        // await new Promise((resolve) => setTimeout(resolve, 3000));
        return (inputData as number) * 3;
      },
    });

    const cue = Cue.createCue({
      id: 'parallel-state-test',
      inputSchema: z.number(),
      outputSchema: z.number(),
    });

    cue.parallel([parallelBlock1, parallelBlock2]);

    // Monitor states with detailed logging
    const states: Array<{ block: string; cue: string }> = [];
    const unsubscribe = cue.store.subscribe((state) => {
      const lastLog = state.logs[state.logs.length - 1];

      if (lastLog?.logType === 'BlockStatusUpdate' && lastLog.blockStatus) {
        const stateUpdate = {
          block: lastLog.blockStatus,
          cue: state.status.toLowerCase(),
        };
        states.push(stateUpdate);
      }
    });

    // Start execution
    const result = await cue.start(5);
    // Clean up
    unsubscribe();

    // Verify states
    expect(states).toContainEqual({ block: 'completed', cue: 'running' });
    expect(result.status).toBe('completed');
    if (result.status === 'completed') {
      expect(result.result).toEqual({
        parallel1: 10,
        parallel2: 15,
      });
    }
  });

  // Test state transitions in conditional blocks
  it('should handle state transitions in conditional blocks', async () => {
    const evenBlock = Cue.createBlock({
      id: 'even',
      inputSchema: z.number(),
      outputSchema: z.string(),
      execute: async ({ inputData }) => {
        return `even: ${inputData}`;
      },
    });

    const oddBlock = Cue.createBlock({
      id: 'odd',
      inputSchema: z.number(),
      outputSchema: z.string(),
      execute: async ({ inputData }) => {
        return `odd: ${inputData}`;
      },
    });

    const cue = Cue.createCue({
      id: 'conditional-states-test',
      inputSchema: z.number(),
      outputSchema: z.string(),
    });

    // Use branch to create conditional execution
    cue.branch([
      [async ({ inputData }) => (inputData as number) % 2 === 0, evenBlock],
      [async ({ inputData }) => (inputData as number) % 2 !== 0, oddBlock],
    ]);

    // Set up state monitoring
    const states: { block: string; cue: string }[] = [];
    const unsubscribe = cue.store.subscribe((state) => {
      // console.log('Store Update:', state);

      const lastLog = state.logs[state.logs.length - 1];
      if (lastLog?.logType === 'BlockStatusUpdate' && lastLog.blockStatus) {
        states.push({
          block: lastLog.blockStatus,
          cue: state.status.toLowerCase(),
        });
      }
    });

    // Test even number
    const evenResult = await cue.start(4);
    await new Promise((resolve) => setTimeout(resolve, 100));

    // console.log('States:', states);

    // Verify even number states
    expect(states).toContainEqual({ block: 'running', cue: 'running' });
    expect(states).toContainEqual({ block: 'completed', cue: 'running' });
    expect(evenResult.status).toBe('completed');
    if (evenResult.status === 'completed') {
      expect(evenResult.result).toBe('even: 4');
    }

    // Reset states for odd number test
    states.length = 0;
    cue.store.getState().reset();

    // Test odd number
    const oddResult = await cue.start(5);
    await new Promise((resolve) => setTimeout(resolve, 100));
    unsubscribe();

    // Verify odd number states
    expect(states).toContainEqual({ block: 'running', cue: 'running' });
    expect(states).toContainEqual({ block: 'completed', cue: 'running' });
    expect(oddResult.status).toBe('completed');
    if (oddResult.status === 'completed') {
      expect(oddResult.result).toBe('odd: 5');
    }
  });

  // Test state transitions in foreach blocks
  it('should handle state transitions in foreach blocks', async () => {
    const processBlock = Cue.createBlock({
      id: 'process',
      inputSchema: z.number(),
      outputSchema: z.number(),
      execute: async ({ inputData }) => {
        return (inputData as number) * 2;
      },
    });

    const cue = Cue.createCue({
      id: 'foreach-states-test',
      inputSchema: z.array(z.number()),
      outputSchema: z.array(z.number()),
    });

    // Use foreach with concurrency of 2
    cue.foreach(processBlock, { concurrency: 2 });

    // Set up state monitoring
    const states: { block: string; cue: string }[] = [];
    const unsubscribe = cue.store.subscribe((state) => {
      const lastLog = state.logs[state.logs.length - 1];
      if (lastLog?.logType === 'BlockStatusUpdate' && lastLog.blockStatus) {
        states.push({
          block: lastLog.blockStatus,
          cue: state.status.toLowerCase(),
        });
      }
    });

    // Test with array of numbers
    const result = await cue.start([1, 2, 3, 4, 5]);
    await new Promise((resolve) => setTimeout(resolve, 100));
    unsubscribe();

    // Verify states
    // Should have running and completed states for each item
    expect(states).toContainEqual({ block: 'running', cue: 'running' });
    expect(states).toContainEqual({ block: 'completed', cue: 'running' });

    // Verify final result
    expect(result.status).toBe('completed');
    if (result.status === 'completed') {
      expect(result.result).toEqual([2, 4, 6, 8, 10]);
    }

    // Verify that we have the correct number of state transitions
    // For each item: running -> completed
    const runningStates = states.filter((s) => s.block === 'running');
    const completedStates = states.filter((s) => s.block === 'completed');
    expect(runningStates.length).toBe(5); // One running state per item
    expect(completedStates.length).toBe(5); // One completed state per item
  });
});
