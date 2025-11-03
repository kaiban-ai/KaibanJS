import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConsoleExporter } from './ConsoleExporter';

// Mock span
const mockSpan = {
  name: 'test.span',
  status: { code: 1, message: undefined },
  duration: [1, 500000], // 1.5 seconds in [seconds, nanoseconds]
  startTime: [1234567890, 0], // Unix timestamp
  endTime: [1234567891, 500000000],
  attributes: {
    'test.key': 'test.value',
    'workflow.id': 'workflow-123',
  },
  events: [
    {
      name: 'test.event',
      attributes: { 'event.key': 'event.value' },
    },
  ],
};

describe('ConsoleExporter', () => {
  let exporter: ConsoleExporter;
  let consoleSpy: any;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    exporter = new ConsoleExporter(true);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('constructor', () => {
    it('should create exporter with enabled state', () => {
      const enabledExporter = new ConsoleExporter(true);
      expect(enabledExporter).toBeInstanceOf(ConsoleExporter);
    });

    it('should create exporter with disabled state', () => {
      const disabledExporter = new ConsoleExporter(false);
      expect(disabledExporter).toBeInstanceOf(ConsoleExporter);
    });
  });

  describe('export', () => {
    it('should export spans when enabled', () => {
      exporter.export([mockSpan as any]);

      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('\n🔍 OpenTelemetry Traces:');
    });

    it('should not export when disabled', () => {
      exporter.setEnabled(false);
      exporter.export([mockSpan as any]);

      expect(consoleSpy).not.toHaveBeenCalledWith('\n🔍 OpenTelemetry Traces:');
    });

    it('should handle empty spans array', () => {
      exporter.export([]);

      expect(consoleSpy).not.toHaveBeenCalledWith('\n🔍 OpenTelemetry Traces:');
    });
  });

  describe('exportSpan', () => {
    it('should export single span when enabled', () => {
      exporter.exportSpan(mockSpan as any);

      expect(consoleSpy).toHaveBeenCalledWith('\n🔍 OpenTelemetry Span:');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Name:'));
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Status:')
      );
    });

    it('should not export when disabled', () => {
      exporter.setEnabled(false);
      exporter.exportSpan(mockSpan as any);

      expect(consoleSpy).not.toHaveBeenCalledWith('\n🔍 OpenTelemetry Span:');
    });
  });

  describe('setEnabled', () => {
    it('should enable exporter', () => {
      exporter.setEnabled(false);
      exporter.setEnabled(true);

      exporter.exportSpan(mockSpan as any);

      expect(consoleSpy).toHaveBeenCalledWith('\n🔍 OpenTelemetry Span:');
    });

    it('should disable exporter', () => {
      exporter.setEnabled(false);

      exporter.exportSpan(mockSpan as any);

      expect(consoleSpy).not.toHaveBeenCalledWith('\n🔍 OpenTelemetry Span:');
    });
  });
});
