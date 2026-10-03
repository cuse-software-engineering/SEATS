// Unit tests of the Media Storage Adapter behind uploadZoneMapImage() (UC-04 step 3 and EF-3, FR-39).
import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import * as d from '../src/domain.js';
import { adapters, FakeMediaStorage } from '../src/adapters.js';
import { resetStore } from '../src/store.js';

let storage: FakeMediaStorage;
beforeEach(async () => { await resetStore(); storage = new FakeMediaStorage(); adapters.mediaStorage = storage; });

test('the image goes through the adapter and its URL is kept on the map', async () => {
  const map = await d.createZoneMap({ name: 'Main hall' });
  const updated = await d.uploadZoneMapImage(map.id, { fileName: 'hall.png' });
  assert.equal(updated.imageUrl, `https://storage.example/zone-maps/${map.id}/hall.png`);
  assert.deepEqual(storage.stored, [{ zoneMapId: map.id, fileName: 'hall.png' }]);
});

test('UC-04 EF-3: when the storage refuses the image the map is unchanged and the Manager learns why', async () => {
  const map = await d.createZoneMap({ name: 'Main hall' });
  storage.failNext = 1;
  await assert.rejects(d.uploadZoneMapImage(map.id, { fileName: 'hall.png' }), (e: unknown) => e instanceof d.InfrastructureError && e.system === 'the object storage' && /unchanged/.test(e.message));
  assert.equal((await d.getZoneMap(map.id)).imageUrl, '');
  const again = await d.uploadZoneMapImage(map.id, { fileName: 'hall.png' });   // the storage is back
  assert.equal(again.imageUrl, `https://storage.example/zone-maps/${map.id}/hall.png`);
});

test('a missing file name is refused before the adapter is asked', async () => {
  const map = await d.createZoneMap({ name: 'Main hall' });
  await assert.rejects(d.uploadZoneMapImage(map.id, {}), (e: unknown) => e instanceof d.DomainError && e.kind === 'invalid');
  assert.equal(storage.stored.length, 0);
});
