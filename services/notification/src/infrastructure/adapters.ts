// The implementations of the LineMessaging port of the domain (domain/ports.ts; Table 5.2, ADR-10): the fake of
// progress 1 logs each push and records it, and a test can make the next pushes fail. LINE_MESSAGING selects another
// implementation when one exists. The LINE Messaging API is an external system: a push it does not accept is an
// InfrastructureError naming it.
import { InfrastructureError } from '@seats/errors/src/index.js';
import type { LineMessage, LineMessaging } from '../domain/ports.js';

/** The fake of progress 1: a log line instead of the LINE Messaging API. */
export class LoggingLineMessaging implements LineMessaging {
  readonly pushed: LineMessage[] = [];
  failNext = 0;   // tests: the next n pushes are refused
  async push(message: LineMessage): Promise<{ providerMessageId: string }> {
    if (this.failNext > 0) { this.failNext--; throw new InfrastructureError('the LINE Messaging API', 'the LINE Messaging API did not accept the message (fake)'); }
    this.pushed.push(message);
    console.log(`[notification] LINE push to ${message.userId}: ${message.kind}`);
    return { providerMessageId: `fake-${this.pushed.length}` };
  }
}

export function lineMessagingFromEnv(): LineMessaging {
  const kind = process.env.LINE_MESSAGING ?? 'fake';
  if (kind === 'fake') return new LoggingLineMessaging();
  throw new Error(`LINE_MESSAGING=${kind}: only "fake" is built; the adapter of the LINE Messaging API comes with the channel access token`);
}

/** The adapter in use; tests replace it. wire() of index.ts delegates the port to whatever is here at call time. */
export const adapters: { lineMessaging: LineMessaging } = { lineMessaging: lineMessagingFromEnv() };
