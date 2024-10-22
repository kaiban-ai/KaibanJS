// C:\Users\pwalc\Documents\GroqEmailAssistant\KaibanJS\src\utils\CustomMessageHistory.ts

import { BaseListChatMessageHistory } from "@langchain/core/chat_history";
import {
  BaseMessage,
  HumanMessage,
  AIMessage,
  SystemMessage,
  FunctionMessage,
  ChatMessage,
  ChatMessageChunk,
} from "@langchain/core/messages";

interface ChatMessageFieldsWithRole {
  content: string;
  role: string;
}

class CustomMessageHistory extends BaseListChatMessageHistory {
  private messages: BaseMessage[];
  public lc_namespace: string[] = ["langchain", "memory", "custom_chat_history"];

  constructor() {
    super();
    this.messages = [];
  }

  async addMessage(message: BaseMessage): Promise<void> {
    this.messages.push(message);
  }

  async getMessages(): Promise<BaseMessage[]> {
    return this.messages;
  }

  async clear(): Promise<void> {
    this.messages = [];
  }

  get length(): number {
    return this.messages.length;
  }

  async addUserMessage(message: string): Promise<void> {
    await this.addMessage(new HumanMessage(message));
  }

  async addAIMessage(message: string): Promise<void> {
    await this.addMessage(new AIMessage(message));
  }

  async addSystemMessage(message: string): Promise<void> {
    await this.addMessage(new SystemMessage(message));
  }

  async addFunctionMessage(name: string, content: string): Promise<void> {
    await this.addMessage(new FunctionMessage(content, name));
  }

  async addChatMessage(fields: ChatMessageFieldsWithRole): Promise<void> {
    await this.addMessage(new ChatMessage(fields));
  }

  getMessageRole(message: BaseMessage): string {
    if (message instanceof HumanMessage) return 'human';
    if (message instanceof AIMessage) return 'ai';
    if (message instanceof SystemMessage) return 'system';
    if (message instanceof FunctionMessage) return 'function';
    if (message instanceof ChatMessage) return (message as ChatMessage).role;
    return 'unknown';
  }

  getMessageType(message: BaseMessage): string {
    return message._getType();
  }

  isMessageChunk(message: BaseMessage): boolean {
    return message instanceof ChatMessageChunk;
  }

  // New method to handle message chunks if needed
  async addMessageChunk(chunk: BaseMessage): Promise<void> {
    if (this.isMessageChunk(chunk)) {
      if (this.messages.length > 0 && this.isMessageChunk(this.messages[this.messages.length - 1])) {
        const lastMessage = this.messages[this.messages.length - 1] as ChatMessageChunk;
        this.messages[this.messages.length - 1] = lastMessage.concat(chunk as ChatMessageChunk);
      } else {
        await this.addMessage(chunk);
      }
    } else {
      await this.addMessage(chunk);
    }
  }
}

export default CustomMessageHistory;