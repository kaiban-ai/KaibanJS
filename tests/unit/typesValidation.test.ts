import {
  getParsedJSON,
  AgentResponse,
  ActionInput,
} from '../../src/utils/parser';
import { oset } from '../../src/utils/objectUtils';

/**
 * Type test suite that validates TypeScript typing has been implemented correctly.
 * These tests check both compile-time and runtime type compatibility.
 */
describe('TypeScript Type Validation', () => {
  describe('Parser Module Types', () => {
    test('AgentResponse type should accept all valid properties', () => {
      // This is mostly a compile-time test
      const validResponse: AgentResponse = {
        thought: 'This is a thought',
        action: 'test_action',
        actionInput: { query: 'test query' },
        observation: 'This is an observation',
        isFinalAnswerReady: true,
        finalAnswer: 'Final answer',
      };

      // Basic runtime validations
      expect(typeof validResponse.thought).toBe('string');
      expect(typeof validResponse.action).toBe('string');
      expect(validResponse.actionInput).toBeInstanceOf(Object);
      expect(typeof validResponse.observation).toBe('string');
      expect(typeof validResponse.isFinalAnswerReady).toBe('boolean');
      expect(typeof validResponse.finalAnswer).toBe('string');
    });

    test('ActionInput type should accept valid key-value pairs', () => {
      const validInput: ActionInput = {
        query: 'search term',
        limit: 10,
        filters: {
          category: 'news',
          date: '2023-01-01',
        },
      };

      expect(validInput.query).toBe('search term');
      expect(validInput.limit).toBe(10);
      expect(validInput.filters).toHaveProperty('category');
    });

    test('getParsedJSON should handle edge cases with correct types', () => {
      // Empty object
      const emptyResult = getParsedJSON('{}');
      const emptyCheck: AgentResponse = emptyResult; // Type check
      expect(emptyCheck).toEqual({});

      // Malformed JSON should still return an object matching AgentResponse
      const malformedResult = getParsedJSON('This is not JSON');
      const malformedCheck: AgentResponse = malformedResult; // Type check
      expect(typeof malformedCheck).toBe('object');
    });
  });

  describe('Object Utilities Types', () => {
    test('oset function should handle typed objects', () => {
      // Create a typed object
      const testObj: Record<string, unknown> = {};

      // Test that oset works with typed objects
      oset(testObj, 'key1', 'value1');
      oset(testObj, 'nested.key', 123);

      expect(testObj).toHaveProperty('key1', 'value1');
      expect(testObj).toHaveProperty('nested');
      expect((testObj.nested as Record<string, unknown>).key).toBe(123);
    });
  });

  // Add more type tests for other key modules as needed
});
