import { trace, Span, SpanStatusCode, context } from '@opentelemetry/api';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { ConsoleExporter, OTLPExporter } from '../exporters';
import type { OpenTelemetryConfig } from '../types';

/**
 * Manages OpenTelemetry spans for KaibanJS workflows
 */
export class SpanManager {
  private tracer: any;
  private exporters: Array<ConsoleExporter | OTLPExporter> = [];
  private activeSpans: Map<string, Span> = new Map();

  constructor(
    private config: OpenTelemetryConfig,
    private tracerProvider?: NodeTracerProvider
  ) {
    this.initializeTracer();
    this.initializeExporters();
  }

  /**
   * Initialize tracer from provider or create default
   */
  private initializeTracer(): void {
    if (this.tracerProvider) {
      this.tracer = this.tracerProvider.getTracer('kaibanjs', '1.0.0');
    } else {
      this.tracer = trace.getTracer('kaibanjs', '1.0.0');
    }
  }

  /**
   * Initialize all configured exporters
   */
  private initializeExporters(): void {
    const { exporters } = this.config;

    // Console exporter
    if (exporters?.console) {
      this.exporters.push(new ConsoleExporter(true));
    }

    // OTLP exporters
    if (exporters?.otlp) {
      const otlpConfigs = Array.isArray(exporters.otlp)
        ? exporters.otlp
        : [exporters.otlp];

      otlpConfigs.forEach((config) => {
        if (config.enabled !== false) {
          this.exporters.push(new OTLPExporter(config));
        }
      });
    }
  }

  /**
   * Start a new span
   */
  public startSpan(
    name: string,
    attributes: Record<string, any>,
    parentSpan?: Span
  ): Span {
    const spanOptions: any = {
      attributes,
      kind: this.determineSpanKind(name),
    };

    let span: Span;

    if (parentSpan) {
      // Create nested span with proper parent context
      const parentContext = trace.setSpan(context.active(), parentSpan);
      span = this.tracer.startSpan(name, spanOptions, parentContext);
    } else {
      span = this.tracer.startSpan(name, spanOptions);
    }

    // Store span metadata for console export
    (span as any)._kaibanMetadata = {
      name,
      attributes,
      startTime: Date.now(),
      kind: this.determineSpanKind(name),
    };

    // Track ALL spans for OTLP export (both active and completed)
    const spanId = span.spanContext().spanId;
    this.activeSpans.set(spanId, span);

    // Apply sampling
    if (this.shouldSample(attributes)) {
      span.setStatus({ code: SpanStatusCode.OK });
    } else {
      span.setStatus({ code: SpanStatusCode.UNSET });
    }

    // Export workflow and task spans immediately for console
    if (name.startsWith('workflow') || name.startsWith('task')) {
      this.exportSpan(span);
    }

    return span;
  }

  /**
   * End a span with optional attributes
   */
  public endSpan(
    span: Span,
    attributes?: Record<string, any>,
    newName?: string
  ): void {
    if (attributes) {
      span.setAttributes(attributes);
    }

    // Update span metadata with end time and final attributes
    const metadata = (span as any)._kaibanMetadata;
    if (metadata) {
      metadata.endTime = Date.now();
      metadata.duration = metadata.endTime - metadata.startTime;
      metadata.finalAttributes = { ...metadata.attributes, ...attributes };

      // Update span name if provided
      if (newName) {
        metadata.name = newName;
      }

      // Add duration to span attributes for better visibility
      if (attributes) {
        attributes.duration_ms = metadata.duration;
      }
    }

    // Keep span in activeSpans for OTLP export (don't move to completed)
    const _spanId = span.spanContext().spanId;

    // Export span to console immediately when ended
    this.exportSpan(span);

    span.end();
  }

  /**
   * Add an event to a span
   */
  public addEvent(
    name: string,
    attributes: Record<string, any>,
    span: Span
  ): void {
    span.addEvent(name, attributes);

    // Export the event to console for debugging
    this.exporters.forEach((exporter) => {
      if ('exportEvent' in exporter) {
        exporter.exportEvent(name, attributes);
      }
    });
  }

  /**
   * Export single span to all exporters
   */
  public async exportSpan(span: Span): Promise<void> {
    const exportPromises = this.exporters.map((exporter) =>
      exporter.exportSpan ? exporter.exportSpan(span) : Promise.resolve()
    );

    await Promise.allSettled(exportPromises);
  }

  /**
   * Export multiple spans to all exporters
   */
  public async exportSpans(spans: Span[]): Promise<void> {
    const exportPromises = this.exporters.map((exporter) =>
      exporter.export ? exporter.export(spans) : Promise.resolve()
    );

    await Promise.allSettled(exportPromises);
  }

  /**
   * Determine span kind based on name
   */
  private determineSpanKind(name: string): number {
    if (name.startsWith('workflow')) return 1; // SERVER
    if (name.startsWith('task')) return 2; // CLIENT
    if (name.startsWith('agent')) return 2; // CLIENT
    return 0; // INTERNAL
  }

  /**
   * Clear processed spans cache (delegates to console exporter)
   */
  public clearProcessedSpans(): void {
    this.exporters.forEach((exporter) => {
      if ('clearProcessedSpans' in exporter) {
        exporter.clearProcessedSpans();
      }
    });
  }

  /**
   * Get all spans for OTLP export
   */
  public getActiveSpans(): Span[] {
    const allSpans = Array.from(this.activeSpans.values());
    // Found spans for OTLP export
    return allSpans;
  }

  /**
   * Check if span should be sampled based on configuration
   */
  private shouldSample(_attributes: Record<string, any>): boolean {
    switch (this.config.sampling.strategy) {
      case 'always':
        return true;
      case 'probabilistic':
        return Math.random() < this.config.sampling.rate;
      case 'rate_limiting':
        // Simple rate limiting implementation
        return Math.random() < this.config.sampling.rate;
      default:
        return true;
    }
  }
}
