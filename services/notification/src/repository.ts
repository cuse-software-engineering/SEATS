// The repository of the Notification DB: the domain's view of its messages, with methods named after what the domain
// asks for. collection<T>() of store.ts is called here only; the domain imports `messages` and never sees a Collection<T>.
import { collection } from './store.js';
import type { Message } from './model.js';

export interface MessageRepository {
  /** The message with this id, or null. */
  get(messageId: string): Promise<Message | null>;
  /** Inserts or replaces the message (each attempt rewrites its outcome); answers the message as given. */
  save(m: Message): Promise<Message>;
  /** Every message, for the tests and the live view. */
  all(): Promise<Message[]>;
  /** The messages with delivered: false; the retry job filters the attempts below the maximum. */
  undelivered(): Promise<Message[]>;
}

const stored = collection<Message>('messages');
/** The messages of this service's database. */
export const messages: MessageRepository = {
  get: (messageId) => stored.get(messageId),
  save: (m) => stored.put(m.messageId, m),
  all: () => stored.list(),
  undelivered: () => stored.find({ delivered: false }),
};
