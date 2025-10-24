# KaibanJS OpenTelemetry Examples

This document provides a comprehensive overview of the OpenTelemetry examples available in the KaibanJS package.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
export OPENAI_API_KEY="your-openai-key"

# Run console example (no external dependencies)
npm run example:console

# Run Langfuse example
export LANGFUSE_PUBLIC_KEY="your-public-key"
export LANGFUSE_SECRET_KEY="your-secret-key"
npm run example:langfuse
```

## 📋 Available Examples

### 1. Console Export (`console-example.ts`)

**Perfect for development and debugging**

- ✅ No external dependencies
- ✅ Immediate console output
- ✅ Development debugging
- ✅ Multiple team complexity levels

**Usage:**

```bash
npm run example:console
```

### 2. Langfuse Export (`langfuse-example.ts`)

**LLM observability and trace visualization**

- ✅ OTLP export to Langfuse
- ✅ LLM observability
- ✅ Trace visualization
- ✅ Performance monitoring

**Setup:**

```bash
export LANGFUSE_PUBLIC_KEY="your-public-key"
export LANGFUSE_SECRET_KEY="your-secret-key"
npm run example:langfuse
```

### 3. SigNoz Export (`signoz-example.ts`)

**Distributed tracing and service monitoring**

- ✅ OTLP export to SigNoz
- ✅ Distributed tracing
- ✅ Service map visualization
- ✅ Performance metrics

**Setup:**

```bash
export SIGNOZ_ACCESS_TOKEN="your-access-token"
npm run example:signoz
```

### 4. Phoenix Export (`phoenix-example.ts`)

**LLM observability and debugging**

- ✅ OTLP export to Phoenix
- ✅ LLM observability
- ✅ Trace visualization
- ✅ Error tracking

**Setup:**

```bash
export PHOENIX_API_KEY="your-api-key"
export PHOENIX_ENDPOINT="https://your-phoenix-instance.com/otel"
npm run example:phoenix
```

### 5. Braintrust Export (`braintrust-example.ts`)

**LLM observability and cost tracking**

- ✅ OTLP export to Braintrust
- ✅ LLM observability
- ✅ Cost tracking
- ✅ Performance optimization

**Setup:**

```bash
export BRAINTRUST_API_KEY="your-api-key"
export BRAINTRUST_ENDPOINT="https://www.braintrust.dev/api/v1/otel"
npm run example:braintrust
```

## 🏗️ Shared Teams

All examples use shared teams that range from simple to complex:

### Simple Teams

- **`simple-data`** - Single agent, single task
- **`content-creation`** - Two agents working in sequence

### Intermediate Teams

- **`resume-creation`** - Multi-agent resume creation
- **`sports-news`** - Research and content creation

### Complex Teams

- **`trip-planning`** - Multi-phase trip planning
- **`product-spec`** - Product specification workflow

## 🎯 Usage Examples

### Run Specific Team

```bash
# Set team name
export TEAM_NAME="trip-planning"
npm run example:langfuse
```

### Run Multiple Examples

```bash
# Run multiple teams
export RUN_TYPE="multiple"
npm run example:langfuse
```

### Run Complex Examples

```bash
# Run complex teams only
export RUN_TYPE="complex"
npm run example:langfuse
```

## 🔧 Configuration

### Environment Variables

#### Required for all examples:

- `OPENAI_API_KEY` - OpenAI API key for LLM calls

#### Langfuse:

- `LANGFUSE_PUBLIC_KEY` - Langfuse public key
- `LANGFUSE_SECRET_KEY` - Langfuse secret key

#### SigNoz:

- `SIGNOZ_ACCESS_TOKEN` - SigNoz access token

#### Phoenix:

- `PHOENIX_API_KEY` - Phoenix API key
- `PHOENIX_ENDPOINT` - Phoenix OTLP endpoint (optional)

#### Braintrust:

- `BRAINTRUST_API_KEY` - Braintrust API key
- `BRAINTRUST_ENDPOINT` - Braintrust OTLP endpoint (optional)

### Custom Configuration

```typescript
import { createOpenTelemetryIntegration } from '@kaibanjs/opentelemetry';

const config = {
  enabled: true,
  sampling: {
    rate: 1.0,
    strategy: 'always',
  },
  attributes: {
    includeSensitiveData: false,
    customAttributes: {
      'service.name': 'my-kaiban-service',
      'service.version': '1.0.0',
    },
  },
  exporters: {
    console: true,
    otlp: {
      endpoint: 'https://your-service.com',
      headers: {
        Authorization: 'Bearer your-token',
      },
      serviceName: 'my-service',
    },
  },
};

const integration = createOpenTelemetryIntegration(config);
```

## 📊 Semantic Conventions

All examples use KaibanJS semantic conventions:

### LLM Request Attributes (`kaiban.llm.request.*`)

- `kaiban.llm.request.messages` - Input messages
- `kaiban.llm.request.model` - Model name
- `kaiban.llm.request.provider` - Provider (openai, anthropic, etc.)
- `kaiban.llm.request.iteration` - Iteration number
- `kaiban.llm.request.start_time` - Start time
- `kaiban.llm.request.status` - Request status

### LLM Usage Attributes (`kaiban.llm.usage.*`)

- `kaiban.llm.usage.input_tokens` - Input tokens
- `kaiban.llm.usage.output_tokens` - Output tokens
- `kaiban.llm.usage.total_tokens` - Total tokens
- `kaiban.llm.usage.cost` - Cost in USD

### LLM Response Attributes (`kaiban.llm.response.*`)

- `kaiban.llm.response.messages` - Output messages
- `kaiban.llm.response.duration` - Response duration
- `kaiban.llm.response.status` - Response status

### Span Types

- `kaiban.agent.thinking` - Agent thinking spans
- `task.execute` - Task execution spans

## 🐛 Troubleshooting

### Common Issues

1. **Missing Environment Variables**

   ```
   Error: Missing required environment variables: OPENAI_API_KEY
   ```

   **Solution:** Set the required environment variables

2. **OTLP Export Failures**

   ```
   Error: OTLP export failed
   ```

   **Solution:** Check your API keys and endpoints

3. **Team Not Found**
   ```
   Error: Team 'invalid-team' not found
   ```
   **Solution:** Use a valid team name from the available teams

### Debug Mode

Enable debug mode for detailed logging:

```bash
export DEBUG=true
npm run example:langfuse
```

## 📚 Additional Resources

- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [Langfuse Documentation](https://langfuse.com/docs)
- [SigNoz Documentation](https://signoz.io/docs)
- [Phoenix Documentation](https://phoenix.arize.com/docs)
- [Braintrust Documentation](https://www.braintrust.dev/docs)

## 🤝 Contributing

To add a new example:

1. Create a new file: `new-service-example.ts`
2. Follow the existing pattern
3. Add configuration and validation
4. Export from `index.ts`
5. Update this README

## 📄 License

MIT License - see LICENSE file for details.
