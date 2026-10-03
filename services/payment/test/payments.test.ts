// Unit tests of the Payment Service domain: the Payment Gateway behind its adapter (ADR-11). No collaborator is called.
import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import * as d from '../src/domain.js';
import { adapters, SimulatedPaymentGateway, type PaymentGatewayAdapter } from '../src/adapters.js';
import { resetStore } from '../src/store.js';

const refused = (fn: () => Promise<unknown>, kind: d.DomainError['kind']) => assert.rejects(fn, (e: unknown) => e instanceof d.DomainError && e.kind === kind);
const rejected = (p: Promise<unknown>, kind: d.DomainError['kind']) => assert.rejects(p, (e: unknown) => e instanceof d.DomainError && e.kind === kind);
const REQUEST = { bookingId: 'b1', amount: 7800, customerId: 'U-somchai' };
let gateway: SimulatedPaymentGateway;

beforeEach(async () => { await resetStore(); gateway = new SimulatedPaymentGateway(); adapters.paymentGateway = gateway; });

describe('createPaymentRequest', () => {
  test('stores a Pending payment and answers the checkout URL that the gateway opened', async () => {
    const r = await d.createPaymentRequest(REQUEST);
    assert.equal(r.checkoutUrl, `https://checkout.example/pay/${r.paymentId}`);
    assert.deepEqual(gateway.checkouts, [{ paymentId: r.paymentId, amount: 7800, customerId: 'U-somchai' }], 'the adapter was asked for the checkout');
    assert.deepEqual(await d.getPaymentStatus({ paymentId: r.paymentId }), { paymentId: r.paymentId, bookingId: 'b1', status: 'Pending', amount: 7800 });
  });
  test('validates the request before touching the gateway', async () => {
    await rejected(d.createPaymentRequest({ ...REQUEST, bookingId: '' }), 'invalid');
    await rejected(d.createPaymentRequest({ ...REQUEST, customerId: undefined }), 'invalid');
    await rejected(d.createPaymentRequest({ ...REQUEST, amount: 0 }), 'invalid');
    await rejected(d.createPaymentRequest({ ...REQUEST, amount: 12.5 }), 'invalid');
    assert.equal(gateway.checkouts.length, 0);
  });
  test('any adapter serves: a test double that answers another URL', async () => {
    const double: PaymentGatewayAdapter = { createCheckout: async ({ paymentId }) => ({ checkoutUrl: `https://pay.test/${paymentId}` }), verifySignature: () => true };
    adapters.paymentGateway = double;
    const r = await d.createPaymentRequest(REQUEST);
    assert.equal(r.checkoutUrl, `https://pay.test/${r.paymentId}`);
  });
});

describe('receivePaymentResult', () => {
  test('records Paid once; a duplicate is accepted and ignored', async () => {
    const { paymentId } = await d.createPaymentRequest(REQUEST);
    assert.deepEqual(await d.receivePaymentResult(gateway.signedResult(paymentId, 'Paid', 7800)), { accepted: true });
    assert.equal((await d.getPaymentStatus({ paymentId })).status, 'Paid');
    assert.deepEqual(await d.receivePaymentResult(gateway.signedResult(paymentId, 'Failed', 7800)), { accepted: true });
    assert.equal((await d.getPaymentStatus({ paymentId })).status, 'Paid');                     // the first record stands
  });
  test('records Failed', async () => {
    const { paymentId } = await d.createPaymentRequest(REQUEST);
    await d.receivePaymentResult(gateway.signedResult(paymentId, 'Failed', 7800));
    assert.equal((await d.getPaymentStatus({ paymentId })).status, 'Failed');
  });
  test('the signature is checked by the adapter: a wrong one, an unknown status, a mismatched amount and an unknown payment are refused', async () => {
    const { paymentId } = await d.createPaymentRequest(REQUEST);
    await refused(() => d.receivePaymentResult({ ...gateway.signedResult(paymentId, 'Paid', 7800), signature: 'sim-other' }), 'invalid');
    await refused(() => d.receivePaymentResult({ ...gateway.signedResult(paymentId, 'Paid', 7800), signature: '' }), 'invalid');
    await refused(() => d.receivePaymentResult(gateway.signedResult(paymentId, 'Done' as 'Paid', 7800)), 'invalid');
    await refused(() => d.receivePaymentResult(gateway.signedResult(paymentId, 'Paid', 7200)), 'conflict');
    await refused(() => d.receivePaymentResult(gateway.signedResult('nope', 'Paid', 7800)), 'not_found');
    await refused(() => d.receivePaymentResult({ status: 'Paid', amount: 7800, signature: 'sim-' }), 'invalid');
    assert.equal((await d.getPaymentStatus({ paymentId })).status, 'Pending');
  });
});

describe('getPaymentStatus', () => {
  test('an unknown payment is not found', async () => {
    await refused(() => d.getPaymentStatus({ paymentId: 'nope' }), 'not_found');
    await refused(() => d.getPaymentStatus({}), 'not_found');
  });
});
