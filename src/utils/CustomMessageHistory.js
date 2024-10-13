class CustomMessageHistory {
    constructor() {
      this.messages = [];
    }
  
    addMessage(message) {
      if (typeof message === 'object' && 'role' in message && 'content' in message) {
        this.messages.push(message);
      } else {
        throw new Error('Invalid message format. Expected {role, content}');
      }
    }
  
    getMessages() {
      return this.messages;
    }
  
    clear() {
      this.messages = [];
    }
  
    get length() {
      return this.messages.length;
    }
  }
  
  export default CustomMessageHistory;