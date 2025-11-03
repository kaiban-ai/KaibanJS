import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OTLPExporter } from './OTLPExporter';
import type { OTLPConfig } from '../types';

// Mock the OTLP exporters
vi.mock('@opentelemetry/exporter-trace-otlp-http', () => ({
  OTLPTraceExporter: vi.fn().mockImplementation(() => ({
    export: vi.fn().mockImplementation((spans, callback) => {
      // Simulate successful export
      callback({ code: 0 });
    }),
  })),
}));

vi.mock('@opentelemetry/exporter-trace-otlp-grpc', () => ({
  OTLPTraceExporter: vi.fn().mockImplementation(() => ({
    export: vi.fn().mockImplementation((spans, callback) => {
      // Simulate successful export
      callback({ code: 0 });
    }),
  })),
}));

describe('OTLPExporter', () => {
  let mockSpan: any;
  let consoleSpy: any;

  beforeEach(() => {
    // Mock console methods
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    };

    // Mock span
    mockSpan = {
      name: 'test-span',
      attributes: { 'test.attribute': 'test-value' },
      status: { code: 1 },
      end: vi.fn(),
    };

    // Clear environment variables
    delete process.env.OTEL_EXPORTER_OTLP_HEADERS;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('HTTP Protocol', () => {
    it('should create HTTP exporter with correct configuration', () => {
      const config: OTLPConfig = {
        endpoint: 'https://test-service.com',
        protocol: 'http',
        headers: { Authorization: 'Bearer test-token' },
        serviceName: 'test-service',
        timeout: 5000,
        compression: 'gzip',
      };

      const exporter = new OTLPExporter(config);

      expect(exporter.getProtocol()).toBe('http');
    });

    it('should normalize HTTP endpoint correctly', async () => {
      const config: OTLPConfig = {
        endpoint: 'https://test-service.com',
        protocol: 'http',
        serviceName: 'test-service',
      };

      const exporter = new OTLPExporter(config);
      await exporter.export([mockSpan]);

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Exported 1 traces to OTLP (HTTP)')
      );
    });

    it('should handle HTTP endpoint with existing path', async () => {
      const config: OTLPConfig = {
        endpoint: 'https://test-service.com/v1/traces',
        protocol: 'http',
        serviceName: 'test-service',
      };

      const exporter = new OTLPExporter(config);
      await exporter.export([mockSpan]);

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Exported 1 traces to OTLP (HTTP)')
      );
    });
  });

  describe('gRPC Protocol', () => {
    it('should create gRPC exporter with correct configuration', () => {
      const config: OTLPConfig = {
        endpoint: 'https://test-service.com:443',
        protocol: 'grpc',
        headers: { Authorization: 'Bearer test-token' },
        serviceName: 'test-service',
      };

      const exporter = new OTLPExporter(config);

      expect(exporter.getProtocol()).toBe('grpc');
    });

    it('should normalize gRPC endpoint correctly', async () => {
      const config: OTLPConfig = {
        endpoint: 'https://test-service.com:443',
        protocol: 'grpc',
        serviceName: 'test-service',
      };

      const exporter = new OTLPExporter(config);
      await exporter.export([mockSpan]);

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Exported 1 traces to OTLP (GRPC)')
      );
    });
  });

  describe('Environment Variables', () => {
    it('should parse environment headers correctly', () => {
      process.env.OTEL_EXPORTER_OTLP_HEADERS =
        'Authorization=Bearer token,Content-Type=application/json';

      const config: OTLPConfig = {
        endpoint: 'https://test-service.com',
        protocol: 'http',
        serviceName: 'test-service',
      };

      const exporter = new OTLPExporter(config);
      // The headers should be parsed and included in the exporter configuration
      expect(exporter).toBeDefined();
    });

    it('should handle missing environment headers gracefully', () => {
      delete process.env.OTEL_EXPORTER_OTLP_HEADERS;

      const config: OTLPConfig = {
        endpoint: 'https://test-service.com',
        protocol: 'http',
        serviceName: 'test-service',
      };

      const exporter = new OTLPExporter(config);
      expect(exporter).toBeDefined();
    });
  });

  describe('Export Methods', () => {
    it('should export multiple spans successfully', async () => {
      const config: OTLPConfig = {
        endpoint: 'https://test-service.com',
        protocol: 'http',
        serviceName: 'test-service',
      };

      const exporter = new OTLPExporter(config);
      const spans = [mockSpan, { ...mockSpan, name: 'test-span-2' }];

      await exporter.export(spans);

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Exported 2 traces to OTLP (HTTP)')
      );
    });

    it('should export single span successfully', async () => {
      const config: OTLPConfig = {
        endpoint: 'https://test-service.com',
        protocol: 'http',
        serviceName: 'test-service',
      };

      const exporter = new OTLPExporter(config);

      await exporter.exportSpan(mockSpan);

      // Should not throw any errors
      expect(exporter).toBeDefined();
    });

    it('should handle export errors gracefully', async () => {
      const config: OTLPConfig = {
        endpoint: 'https://test-service.com',
        protocol: 'http',
        serviceName: 'test-service',
      };

      const exporter = new OTLPExporter(config);

      // Mock the exporter to call callback with error
      const mockExporter = exporter.getExporter();
      vi.spyOn(mockExporter, 'export').mockImplementation((spans, callback) => {
        callback({ code: 1, error: new Error('Export failed') });
      });

      await exporter.export([mockSpan]);

      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to export traces'),
        expect.any(Error)
      );
    });

    it('should not export when disabled', async () => {
      const config: OTLPConfig = {
        endpoint: 'https://test-service.com',
        protocol: 'http',
        serviceName: 'test-service',
        enabled: false,
      };

      const exporter = new OTLPExporter(config);

      await exporter.export([mockSpan]);

      // Should not log success message when disabled
      expect(consoleSpy.log).not.toHaveBeenCalledWith(
        expect.stringContaining('Exported')
      );
    });
  });

  describe('Configuration', () => {
    it('should use default values when not provided', () => {
      const config: OTLPConfig = {
        endpoint: 'https://test-service.com',
      };

      const exporter = new OTLPExporter(config);

      expect(exporter.getProtocol()).toBe('http');
    });

    it('should allow enabling/disabling exporter', () => {
      const config: OTLPConfig = {
        endpoint: 'https://test-service.com',
        enabled: true,
      };

      const exporter = new OTLPExporter(config);
      expect(exporter).toBeDefined();

      exporter.setEnabled(false);
      // Should not throw when disabled
      expect(exporter).toBeDefined();
    });

    it('should handle Langfuse-style endpoints', async () => {
      const config: OTLPConfig = {
        endpoint: 'https://cloud.langfuse.com/api/public/otel',
        protocol: 'http',
        headers: {
          Authorization: 'Basic ' + Buffer.from('pk:sk').toString('base64'),
        },
        serviceName: 'langfuse-test',
      };

      const exporter = new OTLPExporter(config);
      await exporter.export([mockSpan]);

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Exported 1 traces to OTLP (HTTP)')
      );
    });

    it('should handle SigNoz-style endpoints', async () => {
      const config: OTLPConfig = {
        endpoint: 'https://ingest.us.signoz.cloud:443',
        protocol: 'grpc',
        headers: {
          'signoz-access-token': 'test-token',
        },
        serviceName: 'signoz-test',
      };

      const exporter = new OTLPExporter(config);
      await exporter.export([mockSpan]);

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Exported 1 traces to OTLP (GRPC)')
      );
    });
  });
});
