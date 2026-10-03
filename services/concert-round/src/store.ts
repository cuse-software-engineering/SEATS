// The Round DB (ADR-06): an in-memory cache, synchronous like before so domain.ts does not change, durably backed by
// MongoDB through Mongoose. connectStore() hydrates the cache from Mongo once at startup; every put() and delete()
// afterwards is mirrored to Mongo in the background — best effort, since the caller already has its result from the
// cache (a failed write is logged, not thrown). With no connection string configured the service runs exactly as
// before, in memory only (the Render free-plan demo deployment, ADR-06's persistence is then simply off); the unit
// tests never call connectStore() and so never touch the network or need a MongoDB of their own.
import mongoose, { Schema } from 'mongoose';

export interface Collection<T> {
  get(id: string): T | null;
  put(id: string, doc: T): T;
  delete(id: string): boolean;
  list(): T[];
}

const collections = new Map<string, Map<string, unknown>>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- every collection stores a different shape (Table 6.5); domain.ts already validates it
const models = new Map<string, mongoose.Model<any>>();

// One schema for every collection: the documents are already validated by domain.ts (Table 6.5), so the Round DB
// stores them as given rather than duplicating their shape here.
const DocumentSchema = new Schema({}, { strict: false, _id: false, versionKey: false });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function modelFor(name: string): mongoose.Model<any> {
  let model = models.get(name);
  if (!model) { model = mongoose.model(name, DocumentSchema, name); models.set(name, model); }
  return model;
}

let persisting = false;

export function collection<T>(name: string): Collection<T> {
  if (!collections.has(name)) collections.set(name, new Map());
  const cache = collections.get(name) as Map<string, T>;
  return {
    get: (id) => cache.get(id) ?? null,
    put: (id, doc) => {
      cache.set(id, doc);
      if (persisting) {
        modelFor(name)
          .replaceOne({ _id: id }, { _id: id, ...(doc as Record<string, unknown>) }, { upsert: true })
          .catch((e: unknown) => console.error(`[concert-round] could not persist ${name}/${id} to MongoDB`, e));
      }
      return doc;
    },
    delete: (id) => {
      const existed = cache.delete(id);
      if (persisting) {
        modelFor(name).deleteOne({ _id: id }).catch((e: unknown) => console.error(`[concert-round] could not delete ${name}/${id} from MongoDB`, e));
      }
      return existed;
    },
    list: () => [...cache.values()],
  };
}

/** Empties every collection in the cache (not MongoDB); the unit tests call it before each case. */
export function resetStore(): void {
  for (const m of collections.values()) m.clear();
}

/**
 * Opens the MongoDB connection named by CONCERT_ROUND_MONGO_URL (or MONGO_URL) and loads every collection already
 * registered — domain.ts's top-level collection() calls have already run by the time server.ts calls this — into
 * the cache. Call once, before serving requests (server.ts). With no connection string this is a no-op: the store
 * stays in memory only, exactly as the service ran before this change.
 */
export async function connectStore(url = process.env.CONCERT_ROUND_MONGO_URL ?? process.env.MONGO_URL): Promise<void> {
  if (!url) {
    console.log('[concert-round] no CONCERT_ROUND_MONGO_URL: running in memory only (ADR-06 persistence is off)');
    return;
  }
  await mongoose.connect(url);
  for (const [name, cache] of collections) {
    const docs = await modelFor(name).find().lean();
    cache.clear();
    for (const doc of docs as Record<string, unknown>[]) {
      const { _id, ...rest } = doc;
      cache.set(_id as string, rest);
    }
  }
  persisting = true;
  console.log(`[concert-round] connected to MongoDB; hydrated ${collections.size} collection(s)`);
}

/** Closes the MongoDB connection; tests that do connect (store.test.ts) call it in afterEach/after. */
export async function disconnectStore(): Promise<void> {
  if (!persisting) return;
  persisting = false;
  await mongoose.disconnect();
}
