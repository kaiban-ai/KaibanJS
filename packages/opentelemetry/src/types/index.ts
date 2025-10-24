import { Span } from '@opentelemetry/api';

/**
 * Configuration for OpenTelemetry integration
 */
export interface OpenTelemetryConfig {
  /** Whether observability is enabled */
  enabled: boolean;

  /** Sampling configuration */
  sampling: {
    rate: number; // 0.0 to 1.0
    strategy: 'always' | 'probabilistic' | 'rate_limiting';
  };

  /** Attribute configuration */
  attributes: {
    includeSensitiveData: boolean;
    customAttributes: Record<string, string>;
  };

  /** Exporters configuration */
  exporters?: {
    console?: boolean;
    jaeger?: JaegerConfig;
    prometheus?: PrometheusConfig;
    otlp?: OTLPConfig | OTLPConfig[];
  };
}

/**
 * Jaeger exporter configuration
 */
export interface JaegerConfig {
  endpoint: string;
  serviceName?: string;
  tags?: Record<string, string>;
}

/**
 * Prometheus exporter configuration
 */
export interface PrometheusConfig {
  port?: number;
  path?: string;
  hostname?: string;
}

/**
 * OTLP exporter configuration
 */
export interface OTLPConfig {
  /** Endpoint del servicio */
  endpoint: string;

  /** Protocolo OTLP */
  protocol?: 'http' | 'grpc';

  /** Headers de autenticación y configuración */
  headers?: Record<string, string>;

  /** Timeout en milisegundos */
  timeout?: number;

  /** Compresión (solo para HTTP) */
  compression?: 'gzip' | 'none';

  /** Nombre del servicio */
  serviceName?: string;

  /** Habilitado/deshabilitado */
  enabled?: boolean;
}

/**
 * Context for correlating spans across the workflow
 */
export interface KaibanSpanContext {
  teamName: string;
  workflowId: string;
  rootSpan?: Span;
  taskSpans: Map<string, Span>;
  toolSpans: Map<string, Span>;
  agentSpans: Map<string, Span>;

  setRootSpan(span: Span): void;
  getRootSpan(): Span | undefined;
  setTaskSpan(taskId: string, span: Span): void;
  getTaskSpan(taskId: string): Span | undefined;
  removeTaskSpan(taskId: string): void;
  setToolSpan(agentId: string, span: Span): void;
  getToolSpan(agentId: string): Span | undefined;
  removeToolSpan(agentId: string): void;
  setAgentSpan(agentId: string, span: Span): void;
  getAgentSpan(agentId: string): Span | undefined;
  removeAgentSpan(agentId: string): void;
}

/**
 * Base workflow log type from KaibanJS
 */
export interface BaseWorkflowLog {
  timestamp: number;
  logDescription: string;
  logType: 'WorkflowStatusUpdate' | 'AgentStatusUpdate' | 'TaskStatusUpdate';
}

// WorkflowLog removed - not needed in simplified version

/**
 * Task status log types
 */
export interface TaskLog extends BaseWorkflowLog {
  logType: 'TaskStatusUpdate';
  task: {
    id: string;
    title: string;
    description: string;
  };
  agent: {
    name: string;
    role: string;
  };
  taskStatus: string;
  metadata?: any;
}

/**
 * Agent status log types
 */
export interface AgentLog extends BaseWorkflowLog {
  logType: 'AgentStatusUpdate';
  task: {
    id: string;
  };
  agent: {
    id: string;
    name: string;
    role: string;
    llmConfig: {
      model: string;
    };
  };
  agentStatus: string;
  metadata?: any;
}

/**
 * Union type for all log types (simplified - only task and agent logs)
 */
export type KaibanLog = TaskLog | AgentLog;
