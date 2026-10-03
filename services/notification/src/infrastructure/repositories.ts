// The repositories of the Notification DB: the MessageRepository of the domain (domain/repository.ts) implemented over
// collection<T>() of store.ts. Only this file sees a Collection<T>; wire() of index.ts binds `messages` to the domain's port.
import type { MessageRepository } from '../domain/repository.js';
import type { Message } from '../domain/model.js';
import { collection } from './store.js';

const stored = collection<Message>('messages');
/** The messages of this service's database. */
export const messages: MessageRepository = {
  get: (messageId) => stored.get(messageId),
  save: (m) => stored.put(m.messageId, m),
  all: () => stored.list(),
  undelivered: () => stored.find({ delivered: false }),
};
