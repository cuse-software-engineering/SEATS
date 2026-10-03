// Unit tests of the Payment Service domain (src/domain/payments.ts): the Payment Gateway behind its adapter (ADR-11). No
// collaborator is called. Techniques of docs/test-design.md, one table in the header comment of each describe and one named
// test per row: equivalence classes with boundary values (createPaymentRequest, getPaymentStatus), the decision table of
// receivePaymentResult (signature, payment known, status, amount, already settled) and the state matrix of a payment.
import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import * as d from '../src/domain/index.js';
import { adapters, SimulatedPaymentGateway, type PaymentGateway } from '../src/infrastructure/adapters.js';
import { resetStore, wire } from '../src/infrastructure/index.js';
import { payments } from '../src/infrastructure/repositories.js';

wire();   // the in-memory repository and the simulated gateway behind the domain's ports; beforeEach swaps the gateway on the adapters holder

type Kind = d.DomainError['kind'];
type Status = d.PaymentStatusValue;
const refused = (fn: () => Promise<unknown>, kind: Kind) => assert.rejects(fn, (e: unknown) => e instanceof d.DomainError && e.kind === kind);
const rejected = (p: Promise<unknown>, kind: Kind) => assert.rejects(p, (e: unknown) => e instanceof d.DomainError && e.kind === kind);
const REQUEST = { bookingId: 'b1', amount: 7800, customerId: 'U-somchai' };
let gateway: SimulatedPaymentGateway;
/** A result as the webhook posts it: with the simulated signature of `paymentId`, a wrong one, or none. */
const posted = (paymentId: string, status: string | undefined, amount: number | undefined, signature: 'valid' | 'wrong' | 'missing' = 'valid') =>
  ({ paymentId, status, amount, signature: signature === 'valid' ? `sim-${paymentId}` : signature === 'wrong' ? 'sim-other' : undefined });
/** A payment in the given state: a fresh request, or one with the gateway's result recorded. */
const paymentIn = async (status: Status): Promise<string> => { const { paymentId } = await d.createPaymentRequest(REQUEST); if (status !== 'Pending') await d.receivePaymentResult(gateway.signedResult(paymentId, status, 7800)); return paymentId; };
const statusOf = async (paymentId: string): Promise<Status> => (await d.getPaymentStatus({ paymentId })).status;

beforeEach(async () => { await resetStore(); gateway = new SimulatedPaymentGateway(); adapters.paymentGateway = gateway; });

describe('createPaymentRequest', () => {
  // | class                        | input                                         | expected                                                       |
  // |------------------------------|-----------------------------------------------|----------------------------------------------------------------|
  // | valid                        | b1, 7800 THB, U-somchai                       | a Pending payment and the checkout URL the gateway opened      |
  // | amount boundary              | amount 1 (the smallest fee)                   | a Pending payment of 1                                         |
  // | amount zero                  | amount 0                                      | invalid, the gateway is not asked                              |
  // | amount negative              | amount -7800                                  | invalid                                                        |
  // | amount non-integer           | amount 12.5                                   | invalid                                                        |
  // | amount not a number          | amount NaN                                    | invalid                                                        |
  // | amount missing               | amount undefined                              | invalid                                                        |
  // | bookingId missing            | bookingId '' / undefined                      | invalid                                                        |
  // | customerId missing           | customerId '' / undefined                     | invalid                                                        |
  // | several problems at once     | bookingId '', amount 0                        | invalid (one refusal; the ids are checked first)               |
  // | second request, same booking | REQUEST twice                                 | two Pending payments with distinct ids; no rule forbids it     |
  // | checkout URL of the port     | a gateway double answering https://pay.test/… | that URL: it comes from the port, not from the rules           |
  test('valid: b1, 7800 THB, U-somchai -> a Pending payment and the checkout URL the gateway opened', async () => {
    const r = await d.createPaymentRequest(REQUEST);
    assert.equal(r.checkoutUrl, `https://checkout.example/pay/${r.paymentId}`);
    assert.deepEqual(gateway.checkouts, [{ paymentId: r.paymentId, amount: 7800, customerId: 'U-somchai' }], 'the adapter was asked for the checkout');
    assert.deepEqual(await d.getPaymentStatus({ paymentId: r.paymentId }), { paymentId: r.paymentId, bookingId: 'b1', status: 'Pending', amount: 7800 });
  });
  test('invalid requests: bookingId "", customerId undefined, amount 0, amount 12.5 -> invalid, the gateway is not asked', async () => {
    await rejected(d.createPaymentRequest({ ...REQUEST, bookingId: '' }), 'invalid');
    await rejected(d.createPaymentRequest({ ...REQUEST, customerId: undefined }), 'invalid');
    await rejected(d.createPaymentRequest({ ...REQUEST, amount: 0 }), 'invalid');
    await rejected(d.createPaymentRequest({ ...REQUEST, amount: 12.5 }), 'invalid');
    assert.equal(gateway.checkouts.length, 0);
  });
  const CASES: { name: string; input: Parameters<typeof d.createPaymentRequest>[0]; kind?: Kind }[] = [
    { name: 'amount boundary: 1 THB (the smallest fee) -> a Pending payment of 1', input: { ...REQUEST, amount: 1 } },
    { name: 'amount zero: 0 -> invalid, the gateway is not asked', input: { ...REQUEST, amount: 0 }, kind: 'invalid' },
    { name: 'amount negative: -7800 -> invalid', input: { ...REQUEST, amount: -7800 }, kind: 'invalid' },
    { name: 'amount non-integer: 12.5 -> invalid', input: { ...REQUEST, amount: 12.5 }, kind: 'invalid' },
    { name: 'amount not a number: NaN -> invalid', input: { ...REQUEST, amount: Number.NaN }, kind: 'invalid' },
    { name: 'amount missing: undefined -> invalid', input: { ...REQUEST, amount: undefined }, kind: 'invalid' },
    { name: 'bookingId missing: "" -> invalid', input: { ...REQUEST, bookingId: '' }, kind: 'invalid' },
    { name: 'bookingId missing: undefined -> invalid', input: { ...REQUEST, bookingId: undefined }, kind: 'invalid' },
    { name: 'customerId missing: "" -> invalid', input: { ...REQUEST, customerId: '' }, kind: 'invalid' },
    { name: 'customerId missing: undefined -> invalid', input: { ...REQUEST, customerId: undefined }, kind: 'invalid' },
    { name: 'several problems at once: bookingId "" and amount 0 -> invalid', input: { ...REQUEST, bookingId: '', amount: 0 }, kind: 'invalid' },
  ];
  for (const c of CASES) test(c.name, async () => {
    if (c.kind) { await rejected(d.createPaymentRequest(c.input), c.kind); assert.equal(gateway.checkouts.length, 0, 'the gateway is not asked'); return; }
    const r = await d.createPaymentRequest(c.input);
    assert.equal(r.checkoutUrl, `https://checkout.example/pay/${r.paymentId}`);
    assert.deepEqual(gateway.checkouts, [{ paymentId: r.paymentId, amount: c.input.amount, customerId: c.input.customerId }]);
    assert.deepEqual(await d.getPaymentStatus({ paymentId: r.paymentId }), { paymentId: r.paymentId, bookingId: c.input.bookingId, status: 'Pending', amount: c.input.amount });
  });
  test('second request, same booking: REQUEST twice -> two Pending payments with distinct ids, the gateway asked twice (no rule forbids it)', async () => {
    const first = await d.createPaymentRequest(REQUEST), second = await d.createPaymentRequest(REQUEST);
    assert.notEqual(second.paymentId, first.paymentId);
    assert.deepEqual([await statusOf(first.paymentId), await statusOf(second.paymentId), gateway.checkouts.length], ['Pending', 'Pending', 2]);
  });
  test('checkout URL of the port: a gateway double answering https://pay.test/<id> -> that URL', async () => {
    const double: PaymentGateway = { createCheckout: async ({ paymentId }) => ({ checkoutUrl: `https://pay.test/${paymentId}` }), verifySignature: () => true };
    adapters.paymentGateway = double;
    const r = await d.createPaymentRequest(REQUEST);
    assert.equal(r.checkoutUrl, `https://pay.test/${r.paymentId}`);
  });
});

describe('receivePaymentResult', () => {
  // Decision table (docs/test-design.md): the conditions in the order the rule checks them. A settled payment absorbs every
  // further result (NFR-22: duplicate or out-of-order results are processed exactly once, already settled ones ignored).
  // | rule | paymentId | payment | signature | status  | amount  | settled | expected                                  | status after |
  // |------|-----------|---------|-----------|---------|---------|---------|-------------------------------------------|--------------|
  // | R1   | given     | known   | valid     | Paid    | matches | no      | accepted                                  | Paid         |
  // | R2   | given     | known   | valid     | Failed  | matches | no      | accepted                                  | Failed       |
  // | R3   | given     | known   | valid     | Done    | matches | no      | invalid                                   | Pending      |
  // | R4   | given     | known   | valid     | ''      | matches | no      | invalid                                   | Pending      |
  // | R5   | given     | known   | valid     | missing | matches | no      | invalid                                   | Pending      |
  // | R6   | given     | known   | wrong     | Paid    | matches | no      | invalid                                   | Pending      |
  // | R7   | given     | known   | missing   | Paid    | matches | no      | invalid                                   | Pending      |
  // | R8   | given     | known   | wrong     | Done    | matches | no      | invalid (signature before status)         | Pending      |
  // | R9   | given     | known   | valid     | Paid    | differs | no      | conflict                                  | Pending      |
  // | R10  | given     | known   | valid     | Paid    | missing | no      | conflict (compared, not validated)        | Pending      |
  // | R11  | given     | known   | wrong     | Paid    | differs | no      | invalid (signature before amount)         | Pending      |
  // | R12  | given     | unknown | valid     | Paid    | matches | —       | not_found                                 | (Pending)    |
  // | R13  | given     | unknown | wrong     | Paid    | matches | —       | not_found (lookup before signature)       | (Pending)    |
  // | R14  | missing   | —       | —         | Paid    | matches | —       | invalid                                   | (Pending)    |
  // | R15  | given     | known   | valid     | Paid    | matches | Paid    | accepted, ignored (duplicate)             | Paid         |
  // | R16  | given     | known   | valid     | Failed  | matches | Paid    | accepted, ignored (out of order)          | Paid         |
  // | R17  | given     | known   | valid     | Failed  | matches | Failed  | accepted, ignored (duplicate)             | Failed       |
  // | R18  | given     | known   | valid     | Paid    | matches | Failed  | accepted, ignored (out of order)          | Failed       |
  // | R19  | given     | known   | wrong     | Paid    | matches | Paid    | invalid (verified even when settled)      | Paid         |
  // | R20  | given     | known   | valid     | Done    | matches | Paid    | invalid                                   | Paid         |
  // | R21  | given     | known   | valid     | Paid    | differs | Paid    | conflict (amount before the settled check)| Paid         |
  test('Paid then Failed: the gateway posts Paid, then Failed -> Paid recorded once, the second result accepted and ignored', async () => {
    const { paymentId } = await d.createPaymentRequest(REQUEST);
    assert.deepEqual(await d.receivePaymentResult(gateway.signedResult(paymentId, 'Paid', 7800)), { accepted: true });
    assert.equal((await d.getPaymentStatus({ paymentId })).status, 'Paid');
    assert.deepEqual(await d.receivePaymentResult(gateway.signedResult(paymentId, 'Failed', 7800)), { accepted: true });
    assert.equal((await d.getPaymentStatus({ paymentId })).status, 'Paid');                     // the first record stands
  });
  test('Failed: the gateway posts Failed -> Failed', async () => {
    const { paymentId } = await d.createPaymentRequest(REQUEST);
    await d.receivePaymentResult(gateway.signedResult(paymentId, 'Failed', 7800));
    assert.equal((await d.getPaymentStatus({ paymentId })).status, 'Failed');
  });
  test('refusals: a wrong signature, an unknown status, a mismatched amount, an unknown payment, a missing id -> invalid / conflict / not_found, the payment stays Pending', async () => {
    const { paymentId } = await d.createPaymentRequest(REQUEST);
    await refused(() => d.receivePaymentResult({ ...gateway.signedResult(paymentId, 'Paid', 7800), signature: 'sim-other' }), 'invalid');
    await refused(() => d.receivePaymentResult({ ...gateway.signedResult(paymentId, 'Paid', 7800), signature: '' }), 'invalid');
    await refused(() => d.receivePaymentResult(gateway.signedResult(paymentId, 'Done' as 'Paid', 7800)), 'invalid');
    await refused(() => d.receivePaymentResult(gateway.signedResult(paymentId, 'Paid', 7200)), 'conflict');
    await refused(() => d.receivePaymentResult(gateway.signedResult('nope', 'Paid', 7800)), 'not_found');
    await refused(() => d.receivePaymentResult({ status: 'Paid', amount: 7800, signature: 'sim-' }), 'invalid');
    assert.equal((await d.getPaymentStatus({ paymentId })).status, 'Pending');
  });
  const ROWS: { name: string; prior?: Status; unknown?: boolean; noId?: boolean; sig?: 'valid' | 'wrong' | 'missing'; status?: string; amount?: number; kind?: Kind; after: Status }[] = [
    { name: 'R1: valid signature, known payment, Paid, amount matches, not settled -> accepted, Paid', after: 'Paid' },
    { name: 'R2: valid signature, known payment, Failed, amount matches, not settled -> accepted, Failed', status: 'Failed', after: 'Failed' },
    { name: 'R3: valid signature, known payment, status Done, not settled -> invalid, stays Pending', status: 'Done', kind: 'invalid', after: 'Pending' },
    { name: 'R4: valid signature, known payment, status "", not settled -> invalid', status: '', kind: 'invalid', after: 'Pending' },
    { name: 'R5: valid signature, known payment, status missing, not settled -> invalid', status: undefined, kind: 'invalid', after: 'Pending' },
    { name: 'R6: wrong signature, known payment, Paid, not settled -> invalid, stays Pending', sig: 'wrong', kind: 'invalid', after: 'Pending' },
    { name: 'R7: signature missing, known payment, Paid, not settled -> invalid', sig: 'missing', kind: 'invalid', after: 'Pending' },
    { name: 'R8: wrong signature, known payment, status Done, not settled -> invalid (the signature is checked before the status)', sig: 'wrong', status: 'Done', kind: 'invalid', after: 'Pending' },
    { name: 'R9: valid signature, known payment, Paid, amount 7200 differs, not settled -> conflict, stays Pending', amount: 7200, kind: 'conflict', after: 'Pending' },
    { name: 'R10: valid signature, known payment, Paid, amount missing, not settled -> conflict (the amount is compared, not validated)', amount: undefined, kind: 'conflict', after: 'Pending' },
    { name: 'R11: wrong signature, known payment, Paid, amount differs, not settled -> invalid (the signature is checked before the amount)', sig: 'wrong', amount: 7200, kind: 'invalid', after: 'Pending' },
    { name: 'R12: valid signature for an unknown payment, Paid -> not_found', unknown: true, kind: 'not_found', after: 'Pending' },
    { name: 'R13: wrong signature, unknown payment, Paid -> not_found (the payment is looked up before the signature)', unknown: true, sig: 'wrong', kind: 'not_found', after: 'Pending' },
    { name: 'R14: paymentId missing, Paid -> invalid', noId: true, kind: 'invalid', after: 'Pending' },
    { name: 'R15: valid signature, known payment, Paid again, settled Paid -> accepted and ignored (a duplicate, NFR-22)', prior: 'Paid', after: 'Paid' },
    { name: 'R16: valid signature, known payment, Failed, settled Paid -> accepted and ignored (out of order, NFR-22): Paid stands', prior: 'Paid', status: 'Failed', after: 'Paid' },
    { name: 'R17: valid signature, known payment, Failed again, settled Failed -> accepted and ignored (a duplicate)', prior: 'Failed', status: 'Failed', after: 'Failed' },
    { name: 'R18: valid signature, known payment, Paid, settled Failed -> accepted and ignored (out of order): Failed stands', prior: 'Failed', after: 'Failed' },
    { name: 'R19: wrong signature, known payment, Paid, settled Paid -> invalid (the signature is verified even when settled)', prior: 'Paid', sig: 'wrong', kind: 'invalid', after: 'Paid' },
    { name: 'R20: valid signature, known payment, status Done, settled Paid -> invalid', prior: 'Paid', status: 'Done', kind: 'invalid', after: 'Paid' },
    { name: 'R21: valid signature, known payment, Paid, amount differs, settled Paid -> conflict (the amount is checked before the settled check)', prior: 'Paid', amount: 7200, kind: 'conflict', after: 'Paid' },
  ];
  for (const r of ROWS) test(r.name, async () => {
    const paymentId = await paymentIn(r.prior ?? 'Pending');
    const result = posted(r.unknown ? 'nope' : paymentId, 'status' in r ? r.status : 'Paid', 'amount' in r ? r.amount : 7800, r.sig);
    const input = r.noId ? { ...result, paymentId: undefined } : result;
    if (r.kind) await rejected(d.receivePaymentResult(input), r.kind); else assert.deepEqual(await d.receivePaymentResult(input), { accepted: true });
    assert.equal(await statusOf(paymentId), r.after);
  });
});

describe('the states of a payment × the operations', () => {
  // State matrix (docs/test-design.md): a result settles a Pending payment once; a settled payment absorbs every further result
  // (NFR-22: duplicate or out-of-order results are processed exactly once, already settled ones ignored) and its record is untouched.
  // No cell refuses: the only conflict of this domain is the amount mismatch (decision table R9, R21).
  // | state   | result Paid                    | result Failed                  | getPaymentStatus   |
  // |---------|--------------------------------|--------------------------------|--------------------|
  // | Pending | Paid, resultAt recorded        | Failed, resultAt recorded      | Pending, no change |
  // | Paid    | Paid (duplicate, ignored)      | Paid (out of order, ignored)   | Paid, no change    |
  // | Failed  | Failed (out of order, ignored) | Failed (duplicate, ignored)    | Failed, no change  |
  const CELLS: { name: string; state: Status; event: 'Paid' | 'Failed' | 'read'; next: Status }[] = [
    { name: 'Pending × result Paid: the gateway posts Paid -> Paid, the time of the result recorded', state: 'Pending', event: 'Paid', next: 'Paid' },
    { name: 'Pending × result Failed: the gateway posts Failed -> Failed, the time of the result recorded', state: 'Pending', event: 'Failed', next: 'Failed' },
    { name: 'Pending × getPaymentStatus: a read -> Pending, nothing changes', state: 'Pending', event: 'read', next: 'Pending' },
    { name: 'Paid × result Paid: the gateway retries Paid -> Paid, the duplicate ignored, the record untouched', state: 'Paid', event: 'Paid', next: 'Paid' },
    { name: 'Paid × result Failed: Failed arrives after Paid -> Paid stands (out of order, ignored), the record untouched', state: 'Paid', event: 'Failed', next: 'Paid' },
    { name: 'Paid × getPaymentStatus: a read -> Paid, nothing changes', state: 'Paid', event: 'read', next: 'Paid' },
    { name: 'Failed × result Paid: Paid arrives after Failed -> Failed stands (out of order, ignored), the record untouched', state: 'Failed', event: 'Paid', next: 'Failed' },
    { name: 'Failed × result Failed: the gateway retries Failed -> Failed, the duplicate ignored, the record untouched', state: 'Failed', event: 'Failed', next: 'Failed' },
    { name: 'Failed × getPaymentStatus: a read -> Failed, nothing changes', state: 'Failed', event: 'read', next: 'Failed' },
  ];
  for (const c of CELLS) test(c.name, async () => {
    const paymentId = await paymentIn(c.state);
    const before = await payments.get(paymentId);
    if (c.event === 'read') assert.equal((await d.getPaymentStatus({ paymentId })).status, c.state);
    else assert.deepEqual(await d.receivePaymentResult(gateway.signedResult(paymentId, c.event, 7800)), { accepted: true }, 'the webhook is acknowledged');
    const after = await payments.get(paymentId);
    assert.equal(after?.status, c.next);
    if (c.state === c.next) assert.deepEqual(after, before, 'the record is untouched');
    else assert.notEqual(after?.resultAt, '', 'the time of the result is recorded');
  });
});

describe('getPaymentStatus', () => {
  // | class          | input                                | expected                                     |
  // |----------------|--------------------------------------|----------------------------------------------|
  // | known, Pending | the id of a fresh request            | its id, booking, Pending and amount          |
  // | known, settled | the id after the gateway posted Paid | status Paid, the same id, booking and amount |
  // | unknown        | 'nope'                               | not_found                                    |
  // | empty id       | ''                                   | not_found                                    |
  // | missing id     | {}                                   | not_found                                    |
  test('unknown and missing: "nope" and {} -> not_found', async () => {
    await refused(() => d.getPaymentStatus({ paymentId: 'nope' }), 'not_found');
    await refused(() => d.getPaymentStatus({}), 'not_found');
  });
  const CASES: { name: string; state?: Status; id?: string; kind?: Kind }[] = [
    { name: 'known, Pending: the id of a fresh request -> its id, booking, Pending and amount', state: 'Pending' },
    { name: 'known, settled: the id after the gateway posted Paid -> Paid with the same id, booking and amount', state: 'Paid' },
    { name: 'unknown: "nope" -> not_found', id: 'nope', kind: 'not_found' },
    { name: 'empty id: "" -> not_found', id: '', kind: 'not_found' },
    { name: 'missing id: {} -> not_found', kind: 'not_found' },
  ];
  for (const c of CASES) test(c.name, async () => {
    if (c.kind) return refused(() => d.getPaymentStatus(c.id === undefined ? {} : { paymentId: c.id }), c.kind);
    const paymentId = await paymentIn(c.state ?? 'Pending');
    assert.deepEqual(await d.getPaymentStatus({ paymentId }), { paymentId, bookingId: 'b1', status: c.state, amount: 7800 });
  });
});
