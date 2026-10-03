// The ports of the domain: what it needs from outside, as interfaces. infrastructure/index.ts binds the implementations
// (wire()); the rules call them through `ports` and never import the infrastructure.
import type { MessageRepository } from './repository.js';

export interface LineMessage { userId: string; kind: string; text: string }

/** The LINE Messaging API as the domain uses it (Table 5.2, ADR-10); infrastructure/adapters.ts holds the implementations. */
export interface LineMessaging {
  /** Pushes one message to a LINE user; rejects with an InfrastructureError when the LINE Messaging API does not accept it. */
  push(message: LineMessage): Promise<{ providerMessageId: string }>;
}

export interface Ports {
  messages: MessageRepository;
  lineMessaging: LineMessaging;
}

/** Bound by wire(); reading a port before that throws a clear error instead of an undefined access. */
export const ports: Ports = new Proxy({} as Ports, {
  get(target, key) {
    if (!(key in target)) throw new Error(`port ${String(key)} is not bound: call wire() of the infrastructure first`);
    return target[key as keyof Ports];
  },
});

export const bindPorts = (p: Partial<Ports>): void => { Object.assign(ports, p); };
