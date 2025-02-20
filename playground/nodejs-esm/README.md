# Node.js ESM Example

This example demonstrates using KaibanJS in a Node.js environment with ESM (ECMAScript Modules) imports. It includes both ESM and CommonJS versions of the same code to showcase compatibility across different module systems.

## Environment Setup

- Node.js version: >=21.0.0 (tested with Node.js 21)
- KaibanJS version: ^0.14.0

## Project Structure

```
nodejs-esm/
├── .env                 # Environment variables configuration
├── index.js            # ESM version using import statements
├── index.cjs           # CommonJS version using require statements
└── package.json        # Project configuration with "type": "module"
```

## Key Features

- Demonstrates KaibanJS usage in a Node.js environment
- Shows both ESM and CommonJS module system compatibility
- Implements a complete team workflow with multiple agents and tasks
- Includes proper error handling and workflow status monitoring

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Configure your environment:

   - Copy `.env.example` to `.env` (if not already done)
   - Add your OpenAI API key to `.env`:
     ```
     OPENAI_API_KEY=your-api-key-here
     ```

3. Run the examples:

   ```bash
   # Run ESM version
   npm start

   # Run CommonJS version
   npm run start:cjs
   ```

## Code Examples

### ESM Version (index.js)

```javascript
import { Agent, Task, Team } from 'kaibanjs';
```

### CommonJS Version (index.cjs)

```javascript
const { Agent, Task, Team } = require('kaibanjs');
```

## Notes

- This example demonstrates that KaibanJS works in Node.js environments without requiring React as a dependency
- The example uses zustand's core functionality without React-specific features
- Both ESM and CommonJS versions implement the same functionality to showcase module system compatibility
