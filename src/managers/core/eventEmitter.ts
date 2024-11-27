/**
* @file eventEmitter.ts
* @path src/managers/core/eventEmitter.ts
* @description Core event emitter implementation
*
* @module @managers/core
*/

import { v4 as uuidv4 } from 'uuid';
import type {
  IBaseEvent,
  IEventEmitter,
  IEventHandler,
  IEventRegistry,
  IValidationResult,
  IEventValidationResult
} from '../../types/common/commonEventTypes';
import { createBaseMetadata } from '../../types/common/commonMetadataTypes';
import { createError } from '../../types/common/commonErrorTypes';

// ─── Event Registry Implementation ──────────────────────────────────────────────

class EventRegistry implements IEventRegistry {
  private handlers: Map<string, Set<IEventHandler<any>>> = new Map();

  registerHandler<T extends IBaseEvent>(
    eventType: string,
    handler: IEventHandler<T>
  ): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);
  }

  unregisterHandler<T extends IBaseEvent>(
    eventType: string,
    handler: IEventHandler<T>
  ): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.handlers.delete(eventType);
      }
    }
  }

  getHandlers<T extends IBaseEvent>(eventType: string): IEventHandler<T>[] {
    return Array.from(this.handlers.get(eventType) || []);
  }
}

// ─── Event Emitter Implementation ──────────────────────────────────────────────

export class BaseEventEmitter implements IEventEmitter {
  private registry: IEventRegistry;
  private static instance: BaseEventEmitter;

  protected constructor(registry: IEventRegistry = new EventRegistry()) {
    this.registry = registry;
  }

  public static getInstance(): BaseEventEmitter {
    if (!BaseEventEmitter.instance) {
      BaseEventEmitter.instance = new BaseEventEmitter();
    }
    return BaseEventEmitter.instance;
  }

  async emit<T extends IBaseEvent>(event: T): Promise<void> {
    try {
      const handlers = this.registry.getHandlers<T>(event.type);
      
      if (handlers.length === 0) {
        console.warn(`No handlers registered for event type: ${event.type}`);
        return;
      }

      // Validate event with all handlers before processing
      const validationResult = await this.validateEvent(event, handlers);
      
      if (!validationResult.isValid) {
        throw createError({
          message: `Event validation failed: ${validationResult.errors.join(', ')}`,
          type: 'ValidationError',
          context: {
            eventType: event.type,
            eventId: event.id,
            validationErrors: validationResult.errors
          }
        });
      }

      // Process event with all handlers
      await Promise.all(handlers.map(handler => handler.handle(event)));
      
      console.info(`Successfully processed event: ${event.type}`, {
        eventId: event.id,
        timestamp: event.timestamp
      });
    } catch (error) {
      console.error('Error processing event:', {
        eventType: event.type,
        eventId: event.id,
        error
      });
      throw error;
    }
  }

  on<T extends IBaseEvent>(eventType: string, handler: IEventHandler<T>): void {
    try {
      this.registry.registerHandler(eventType, handler);
      console.debug(`Registered handler for event type: ${eventType}`);
    } catch (error) {
      console.error('Error registering event handler:', {
        eventType,
        error
      });
      throw error;
    }
  }

  off<T extends IBaseEvent>(eventType: string, handler: IEventHandler<T>): void {
    try {
      this.registry.unregisterHandler(eventType, handler);
      console.debug(`Unregistered handler for event type: ${eventType}`);
    } catch (error) {
      console.error('Error unregistering event handler:', {
        eventType,
        error
      });
      throw error;
    }
  }

  // ─── Helper Methods ─────────────────────────────────────────────────────────

  protected createBaseEvent(type: string): IBaseEvent {
    return {
      id: uuidv4(),
      timestamp: Date.now(),
      type,
      metadata: createBaseMetadata('EventEmitter', type)
    };
  }

  protected async validateEvent<T extends IBaseEvent>(
    event: T,
    handlers: IEventHandler<T>[]
  ): Promise<IEventValidationResult> {
    const startTime = Date.now();
    const validationResults = await Promise.all(
      handlers.map(handler => handler.validate(event))
    );

    const isValid = validationResults.every(result => result.isValid);
    const errors = validationResults
      .filter(result => !result.isValid)
      .map(result => result.errors)
      .flat();

    const warnings = validationResults
      .map(result => result.warnings || [])
      .flat();

    return {
      isValid,
      errors,
      warnings,
      metadata: {
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        validatorName: 'EventEmitter'
      }
    };
  }
}

export default BaseEventEmitter.getInstance();
