import { getParsedJSON, AgentResponse } from '../../src/utils/parser';

describe('Agents Utility Functions', () => {
  describe('getParsedJSON', () => {
    // Mock console.error to avoid polluting test output
    console.error = jest.fn();

    test('should correctly parse a well-formed JSON string', () => {
      const input = `{
                "thought": "To find detailed information about the Copa America 2024 winner, I need to search for the most recent and relevant information.",
                "action": "tavily_search_results_json",
                "actionInput": {"query":"Copa America 2024 winner results details"}
            }`;
      const result = getParsedJSON(input);
      expect(result).toEqual({
        thought:
          'To find detailed information about the Copa America 2024 winner, I need to search for the most recent and relevant information.',
        action: 'tavily_search_results_json',
        actionInput: { query: 'Copa America 2024 winner results details' },
      });
    });

    test('should handle JSON strings with line breaks and missing commas', () => {
      const input = `{
                "thought": "To find detailed information about the Copa America 2024 winner, I need to search for the most recent and relevant information."
                "action": "tavily_search_results_json",
                "actionInput": {"query":"Copa America 2024 winner results details"}
            }`;
      const result = getParsedJSON(input);
      expect(result).toEqual({
        thought:
          'To find detailed information about the Copa America 2024 winner, I need to search for the most recent and relevant information.',
        action: 'tavily_search_results_json',
        actionInput: { query: 'Copa America 2024 winner results details' },
      });
    });

    test('should handle JSON strings with line breaks and missing commas (Case 2)', () => {
      const input = `{\\n   "thought": "To find detailed information about the Copa America 2024 winner, I need to search for the most recent and relevant information. Since this is a future event, I should be cautious about the results and verify if the tournament has actually taken place."\\n   "action": "tavily_search_results_json",\\n   "actionInput": {"query":"Copa America 2024 winner results details"}\\n}`;
      const expectedOutput: AgentResponse = {
        thought:
          'To find detailed information about the Copa America 2024 winner, I need to search for the most recent and relevant information. Since this is a future event, I should be cautious about the results and verify if the tournament has actually taken place.',
        action: 'tavily_search_results_json',
        actionInput: { query: 'Copa America 2024 winner results details' },
      };
      const result = getParsedJSON(input);
      expect(result).toEqual(expectedOutput);
    });

    test('should handle JSON strings with leading non-JSON text and real newlines', () => {
      const input = `### Thought\n\n{\n    "thought": "To write a detailed article about the sports event, I need to first decide on the event, gather key information, and structure it into a well-organized piece.",\n    "action": "self_question",\n    "actionInput": {}\n}`;
      const expectedOutput: AgentResponse = {
        thought:
          'To write a detailed article about the sports event, I need to first decide on the event, gather key information, and structure it into a well-organized piece.',
        action: 'self_question',
        actionInput: {},
      };
      const result = getParsedJSON(input);
      expect(result).toEqual(expectedOutput);
    });

    test('should handle JSON strings with complex non-JSON text and real newlines', () => {
      const input = `### Thought\n\nI need to craft a well-structured and engaging sports article about the 2024 Copa America final match between Argentina and Colombia, focusing on Argentina's victory with a late goal in the 112th minute of extra time.\n\n{\n   "thought": "How can I craft a captivating sports article that highlights Argentina's thrilling win over Colombia in the 2024 Copa America final?",\n   "action": "self_question"\n}`;
      const expectedOutput: AgentResponse = {
        thought:
          "How can I craft a captivating sports article that highlights Argentina's thrilling win over Colombia in the 2024 Copa America final?",
        action: 'self_question',
      };
      const result = getParsedJSON(input);
      expect(result).toEqual(expectedOutput);
    });

    test('should handle JSON strings with markdown', () => {
      const input =
        '/```json\n{\n "thought": "To get the answer, I need to look for the latest Copa America tournament and its winner.",\n "action": "tavily_search_results_json",\n "actionInput": {"query": "Copa America 2024 winner"}\n}\n```';
      const expectedOutput: AgentResponse = {
        thought:
          'To get the answer, I need to look for the latest Copa America tournament and its winner.',
        action: 'tavily_search_results_json',
        actionInput: { query: 'Copa America 2024 winner' },
      };
      const result = getParsedJSON(input);
      expect(result).toEqual(expectedOutput);
    });

    // Type safety test
    test('type safety - return value should satisfy AgentResponse type', () => {
      const input = `{
                "thought": "Testing type safety",
                "action": "test_action",
                "actionInput": {"query":"test query"}
            }`;
      const result = getParsedJSON(input);

      // This is just a compile-time check
      const _typeCheck: AgentResponse = result;

      // Runtime assertions to ensure the object has the expected structure
      expect(typeof result.thought).toBe('string');
      expect(typeof result.action).toBe('string');
      expect(result.actionInput).toBeInstanceOf(Object);
    });
  });
});
