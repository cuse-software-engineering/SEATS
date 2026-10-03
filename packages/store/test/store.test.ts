// The contract of Collection<T>, run against the in-memory store always and against MongoDB when TEST_MONGO_URL names
// one (docker run --rm -p 27017:27017 mongo:7; TEST_MONGO_URL=mongodb://localhost:27017/seats_store_test). The two
// implementations must be indistinguishable to a domain module, which is what lets a service switch by configuration.
import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { DuplicateKeyError, memoryStore, mongoStore, serviceStore, type Store } from '../src/index.js';

interface Thing { id: string; name: string; group?: string; tags: string[]; nested: { n: number } }
const thing = (id: string, name: string, group?: string): Thing => ({ id, name, ...(group === undefined ? {} : { group }), tags: ['a', 'b'], nested: { n: 1 } });

function contract(label: string, open: () => Promise<Store>, skip: string | false) {
  describe(label, { skip }, () => {
    let store: Store;
    before(async () => { store = await open(); });
    beforeEach(async () => { await store.reset(); });
    after(async () => { await store.close(); });

    test('get() answers null, then the document put()', async () => {
      const things = store.collection<Thing>('things');
      assert.equal(await things.get('t1'), null);
      assert.deepEqual(await things.put('t1', thing('t1', 'Alpha')), thing('t1', 'Alpha'));
      assert.deepEqual(await things.get('t1'), thing('t1', 'Alpha'));
    });

    test('put() replaces the whole document', async () => {
      const things = store.collection<Thing>('things');
      await things.put('t1', thing('t1', 'Alpha', 'g1'));
      await things.put('t1', thing('t1', 'Beta'));
      assert.deepEqual(await things.get('t1'), thing('t1', 'Beta'));   // group is gone, not kept from the first version
    });

    test('insert() refuses a second document with the same id', async () => {
      const things = store.collection<Thing>('things');
      await things.insert('t1', thing('t1', 'Alpha'));
      await assert.rejects(things.insert('t1', thing('t1', 'Again')), (e: unknown) => e instanceof DuplicateKeyError && e.id === 't1');
      assert.deepEqual(await things.get('t1'), thing('t1', 'Alpha'));
    });

    test('insert() is first-wins under concurrency', async () => {
      const locks = store.collection<{ owner: string }>('locks');
      const outcomes = await Promise.allSettled(['a', 'b', 'c', 'd'].map((owner) => locks.insert('round-1/table-7', { owner })));
      assert.equal(outcomes.filter((o) => o.status === 'fulfilled').length, 1);
      assert.equal(outcomes.filter((o) => o.status === 'rejected' && o.reason instanceof DuplicateKeyError).length, 3);
    });

    test('delete() tells whether the document existed', async () => {
      const things = store.collection<Thing>('things');
      await things.put('t1', thing('t1', 'Alpha'));
      assert.equal(await things.delete('t1'), true);
      assert.equal(await things.delete('t1'), false);
      assert.equal(await things.get('t1'), null);
    });

    test('list() and find() by top-level equality, undefined fields ignored', async () => {
      const things = store.collection<Thing>('things');
      await things.put('t1', thing('t1', 'Alpha', 'g1'));
      await things.put('t2', thing('t2', 'Beta', 'g2'));
      await things.put('t3', thing('t3', 'Gamma', 'g1'));
      assert.deepEqual((await things.list()).map((t) => t.id).sort(), ['t1', 't2', 't3']);
      assert.deepEqual((await things.find({ group: 'g1' })).map((t) => t.id).sort(), ['t1', 't3']);
      assert.deepEqual((await things.find({ group: 'g1', name: 'Gamma' })).map((t) => t.id), ['t3']);
      assert.deepEqual((await things.find({ group: undefined })).length, 3);
      assert.deepEqual(await things.find({ group: 'none' }), []);
    });

    test('collections are separate and reset() empties them all', async () => {
      await store.collection<Thing>('things').put('t1', thing('t1', 'Alpha'));
      await store.collection<{ v: number }>('other').put('o1', { v: 1 });
      assert.equal(await store.collection<Thing>('other').get('t1'), null);
      await store.reset();
      assert.deepEqual(await store.collection<Thing>('things').list(), []);
      assert.deepEqual(await store.collection<{ v: number }>('other').list(), []);
    });

    test('a document is JSON: an undefined field is not stored, a Date comes back as its ISO string', async () => {
      const docs = store.collection<{ id: string; when: Date | string; note?: string }>('docs');
      await docs.put('d1', { id: 'd1', when: new Date('2026-11-28T18:00:00.000Z'), note: undefined });
      assert.deepEqual(await docs.get('d1'), { id: 'd1', when: '2026-11-28T18:00:00.000Z' });
    });

    test('a read is a copy: changing it does not change the store', async () => {
      const things = store.collection<Thing>('things');
      const original = thing('t1', 'Alpha');
      await things.put('t1', original);
      original.name = 'changed after put';
      const read = (await things.get('t1'))!;
      read.tags.push('c'); read.nested.n = 2;
      assert.deepEqual(await things.get('t1'), thing('t1', 'Alpha'));
    });
  });
}

contract('in memory', async () => memoryStore(), false);

const URL = process.env.TEST_MONGO_URL;
contract('MongoDB', () => mongoStore(URL as string), URL ? false : 'set TEST_MONGO_URL to a MongoDB to run this suite');

describe('serviceStore', () => {
  test('starts in memory and connect() without configuration keeps it there', async () => {
    const s = serviceStore('example');
    const things = s.collection<Thing>('things');
    await things.put('t1', thing('t1', 'Alpha'));
    delete process.env.EXAMPLE_MONGO_URL; delete process.env.MONGO_URL;
    await s.connect();
    assert.equal(s.kind(), 'memory');
    assert.deepEqual(await things.get('t1'), thing('t1', 'Alpha'));
  });

  test('connect() to MongoDB switches the handles taken before it', { skip: URL ? false : 'set TEST_MONGO_URL' }, async () => {
    const s = serviceStore('example');
    const things = s.collection<Thing>('things');   // taken at module load, as a domain does
    await s.connect(URL);
    await s.reset();
    assert.equal(s.kind(), 'mongodb');
    await things.put('t1', thing('t1', 'Alpha'));
    const again = await mongoStore(URL as string);
    assert.deepEqual(await again.collection<Thing>('things').get('t1'), thing('t1', 'Alpha'));   // it reached the database
    await again.close();
    await s.close();
    assert.equal(s.kind(), 'memory');
  });
});
