// The repository of the Notification DB as the domain sees it: methods named after what the rules ask for, nothing of
// the database. infrastructure/repositories.ts implements it over the store; the rules reach it through ports.messages.
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
