// Unit tests of the Payment Service domain: the Payment Gateway behind its adapter (ADR-11). No collaborator is called.
import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import * as d from '../src/domain.js';
import { adapters, SimulatedPaymentGateway, type PaymentGatewayAdapter } from '../src/adapters.js';
import { resetStore } from '../src/store.js';

const refused = (fn: () => unknown, status: number) => assert.throws(fn, (e: unknown) => e instanceof d.DomainError && e.status === status);
const rejected = (p: Promise<unknown>, status: number) => assert.rejects(p, (e: unknown) => e instanceof d.DomainError && e.status === status);
const REQUEST = { bookingId: 'b1', amount: 7800, customerId: 'U-somchai' };
let gateway: SimulatedPaymentGateway;

beforeEach(() => { resetStore(); gateway = new SimulatedPaymentGateway(); adapters.paymentGateway = gateway; });

describe('createPaymentRequest', () => {
  test('stores a Pending payment and answers the checkout URL that the gateway opened', async () => {
    const r = await d.createPaymentRequest(REQUEST);
    assert.equal(r.checkoutUrl, `https://checkout.example/pay/${r.paymentId}`);
    assert.deepEqual(gateway.checkouts, [{ paymentId: r.paymentId, amount: 7800, customerId: 'U-somchai' }], 'the adapter was asked for the checkout');
    assert.deepEqual(d.getPaymentStatus({ paymentId: r.paymentId }), { paymentId: r.paymentId, bookingId: 'b1', status: 'Pending', amount: 7800 });
  });
  test('validates the request before touching the gateway', async () => {
    await rejected(d.createPaymentRequest({ ...REQUEST, bookingId: '' }), 400);
    await rejected(d.createPaymentRequest({ ...REQUEST, customerId: undefined }), 400);
    await rejected(d.createPaymentRequest({ ...REQUEST, amount: 0 }), 400);
    await rejected(d.createPaymentRequest({ ...REQUEST, amount: 12.5 }), 400);
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
    assert.deepEqual(d.receivePaymentResult(gateway.signedResult(paymentId, 'Paid', 7800)), { accepted: true });
    assert.equal(d.getPaymentStatus({ paymentId }).status, 'Paid');
    assert.deepEqual(d.receivePaymentResult(gateway.signedResult(paymentId, 'Failed', 7800)), { accepted: true });
    assert.equal(d.getPaymentStatus({ paymentId }).status, 'Paid');                             // the first record stands
  });
  test('records Failed', async () => {
    const { paymentId } = await d.createPaymentRequest(REQUEST);
    d.receivePaymentResult(gateway.signedResult(paymentId, 'Failed', 7800));
    assert.equal(d.getPaymentStatus({ paymentId }).status, 'Failed');
  });
  test('the signature is checked by the adapter: a wrong one, an unknown status, a mismatched amount and an unknown payment are refused', async () => {
    const { paymentId } = await d.createPaymentRequest(REQUEST);
    refused(() => d.receivePaymentResult({ ...gateway.signedResult(paymentId, 'Paid', 7800), signature: 'sim-other' }), 400);
    refused(() => d.receivePaymentResult({ ...gateway.signedResult(paymentId, 'Paid', 7800), signature: '' }), 400);
    refused(() => d.receivePaymentResult(gateway.signedResult(paymentId, 'Done' as 'Paid', 7800)), 400);
    refused(() => d.receivePaymentResult(gateway.signedResult(paymentId, 'Paid', 7200)), 409);
    refused(() => d.receivePaymentResult(gateway.signedResult('nope', 'Paid', 7800)), 404);
    refused(() => d.receivePaymentResult({ status: 'Paid', amount: 7800, signature: 'sim-' }), 400);
    assert.equal(d.getPaymentStatus({ paymentId }).status, 'Pending');
  });
});

describe('getPaymentStatus', () => {
  test('an unknown payment is not found', () => {
    refused(() => d.getPaymentStatus({ paymentId: 'nope' }), 404);
    refused(() => d.getPaymentStatus({}), 404);
  });
});
