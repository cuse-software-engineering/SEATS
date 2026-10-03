// Unit tests of the Concert Round Service domain: table types (FR-37), the kinds of table a zone map places. Test design:
// equivalence classes with boundary values of defineTableType (the table in the header of the describe) and the
// redefinition of an id (PUT replaces), one test per row.
import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import * as d from '../src/domain/index.js';
import { resetStore, wire } from '../src/infrastructure/index.js';
wire();   // the in-memory repositories behind the domain's ports, once per process

const refused = (p: Promise<unknown>, kind: d.DomainError['kind']) => assert.rejects(p, (e: unknown) => e instanceof d.DomainError && e.kind === kind);

beforeEach(async () => { await resetStore(); });

describe('defineTableType', () => {
  test('validates id, name and capacity', async () => {
    await refused(d.defineTableType('', { name: 'x', capacity: 2 }), 'invalid');
    await refused(d.defineTableType('t', { name: '', capacity: 2 }), 'invalid');
    await refused(d.defineTableType('t', { name: 'x', capacity: 0 }), 'invalid');
    await refused(d.defineTableType('t', { name: 'x', capacity: 1.5 }), 'invalid');
  });
  test('stores the type and lists it; a second definition replaces it', async () => {
    await d.defineTableType('sofa6', { name: '6-person sofa', capacity: 6, packageContent: 'one bottle' });
    await d.defineTableType('sofa6', { name: '6-person sofa', capacity: 8 });
    assert.deepEqual(await d.listTableTypes(), [{ id: 'sofa6', name: '6-person sofa', capacity: 8, packageContent: '' }]);
  });
});

describe('defineTableType: equivalence classes (FR-37)', () => {
  // class                  | input (id, body)                          | expected
  // capacity below minimum | capacity 0                                | invalid, nothing stored
  // capacity below minimum | capacity -1                               | invalid
  // capacity at minimum    | capacity 1                                | stored
  // capacity large         | capacity 1000                             | stored
  // capacity non-integer   | capacity 1.5                              | invalid
  // capacity not a number  | capacity NaN                              | invalid
  // capacity missing       | no capacity                               | invalid
  // id blank               | ''                                        | invalid
  // name blank             | ''                                        | invalid
  // name missing           | no name                                   | invalid
  // content missing        | no packageContent                         | stored as ''
  // content given          | 'one bottle'                              | kept
  const cases: { name: string; id: string; body: Partial<d.TableType>; stored?: d.TableType }[] = [
    { name: 'capacity below minimum: 0 -> invalid, nothing stored', id: 't', body: { name: 'x', capacity: 0 } },
    { name: 'capacity below minimum: -1 -> invalid', id: 't', body: { name: 'x', capacity: -1 } },
    { name: 'capacity at minimum: 1 -> stored', id: 't', body: { name: 'x', capacity: 1 }, stored: { id: 't', name: 'x', capacity: 1, packageContent: '' } },
    { name: 'capacity large: 1000 -> stored', id: 't', body: { name: 'x', capacity: 1000 }, stored: { id: 't', name: 'x', capacity: 1000, packageContent: '' } },
    { name: 'capacity non-integer: 1.5 -> invalid', id: 't', body: { name: 'x', capacity: 1.5 } },
    { name: 'capacity not a number: NaN -> invalid', id: 't', body: { name: 'x', capacity: NaN } },
    { name: 'capacity missing: no capacity -> invalid', id: 't', body: { name: 'x' } },
    { name: 'id blank: "" -> invalid', id: '', body: { name: 'x', capacity: 2 } },
    { name: 'name blank: "" -> invalid', id: 't', body: { name: '', capacity: 2 } },
    { name: 'name missing: no name -> invalid', id: 't', body: { capacity: 2 } },
    { name: 'content missing: no packageContent -> stored as ""', id: 'sofa6', body: { name: '6-person sofa', capacity: 6 }, stored: { id: 'sofa6', name: '6-person sofa', capacity: 6, packageContent: '' } },
    { name: 'content given: "one bottle" -> kept', id: 'sofa6', body: { name: '6-person sofa', capacity: 6, packageContent: 'one bottle' }, stored: { id: 'sofa6', name: '6-person sofa', capacity: 6, packageContent: 'one bottle' } },
  ];
  for (const c of cases) test(c.name, async () => {
    if (c.stored) { assert.deepEqual(await d.defineTableType(c.id, c.body), c.stored); assert.deepEqual(await d.listTableTypes(), [c.stored]); }
    else { await refused(d.defineTableType(c.id, c.body), 'invalid'); assert.deepEqual(await d.listTableTypes(), []); }
  });
});

describe('defineTableType: redefinition of an id (PUT replaces) and listTableTypes', () => {
  // class                   | input                                   | expected
  // nothing defined         | list                                    | []
  // two ids                 | sofa6, round2                           | both listed, in definition order
  // same id twice           | capacity 6 then 8                       | one type, the later values
  // same id, content dropped| content then none                       | content ''
  // same id, name changed   | 'sofa' then 'VIP sofa'                  | the later name
  test('nothing defined: list -> []', async () => { assert.deepEqual(await d.listTableTypes(), []); });
  test('two ids: sofa6, round2 -> both listed in definition order', async () => {
    await d.defineTableType('sofa6', { name: '6-person sofa', capacity: 6 });
    await d.defineTableType('round2', { name: '2-person round table', capacity: 2 });
    assert.deepEqual((await d.listTableTypes()).map((t) => t.id), ['sofa6', 'round2']);
  });
  test('same id twice: capacity 6 then 8 -> one type with the later values', async () => {
    await d.defineTableType('sofa6', { name: '6-person sofa', capacity: 6 });
    assert.deepEqual(await d.defineTableType('sofa6', { name: 'VIP sofa', capacity: 8 }), { id: 'sofa6', name: 'VIP sofa', capacity: 8, packageContent: '' });
    assert.deepEqual(await d.listTableTypes(), [{ id: 'sofa6', name: 'VIP sofa', capacity: 8, packageContent: '' }]);
  });
  test('same id, an invalid redefinition: capacity 0 -> invalid, the earlier definition kept', async () => {
    await d.defineTableType('sofa6', { name: '6-person sofa', capacity: 6 });
    await refused(d.defineTableType('sofa6', { name: '6-person sofa', capacity: 0 }), 'invalid');
    assert.deepEqual(await d.listTableTypes(), [{ id: 'sofa6', name: '6-person sofa', capacity: 6, packageContent: '' }]);
  });
});
