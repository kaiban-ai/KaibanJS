import {
  parseClaudeJsonOutput,
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

/** Full Team + mock run: see `playground/external-coding-agents` (`npm start`). */
