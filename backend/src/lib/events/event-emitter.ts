import { Injectable, Logger } from '@nestjs/common';
import { DomainEvent, DomainEventType } from './domain-events';

export type EventHandler<T extends DomainEvent = DomainEvent> = (event: T) => Promise<void> | void;

@Injectable()
export class DomainEventEmitter {
  private readonly logger = new Logger(DomainEventEmitter.name);
  private readonly handlers: Map<DomainEventType, EventHandler[]> = new Map();

  /**
   * Register an event handler
   */
  on<T extends DomainEvent>(eventType: DomainEventType, handler: EventHandler<T>): void {
    const existing = this.handlers.get(eventType) || [];
    existing.push(handler as EventHandler);
    this.handlers.set(eventType, existing);
    this.logger.debug(`Registered handler for ${eventType}`);
  }

  /**
   * Emit a domain event
   */
  async emit<T extends DomainEvent>(event: T): Promise<void> {
    const handlers = this.handlers.get(event.type) || [];

    this.logger.log(`Emitting event: ${event.type} for tenant ${event.tenantId}`);

    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (error) {
        this.logger.error(
          `Error handling event ${event.type}: ${error.message}`,
          error.stack,
        );
        // Continue with other handlers even if one fails
      }
    }
  }

  /**
   * Remove a specific handler
   */
  off(eventType: DomainEventType, handler: EventHandler): void {
    const handlers = this.handlers.get(eventType) || [];
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
      this.handlers.set(eventType, handlers);
    }
  }

  /**
   * Remove all handlers for an event type
   */
  removeAllListeners(eventType?: DomainEventType): void {
    if (eventType) {
      this.handlers.delete(eventType);
    } else {
      this.handlers.clear();
    }
  }

  /**
   * Get count of registered handlers
   */
  listenerCount(eventType: DomainEventType): number {
    return (this.handlers.get(eventType) || []).length;
  }
}
