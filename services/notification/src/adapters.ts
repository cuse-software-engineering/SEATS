// The LINE Messaging port of the Notification Service and its fake (Table 5.2, ADR-10). The fake logs each push and
// records it; a test can make the next pushes fail. LINE_MESSAGING selects another implementation when one exists.
// The LINE Messaging API is an external system: a push it does not accept is an InfrastructureError naming it.
import { InfrastructureError } from '@seats/errors/src/index.js';

export interface LineMessage { userId: string; kind: string; text: string }

export interface LineMessagingAdapter {
  /** Pushes one message to a LINE user; rejects when the LINE Messaging API does not accept it. */
  push(message: LineMessage): Promise<{ providerMessageId: string }>;
}

/** The fake of progress 1: a log line instead of the LINE Messaging API. */
export class LoggingLineMessaging implements LineMessagingAdapter {
  readonly pushed: LineMessage[] = [];
  failNext = 0;   // tests: the next n pushes are refused
  async push(message: LineMessage): Promise<{ providerMessageId: string }> {
    if (this.failNext > 0) { this.failNext--; throw new InfrastructureError('the LINE Messaging API', 'the LINE Messaging API did not accept the message (fake)'); }
    this.pushed.push(message);
    console.log(`[notification] LINE push to ${message.userId}: ${message.kind}`);
    return { providerMessageId: `fake-${this.pushed.length}` };
  }
}

export function lineMessagingFromEnv(): LineMessagingAdapter {
  const kind = process.env.LINE_MESSAGING ?? 'fake';
  if (kind === 'fake') return new LoggingLineMessaging();
  throw new Error(`LINE_MESSAGING=${kind}: only "fake" is built; the adapter of the LINE Messaging API comes with the channel access token`);
}

/** The adapter in use; tests replace it. */
export const adapters = { lineMessaging: lineMessagingFromEnv() };
