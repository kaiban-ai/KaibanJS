// C:\Users\pwalc\Documents\GroqEmailAssistant\KaibanJS\src\utils\CustomMessageHistory.ts

/**
 * Represents a custom message history for storing and managing conversation messages.
 */
interface Message {
  role: string;
  content: string;
}

class CustomMessageHistory {
  private messages: Message[];

  constructor() {
    this.messages = [];
  }

  /**
   * Adds a new message to the history.
   * @param message The message to be added.
   * @throws {Error} If the message format is invalid.
   */
  addMessage(message: Message): void {
    if (typeof message === 'object' && 'role' in message && 'content' in message) {
      this.messages.push(message);
    } else {
      throw new Error('Invalid message format. Expected {role, content}');
    }
  }

  /**
   * Retrieves all messages in the history.
   * @returns An array of all messages.
   */
  getMessages(): Message[] {
    return this.messages;
  }

  /**
   * Clears all messages from the history.
   */
  clear(): void {
    this.messages = [];
  }

  /**
   * Gets the number of messages in the history.
   * @returns The number of messages.
   */
  get length(): number {
    return this.messages.length;
  }
}

export default CustomMessageHistory;