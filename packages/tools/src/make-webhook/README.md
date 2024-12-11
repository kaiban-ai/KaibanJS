# Make Webhook Tool

The Make Webhook Tool allows AI agents to interact with Make's webhook service, enabling seamless integration with thousands of apps and services supported by Make.

## Purpose

The Make Webhook Tool is designed to extend the capabilities of AI agents by allowing them to trigger workflows and automate tasks across various applications using Make's webhook functionality. This tool is ideal for scenarios where agents need to interact with multiple services and automate complex workflows.

## Features

- Easy integration with Make's webhook service
- Trigger workflows and automate tasks across thousands of apps
- Configurable options for webhook events and payloads

## Usage

To use the Make Webhook Tool, follow these steps:

**Configure the Tool**: Create an instance of the `MakeWebhook` tool with the required configuration.

```javascript
import { z } from 'zod';

const MakeTool = new MakeWebhook({
  url: 'https://hooks.Make.com/hooks/catch/4716958/2sdvyu2', // Set your Make webhook URL here
  schema: z.object({
    emailSubject: z.string().describe('The subject of the email.'),
    issuesSummary: z.string().describe('The summary of the issues.'),
  }),
});
```

**Use the Tool**: Integrate the tool into your workflow or agent.

```javascript
const response = await MakeTool._call({
  emailSubject: 'Weekly GitHub Issues Report',
  issuesSummary: 'Summary of the issues found in the repository.',
});

console.log(response);
```

For questions or discussions, join our [Discord](https://kaibanjs.com/discord).

## License

MIT License
