/**
 * @file baseEventEmitterManager.ts
 * @path src/managers/core/baseEventEmitterManager.ts
 * @description Base event emitter manager implementation
 */

// Runtime imports
import { CoreManager } from './coreManager';
import { v4 as uuidv4 } from 'uuid';
import { createBaseMetadata } from '../../types/common/baseTypes';
import { createError } from '../../types/common/errorTypes';
import { createValidationResult } from '../../types/common/validationTypes';

// Single declaration for all runtime-needed imports
declare interface _RuntimeImports {
    core: typeof CoreManager;
    external: typeof uuidv4;
    utils: typeof createBaseMetadata & typeof createError & typeof createValidationResult;
}

// Type-only imports
import type {
    IBaseEvent,
    IEventEmitter,
    IEventHandler,
    IEventRegistry
} from '../../types/common/baseTypes';
import type { IValidationResult } from '../../types/common/validationTypes';

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

// ─── Base Event Emitter Manager Implementation ──────────────────────────────────────────────

export abstract class BaseEventEmitterManager extends CoreManager implements IEventEmitter {
    private readonly registry: IEventRegistry;

    protected constructor() {
        super();
        this.registry = new EventRegistry();
    }

    // ─── IEventEmitter Implementation ────────────────────────────────────────────

    public async emit<T extends IBaseEvent>(event: T): Promise<void> {
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

    public on<T extends IBaseEvent>(eventType: string, handler: IEventHandler<T>): void {
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

    public off<T extends IBaseEvent>(eventType: string, handler: IEventHandler<T>): void {
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

    // ─── Protected Helper Methods ─────────────────────────────────────────────────────

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
    ): Promise<IValidationResult> {
        const startTime = Date.now();
        const validationResults = await Promise.all(
            handlers.map(handler => handler.validate(event))
        );

        const isValid = validationResults.every(result => result.isValid);
        const errors = validationResults
            .filter(result => !result.isValid)
            .flatMap(result => [...result.errors]);

        const warnings = validationResults
            .flatMap(result => [...(result.warnings || [])]);

        return createValidationResult({
            isValid,
            errors,
            warnings,
            metadata: {
                timestamp: Date.now(),
                duration: Date.now() - startTime,
                validatorName: 'EventEmitter'
            }
        });
    }
}
