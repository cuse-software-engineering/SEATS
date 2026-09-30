// The Media Storage port of the Concert Round Service and its fake (Table 5.2; FR-39: the image of the venue behind a
// zone map). The fake answers a URL without storing anything; MEDIA_STORAGE selects another implementation when one exists.
export interface MediaStorageAdapter {
  /** Stores the image of a zone map and answers its URL; rejects when the object storage refuses it (UC-04 EF-3). */
  store(zoneMapId: string, fileName: string): Promise<{ url: string }>;
}

export class FakeMediaStorage implements MediaStorageAdapter {
  readonly stored: { zoneMapId: string; fileName: string }[] = [];
  failNext = 0;   // tests: the next n stores are refused
  async store(zoneMapId: string, fileName: string): Promise<{ url: string }> {
    if (this.failNext > 0) { this.failNext--; throw new Error('the object storage did not accept the image (fake)'); }
    this.stored.push({ zoneMapId, fileName });
    return { url: `https://storage.example/zone-maps/${zoneMapId}/${fileName}` };
  }
}

export function mediaStorageFromEnv(): MediaStorageAdapter {
  const kind = process.env.MEDIA_STORAGE ?? 'fake';
  if (kind === 'fake') return new FakeMediaStorage();
  throw new Error(`MEDIA_STORAGE=${kind}: only "fake" is built; the adapter of the cloud object storage comes with the bucket`);
}

/** The adapter in use; tests replace it. */
export const adapters = { mediaStorage: mediaStorageFromEnv() };
