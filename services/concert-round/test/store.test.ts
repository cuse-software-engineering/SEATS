// Integration test of the Round DB's MongoDB persistence (ADR-06). Needs a real MongoDB; the rest of the suite
// (rounds.test.ts, zone-maps.test.ts, media.test.ts) never touches the network and always runs.
//
//   docker run --rm -p 27018:27017 mongo:7
//   TEST_MONGO_URL=mongodb://localhost:27018/concert-round-test npm -w services/concert-round test
//
// Skipped with no TEST_MONGO_URL (or CONCERT_ROUND_MONGO_URL / MONGO_URL) set, so `npm test` elsewhere — CI, another
// contributor's machine, this repo's default `npm test` — never needs a MongoDB of its own.
import { after, afterEach, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { collection, connectStore, disconnectStore, resetStore } from '../src/store.js';

const URL = process.env.TEST_MONGO_URL ?? process.env.CONCERT_ROUND_MONGO_URL ?? process.env.MONGO_URL;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('Round DB persistence (ADR-06)', { skip: URL ? false : 'set TEST_MONGO_URL to a MongoDB to run this suite' }, () => {
  before(async () => { await connectStore(URL); });
  afterEach(async () => { await mongoose.connection.dropDatabase(); resetStore(); });
  after(async () => { await disconnectStore(); });

  test('put() answers from the cache at once and is mirrored to MongoDB', async () => {
    const things = collection<{ id: string; name: string }>('things');
    assert.deepEqual(things.put('t1', { id: 't1', name: 'Alpha' }), { id: 't1', name: 'Alpha' });   // no await: the cache is synchronous
    assert.deepEqual(things.get('t1'), { id: 't1', name: 'Alpha' });

    await wait(100);   // the mirrored write to MongoDB happens in the background
    const raw = await mongoose.connection.collection('things').findOne({ _id: 't1' });
    assert.equal(raw?.name, 'Alpha');
  });

  test('a second put() for the same id replaces the document in MongoDB, not duplicates it', async () => {
    const things = collection<{ id: string; name: string }>('things');
    things.put('t2', { id: 't2', name: 'Beta' });
    things.put('t2', { id: 't2', name: 'Beta v2' });
    await wait(100);
    assert.equal(await mongoose.connection.collection('things').countDocuments({ _id: 't2' }), 1);
    const raw = await mongoose.connection.collection('things').findOne({ _id: 't2' });
    assert.equal(raw?.name, 'Beta v2');
  });

  test('delete() removes the document from MongoDB too', async () => {
    const things = collection<{ id: string; name: string }>('things');
    things.put('t3', { id: 't3', name: 'Gamma' });
    await wait(100);
    things.delete('t3');
    await wait(100);
    assert.equal(await mongoose.connection.collection('things').findOne({ _id: 't3' }), null);
  });

  test('connectStore() hydrates the cache from what MongoDB already holds — a restarted process keeps its data', async () => {
    const things = collection<{ id: string; name: string }>('things');
    things.put('t4', { id: 't4', name: 'Delta' });
    await wait(100);

    resetStore();                        // as if the process had just restarted: the cache is empty
    assert.equal(things.get('t4'), null);

    await connectStore(URL);             // the real boot sequence (server.ts): hydrate every registered collection from MongoDB
    assert.deepEqual(things.get('t4'), { id: 't4', name: 'Delta' });
  });
});
