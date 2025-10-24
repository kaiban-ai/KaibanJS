import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SpanManager } from './SpanManager';
import { OTLPExporter as _OTLPExporter } from '../exporters/OTLPExporter';
import type { OpenTelemetryConfig } from '../types';

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

describe('SpanManager with OTLP Integration', () => {
  let spanManager: SpanManager;
  let _consoleSpy: any;

  beforeEach(() => {
    // Mock console methods
    _consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('OTLP Exporter Integration', () => {
    it('should initialize with single OTLP exporter', () => {
      const config: OpenTelemetryConfig = {
        enabled: true,
        sampling: { rate: 1.0, strategy: 'always' },
        attributes: {
          includeSensitiveData: false,
          customAttributes: {},
        },
        exporters: {
          console: true,
          otlp: {
            endpoint: 'https://test-service.com',
            protocol: 'http',
            serviceName: 'test-service',
          },
        },
      };

      spanManager = new SpanManager(config);
      expect(spanManager).toBeDefined();
    });

    it('should initialize with multiple OTLP exporters', () => {
      const config: OpenTelemetryConfig = {
        enabled: true,
        sampling: { rate: 1.0, strategy: 'always' },
        attributes: {
          includeSensitiveData: false,
          customAttributes: {},
        },
        exporters: {
          console: true,
          otlp: [
            {
              endpoint: 'https://signoz.com:443',
              protocol: 'grpc',
              headers: { 'signoz-access-token': 'token1' },
              serviceName: 'signoz-service',
            },
            {
              endpoint: 'https://langfuse.com/api/public/otel',
              protocol: 'http',
              headers: { Authorization: 'Basic token2' },
              serviceName: 'langfuse-service',
            },
          ],
        },
      };

      spanManager = new SpanManager(config);
      expect(spanManager).toBeDefined();
    });

    it('should handle disabled OTLP exporters', () => {
      const config: OpenTelemetryConfig = {
        enabled: true,
        sampling: { rate: 1.0, strategy: 'always' },
        attributes: {
          includeSensitiveData: false,
          customAttributes: {},
        },
        exporters: {
          console: true,
          otlp: {
            endpoint: 'https://test-service.com',
            protocol: 'http',
            serviceName: 'test-service',
            enabled: false,
          },
        },
      };

      spanManager = new SpanManager(config);
      expect(spanManager).toBeDefined();
    });
  });

  describe('Span Export with OTLP', () => {
    beforeEach(() => {
      const config: OpenTelemetryConfig = {
        enabled: true,
        sampling: { rate: 1.0, strategy: 'always' },
        attributes: {
          includeSensitiveData: false,
          customAttributes: {},
        },
        exporters: {
          console: true,
          otlp: {
            endpoint: 'https://test-service.com',
            protocol: 'http',
            serviceName: 'test-service',
          },
        },
      };

      spanManager = new SpanManager(config);
    });

    it('should export workflow spans to OTLP', async () => {
      const span = spanManager.startSpan('workflow:content-processing', {
        'workflow.id': 'wf-123',
        'workflow.status': 'RUNNING',
      });

      // Mock the span to simulate completion
      (span as any)._kaibanMetadata = {
        name: 'workflow:content-processing',
        attributes: { 'workflow.id': 'wf-123' },
        startTime: Date.now(),
        endTime: Date.now() + 1000,
        duration: 1000,
      };

      await spanManager.exportSpan(span);

      // Should not throw any errors
      expect(span).toBeDefined();
    });

    it('should export task spans to OTLP', async () => {
      const span = spanManager.startSpan('task:analyze-content', {
        'task.id': 'task-123',
        'task.status': 'DOING',
        'agent.name': 'Content Analyzer',
      });

      // Mock the span to simulate completion
      (span as any)._kaibanMetadata = {
        name: 'task:analyze-content',
        attributes: { 'task.id': 'task-123' },
        startTime: Date.now(),
        endTime: Date.now() + 500,
        duration: 500,
      };

      await spanManager.exportSpan(span);

      // Should not throw any errors
      expect(span).toBeDefined();
    });

    it('should export multiple spans to OTLP', async () => {
      const spans = [
        spanManager.startSpan('workflow:content-processing', {
          'workflow.id': 'wf-123',
        }),
        spanManager.startSpan('task:analyze-content', {
          'task.id': 'task-123',
        }),
        spanManager.startSpan('task:optimize-content', {
          'task.id': 'task-456',
        }),
      ];

      // Mock spans with metadata
      spans.forEach((span, index) => {
        (span as any)._kaibanMetadata = {
          name: span.name,
          attributes: { [`test.${index}`]: `value-${index}` },
          startTime: Date.now(),
          endTime: Date.now() + 1000,
          duration: 1000,
        };
      });

      await spanManager.exportSpans(spans);

      // Should not throw any errors
      expect(spans).toHaveLength(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle OTLP export errors gracefully', async () => {
      const config: OpenTelemetryConfig = {
        enabled: true,
        sampling: { rate: 1.0, strategy: 'always' },
        attributes: {
          includeSensitiveData: false,
          customAttributes: {},
        },
        exporters: {
          console: true,
          otlp: {
            endpoint: 'https://invalid-endpoint.com',
            protocol: 'http',
            serviceName: 'test-service',
          },
        },
      };

      spanManager = new SpanManager(config);

      const span = spanManager.startSpan('workflow:test', {
        'workflow.id': 'wf-123',
      });

      // Mock the span
      (span as any)._kaibanMetadata = {
        name: 'workflow:test',
        attributes: { 'workflow.id': 'wf-123' },
        startTime: Date.now(),
        endTime: Date.now() + 1000,
        duration: 1000,
      };

      // This should not throw, even if the export fails
      await expect(spanManager.exportSpan(span)).resolves.not.toThrow();
    });
  });

  describe('Real-world Service Configurations', () => {
    it('should handle SigNoz configuration', () => {
      const config: OpenTelemetryConfig = {
        enabled: true,
        sampling: { rate: 1.0, strategy: 'always' },
        attributes: {
          includeSensitiveData: false,
          customAttributes: {},
        },
        exporters: {
          console: true,
          otlp: {
            endpoint: 'https://ingest.us.signoz.cloud:443',
            protocol: 'grpc',
            headers: {
              'signoz-access-token': 'test-token',
            },
            serviceName: 'kaibanjs-signoz',
          },
        },
      };

      spanManager = new SpanManager(config);
      expect(spanManager).toBeDefined();
    });

    it('should handle Langfuse configuration', () => {
      const config: OpenTelemetryConfig = {
        enabled: true,
        sampling: { rate: 1.0, strategy: 'always' },
        attributes: {
          includeSensitiveData: false,
          customAttributes: {},
        },
        exporters: {
          console: true,
          otlp: {
            endpoint: 'https://cloud.langfuse.com/api/public/otel',
            protocol: 'http',
            headers: {
              Authorization: 'Basic ' + Buffer.from('pk:sk').toString('base64'),
            },
            serviceName: 'kaibanjs-langfuse',
            compression: 'gzip',
          },
        },
      };

      spanManager = new SpanManager(config);
      expect(spanManager).toBeDefined();
    });

    it('should handle Phoenix configuration', () => {
      const config: OpenTelemetryConfig = {
        enabled: true,
        sampling: { rate: 1.0, strategy: 'always' },
        attributes: {
          includeSensitiveData: false,
          customAttributes: {},
        },
        exporters: {
          console: true,
          otlp: {
            endpoint: 'https://your-phoenix-instance.com/otel',
            protocol: 'http',
            headers: {
              Authorization: 'Bearer phoenix-api-key',
            },
            serviceName: 'kaibanjs-phoenix',
          },
        },
      };

      spanManager = new SpanManager(config);
      expect(spanManager).toBeDefined();
    });
  });
});
