import { EventEmitter } from "events";

// Typed event map for internal event bus
export interface AlertEvents {
  "alert:created": {
    alertId: string;
    patientId: string;
    severity: string;
    message: string;
    triggeredAt: Date;
  };
  "alert:suppressed": {
    alertId: string;
    patientId: string;
    suppressedCount: number;
    severity: string;
    message: string;
    triggeredAt: Date;
  };
}

type EventMap = AlertEvents;

class TypedEventBus extends EventEmitter {
  emitEvent<K extends keyof EventMap>(event: K, payload: EventMap[K]): boolean {
    return this.emit(event, payload);
  }

  onEvent<K extends keyof EventMap>(
    event: K,
    listener: (payload: EventMap[K]) => void,
  ): this {
    return this.on(event, listener);
  }

  offEvent<K extends keyof EventMap>(
    event: K,
    listener: (payload: EventMap[K]) => void,
  ): this {
    return this.off(event, listener);
  }
}

// Singleton - used to decouple worker from socket gateway
export const eventBus = new TypedEventBus();
