// Unit tests of the Payment Service domain: the simulated Payment Gateway (ADR-11). No collaborator is called.
import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import * as d from '../src/domain.js';
import { resetStore } from '../src/store.js';

const refused = (fn: () => unknown, status: number) => assert.throws(fn, (e: unknown) => e instanceof d.DomainError && e.status === status);
const REQUEST = { bookingId: 'b1', amount: 7800, customerId: 'U-somchai' };
const result = (paymentId: string, over: Partial<{ status: string; amount: number; signature: string }> = {}) => ({ paymentId, status: 'Paid', amount: 7800, signature: `sim-${paymentId}`, ...over });

beforeEach(resetStore);

describe('createPaymentRequest', () => {
  test('stores a Pending payment and answers the checkout URL of the simulated gateway', () => {
    const r = d.createPaymentRequest(REQUEST);
    assert.equal(r.checkoutUrl, `https://checkout.example/pay/${r.paymentId}`);
    assert.deepEqual(d.getPaymentStatus({ paymentId: r.paymentId }), { paymentId: r.paymentId, bookingId: 'b1', status: 'Pending', amount: 7800 });
  });
  test('validates the request', () => {
    refused(() => d.createPaymentRequest({ ...REQUEST, bookingId: '' }), 400);
    refused(() => d.createPaymentRequest({ ...REQUEST, customerId: undefined }), 400);
    refused(() => d.createPaymentRequest({ ...REQUEST, amount: 0 }), 400);
    refused(() => d.createPaymentRequest({ ...REQUEST, amount: 12.5 }), 400);
  });
});

describe('receivePaymentResult', () => {
  test('records Paid once; a duplicate is accepted and ignored', () => {
    const { paymentId } = d.createPaymentRequest(REQUEST);
    assert.deepEqual(d.receivePaymentResult(result(paymentId)), { accepted: true });
    assert.equal(d.getPaymentStatus({ paymentId }).status, 'Paid');
    assert.deepEqual(d.receivePaymentResult(result(paymentId, { status: 'Failed' })), { accepted: true });
    assert.equal(d.getPaymentStatus({ paymentId }).status, 'Paid');                             // the first record stands
  });
  test('records Failed', () => {
    const { paymentId } = d.createPaymentRequest(REQUEST);
    d.receivePaymentResult(result(paymentId, { status: 'Failed' }));
    assert.equal(d.getPaymentStatus({ paymentId }).status, 'Failed');
  });
  test('refuses a wrong signature, an unknown status, a mismatched amount and an unknown payment', () => {
    const { paymentId } = d.createPaymentRequest(REQUEST);
    refused(() => d.receivePaymentResult(result(paymentId, { signature: 'sim-other' })), 400);
    refused(() => d.receivePaymentResult(result(paymentId, { signature: '' })), 400);
    refused(() => d.receivePaymentResult(result(paymentId, { status: 'Done' })), 400);
    refused(() => d.receivePaymentResult(result(paymentId, { amount: 7200 })), 409);
    refused(() => d.receivePaymentResult(result('nope')), 404);
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
