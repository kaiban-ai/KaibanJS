import {
  parseClaudeJsonOutput,
  parseCodexJsonOutput,
  parseOpenCodeJsonOutput,
} from '../../src/agents/externalCoding/cliCodingDrivers';

describe('External coding — JSON parsers', () => {
  test('parseClaudeJsonOutput reads result and structured_output', () => {
    const out = parseClaudeJsonOutput(
      JSON.stringify({
        result: 'summary',
        session_id: 's1',
        structured_output: { a: 1 },
      })
    );
    expect(out.text).toBe('summary');
    expect(out.structured).toEqual({ a: 1 });
  });

  test('parseOpenCodeJsonOutput prefers last JSON line', () => {
    const out = parseOpenCodeJsonOutput(
      '{"type":"init"}\n{"text":"final","foo":2}\n'
    );
    expect(out.text).toBe('final');
    expect(out.structured).toMatchObject({ text: 'final', foo: 2 });
  });
});

describe('parseCodexJsonOutput', () => {
  const THREAD_STARTED = '{"type":"thread.started","thread_id":"abc123"}';
  const TURN_STARTED = '{"type":"turn.started"}';
  const TURN_COMPLETED =
    '{"type":"turn.completed","usage":{"input_tokens":100,"output_tokens":10}}';

  test('extracts text from a single agent_message item', () => {
    const stdout = [
      'Reading additional input from stdin...',
      THREAD_STARTED,
      TURN_STARTED,
      '{"type":"item.completed","item":{"id":"item_0","type":"agent_message","text":"hello world"}}',
      TURN_COMPLETED,
    ].join('\n');

    const out = parseCodexJsonOutput(stdout);
    expect(out.text).toBe('hello world');
    expect(out.structured).toBeUndefined();
  });

  test('joins multiple agent_message items with double newline', () => {
    const stdout = [
      THREAD_STARTED,
      TURN_STARTED,
      '{"type":"item.completed","item":{"id":"item_0","type":"agent_message","text":"first block"}}',
      '{"type":"item.completed","item":{"id":"item_1","type":"agent_message","text":"second block"}}',
      TURN_COMPLETED,
    ].join('\n');

    const out = parseCodexJsonOutput(stdout);
    expect(out.text).toBe('first block\n\nsecond block');
  });

  test('ignores non-agent_message item types', () => {
    const stdout = [
      THREAD_STARTED,
      TURN_STARTED,
      '{"type":"item.completed","item":{"id":"item_0","type":"tool_call","text":"should be ignored"}}',
      '{"type":"item.completed","item":{"id":"item_1","type":"agent_message","text":"real answer"}}',
      TURN_COMPLETED,
    ].join('\n');

    const out = parseCodexJsonOutput(stdout);
    expect(out.text).toBe('real answer');
  });

  test('falls back to raw stdout when no agent_message items are found', () => {
    const stdout = [THREAD_STARTED, TURN_STARTED, TURN_COMPLETED].join('\n');
    const out = parseCodexJsonOutput(stdout);
    expect(out.text).toBe(stdout.trim());
    expect(out.structured).toBeUndefined();
  });

  test('structured is undefined when turn.completed is absent', () => {
    const stdout =
      '{"type":"item.completed","item":{"id":"item_0","type":"agent_message","text":"hi"}}';
    const out = parseCodexJsonOutput(stdout);
    expect(out.text).toBe('hi');
    expect(out.structured).toBeUndefined();
  });

  test('handles empty stdout gracefully', () => {
    const out = parseCodexJsonOutput('');
    expect(out.text).toBe('');
    expect(out.structured).toBeUndefined();
  });

  test('skips malformed JSON lines without throwing', () => {
    const stdout = [
      'not json at all',
      '{"type":"item.completed","item":{"id":"item_0","type":"agent_message","text":"ok"}}',
      '{broken',
      TURN_COMPLETED,
    ].join('\n');

    const out = parseCodexJsonOutput(stdout);
    expect(out.text).toBe('ok');
  });
});

/** Full Team + mock run: see `playground/external-coding-agents` (`npm start`). */
