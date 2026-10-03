// Unit tests of the Notification Service domain (src/domain/messages.ts): the LINE Messaging API behind its adapter (ADR-10),
// the fake that records each push and can refuse the next ones (fault injection), and the retry job of FR-22. Techniques of
// docs/test-design.md, one table in the header comment of each describe and one named test per row: equivalence classes of
// the three notices and of getMessage, the boundary values of the retry job around MAX_ATTEMPTS.
import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import * as d from '../src/domain/index.js';
import { resetStore, wire } from '../src/infrastructure/index.js';
import { adapters, LoggingLineMessaging } from '../src/infrastructure/adapters.js';
import { messages } from '../src/infrastructure/repositories.js';
import type { DomainErrorKind } from '@seats/errors/src/index.js';

wire();   // binds the repositories and the LINE adapter to the domain's ports, once

const MAX_ATTEMPTS = 3;   // FR-22 as messages.ts counts it: pushes in total, the first send included
const rejected = (p: Promise<unknown>, kind: DomainErrorKind) => assert.rejects(p, (e: unknown) => e instanceof d.DomainError && e.kind === kind);
const REQUEST = { customerId: 'U-somchai', bookingId: 'b1', roundName: 'Friday Live', tableNumber: 5 };
const SENDERS: Record<d.NotificationKind, (req: d.NotificationRequest) => Promise<d.NotificationResult>> = { BookingConfirmation: d.sendBookingConfirmation, HoldExpiredNotice: d.sendHoldExpiredNotice, PaymentFailedNotice: d.sendPaymentFailedNotice };
let line: LoggingLineMessaging;
const quiet = <T>(fn: () => Promise<T>): Promise<T> => { const log = console.log, warn = console.warn; console.log = () => {}; console.warn = () => {}; return fn().finally(() => { console.log = log; console.warn = warn; }); };
/** The record the domain keeps of a message. */
const stored = async (messageId: string): Promise<d.Message> => (await d.getMessage(messageId)) ?? assert.fail(`message ${messageId} is not stored`);
/** A message seeded into an outcome: sent once (accepted or refused by LINE), then its attempt count set to `attempts`. */
const seeded = async (delivered: boolean, attempts: number): Promise<string> => {
  line.failNext = delivered ? 0 : 1;
  const { messageId } = await d.sendBookingConfirmation(REQUEST);
  const m = await stored(messageId); m.attempts = attempts; await messages.save(m);
  return messageId;
};

beforeEach(async () => { await resetStore(); line = new LoggingLineMessaging(); adapters.lineMessaging = line; });

describe('the three notices: sendBookingConfirmation, sendHoldExpiredNotice, sendPaymentFailedNotice', () => {
  // | class                          | input                                       | expected                                                                      |
  // |--------------------------------|---------------------------------------------|-------------------------------------------------------------------------------|
  // | valid, each kind               | REQUEST                                     | delivered; one push; the record: kind, ids, attempts 1, lastError ''          |
  // | valid, the answer of the port  | the fake answers providerMessageId fake-1   | delivered; the id is not kept (MESSAGE of data-model.md has no field for it)  |
  // | customerId missing             | '' / undefined                              | invalid, nothing pushed, nothing stored                                       |
  // | bookingId missing              | '' / undefined                              | invalid                                                                       |
  // | both missing                   | {}                                          | invalid                                                                       |
  // | roundName, tableNumber missing | {customerId, bookingId}                     | invalid, nothing pushed, nothing stored                                       |
  // | LINE refuses                   | failNext 1                                  | the InfrastructureError is caught: not delivered, attempts 1, lastError kept  |
  // | LINE port throws a non-Error   | push rejects with 'boom'                    | caught too: not delivered, attempts 1, lastError 'boom'                        |
  test('valid, the three notices: REQUEST through each sender -> one push each, recorded with attempts 1, delivered', () => quiet(async () => {
    const senders = [['BookingConfirmation', d.sendBookingConfirmation], ['HoldExpiredNotice', d.sendHoldExpiredNotice], ['PaymentFailedNotice', d.sendPaymentFailedNotice]] as const;
    for (const [kind, send] of senders) {
      const r = await send(REQUEST);
      assert.equal(r.delivered, true);
      const m = await messages.get(r.messageId);
      assert.deepEqual([m?.kind, m?.customerId, m?.bookingId, m?.attempts, m?.lastError], [kind, 'U-somchai', 'b1', 1, '']);
      assert.ok(m?.text.includes('table 5') && m.text.includes('Friday Live'), m?.text);
    }
    assert.deepEqual(line.pushed.map((p) => [p.userId, p.kind]), [['U-somchai', 'BookingConfirmation'], ['U-somchai', 'HoldExpiredNotice'], ['U-somchai', 'PaymentFailedNotice']]);
  }));
  test('required fields: customerId "", bookingId undefined -> invalid, nothing pushed, nothing stored', () => quiet(async () => {
    await rejected(d.sendBookingConfirmation({ ...REQUEST, customerId: '' }), 'invalid');
    await rejected(d.sendHoldExpiredNotice({ ...REQUEST, bookingId: undefined }), 'invalid');
    assert.deepEqual([line.pushed, await messages.all()], [[], []]);
  }));
  const CASES: { name: string; kind: d.NotificationKind; input: d.NotificationRequest; refused?: DomainErrorKind; text?: RegExp }[] = [
    { name: 'valid, BookingConfirmation: REQUEST -> delivered, the text names table 5 and Friday Live as confirmed', kind: 'BookingConfirmation', input: REQUEST, text: /^Your table 5 for Friday Live is confirmed\./ },
    { name: 'valid, HoldExpiredNotice: REQUEST -> delivered, the text says the hold on table 5 expired', kind: 'HoldExpiredNotice', input: REQUEST, text: /^Your hold on table 5 for Friday Live has expired;/ },
    { name: 'valid, PaymentFailedNotice: REQUEST -> delivered, the text says the payment for table 5 failed', kind: 'PaymentFailedNotice', input: REQUEST, text: /^The payment for table 5 for Friday Live failed;/ },
    { name: 'customerId missing: "" -> invalid, nothing pushed, nothing stored', kind: 'BookingConfirmation', input: { ...REQUEST, customerId: '' }, refused: 'invalid' },
    { name: 'customerId missing: undefined -> invalid', kind: 'HoldExpiredNotice', input: { ...REQUEST, customerId: undefined }, refused: 'invalid' },
    { name: 'bookingId missing: "" -> invalid', kind: 'PaymentFailedNotice', input: { ...REQUEST, bookingId: '' }, refused: 'invalid' },
    { name: 'bookingId missing: undefined -> invalid', kind: 'BookingConfirmation', input: { ...REQUEST, bookingId: undefined }, refused: 'invalid' },
    { name: 'both missing: {} -> invalid', kind: 'PaymentFailedNotice', input: {}, refused: 'invalid' },
  ];
  for (const c of CASES) test(c.name, () => quiet(async () => {
    if (c.refused) { await rejected(SENDERS[c.kind](c.input), c.refused); assert.deepEqual([line.pushed, await messages.all()], [[], []], 'nothing pushed, nothing stored'); return; }
    const r = await SENDERS[c.kind](c.input);
    assert.equal(r.delivered, true);
    const m = await stored(r.messageId);
    assert.deepEqual([m.kind, m.customerId, m.bookingId, m.delivered, m.attempts, m.lastError], [c.kind, c.input.customerId, c.input.bookingId, true, 1, '']);
    assert.match(m.text, c.text ?? /./);
    assert.deepEqual(line.pushed, [{ userId: c.input.customerId, kind: c.kind, text: m.text }]);
  }));
  test('valid, the answer of the port: the LINE fake answers providerMessageId fake-1 -> delivered; the record keeps the fields of MESSAGE (data-model.md) plus attempts and lastError, not the provider id', () => quiet(async () => {
    const answered: string[] = [];
    adapters.lineMessaging = { push: async (m) => { const r = await line.push(m); answered.push(r.providerMessageId); return r; } };
    const r = await d.sendBookingConfirmation(REQUEST);
    assert.deepEqual([r.delivered, answered], [true, ['fake-1']]);
    assert.deepEqual(Object.keys(await stored(r.messageId)).sort(), ['attempts', 'bookingId', 'customerId', 'delivered', 'kind', 'lastError', 'messageId', 'sentAt', 'text']);
  }));
  test('roundName and tableNumber missing: {customerId, bookingId} -> invalid, nothing pushed, nothing stored', () => quiet(async () => {
    await rejected(d.sendBookingConfirmation({ customerId: 'U-somchai', bookingId: 'b1' }), 'invalid');
    assert.equal(line.pushed.length, 0);
  }));
  test('LINE refuses: failNext 1 -> the InfrastructureError is caught: not delivered, kept with attempts 1 and the LINE error as lastError, nothing pushed', () => quiet(async () => {
    line.failNext = 1;
    const r = await d.sendPaymentFailedNotice(REQUEST);   // no InfrastructureError escapes to the caller
    const m = await stored(r.messageId);
    assert.deepEqual([r.delivered, m.delivered, m.attempts, m.lastError, line.pushed], [false, false, 1, 'the LINE Messaging API did not accept the message (fake)', []]);
  }));
  test('LINE port rejects with a non-Error: push rejects with "boom" -> caught too: not delivered, attempts 1, lastError "boom"', () => quiet(async () => {
    adapters.lineMessaging = { push: () => Promise.reject('boom') };
    const r = await d.sendBookingConfirmation(REQUEST);
    const m = await stored(r.messageId);
    assert.deepEqual([r.delivered, m.delivered, m.attempts, m.lastError], [false, false, 1, 'boom']);
  }));
});

describe('when the LINE Messaging API refuses the message (UC-01 EF-3, FR-22)', () => {
  // | class                  | input       | expected                                                               |
  // |------------------------|-------------|------------------------------------------------------------------------|
  // | LINE refuses once      | failNext 1  | not delivered, attempts 1, lastError names the refusal                 |
  // | succeeds on retry      | failNext 1  | the retry job resends it once: delivered, attempts 2; nothing left     |
  // | far above the maximum  | failNext 10 | three attempts in all, then the job gives up: undelivered, attempts 3  |
  test('LINE refuses once: failNext 1 -> not delivered, kept with attempts 1 and lastError', () => quiet(async () => {
    line.failNext = 1;
    const r = await d.sendBookingConfirmation(REQUEST);
    assert.equal(r.delivered, false);
    const m = await d.getMessage(r.messageId);
    assert.equal(m?.attempts, 1); assert.match(m?.lastError ?? '', /did not accept/);
  }));
  test('succeeds on retry: failNext 1 -> the retry job resends it once, delivered with attempts 2, nothing left to retry', () => quiet(async () => {
    line.failNext = 1;
    const r = await d.sendHoldExpiredNotice(REQUEST);
    assert.deepEqual(await d.retryFailedMessages(), [r.messageId]);
    const m = await d.getMessage(r.messageId);
    assert.equal(m?.delivered, true); assert.equal(m?.attempts, 2);
    assert.deepEqual(await d.retryFailedMessages(), [], 'nothing left to retry');
  }));
  test('far above the maximum: failNext 10 -> the retry job gives up after three attempts, undelivered with attempts 3, the fourth push never tried', () => quiet(async () => {
    line.failNext = 10;
    const r = await d.sendPaymentFailedNotice(REQUEST);
    await d.retryFailedMessages(); await d.retryFailedMessages();
    assert.deepEqual(await d.retryFailedMessages(), [], 'the fourth push is never tried');
    const m = await d.getMessage(r.messageId);
    assert.deepEqual([m?.delivered, m?.attempts], [false, 3]);
    assert.equal(line.pushed.length, 0);
  }));
});

describe('retryFailedMessages (FR-22): one message around MAX_ATTEMPTS', () => {
  // The message is sent once, its attempt count then seeded; `runs` is what each run of the job answers ([id] or []).
  // lastError is '' exactly when the message is delivered.
  // | class                          | seeded as                      | LINE      | expected: runs; record after                                   |
  // |--------------------------------|--------------------------------|-----------|----------------------------------------------------------------|
  // | one below the maximum          | undelivered, attempts MAX-1    | refusing  | retried, then nothing; undelivered, attempts MAX               |
  // | last allowed attempt succeeds  | undelivered, attempts MAX-1    | accepting | retried, then nothing; delivered, attempts MAX                 |
  // | at the maximum                 | undelivered, attempts MAX      | accepting | never retried; undelivered, attempts MAX                       |
  // | above the maximum              | undelivered, attempts MAX+1    | accepting | never retried; unchanged                                       |
  // | one failed send                | undelivered, attempts 1        | refusing  | retried twice, then nothing; undelivered, attempts MAX         |
  // | succeeds on retry              | undelivered, attempts 1        | accepting | retried, then nothing; delivered, attempts 2 kept              |
  // | never pushed                   | undelivered, attempts 0        | accepting | retried, then nothing; delivered, attempts 1                   |
  // | delivered                      | delivered, attempts 1          | accepting | never retried; attempts stays 1                                |
  // | delivered below the maximum    | delivered, attempts MAX-1      | accepting | never retried; unchanged                                       |
  const CASES: { name: string; delivered: boolean; attempts: number; failNext: number; runs: boolean[]; after: [boolean, number] }[] = [
    { name: 'one below the maximum: undelivered with attempts MAX-1, LINE still refusing -> retried once more, then never again; undelivered with attempts MAX', delivered: false, attempts: MAX_ATTEMPTS - 1, failNext: 10, runs: [true, false, false], after: [false, MAX_ATTEMPTS] },
    { name: 'last allowed attempt succeeds: undelivered with attempts MAX-1, LINE accepting -> retried once, delivered with attempts MAX', delivered: false, attempts: MAX_ATTEMPTS - 1, failNext: 0, runs: [true, false], after: [true, MAX_ATTEMPTS] },
    { name: 'at the maximum: undelivered with attempts MAX, LINE accepting -> never retried, undelivered with attempts MAX', delivered: false, attempts: MAX_ATTEMPTS, failNext: 0, runs: [false, false], after: [false, MAX_ATTEMPTS] },
    { name: 'above the maximum: undelivered with attempts MAX+1 (seeded) -> never retried, unchanged', delivered: false, attempts: MAX_ATTEMPTS + 1, failNext: 0, runs: [false], after: [false, MAX_ATTEMPTS + 1] },
    { name: 'one failed send: undelivered with attempts 1, LINE still refusing -> retried on two runs, then stops; undelivered with attempts MAX', delivered: false, attempts: 1, failNext: 10, runs: [true, true, false], after: [false, MAX_ATTEMPTS] },
    { name: 'succeeds on retry: undelivered with attempts 1, LINE accepting -> retried once, delivered with attempts 2 kept', delivered: false, attempts: 1, failNext: 0, runs: [true, false], after: [true, 2] },
    { name: 'never pushed: undelivered with attempts 0 (seeded) -> retried once, delivered with attempts 1', delivered: false, attempts: 0, failNext: 0, runs: [true, false], after: [true, 1] },
    { name: 'delivered: delivered with attempts 1 -> never retried, attempts stays 1', delivered: true, attempts: 1, failNext: 0, runs: [false, false], after: [true, 1] },
    { name: 'delivered below the maximum: delivered with attempts MAX-1 (seeded) -> never retried, unchanged', delivered: true, attempts: MAX_ATTEMPTS - 1, failNext: 0, runs: [false], after: [true, MAX_ATTEMPTS - 1] },
  ];
  for (const c of CASES) test(c.name, () => quiet(async () => {
    const id = await seeded(c.delivered, c.attempts);
    line.failNext = c.failNext;
    for (const [i, retried] of c.runs.entries()) assert.deepEqual(await d.retryFailedMessages(), retried ? [id] : [], `run ${i + 1}`);
    const m = await stored(id);
    assert.deepEqual([m.delivered, m.attempts], c.after);
    assert.equal(m.lastError === '', m.delivered, 'lastError is empty exactly when delivered');
  }));
});

describe('retryFailedMessages (FR-22): several messages in one run', () => {
  // | class          | messages                                            | expected                                                          |
  // |----------------|-----------------------------------------------------|-------------------------------------------------------------------|
  // | all undelivered| three refused notices, one per kind                 | all three retried in one run, in order; each delivered, attempts 2 |
  // | mixed          | delivered; undelivered at 1; undelivered at MAX     | only the one at 1 is retried, the others unchanged                |
  // | none           | no message                                          | nothing retried                                                   |
  test('all undelivered: three refused notices -> all three retried in one run, in order, each delivered with attempts 2', () => quiet(async () => {
    line.failNext = 3;
    const ids = [await d.sendBookingConfirmation(REQUEST), await d.sendHoldExpiredNotice(REQUEST), await d.sendPaymentFailedNotice(REQUEST)].map((r) => r.messageId);
    assert.deepEqual(await d.retryFailedMessages(), ids);
    for (const id of ids) { const m = await stored(id); assert.deepEqual([m.delivered, m.attempts, m.lastError], [true, 2, '']); }
    assert.deepEqual(line.pushed.map((p) => p.kind), ['BookingConfirmation', 'HoldExpiredNotice', 'PaymentFailedNotice']);
  }));
  test('mixed: delivered, undelivered at attempts 1, undelivered at MAX -> only the one at 1 is retried, the others unchanged', () => quiet(async () => {
    const done = await seeded(true, 1), open = await seeded(false, 1), spent = await seeded(false, MAX_ATTEMPTS);
    assert.deepEqual(await d.retryFailedMessages(), [open]);
    assert.deepEqual(await Promise.all([done, open, spent].map(async (id) => { const m = await stored(id); return [m.delivered, m.attempts]; })), [[true, 1], [true, 2], [false, MAX_ATTEMPTS]]);
  }));
  test('none: no message -> nothing retried', () => quiet(async () => { assert.deepEqual(await d.retryFailedMessages(), []); }));
});

describe('retryFailedMessages (FR-22): failNext from the send on (fault injection, UC-01 EF-3)', () => {
  // One notice is sent with `failNext` refusals queued on the fake; `runs` is what each run of the job answers ([id] or []).
  // | class                 | failNext | expected: runs; record after; pushes that reached LINE                                       |
  // |-----------------------|----------|----------------------------------------------------------------------------------------------|
  // | none refused          | 0        | nothing to retry; delivered by the send, attempts 1; 1 push                                  |
  // | one refused           | 1        | the send fails, the first run delivers; attempts 2; 1 push                                   |
  // | one below the maximum | MAX-1    | the send and one run fail, the second run delivers; delivered, attempts MAX; 1 push          |
  // | at the maximum        | MAX      | the send and two runs fail, the third run retries nothing; undelivered, attempts MAX; 0 push |
  // | above the maximum     | MAX+1    | the same: the rule stops at MAX whatever LINE would do next; 0 push                          |
  // | far above             | 10       | the same; 0 push                                                                             |
  const CASES: { name: string; failNext: number; runs: boolean[]; after: [boolean, number]; pushed: number }[] = [
    { name: 'none refused: failNext 0 -> delivered by the send with attempts 1, nothing to retry, 1 push', failNext: 0, runs: [false], after: [true, 1], pushed: 1 },
    { name: 'one refused: failNext 1 -> the send fails, the first run delivers with attempts 2, 1 push', failNext: 1, runs: [true, false], after: [true, 2], pushed: 1 },
    { name: 'one below the maximum: failNext MAX-1 -> the send and one run fail, the second run delivers with attempts MAX, 1 push', failNext: MAX_ATTEMPTS - 1, runs: [true, true, false], after: [true, MAX_ATTEMPTS], pushed: 1 },
    { name: 'at the maximum: failNext MAX -> the send and two runs fail, the third run retries nothing; undelivered with attempts MAX, 0 push', failNext: MAX_ATTEMPTS, runs: [true, true, false], after: [false, MAX_ATTEMPTS], pushed: 0 },
    { name: 'above the maximum: failNext MAX+1 -> the same, the rule stops at MAX; undelivered with attempts MAX, 0 push', failNext: MAX_ATTEMPTS + 1, runs: [true, true, false], after: [false, MAX_ATTEMPTS], pushed: 0 },
    { name: 'far above: failNext 10 -> the same; undelivered with attempts MAX, 0 push', failNext: 10, runs: [true, true, false, false], after: [false, MAX_ATTEMPTS], pushed: 0 },
  ];
  for (const c of CASES) test(c.name, () => quiet(async () => {
    line.failNext = c.failNext;
    const { messageId } = await d.sendHoldExpiredNotice(REQUEST);
    for (const [i, retried] of c.runs.entries()) assert.deepEqual(await d.retryFailedMessages(), retried ? [messageId] : [], `run ${i + 1}`);
    const m = await stored(messageId);
    assert.deepEqual([m.delivered, m.attempts, line.pushed.length], [...c.after, c.pushed]);
  }));
});

describe('getMessage', () => {
  // | class    | input                   | expected                                       |
  // |----------|-------------------------|------------------------------------------------|
  // | known    | the id of a sent notice | its record: id, kind, delivered, attempts 1    |
  // | unknown  | 'nope'                  | null (the rule answers null, it does not refuse)|
  // | empty id | ''                      | null                                           |
  test('known: the id of a sent notice -> its record', () => quiet(async () => {
    const r = await d.sendBookingConfirmation(REQUEST);
    const m = await d.getMessage(r.messageId);
    assert.deepEqual([m?.messageId, m?.kind, m?.delivered, m?.attempts], [r.messageId, 'BookingConfirmation', true, 1]);
  }));
  const CASES: { name: string; id: string }[] = [
    { name: 'unknown: "nope" -> null (the rule answers null, it does not refuse)', id: 'nope' },
    { name: 'empty id: "" -> null', id: '' },
  ];
  for (const c of CASES) test(c.name, async () => { assert.equal(await d.getMessage(c.id), null); });
});
