// The Media Storage Adapter of the Concert Round Service: the fake behind the MediaStorage port of the domain (Table
// 5.2; FR-39: the image of the venue behind a zone map). The fake answers a URL without storing anything; MEDIA_STORAGE
// selects another implementation when one exists. A refusal of the object storage is an InfrastructureError naming it
// (not a rule of the business).
import { InfrastructureError } from '@seats/errors/src/index.js';
import type { MediaStorage } from '../domain/ports.js';

export class FakeMediaStorage implements MediaStorage {
  readonly stored: { zoneMapId: string; fileName: string }[] = [];
  failNext = 0;   // tests: the next n stores are refused
  async store(zoneMapId: string, fileName: string): Promise<{ url: string }> {
    if (this.failNext > 0) { this.failNext--; throw new InfrastructureError('the object storage', 'the object storage did not accept the image (fake)'); }
    this.stored.push({ zoneMapId, fileName });
    return { url: `https://storage.example/zone-maps/${zoneMapId}/${fileName}` };
  }
}

export function mediaStorageFromEnv(): MediaStorage {
  const kind = process.env.MEDIA_STORAGE ?? 'fake';
  if (kind === 'fake') return new FakeMediaStorage();
  throw new Error(`MEDIA_STORAGE=${kind}: only "fake" is built; the adapter of the cloud object storage comes with the bucket`);
}

/** The adapter in use; tests replace it, and the port bound by wire() delegates to whatever is here. */
export const adapters = { mediaStorage: mediaStorageFromEnv() };
