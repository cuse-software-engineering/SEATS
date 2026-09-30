// Unit tests of the Booking Service domain: the customer profile (UC-09, FR-10, BRULE-11). No collaborator is called.
import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import * as d from '../src/domain.js';
import { resetStore } from '../src/store.js';

const refused = (fn: () => unknown, status: number) => assert.throws(fn, (e: unknown) => e instanceof d.DomainError && e.status === status);
const ME = 'U-somchai';

beforeEach(resetStore);

describe('createCustomerProfile', () => {
  test('needs the consent to the data collection', () => {
    refused(() => d.createCustomerProfile(ME, { name: 'Somchai', phone: '0812345678' }), 400);
    refused(() => d.createCustomerProfile(ME, { name: 'Somchai', phone: '0812345678', consent: false }), 400);
  });
  test('needs a name and a Thai mobile number, and lists the problems', () => {
    assert.throws(() => d.createCustomerProfile(ME, { name: ' ', phone: '021234567', consent: true }), (e: unknown) =>
      e instanceof d.DomainError && e.status === 400 && Array.isArray(e.details) && e.details.length === 2);
    for (const phone of ['0712345678', '081234567', '08123456789', '+66812345678']) refused(() => d.createCustomerProfile(ME, { name: 'Somchai', phone, consent: true }), 400);
  });
  test('stores the profile with the consent time; a duplicate is refused', () => {
    const p = d.createCustomerProfile(ME, { name: ' Somchai ', phone: '0912345678', consent: true });
    assert.deepEqual([p.customerId, p.name, p.phone], [ME, 'Somchai', '0912345678']);
    assert.ok(!Number.isNaN(Date.parse(p.consentAt)));
    refused(() => d.createCustomerProfile(ME, { name: 'Somchai', phone: '0912345678', consent: true }), 409);
    assert.equal(d.getCustomerProfile(ME).phone, '0912345678');
  });
});

describe('getCustomerProfile and updateCustomerProfile', () => {
  test('there is no profile before the first booking', () => {
    refused(() => d.getCustomerProfile(ME), 404);
    refused(() => d.updateCustomerProfile(ME, { name: 'x' }), 404);
  });
  test('changes only the given fields and validates the result', () => {
    d.createCustomerProfile(ME, { name: 'Somchai', phone: '0812345678', consent: true });
    assert.deepEqual([d.updateCustomerProfile(ME, { phone: '0698765432' }).name, d.getCustomerProfile(ME).phone], ['Somchai', '0698765432']);
    refused(() => d.updateCustomerProfile(ME, { phone: '12' }), 400);
    assert.equal(d.getCustomerProfile(ME).phone, '0698765432');
  });
});
