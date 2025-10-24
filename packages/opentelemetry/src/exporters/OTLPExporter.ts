import { Span } from '@opentelemetry/api';
import { ReadableSpan } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter as OTLPTraceExporterHTTP } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPTraceExporter as OTLPTraceExporterGRPC } from '@opentelemetry/exporter-trace-otlp-grpc';
import { CompressionAlgorithm } from '@opentelemetry/otlp-exporter-base';
import type { OTLPConfig } from '../types';

/**
 * Generic OTLP exporter for traces with HTTP and gRPC support
 */
export class OTLPExporter {
  private exporter: OTLPTraceExporterHTTP | OTLPTraceExporterGRPC;
  private enabled: boolean;
  private serviceName: string;
  private protocol: 'http' | 'grpc';

  constructor(config: OTLPConfig) {
    this.enabled = config.enabled !== false;
    this.serviceName = config.serviceName || 'kaibanjs-service';
    this.protocol = config.protocol || 'http';

    const endpoint = this.normalizeEndpoint(config.endpoint, this.protocol);

    const baseConfig = {
      url: endpoint,
      headers: {
        ...this.parseEnvHeaders(),
        ...config.headers,
      },
      timeoutMillis: config.timeout || 30000,
    };
    // Create exporter based on protocol
    if (this.protocol === 'grpc') {
      this.exporter = new OTLPTraceExporterGRPC(baseConfig);
    } else {
      const httpConfig = {
        ...baseConfig,
        compression:
          config.compression === 'none'
            ? CompressionAlgorithm.NONE
            : CompressionAlgorithm.GZIP,
      };
      this.exporter = new OTLPTraceExporterHTTP(httpConfig);
    }
  }

  /**
   * Normalize endpoint based on protocol
   */
  private normalizeEndpoint(endpoint: string, protocol: string): string {
    // If endpoint already includes path, use it as is
    if (
      endpoint.includes('/v1/traces') ||
      endpoint.includes('/api/public/otel')
    ) {
      return endpoint;
    }

    // Add path based on protocol
    if (protocol === 'grpc') {
      return endpoint; // gRPC doesn't need specific path
    } else {
      return `${endpoint}/v1/traces`;
    }
  }

  /**
   * Parse headers from environment variables
   */
  private parseEnvHeaders(): Record<string, string> {
    const envHeaders = process.env.OTEL_EXPORTER_OTLP_HEADERS;
    if (!envHeaders) return {};

    return envHeaders.split(',').reduce((acc, header) => {
      const [key, value] = header.split('=');
      if (key && value) {
        acc[key.trim()] = value.trim();
      }
      return acc;
    }, {} as Record<string, string>);
  }

  /**
   * Export multiple spans using the official OTLP exporter
   */
  public async export(spans: Span[]): Promise<void> {
    if (!this.enabled || spans.length === 0) {
      return;
    }

    // Convert Span[] to ReadableSpan[]
    const readableSpans = spans.map((span) => span as unknown as ReadableSpan);

    return new Promise((resolve) => {
      try {
        this.exporter.export(readableSpans, (result) => {
          if (result.code === 0) {
            // ExportResultCode.SUCCESS
            console.log(
              `✅ [${this.serviceName}] Exported ${
                spans.length
              } traces to OTLP (${this.protocol.toUpperCase()})`
            );
          } else {
            console.error(
              `❌ [${
                this.serviceName
              }] Failed to export traces (${this.protocol.toUpperCase()}):`,
              result.error
            );
          }
          resolve();
        });
      } catch (error) {
        console.error(
          `❌ [${
            this.serviceName
          }] Export error (${this.protocol.toUpperCase()}):`,
          error
        );
        resolve();
      }
    });
  }

  /**
   * Export single span using the official OTLP exporter
   */
  public async exportSpan(span: Span): Promise<void> {
    if (!this.enabled) {
      return;
    }

    // Convert Span to ReadableSpan
    const readableSpan = span as unknown as ReadableSpan;

    return new Promise((resolve) => {
      try {
        this.exporter.export([readableSpan], (result) => {
          if (result.code === 0) {
            // ExportResultCode.SUCCESS
            // Silent success for single spans
          } else {
            console.error(
              `❌ [${
                this.serviceName
              }] Failed to export span (${this.protocol.toUpperCase()}):`,
              result.error
            );
          }
          resolve();
        });
      } catch (error) {
        console.error(
          `❌ [${
            this.serviceName
          }] Export error (${this.protocol.toUpperCase()}):`,
          error
        );
        resolve();
      }
    });
  }

  /**
   * Enable/disable exporter
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Get exporter for SDK integration
   */
  public getExporter(): OTLPTraceExporterHTTP | OTLPTraceExporterGRPC {
    return this.exporter;
  }

  /**
   * Get protocol used
   */
  public getProtocol(): 'http' | 'grpc' {
    return this.protocol;
  }
}
