// The message broker a domain event travels on. A service publishes an event and moves on; some other service's own
// timer or request handling is not involved, unlike the synchronous gRPC collaboration of @seats/store's callers
// (ADR-12). One Broker contract, two implementations, chosen once by configuration when a service starts:
//   - in process (the default: development, the unit and scenario tests, the free-plan demo deployment): one shared
//     instance per Node process, because the broker is one bus every service connects to (RabbitMQ, in a real
//     deployment), not a database of its own per service as @seats/store's memoryStore() is. A publish from one
//     service's serviceBroker() reaches a consumer registered by another service's serviceBroker() in the same
//     process (the monolith, ADR-14), the same way one RabbitMQ node reaches every service's channel.
//   - RabbitMQ through amqplib, when RABBITMQ_URL names one. Queues are durable and messages persistent, so a queued
//     event survives a broker restart; a consumer that throws leaves its message unacked, requeued for another try.
// Both implementations keep the same semantics: a message is JSON (so it travels the same whether in process or over
// AMQP), and publish() before a consumer exists has nowhere to deliver to — dropped, the same shortfall progress 1's
// other fakes have (gateway/src/adapters.ts's FakeLineLogin, say) until the real collaborator is wired.
import { InfrastructureError } from '@seats/errors/src/index.js';

export type BrokerKind = 'memory' | 'rabbitmq';
export type Handler<T> = (message: T) => Promise<void>;

export interface Broker {
  readonly kind: BrokerKind;
  /** Publishes one message onto `queue`; delivered to the queue's consumer when one is registered, dropped otherwise. */
  publish<T extends object>(queue: string, message: T): Promise<void>;
  /** Registers the queue's one consumer. A handler that throws: RabbitMQ requeues the message for another attempt;
   *  the in-process broker has no second attempt, so it logs the failure and moves on. */
  consume<T extends object>(queue: string, handler: Handler<T>): Promise<void>;
  close(): Promise<void>;
}

// ---------------------------------------------------------------- in process
function inProcessBroker(): Broker {
  const handlers = new Map<string, Handler<object>>();
  return {
    kind: 'memory',
    async publish(queue, message) {
      const handler = handlers.get(queue);
      if (!handler) return;   // no consumer registered yet: dropped, like the other fakes of progress 1
      try { await handler(message); } catch (e) { console.warn(`[messaging] ${queue} consumer failed: ${e instanceof Error ? e.message : String(e)}`); }
    },
    async consume(queue, handler) { handlers.set(queue, handler as Handler<object>); },
    async close() { handlers.clear(); },
  };
}

/** A fresh, isolated in-process broker (the tests: each one its own bus, never sharing a queue with another test). */
export function memoryBroker(): Broker { return inProcessBroker(); }

/** The one in-process broker a Node process shares when no RabbitMQ is configured, so two services' serviceBroker()
 *  calls in the same process (the monolith) actually connect. Not exported: a service reaches it only through
 *  serviceBroker(), never directly, so a test cannot mistake it for a fresh memoryBroker(). */
let shared: Broker | undefined;
const sharedMemoryBroker = (): Broker => shared ?? (shared = inProcessBroker());

// ---------------------------------------------------------------- RabbitMQ through amqplib
/** A broker on one RabbitMQ node; `url` as amqplib takes it (amqp://host:5672). Queues are declared durable and a
 *  publish persistent, so a queued event survives a broker restart (it does not survive one in memory, same as the
 *  in-memory store). */
export async function amqpBroker(url: string): Promise<Broker> {
  const amqplib = await import('amqplib');          // loaded only when a service is configured for it
  const connection = await amqplib.connect(url);
  const channel = await connection.createChannel();
  const asserted = new Set<string>();
  const assertQueue = async (queue: string): Promise<void> => {
    if (asserted.has(queue)) return;
    await channel.assertQueue(queue, { durable: true });
    asserted.add(queue);
  };
  return {
    kind: 'rabbitmq',
    async publish(queue, message) {
      await assertQueue(queue);
      const ok = channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), { persistent: true });
      if (!ok) throw new InfrastructureError('RabbitMQ', `the channel's buffer is full publishing to ${queue}`);
    },
    async consume(queue, handler) {
      await assertQueue(queue);
      await channel.consume(queue, (msg) => {
        if (!msg) return;   // the consumer was cancelled (channel or connection closing)
        handler(JSON.parse(msg.content.toString()))
          .then(() => channel.ack(msg))
          .catch((e: unknown) => {
            console.warn(`[messaging] ${queue} consumer failed, requeued: ${e instanceof Error ? e.message : String(e)}`);
            channel.nack(msg, false, true);
          });
      });
    },
    async close() { await channel.close(); await connection.close(); },
  };
}

// ---------------------------------------------------------------- the broker of one service, chosen by configuration
export interface ServiceBroker {
  /** Which implementation answers right now. */
  kind(): BrokerKind;
  /** A publish/consume pair, usable from module load; it follows the implementation chosen by connect(). */
  publish<T extends object>(queue: string, message: T): Promise<void>;
  consume<T extends object>(queue: string, handler: Handler<T>): Promise<void>;
  /** Chooses the implementation: `url` as given, else RABBITMQ_URL, else the in-process broker shared by this Node
   *  process. Call once before serving requests (and before a consumer must be registered). */
  connect(url?: string): Promise<void>;
  /** Closes the RabbitMQ connection, if any, and goes back to the in-process broker. */
  close(): Promise<void>;
}

export function serviceBroker(service: string): ServiceBroker {
  let backend: Broker = sharedMemoryBroker();
  return {
    kind: () => backend.kind,
    publish: (queue, message) => backend.publish(queue, message),
    consume: (queue, handler) => backend.consume(queue, handler),
    async connect(url) {
      const target = url ?? process.env.RABBITMQ_URL;
      if (!target) {
        console.log(`[${service}] no RABBITMQ_URL: events travel in process (shared by this Node process)`);
        return;
      }
      const next = await amqpBroker(target);
      const previous = backend;
      backend = next;
      if (previous.kind === 'rabbitmq') await previous.close();
      console.log(`[${service}] the message broker is RabbitMQ (RABBITMQ_URL)`);
    },
    async close() {
      const previous = backend;
      backend = sharedMemoryBroker();
      if (previous.kind === 'rabbitmq') await previous.close();
    },
  };
}

// ---------------------------------------------------------------- the queues shared between services
/** The wire contract of each event (a plain JSON envelope, since AMQP carries no schema of its own — the analogue of
 *  a .proto message, but for an event a service does not wait on rather than an RPC it calls). */
export const QUEUES = {
  /** UC-01 EF-1 (ADR-08): the Booking Service's hold-expiry job publishes one of these per expired hold; the
   *  Notification Service consumes it and sends HoldExpiredNotice. Replaces waiting on a direct call of
   *  notification.proto's SendHoldExpiredNotice with an event the Booking Service does not wait on and whose failure
   *  does not fail the expiry job. */
  bookingHoldExpired: 'booking.hold-expired',
} as const;

export interface HoldExpiredEvent {
  bookingId: string;
  customerId: string;
  roundId: string;
  roundName: string;
  tableNumber: number;
}
