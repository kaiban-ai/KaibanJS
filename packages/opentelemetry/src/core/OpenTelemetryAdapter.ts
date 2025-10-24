import { Team } from 'kaibanjs';
import {
  trace as _trace,
  Span as _Span,
  SpanStatusCode as _SpanStatusCode,
  context as _context,
} from '@opentelemetry/api';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import {
  AlwaysOnSampler,
  AlwaysOffSampler,
  TraceIdRatioBasedSampler,
} from '@opentelemetry/sdk-trace-base';
import { SpanManager } from './SpanManager';
import { KaibanSpanContextImpl } from './KaibanSpanContext';
import { SimpleTaskMapper } from '../mappers/SimpleTaskMapper';
import {
  ConsoleExporter as _ConsoleExporter,
  OTLPExporter,
} from '../exporters';
import type {
  OpenTelemetryConfig,
  KaibanSpanContext,
  KaibanLog,
} from '../types';

/**
 * Main adapter for integrating KaibanJS with OpenTelemetry
 */
export class OpenTelemetryAdapter {
  private spanManager: SpanManager;
  private taskMapper: SimpleTaskMapper;
  private tracerProvider!: NodeTracerProvider;
  private otlpExporters: OTLPExporter[] = [];

  // Context for correlating spans across the workflow
  private activeContexts: Map<string, KaibanSpanContext> = new Map();

  constructor(private config: OpenTelemetryConfig) {
    this.initializeOpenTelemetry();
    this.spanManager = new SpanManager(config, this.tracerProvider);
    this.taskMapper = new SimpleTaskMapper(this.spanManager);
  }

  /**
   * Initialize OpenTelemetry SDK with proper Resource configuration
   */
  private initializeOpenTelemetry(): void {
    // Create resource with service information
    const resource = resourceFromAttributes({
      [SemanticResourceAttributes.SERVICE_NAME]: 'kaibanjs-service',
      [SemanticResourceAttributes.SERVICE_VERSION]:
        this.config.attributes?.customAttributes?.['service.version'] ||
        '1.0.0',
      [SemanticResourceAttributes.SERVICE_NAMESPACE]: 'kaibanjs',
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]:
        this.config.attributes?.customAttributes?.['service.environment'] ||
        'development',
    });

    // Create tracer provider with resource
    this.tracerProvider = new NodeTracerProvider({
      resource,
      sampler: this.createSampler(),
    });

    // Configure exporters
    this.configureExporters();

    // Register the provider
    this.tracerProvider.register();

    // Register instrumentations
    registerInstrumentations({
      tracerProvider: this.tracerProvider,
      instrumentations: [],
    });
  }

  /**
   * Create sampler based on configuration
   */
  private createSampler() {
    const { sampling } = this.config;
    if (sampling?.strategy === 'always') {
      return new AlwaysOnSampler();
    } else if (sampling?.strategy === 'rate_limiting') {
      return new AlwaysOffSampler();
    } else if (sampling?.strategy === 'probabilistic') {
      return new TraceIdRatioBasedSampler(sampling.rate || 1.0);
    }
    return new AlwaysOnSampler();
  }

  /**
   * Configure exporters based on configuration
   */
  private configureExporters(): void {
    const { exporters } = this.config;

    // Console exporter (handled separately in SpanManager)
    if (exporters?.console) {
      // Console exporter is handled in SpanManager for immediate feedback
    }

    // OTLP exporters - store them for direct export
    if (exporters?.otlp) {
      const otlpConfigs = Array.isArray(exporters.otlp)
        ? exporters.otlp
        : [exporters.otlp];

      otlpConfigs.forEach((config) => {
        if (config.enabled !== false) {
          this.otlpExporters.push(new OTLPExporter(config));
        }
      });
    }
  }

  /**
   * Integrate observability with a KaibanJS Team
   */
  public integrateWithTeam(team: Team): void {
    if (!this.config.enabled) {
      console.log('🔍 OpenTelemetry observability is disabled');
      return;
    }

    // OpenTelemetry integration enabled

    // Subscribe to workflow logs using the same pattern as KaibanJS subscribers
    const store = team.getStore();
    store.subscribe((state: any, previousState: any) => {
      if (state.workflowLogs.length > previousState.workflowLogs.length) {
        const latestLog = state.workflowLogs[state.workflowLogs.length - 1];
        this.processLogEntry(team, latestLog);
      }
    });

    // Integration completed
  }

  /**
   * Process individual log entry
   */
  private processLogEntry(team: Team, log: KaibanLog): void {
    const context = this.getOrCreateContext(team);

    switch (log.logType) {
      case 'TaskStatusUpdate':
        // Processing task status
        this.taskMapper.mapTaskLogToSpan(context, log);
        // Export to OTLP when task completes
        if (['DONE', 'ERRORED', 'ABORTED'].includes((log as any).taskStatus)) {
          // Exporting spans to OTLP
          this.exportSpansToOTLP();
        }
        break;
      case 'AgentStatusUpdate':
        // Processing agent status

        this.taskMapper.mapAgentThinkingToSpan(context, log);
        break;
    }
  }

  /**
   * Export spans to OTLP exporters
   */
  private async exportSpansToOTLP(): Promise<void> {
    if (this.otlpExporters.length === 0) {
      return;
    }

    // Get all active spans from the span manager
    const spans = this.spanManager.getActiveSpans();
    if (spans.length === 0) {
      return;
    }

    // Exporting spans to OTLP

    // Export to all OTLP exporters
    const exportPromises = this.otlpExporters.map((exporter) =>
      exporter.export(spans)
    );

    await Promise.allSettled(exportPromises);
  }

  /**
   * Get or create context for a team
   */
  private getOrCreateContext(team: Team): KaibanSpanContext {
    // Try to get team name from different sources
    const state = team.getStore().getState() as any;
    const teamName =
      state.teamName || state.team?.name || 'Content Processing Team';

    const workflowId = `${teamName}-${Date.now()}`;

    if (!this.activeContexts.has(teamName)) {
      const context = new KaibanSpanContextImpl(teamName, workflowId);
      this.activeContexts.set(teamName, context);
    }

    return this.activeContexts.get(teamName)!;
  }

  /**
   * Get the tracer provider for external use
   */
  public getTracerProvider(): NodeTracerProvider {
    return this.tracerProvider;
  }

  /**
   * Shutdown the adapter
   */
  public async shutdown(): Promise<void> {
    // Shutting down OpenTelemetry adapter
    await this.exportSpansToOTLP();

    this.activeContexts.clear();
    await this.tracerProvider.shutdown();
  }
}
