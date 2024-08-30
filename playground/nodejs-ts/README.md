# AgenticJS - NodeJS Typescript Example

### Getting started

To begin using agenticjs using typescript support.

1. Install the agenticjs library like normal.

`npm install agenticjs`

2. Install typescript as a dev depedency.

`npm install typescript --save-dev`

(Optional) You may create a custom tsconfig.json file if needed.
A basic configuration would look something like this:-

```json
{
  "compilerOptions": {
    "noEmit": true,
    "strict": true,
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "exclude": ["node_modules"]
}
```

3. And now you can start using agenticjs with full typescript support.
   Main classes are typed and can be called directly from the library - `Agent`, `Task` and `Type`.

`import { Agent, Task, Team } from "agenticjs";`

For any specific types, can call them like below:-

`import type { IAgentParams, ITaskParams } from "agenticjs";`

You can check the index.ts as a good reference to get started.

### Development

> NOTE: Make sure your local typed package is built. (Use `npm run build` in the root folder to build the package if haven't already)

For testing the playground example, setup as follows:-

1. Install all dependencies

`npm i`

2. Run the example!

`npm run start`
