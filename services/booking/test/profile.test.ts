// Unit tests of domain/profile.ts: the customer profile (UC-09, FR-10, BRULE-11). No collaborator is called. On top of
// the first tests: equivalence classes with boundary values for createCustomerProfile() and updateCustomerProfile().
import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import * as d from '../src/domain/index.js';
import { resetStore, wire } from '../src/infrastructure/index.js';
import { rejected } from './fixtures.js';

wire();   // binds the in-memory repositories to the domain's ports

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

describe('createCustomerProfile: equivalence classes and boundaries (UC-09 steps 3–5, AF-1, AF-2; FR-10, BRULE-11)', () => {
  // The consent is checked first (AF-1), then the name and the phone together, every problem listed (AF-2, AF-7). A
  // Thai mobile number is 10 digits starting with 06, 08 or 09. Each row starts from a valid request and changes one
  // field; a refused request leaves no profile.
  //  class                            | input                                | expected
  //  consent missing                  | consent: undefined                   | invalid, no profile
  //  consent false                    | consent: false                       | invalid
  //  consent true                     | consent: true                        | created, consentAt a time
  //  consent false and name blank     | consent: false, name: ''             | invalid without a problem list (consent first)
  //  name missing                     | name: undefined                      | invalid 'name is required'
  //  name blank                       | ''                                   | invalid
  //  name whitespace only             | '   '                                | invalid
  //  name padded                      | ' Somchai '                          | stored trimmed 'Somchai'
  //  name with inner spaces           | 'Som chai'                           | stored as given
  //  name Thai                        | 'สมชาย'                              | stored as given
  //  phone 9 digits                   | '081234567'                          | invalid
  //  phone 10 digits                  | '0812345678'                         | ok
  //  phone 11 digits                  | '08123456789'                        | invalid
  //  prefix 06 / 08 / 09              | '0612345678' '0812345678' '0912345678' | ok
  //  prefix 05 / 07                   | '0512345678' '0712345678'            | invalid
  //  prefix 02 (a landline)           | '021234567'                          | invalid
  //  prefix 10 (no leading 0)         | '1012345678'                         | invalid
  //  international form               | '+66812345678'                       | invalid
  //  with spaces / dashes             | '081 234 5678' '081-234-5678'        | invalid
  //  letters                          | '08123456ab'                         | invalid
  //  phone missing / empty            | undefined, ''                        | invalid
  //  name and phone both wrong        | ' ', '021234567'                     | invalid, 2 problems listed
  //  duplicate                        | a second create                      | conflict, the first profile kept
  //  duplicate with invalid data      | a second create with phone '12'      | conflict (the existence is checked first)
  const OK = { name: 'Somchai', phone: '0812345678', consent: true };
  type Row = { cls: string; input: { name?: string; phone?: string; consent?: boolean }; expect: 'ok' | d.DomainError['kind']; stored?: { name?: string; phone?: string }; problems?: number | 'none' };
  const rows: Row[] = [
    { cls: 'consent missing: undefined -> invalid', input: { consent: undefined }, expect: 'invalid', problems: 'none' },
    { cls: 'consent false: false -> invalid', input: { consent: false }, expect: 'invalid', problems: 'none' },
    { cls: 'consent true: true -> created', input: { consent: true }, expect: 'ok' },
    { cls: "consent false and name blank: false, '' -> invalid without a problem list (the consent is checked first)", input: { consent: false, name: '' }, expect: 'invalid', problems: 'none' },
    { cls: 'name missing: undefined -> invalid, one problem', input: { name: undefined }, expect: 'invalid', problems: 1 },
    { cls: "name blank: '' -> invalid", input: { name: '' }, expect: 'invalid', problems: 1 },
    { cls: "name whitespace only: '   ' -> invalid", input: { name: '   ' }, expect: 'invalid', problems: 1 },
    { cls: "name padded: ' Somchai ' -> stored trimmed 'Somchai'", input: { name: ' Somchai ' }, expect: 'ok', stored: { name: 'Somchai' } },
    { cls: "name with inner spaces: 'Som chai' -> stored as given", input: { name: 'Som chai' }, expect: 'ok', stored: { name: 'Som chai' } },
    { cls: "name Thai: 'สมชาย' -> stored as given", input: { name: 'สมชาย' }, expect: 'ok', stored: { name: 'สมชาย' } },
    { cls: "phone 9 digits: '081234567' -> invalid", input: { phone: '081234567' }, expect: 'invalid', problems: 1 },
    { cls: "phone 10 digits: '0812345678' -> ok", input: { phone: '0812345678' }, expect: 'ok' },
    { cls: "phone 11 digits: '08123456789' -> invalid", input: { phone: '08123456789' }, expect: 'invalid', problems: 1 },
    { cls: "prefix 06: '0612345678' -> ok", input: { phone: '0612345678' }, expect: 'ok', stored: { phone: '0612345678' } },
    { cls: "prefix 08: '0899999999' -> ok", input: { phone: '0899999999' }, expect: 'ok', stored: { phone: '0899999999' } },
    { cls: "prefix 09: '0912345678' -> ok", input: { phone: '0912345678' }, expect: 'ok', stored: { phone: '0912345678' } },
    { cls: "prefix 05: '0512345678' -> invalid", input: { phone: '0512345678' }, expect: 'invalid', problems: 1 },
    { cls: "prefix 07: '0712345678' -> invalid", input: { phone: '0712345678' }, expect: 'invalid', problems: 1 },
    { cls: "prefix 02, a landline: '021234567' -> invalid", input: { phone: '021234567' }, expect: 'invalid', problems: 1 },
    { cls: "no leading 0: '1012345678' -> invalid", input: { phone: '1012345678' }, expect: 'invalid', problems: 1 },
    { cls: "international form: '+66812345678' -> invalid", input: { phone: '+66812345678' }, expect: 'invalid', problems: 1 },
    { cls: "with spaces: '081 234 5678' -> invalid", input: { phone: '081 234 5678' }, expect: 'invalid', problems: 1 },
    { cls: "with dashes: '081-234-5678' -> invalid", input: { phone: '081-234-5678' }, expect: 'invalid', problems: 1 },
    { cls: "letters: '08123456ab' -> invalid", input: { phone: '08123456ab' }, expect: 'invalid', problems: 1 },
    { cls: 'phone missing: undefined -> invalid', input: { phone: undefined }, expect: 'invalid', problems: 1 },
    { cls: "phone empty: '' -> invalid", input: { phone: '' }, expect: 'invalid', problems: 1 },
    { cls: "name and phone both wrong: ' ', '021234567' -> invalid with 2 problems", input: { name: ' ', phone: '021234567' }, expect: 'invalid', problems: 2 },
  ];
  for (const r of rows) test(r.cls, async () => {
    const p = d.createCustomerProfile(ME, { ...OK, ...r.input });
    if (r.expect === 'ok') {
      const v = await p;
      assert.deepEqual([v.customerId, v.name, v.phone], [ME, r.stored?.name ?? OK.name, r.stored?.phone ?? OK.phone]);
      assert.ok(Date.now() - Date.parse(v.consentAt) < 5000, 'consentAt is the time of the consent');
      assert.deepEqual(await d.getCustomerProfile(ME), v);
    } else {
      await assert.rejects(p, (e: unknown) => {
        assert.ok(e instanceof d.DomainError); assert.equal(e.kind, r.expect);
        if (r.problems === 'none') assert.equal(e.details, undefined); else if (r.problems !== undefined) assert.equal((e.details as string[]).length, r.problems, `problems: ${JSON.stringify(e.details)}`);
        return true;
      });
      await rejected(d.getCustomerProfile(ME), 'not_found');
    }
  });
  test('duplicate: a second create -> conflict, the first profile kept', async () => {
    const first = await d.createCustomerProfile(ME, OK);
    await rejected(d.createCustomerProfile(ME, { name: 'Malee', phone: '0912345678', consent: true }), 'conflict');
    assert.deepEqual(await d.getCustomerProfile(ME), first);
  });
  test("duplicate with invalid data: a second create with phone '12' and no consent -> conflict (the existence is checked first)", async () => {
    await d.createCustomerProfile(ME, OK);
    await rejected(d.createCustomerProfile(ME, { name: '', phone: '12' }), 'conflict');
  });
  test('two customers: each has a profile of their own', async () => {
    await d.createCustomerProfile(ME, OK); await d.createCustomerProfile('U-malee', { name: 'Malee', phone: '0912345678', consent: true });
    assert.deepEqual([(await d.getCustomerProfile(ME)).name, (await d.getCustomerProfile('U-malee')).name], ['Somchai', 'Malee']);
  });
});

describe('updateCustomerProfile: equivalence classes (UC-09 steps 6–7)', () => {
  // A missing field keeps its value; a given field, even empty, is validated with the rest; a refused update changes
  // nothing (the two fields are saved together). The consent time is not touched. Starts from Somchai / 0812345678.
  //  class                            | input                              | expected
  //  no profile yet                   | {name: 'x'}                        | not_found
  //  only the name                    | {name: 'Malee'}                    | name changed, phone kept
  //  only the phone                   | {phone: '0698765432'}              | phone changed, name kept
  //  both                             | {name: 'Malee', phone: '0698…'}    | both changed
  //  nothing                          | {}                                 | unchanged
  //  invalid phone                    | {phone: '12'}                      | invalid, old phone kept
  //  blank name                       | {name: ''}                         | invalid, old name kept ('' is given, not missing)
  //  whitespace name                  | {name: '  '}                       | invalid
  //  valid name with an invalid phone | {name: 'Malee', phone: '12'}       | invalid, neither changed
  //  valid phone with a blank name    | {name: '', phone: '0698765432'}    | invalid, neither changed
  //  padded name                      | {name: ' Malee '}                  | stored trimmed, as createCustomerProfile() stores it
  //  consent time                     | any valid update                   | consentAt unchanged
  const START = { name: 'Somchai', phone: '0812345678' };
  type Row = { cls: string; input: { name?: string; phone?: string }; expect: 'ok' | d.DomainError['kind']; stored?: { name?: string; phone?: string }; todo?: string };
  const rows: Row[] = [
    { cls: "only the name: {name: 'Malee'} -> name changed, phone kept", input: { name: 'Malee' }, expect: 'ok', stored: { name: 'Malee' } },
    { cls: "only the phone: {phone: '0698765432'} -> phone changed, name kept", input: { phone: '0698765432' }, expect: 'ok', stored: { phone: '0698765432' } },
    { cls: "both: {name: 'Malee', phone: '0698765432'} -> both changed", input: { name: 'Malee', phone: '0698765432' }, expect: 'ok', stored: { name: 'Malee', phone: '0698765432' } },
    { cls: 'nothing: {} -> unchanged', input: {}, expect: 'ok' },
    { cls: "invalid phone: {phone: '12'} -> invalid, old phone kept", input: { phone: '12' }, expect: 'invalid' },
    { cls: "blank name: {name: ''} -> invalid, old name kept ('' is given, not missing)", input: { name: '' }, expect: 'invalid' },
    { cls: "whitespace name: {name: '  '} -> invalid", input: { name: '  ' }, expect: 'invalid' },
    { cls: "valid name with an invalid phone: {name: 'Malee', phone: '12'} -> invalid, neither changed", input: { name: 'Malee', phone: '12' }, expect: 'invalid' },
    { cls: "valid phone with a blank name: {name: '', phone: '0698765432'} -> invalid, neither changed", input: { name: '', phone: '0698765432' }, expect: 'invalid' },
    { cls: "padded name: {name: ' Malee '} -> stored trimmed 'Malee' as createCustomerProfile() stores it", input: { name: ' Malee ' }, expect: 'ok', stored: { name: 'Malee' } },
  ];
  for (const r of rows) {
    const run = async () => {
      const first = await d.createCustomerProfile(ME, { ...START, consent: true });
      const p = d.updateCustomerProfile(ME, r.input);
      if (r.expect === 'ok') assert.deepEqual(await p, { customerId: ME, consentAt: first.consentAt, ...START, ...r.stored }); else await rejected(p, r.expect);
      assert.deepEqual(await d.getCustomerProfile(ME), r.expect === 'ok' ? { customerId: ME, consentAt: first.consentAt, ...START, ...r.stored } : first);
    };
    if (r.todo) test.todo(`${r.cls} (observed: ${r.todo})`, run); else test(r.cls, run);
  }
  test("no profile yet: {name: 'x'} -> not_found, and nothing is created by the way", async () => {
    await rejected(d.updateCustomerProfile(ME, { name: 'x', phone: '0812345678' }), 'not_found');
    await rejected(d.getCustomerProfile(ME), 'not_found');
  });
});
