# Langchain Integration Plan

## Overview
Now that all types are consolidated in KaibanJS/src/types/, we need to properly integrate Langchain's type system with our existing types.

## Integration Strategy

### 1. LLM Types
```typescript
// Use Langchain's base types
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { BaseMessage, SystemMessage, HumanMessage } from '@langchain/core/messages';

// Extend with our provider types
export interface ILLMConfig extends BaseChatModelParams {
  provider: LLMProvider;
  model: string;
  // Additional KaibanJS-specific fields
}

// Provider instances
export type LLMInstance = 
  | ChatGroq
  | ChatOpenAI
  | ChatAnthropic
  | ChatGoogleGenerativeAI
  | ChatMistralAI;
```

### 2. Message Types
```typescript
// Use Langchain's message types directly
export { 
  BaseMessage,
  SystemMessage,
  HumanMessage,
  AIMessage
} from '@langchain/core/messages';

// Extend with our message history
export interface IMessageHistory extends ChatMessageHistory {
  // Additional KaibanJS-specific fields
}
```

### 3. Tool Types
```typescript
// Use Langchain's tool types
export { Tool, ToolParams } from 'langchain/tools';

// Extend with our tool configuration
export interface IToolConfig extends ToolParams {
  // Additional KaibanJS-specific fields
}
```

### 4. Agent Types
```typescript
// Use Langchain's agent types
export interface IExecutableAgent {
  runnable: ChatPromptTemplate;
  getMessageHistory: () => ChatMessageHistory;
  inputMessagesKey: string;
  historyMessagesKey: string;
}
```

## Implementation Steps

### Phase 1: Core Types ⏳
1. [ ] Update LLM types to use Langchain base types
2. [ ] Update message types to use Langchain message types
3. [ ] Update tool types to use Langchain tool types
4. [ ] Add proper type validation

### Phase 2: Manager Integration
1. [ ] Update LLMManager to use Langchain types
2. [ ] Update ThinkingManager to use Langchain types
3. [ ] Update AgenticLoopManager to use Langchain types
4. [ ] Add proper error handling

### Phase 3: Agent Integration
1. [ ] Update ReactChampionAgent to use Langchain types
2. [ ] Update BaseAgent to use Langchain types
3. [ ] Update tool handling to use Langchain types
4. [ ] Add proper validation

## Type Updates

### 1. Provider Types
```typescript
// Update provider configuration
export type LLMProviderConfig = 
  | IGroqConfig 
  | IOpenAIConfig 
  | IAnthropicConfig 
  | IGoogleConfig 
  | IMistralConfig;

// Each config extends Langchain's base config
export interface IGroqConfig extends BaseChatModelParams {
  provider: LLMProvider.GROQ;
  model: GroqModel;
}
```

### 2. Message Types
```typescript
// Update message handling
export interface IMessageHandler {
  createMessage(content: string): BaseMessage;
  createSystemMessage(content: string): SystemMessage;
  createHumanMessage(content: string): HumanMessage;
}
```

### 3. Tool Types
```typescript
// Update tool handling
export interface IToolHandler {
  createTool(config: IToolConfig): Tool;
  validateTool(tool: Tool): boolean;
  executeTool(tool: Tool, input: string): Promise<string>;
}
```

## Success Criteria

### 1. Type Integration
- All LLM operations use Langchain types
- All message operations use Langchain types
- All tool operations use Langchain types
- Clean type hierarchy

### 2. Functionality
- No breaking changes
- All operations work as before
- Better type safety
- Better error handling

### 3. Code Quality
- Clear type definitions
- No duplicate types
- Good documentation
- Proper validation

## Progress
- ✅ Types consolidated in src/types/
- ⏳ LLM integration in progress
- ⏳ Message integration pending
- ⏳ Tool integration pending

## File Organization

### 1. Type Files
- Keep related types together
- Use clear naming conventions
- Add proper documentation
- Include validation

### 2. Manager Files
- Update to use Langchain types
- Keep consistent patterns
- Add proper error handling
- Include validation

### 3. Agent Files
- Update to use Langchain types
- Keep consistent patterns
- Add proper validation
- Include error handling
