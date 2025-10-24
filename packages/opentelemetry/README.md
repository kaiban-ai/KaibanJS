# @kaibanjs/opentelemetry

OpenTelemetry integration for KaibanJS observability and distributed tracing.

## Overview

This package provides seamless integration between KaibanJS and OpenTelemetry, enabling comprehensive observability for AI agent workflows. It automatically maps KaibanJS workflow logs to OpenTelemetry spans, creating detailed traces for monitoring and debugging.

## Features

- 🔍 **Simplified Trace Mapping**: Converts KaibanJS task execution to OpenTelemetry spans
- 📊 **Focused Traces**: Creates task execution spans with nested agent thinking spans
- 🎯 **Smart Sampling**: Configurable sampling strategies for production use
- 🔧 **Flexible Exporters**: Support for console and OTLP exporters
- 🌐 **Multi-Service Support**: Export traces to SigNoz, Langfuse, Phoenix, Braintrust, Dash0, and more
- 📡 **OTLP Protocol**: Standard OpenTelemetry Protocol with HTTP and gRPC support
- 📈 **Performance Metrics**: Automatic collection of duration, cost, and token usage metrics
- 🛡️ **Zero Breaking Changes**: Non-intrusive integration that doesn't modify KaibanJS core
- 🏷️ **KaibanJS Semantic Conventions**: Uses `kaiban.llm.*` attributes for LLM data recognition
- 🔄 **Environment Configuration**: Support for environment variable-based configuration
- 🚀 **Production Ready**: Optimized for production workloads with proper error handling

## Installation

```bash
npm install @kaibanjs/opentelemetry
```

## Quick Start

```typescript
import { Team, Agent, Task } from 'kaibanjs';
import { enableOpenTelemetry } from '@kaibanjs/opentelemetry';

// Create your KaibanJS team
const team = new Team({
  name: 'My Team',
  agents: [...],
  tasks: [...]
});

// Configure OpenTelemetry
const config = {
  enabled: true,
  sampling: { rate: 1.0, strategy: 'always' },
  attributes: {
    includeSensitiveData: false,
    customAttributes: {
      'service.name': 'my-kaiban-app',
      'service.version': '1.0.0'
    }
  },
  exporters: {
    console: true,
    otlp: {
      endpoint: 'https://ingest.us.signoz.cloud:443',
      protocol: 'grpc',
      headers: { 'signoz-access-token': 'your-token' },
      serviceName: 'kaibanjs-service'
    }
  }
};

// Enable observability
enableOpenTelemetry(team, config);

// Start your workflow
await team.start({ input: 'data' });
```

## Configuration

### OpenTelemetryConfig

```typescript
interface OpenTelemetryConfig {
  enabled: boolean;
  sampling: {
    rate: number; // 0.0 to 1.0
    strategy: 'always' | 'probabilistic' | 'rate_limiting';
  };
  attributes: {
    includeSensitiveData: boolean;
    customAttributes: Record<string, string>;
  };
  exporters?: {
    console?: boolean;
    otlp?: OTLPConfig | OTLPConfig[];
  };
}
```

### Sampling Strategies

- **always**: Sample all traces (useful for development)
- **probabilistic**: Sample based on probability (0.0 to 1.0)
- **rate_limiting**: Rate-limited sampling for production

## Trace Structure

The package creates simplified traces with the following structure:

```
Task Span (DOING → DONE)
├── Agent Thinking Span (THINKING_END)
├── Agent Thinking Span (THINKING_END)
└── Agent Thinking Span (THINKING_END)
```

## Supported Events

### Task Events

- `task.execute` - Task execution started (DOING)
- `task.complete` - Task completed successfully (DONE)
- `task.error` - Task failed with error (ERRORED)
- `task.abort` - Task aborted (ABORTED)

### Agent Events

- `agent.thinking` - Agent thinking span (THINKING_END)

## Metrics

The package automatically collects the following metrics:

- **Duration**: Workflow, task, and tool execution times
- **Cost**: Token usage and associated costs
- **Iterations**: Number of agent iterations
- **Success Rates**: Task completion and error rates
- **Resource Usage**: Memory and concurrent operation metrics

## KaibanJS Semantic Conventions

The package uses KaibanJS-specific semantic conventions for LLM attributes that are automatically recognized by observability services:

### LLM Request Attributes (`kaiban.llm.request.*`)

- `kaiban.llm.request.messages` - Input messages to the LLM
- `kaiban.llm.request.model` - Model name used for the request
- `kaiban.llm.request.provider` - Provider of the model (openai, anthropic, google, etc.)
- `kaiban.llm.request.iteration` - Iteration number for the thinking process
- `kaiban.llm.request.start_time` - When the thinking process started
- `kaiban.llm.request.status` - Status of the request (started, interrupted, completed)
- `kaiban.llm.request.input_length` - Length of the input messages

### LLM Usage Attributes (`kaiban.llm.usage.*`)

- `kaiban.llm.usage.input_tokens` - Number of input tokens
- `kaiban.llm.usage.output_tokens` - Number of output tokens
- `kaiban.llm.usage.total_tokens` - Total tokens used
- `kaiban.llm.usage.prompt_tokens` - Prompt tokens
- `kaiban.llm.usage.completion_tokens` - Completion tokens
- `kaiban.llm.usage.cost` - Cost in USD

### LLM Response Attributes (`kaiban.llm.response.*`)

- `kaiban.llm.response.messages` - Output messages from the LLM
- `kaiban.llm.response.duration` - Duration of the response
- `kaiban.llm.response.end_time` - When the response ended
- `kaiban.llm.response.status` - Status of the response (completed, error, etc.)
- `kaiban.llm.response.output_length` - Length of the output messages

These conventions ensure that observability services like Langfuse, Phoenix, and others can automatically recognize and properly display LLM-related data in their dashboards.

## Exporters

### Console Exporter (Development)

```typescript
exporters: {
  console: true;
}
```

### Jaeger Exporter (TODO)

```typescript
exporters: {
  jaeger: {
    endpoint: 'http://localhost:14268/api/traces',
    serviceName: 'kaibanjs-workflow'
  }
}
```

**Status**: Planned for future release

### Prometheus Exporter (TODO)

```typescript
exporters: {
  prometheus: {
    port: 9464,
    path: '/metrics'
  }
}
```

**Status**: Planned for future release

### OTLP Exporter (Multi-Service Support)

The OTLP exporter allows you to send traces to any service that supports the OpenTelemetry Protocol, including SigNoz, Langfuse, Phoenix, Braintrust, Dash0, and more.

#### Single Service Configuration

```typescript
exporters: {
  otlp: {
    endpoint: 'https://your-service.com',
    protocol: 'http', // or 'grpc'
    headers: {
      'Authorization': 'Bearer your-token'
    },
    serviceName: 'kaibanjs-service'
  }
}
```

#### Multiple Services Configuration

```typescript
exporters: {
  otlp: [
    // SigNoz
    {
      endpoint: 'https://ingest.us.signoz.cloud:443',
      protocol: 'grpc',
      headers: { 'signoz-access-token': 'your-token' },
      serviceName: 'kaibanjs-signoz',
    },
    // Langfuse
    {
      endpoint: 'https://cloud.langfuse.com/api/public/otel',
      protocol: 'http',
      headers: {
        Authorization:
          'Basic ' + Buffer.from('pk-lf-xxx:sk-lf-xxx').toString('base64'),
      },
      serviceName: 'kaibanjs-langfuse',
    },
    // Phoenix
    {
      endpoint: 'https://your-phoenix-instance.com/otel',
      protocol: 'http',
      headers: { Authorization: 'Bearer your-api-key' },
      serviceName: 'kaibanjs-phoenix',
    },
  ];
}
```

#### Environment Variables Configuration

You can also configure OTLP exporters using environment variables:

```bash
# Basic configuration
export OTEL_EXPORTER_OTLP_ENDPOINT="https://your-service.com"
export OTEL_EXPORTER_OTLP_HEADERS="Authorization=Bearer your-token"
export OTEL_EXPORTER_OTLP_PROTOCOL="http"

# Specific traces configuration
export OTEL_EXPORTER_OTLP_TRACES_ENDPOINT="https://your-service.com/v1/traces"
export OTEL_EXPORTER_OTLP_TRACES_HEADERS="Authorization=Bearer your-token"
```

Then use a simplified configuration:

```typescript
exporters: {
  otlp: {
    serviceName: 'kaibanjs-service';
    // Will use environment variables as fallback
  }
}
```

## Examples

### Basic Integration

```typescript
import { Team, Agent, Task } from 'kaibanjs';
import { enableOpenTelemetry } from '@kaibanjs/opentelemetry';

const team = new Team({
  name: 'Content Processing Team',
  agents: [
    new Agent({
      name: 'Content Analyzer',
      role: 'Analyze content',
      goal: 'Extract insights from content',
      background: 'I am an expert content analyzer',
    }),
  ],
  tasks: [
    new Task({
      title: 'Analyze content',
      description: 'Analyze the provided content and extract key insights',
      expectedOutput: 'Detailed analysis with key insights',
      agent: team.getAgents()[0],
    }),
  ],
});

// Simple configuration
const config = {
  enabled: true,
  sampling: { rate: 1.0, strategy: 'always' },
  attributes: {
    includeSensitiveData: false,
    customAttributes: {
      'service.name': 'content-processor',
      'service.version': '1.0.0',
    },
  },
  exporters: {
    console: true,
  },
};

// Enable observability
enableOpenTelemetry(team, config);

// Run workflow
await team.start({ content: 'Sample content to analyze' });
```

### Multi-Service OTLP Integration

```typescript
import { createOpenTelemetryIntegration } from '@kaibanjs/opentelemetry';

const config = {
  enabled: true,
  sampling: { rate: 1.0, strategy: 'always' },
  attributes: {
    includeSensitiveData: false,
    customAttributes: {
      'service.version': '1.0.0',
      'service.environment': 'production',
    },
  },
  exporters: {
    console: true,
    otlp: [
      // SigNoz - gRPC protocol
      {
        endpoint: 'https://ingest.us.signoz.cloud:443',
        protocol: 'grpc',
        headers: { 'signoz-access-token': 'your-token' },
        serviceName: 'kaibanjs-signoz',
        timeout: 30000,
      },
      // Langfuse - HTTP protocol
      {
        endpoint: 'https://cloud.langfuse.com/api/public/otel',
        protocol: 'http',
        headers: {
          Authorization: 'Basic ' + Buffer.from('pk:sk').toString('base64'),
        },
        serviceName: 'kaibanjs-langfuse',
        compression: 'gzip',
      },
    ],
  },
};

const integration = createOpenTelemetryIntegration(config);
integration.integrateWithTeam(team);

// Run your workflow
await team.start({ input: 'data' });

// Shutdown when done
await integration.shutdown();
```

### Environment Configuration

```typescript
import * as dotenv from 'dotenv';
dotenv.config();

const config = {
  enabled: true,
  sampling: { rate: 1.0, strategy: 'always' },
  attributes: {
    includeSensitiveData: false,
    customAttributes: {
      'service.version': '1.0.0',
      'service.environment': process.env.NODE_ENV || 'development',
    },
  },
  exporters: {
    console: true,
    otlp: {
      endpoint: 'https://us.cloud.langfuse.com/api/public/otel/v1/traces',
      headers: {
        Authorization:
          'Basic ' +
          Buffer.from(
            `${process.env.LANGFUSE_PUBLIC_KEY}:${process.env.LANGFUSE_SECRET_KEY}`
          ).toString('base64'),
      },
      serviceName: 'kaibanjs-service',
      timeout: 30000,
      compression: 'gzip',
    },
  },
};
```

### Production Configuration

```typescript
const productionConfig = {
  enabled: true,
  sampling: {
    rate: 0.1, // Sample 10% of traces in production
    strategy: 'probabilistic',
  },
  attributes: {
    includeSensitiveData: false, // Never include sensitive data in production
    customAttributes: {
      'service.name': 'kaibanjs-production',
      'service.version': process.env.APP_VERSION || '1.0.0',
      'service.environment': 'production',
      'deployment.region': process.env.AWS_REGION || 'us-east-1',
    },
  },
  exporters: {
    otlp: [
      {
        endpoint: 'https://your-production-otel-endpoint.com',
        protocol: 'grpc',
        headers: { Authorization: `Bearer ${process.env.OTEL_AUTH_TOKEN}` },
        serviceName: 'kaibanjs-production',
        timeout: 30000,
      },
    ],
  },
};
```

## Available Examples

The package includes comprehensive examples in the `src/examples/` directory:

### 1. Basic OTLP Example

**File:** `run-otlp-example.ts`  
**Command:** `npm run dev:otlp-example`

A simple example that demonstrates basic OTLP exporter functionality with local and cloud services.

### 2. Multi-Service Integration

**File:** `multi-service-integration.ts`  
**Command:** `npm run dev:multi-service`

Shows how to export traces to multiple services simultaneously (SigNoz, Langfuse, Phoenix, Braintrust, Dash0).

### 3. Environment Configuration

**File:** `env-configuration.ts`  
**Command:** `npm run dev:env-config`

Demonstrates how to configure OTLP exporters using environment variables.

### 4. Practical Usage

**File:** `practical-otlp-usage.ts`  
**Command:** `npm run dev:practical`

A realistic content processing workflow that shows real-world usage of the OTLP exporter.

## Running Examples

```bash
# Basic OTLP example
npm run dev:otlp-example

# Multi-service integration
npm run dev:multi-service

# Environment configuration
npm run dev:env-config

# Practical usage
npm run dev:practical

# Basic integration
npm run dev
```

## Environment Setup

### For SigNoz

```bash
export SIGNOZ_ACCESS_TOKEN="your-signoz-token"
```

### For Langfuse

```bash
export LANGFUSE_PUBLIC_KEY="pk-lf-your-public-key"
export LANGFUSE_SECRET_KEY="sk-lf-your-secret-key"
```

### For Phoenix

```bash
export PHOENIX_ENDPOINT="https://your-phoenix-instance.com/otel"
export PHOENIX_API_KEY="your-phoenix-api-key"
```

### For Local OTLP Collector

```bash
# Run a local OTLP collector
docker run -p 4318:4318 otel/opentelemetry-collector-contrib
```

## Advanced Usage

For more control over the integration:

```typescript
import { createOpenTelemetryIntegration } from '@kaibanjs/opentelemetry';

const integration = createOpenTelemetryIntegration(config);
integration.integrateWithTeam(team);

// Access the adapter for advanced operations
const adapter = integration.getAdapter();

// Shutdown when done
await integration.shutdown();
```

## Supported Services

- **SigNoz** - Production monitoring (gRPC)
- **Langfuse** - LLM observability (HTTP)
- **Phoenix** - AI observability (HTTP)
- **Braintrust** - AI experiment tracking (HTTP/gRPC)
- **Dash0** - Observability platform (HTTP)
- **Any OTLP-compatible service** - Custom endpoints

## Testing

```bash
# Run all tests
npm test

# Run OTLP-specific tests
npm test OTLPExporter.test.ts
npm test SpanManager.otlp.test.ts

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Troubleshooting

### Common Issues

1. **Connection Refused**: Check if the endpoint is correct and accessible
2. **Authentication Failed**: Verify your API keys and tokens
3. **Protocol Mismatch**: Ensure the protocol (HTTP/gRPC) matches your service
4. **Timeout Errors**: Increase the timeout value in configuration

### Debug Mode

Enable console output to see what's being exported:

```typescript
exporters: {
  console: true, // Shows traces in console
  otlp: { /* your OTLP config */ }
}
```

### Testing Locally

Use a local OTLP collector for testing:

```bash
# Start local collector
docker run -p 4318:4318 otel/opentelemetry-collector-contrib

# Configure to use local collector
exporters: {
  otlp: {
    endpoint: 'http://localhost:4318',
    protocol: 'http',
    serviceName: 'local-test'
  }
}
```

## Production Considerations

1. **Sampling**: Use probabilistic sampling in production to reduce overhead
2. **Sensitive Data**: Set `includeSensitiveData: false` for production
3. **Exporters**: Configure appropriate exporters for your monitoring stack
4. **Resource Limits**: Monitor memory usage with high-volume workflows
5. **Error Handling**: Implement proper error handling for exporter failures
6. **Performance**: Monitor the impact of observability on your workflows

## API Reference

### Core Classes

- `OpenTelemetryAdapter` - Main adapter for OpenTelemetry integration
- `SpanManager` - Manages span creation and lifecycle
- `KaibanSpanContext` - Context for correlating spans across workflows

### Mappers

- `SimpleTaskMapper` - Maps KaibanJS logs to OpenTelemetry spans

### Exporters

- `ConsoleExporter` - Console output for debugging
- `OTLPExporter` - OTLP protocol exporter for various services

### Types

- `OpenTelemetryConfig` - Main configuration interface
- `OTLPConfig` - OTLP exporter configuration
- `KaibanSpanContext` - Span context interface

## Contributing

Contributions are welcome! Please see the main KaibanJS repository for contribution guidelines.

## License

MIT License - see LICENSE file for details.

## Support

- 📖 [Documentation](https://docs.kaibanjs.com)
- 💬 [Discord Community](https://kaibanjs.com/discord)
- 🐛 [Issue Tracker](https://github.com/kaiban-ai/KaibanJS/issues)

## Roadmap / TODO

### Planned Exporters

The following exporters are planned for future releases:

#### Jaeger Exporter

- **Status**: Not implemented
- **Dependencies**: `@opentelemetry/exporter-jaeger`
- **Use Case**: Direct integration with Jaeger tracing backend
- **Configuration**: Already defined in types, needs implementation

#### Prometheus Exporter

- **Status**: Not implemented
- **Dependencies**: `@opentelemetry/exporter-prometheus`
- **Use Case**: Metrics collection and monitoring
- **Configuration**: Already defined in types, needs implementation

### Implementation Requirements

To add these exporters, the following work is needed:

1. **Create exporter classes** in `src/exporters/`
2. **Implement configuration logic** in `OpenTelemetryAdapter.ts`
3. **Add proper error handling** and validation
4. **Update tests** and documentation
5. **Add examples** demonstrating usage

The OpenTelemetry SDK already provides the necessary infrastructure, so implementation should be straightforward.

## Changelog

### v0.1.0

- Initial release with OTLP exporter support
- Multi-service integration capabilities
- Environment variable configuration
- Comprehensive examples and documentation
- Production-ready error handling and performance optimizations
- Console exporter for development debugging
- OTLP exporter with HTTP and gRPC support
