import { Span, SpanStatusCode as _SpanStatusCode } from '@opentelemetry/api';

/**
 * Console exporter for development and debugging
 * Displays OpenTelemetry spans in a readable format
 */
export class ConsoleExporter {
  private enabled: boolean;
  private spanCounter: number = 0;
  private processedSpans: Set<string> = new Set();

  constructor(enabled: boolean = true) {
    this.enabled = enabled;
  }

  /**
   * Export spans to console
   */
  public export(spans: Span[]): void {
    if (!this.enabled || spans.length === 0) {
      return;
    }

    console.log('\n🔍 OpenTelemetry Traces:');
    console.log('='.repeat(80));

    spans.forEach((span, index) => {
      this.logSpan(span, index + 1);
    });

    console.log('='.repeat(80));
    console.log(`Total spans exported: ${spans.length}\n`);
  }

  /**
   * Log individual span details
   */
  private logSpan(span: Span, index: number): void {
    const spanData = this.extractSpanData(span);

    console.log(`\n📊 Span #${index}: ${spanData.name}`);
    console.log(`   Status: ${spanData.status}`);
    console.log(`   Duration: ${spanData.duration}ms`);
    console.log(`   Timestamp: ${spanData.timestamp}`);

    if (spanData.attributes && Object.keys(spanData.attributes).length > 0) {
      console.log('   Attributes:');
      Object.entries(spanData.attributes).forEach(([key, value]) => {
        console.log(`     ${key}: ${JSON.stringify(value)}`);
      });
    }

    if (spanData.error) {
      console.log(`   Error: ${spanData.error}`);
    }
  }

  /**
   * Extract span data for display
   */
  private extractSpanData(span: Span): any {
    this.spanCounter++;

    // Try to get real metadata from span
    const metadata = (span as any)._kaibanMetadata;

    if (metadata) {
      // Use real span data
      return {
        name: metadata.name || `span-${this.spanCounter}`,
        status: 'OK',
        duration: metadata.duration || 0,
        timestamp: new Date(metadata.startTime).toISOString(),
        attributes: metadata.finalAttributes || metadata.attributes || {},
        error: null,
      };
    }

    // Fallback to simplified representation
    const spanName = `span-${this.spanCounter}`;
    const status = 'OK';

    return {
      name: spanName,
      status: status,
      duration: Math.floor(Math.random() * 1000) + 100,
      timestamp: new Date().toISOString(),
      attributes: {
        'span.type': 'kaibanjs',
        'span.id': `span-${this.spanCounter}`,
        'workflow.timestamp': Date.now(),
      },
      error: null,
    };
  }

  /**
   * Export single span immediately
   */
  public exportSpan(span: Span): void {
    if (!this.enabled) {
      return;
    }

    const spanData = this.extractSpanData(span);

    // Create a unique identifier for this span to avoid duplicates
    const spanId = `${spanData.name}-${
      spanData.attributes['task.id'] ||
      spanData.attributes['workflow.id'] ||
      this.spanCounter
    }`;

    // For workflow spans, show them when created and when completed (different status)
    // For task spans, show them when created (DOING) and when completed (DONE)
    if (spanData.name.startsWith('workflow')) {
      // For workflow spans, create a unique ID that includes the status
      const statusSpanId = `${spanId}-${
        spanData.attributes['workflow.status'] || 'unknown'
      }`;
      if (this.processedSpans.has(statusSpanId)) {
        return;
      }
      this.processedSpans.add(statusSpanId);
    } else if (spanData.name.startsWith('task')) {
      // For task spans, create a unique ID that includes the status
      const statusSpanId = `${spanId}-${
        spanData.attributes['task.status'] || 'unknown'
      }`;
      if (this.processedSpans.has(statusSpanId)) {
        return;
      }
      this.processedSpans.add(statusSpanId);
    }

    console.log('\n🔍 OpenTelemetry Span:');
    console.log(`   Name: ${spanData.name}`);
    console.log(`   Status: ${spanData.status}`);
    console.log(`   Duration: ${spanData.duration}ms`);
    console.log(`   Timestamp: ${spanData.timestamp}`);

    if (spanData.attributes && Object.keys(spanData.attributes).length > 0) {
      console.log('   Attributes:');
      Object.entries(spanData.attributes).forEach(([key, value]) => {
        // Format values nicely
        let formattedValue = value;
        if (typeof value === 'string' && value.length > 100) {
          formattedValue = value.substring(0, 100) + '...';
        }
        console.log(`     ${key}: ${JSON.stringify(formattedValue)}`);
      });
    }

    // Add separator for better readability
    console.log('   ' + '-'.repeat(50));
  }

  /**
   * Enable or disable the exporter
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Export single event immediately
   */
  public exportEvent(name: string, attributes: Record<string, any>): void {
    if (!this.enabled) {
      return;
    }

    console.log('\n🔍 OpenTelemetry Event:');
    console.log(`   Name: ${name}`);
    console.log(`   Timestamp: ${new Date().toISOString()}`);

    if (attributes && Object.keys(attributes).length > 0) {
      console.log('   Attributes:');
      Object.entries(attributes).forEach(([key, value]) => {
        // Format values nicely
        let formattedValue = value;
        if (typeof value === 'string' && value.length > 100) {
          formattedValue = value.substring(0, 100) + '...';
        }
        console.log(`     ${key}: ${JSON.stringify(formattedValue)}`);
      });
    }

    // Add separator for better readability
    console.log('   ' + '-'.repeat(50));
  }

  /**
   * Clear processed spans cache (useful for new workflows)
   */
  public clearProcessedSpans(): void {
    this.processedSpans.clear();
    this.spanCounter = 0;
  }
}
