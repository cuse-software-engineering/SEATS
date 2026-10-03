// Unit tests of the Booking Service domain: the customer profile (UC-09, FR-10, BRULE-11). No collaborator is called.
import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import * as d from '../src/domain.js';
import { resetStore } from '../src/store.js';

const rejected = (p: Promise<unknown>, kind: d.DomainError['kind']) => assert.rejects(p, (e: unknown) => e instanceof d.DomainError && e.kind === kind);
const ME = 'U-somchai';

beforeEach(async () => { await resetStore(); });

describe('createCustomerProfile', () => {
  test('needs the consent to the data collection', async () => {
    await rejected(d.createCustomerProfile(ME, { name: 'Somchai', phone: '0812345678' }), 'invalid');
    await rejected(d.createCustomerProfile(ME, { name: 'Somchai', phone: '0812345678', consent: false }), 'invalid');
  });
  test('needs a name and a Thai mobile number, and lists the problems', async () => {
    await assert.rejects(d.createCustomerProfile(ME, { name: ' ', phone: '021234567', consent: true }), (e: unknown) =>
      e instanceof d.DomainError && e.kind === 'invalid' && Array.isArray(e.details) && e.details.length === 2);
    for (const phone of ['0712345678', '081234567', '08123456789', '+66812345678']) await rejected(d.createCustomerProfile(ME, { name: 'Somchai', phone, consent: true }), 'invalid');
  });
  test('stores the profile with the consent time; a duplicate is refused', async () => {
    const p = await d.createCustomerProfile(ME, { name: ' Somchai ', phone: '0912345678', consent: true });
    assert.deepEqual([p.customerId, p.name, p.phone], [ME, 'Somchai', '0912345678']);
    assert.ok(!Number.isNaN(Date.parse(p.consentAt)));
    await rejected(d.createCustomerProfile(ME, { name: 'Somchai', phone: '0912345678', consent: true }), 'conflict');
    assert.equal((await d.getCustomerProfile(ME)).phone, '0912345678');
  });
});

describe('getCustomerProfile and updateCustomerProfile', () => {
  test('there is no profile before the first booking', async () => {
    await rejected(d.getCustomerProfile(ME), 'not_found');
    await rejected(d.updateCustomerProfile(ME, { name: 'x' }), 'not_found');
  });
  test('changes only the given fields and validates the result', async () => {
    await d.createCustomerProfile(ME, { name: 'Somchai', phone: '0812345678', consent: true });
    assert.deepEqual([(await d.updateCustomerProfile(ME, { phone: '0698765432' })).name, (await d.getCustomerProfile(ME)).phone], ['Somchai', '0698765432']);
    await rejected(d.updateCustomerProfile(ME, { phone: '12' }), 'invalid');
    assert.equal((await d.getCustomerProfile(ME)).phone, '0698765432');
  });
});
