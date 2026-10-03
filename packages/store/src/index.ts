// The repository of a service's database (ADR-06: one database per service, nobody else reads it). A domain module
// talks to Collection<T> only; which implementation sits behind it is decided once, by configuration, when the
// service starts:
//   - in memory (the default: development, the unit and scenario tests, the free-plan demo deployment);
//   - MongoDB through Mongoose, when <SERVICE>_MONGO_URL names the service's own database or MONGO_URL names a
//     cluster on which the service takes the database seats_<service>.
// Both implementations keep the same semantics: a document is JSON addressed by its id (so an undefined field is not
// stored and a Date comes back as its ISO string, in memory exactly as in MongoDB), reads return copies (the in-memory
// store clones, so a domain that forgets to put() a change is caught by the tests), and
// insert() is atomic: the second insert of an id fails with DuplicateKeyError on both stores (the unique _id index in
// MongoDB), which is how the Booking Service keeps first-lock-wins (BRULE-03, ADR-13).
import type { Connection, Model } from 'mongoose';
import { InfrastructureError } from '@seats/errors/src/index.js';

export class DuplicateKeyError extends Error {
  constructor(public readonly collectionName: string, public readonly id: string) {
    super(`${collectionName}/${id} exists already`);
    this.name = 'DuplicateKeyError';
  }
}

export interface Collection<T extends object> {
  /** The document with this id, or null. */
  get(id: string): Promise<T | null>;
  /** Inserts or replaces the document; answers the document as given. */
  put(id: string, doc: T): Promise<T>;
  /** Inserts the document; DuplicateKeyError when the id exists (atomic on both stores). */
  insert(id: string, doc: T): Promise<T>;
  /** Removes the document; true when it existed. */
  delete(id: string): Promise<boolean>;
  /** Every document, in insertion order in memory and in natural order in MongoDB. */
  list(): Promise<T[]>;
  /** The documents whose top-level fields equal `where` (undefined fields are ignored). */
  find(where: Partial<T>): Promise<T[]>;
}

export type StoreKind = 'memory' | 'mongodb';

export interface Store {
  readonly kind: StoreKind;
  collection<T extends object>(name: string): Collection<T>;
  /** Empties every collection (the tests). */
  reset(): Promise<void>;
  close(): Promise<void>;
}

/** The copy a document database hands back: JSON, so undefined fields vanish and Dates become strings. */
const clone = <T>(d: T): T => JSON.parse(JSON.stringify(d)) as T;

const matches = (doc: object, where: object): boolean =>
  Object.entries(where).every(([k, v]) => v === undefined || (doc as Record<string, unknown>)[k] === v);

// ---------------------------------------------------------------- in memory
export function memoryStore(): Store {
  const maps = new Map<string, Map<string, object>>();
  const mapOf = (name: string): Map<string, object> => {
    let m = maps.get(name);
    if (!m) { m = new Map(); maps.set(name, m); }
    return m;
  };
  return {
    kind: 'memory',
    collection<T extends object>(name: string): Collection<T> {
      const m = mapOf(name) as Map<string, T>;
      return {
        get: async (id) => { const d = m.get(id); return d === undefined ? null : clone(d); },
        put: async (id, doc) => { m.set(id, clone(doc)); return doc; },
        insert: async (id, doc) => {
          if (m.has(id)) throw new DuplicateKeyError(name, id);
          m.set(id, clone(doc));
          return doc;
        },
        delete: async (id) => m.delete(id),
        list: async () => [...m.values()].map(clone),
        find: async (where) => [...m.values()].filter((d) => matches(d, where)).map(clone),
      };
    },
    reset: async () => { for (const m of maps.values()) m.clear(); },
    close: async () => {},
  };
}

// ---------------------------------------------------------------- MongoDB through Mongoose
const isDuplicateKey = (e: unknown): boolean => typeof e === 'object' && e !== null && (e as { code?: unknown }).code === 11000;
/** A failing driver call as the service reports it: the database did not answer (an InfrastructureError, retryable). */
const database = async <T>(op: string, run: () => Promise<T>): Promise<T> => {
  try { return await run(); } catch (e) { throw new InfrastructureError('MongoDB', `MongoDB did not answer ${op}: ${e instanceof Error ? e.message : String(e)}`, { cause: e }); }
};
/** A document as read from MongoDB: without its _id and as JSON (a BSON Date becomes its ISO string, as in memory). */
const withoutId = <T>(d: Record<string, unknown>): T => { const { _id: _, ...rest } = d; return clone(rest as T); };
const defined = (where: object): Record<string, unknown> => Object.fromEntries(Object.entries(where).filter(([, v]) => v !== undefined));

/** A store on one MongoDB database: `url` as Mongoose takes it; `dbName` overrides the database in the url. */
export async function mongoStore(url: string, dbName?: string): Promise<Store> {
  const { default: mongoose } = await import('mongoose');            // loaded only when a service is configured for it
  const conn: Connection = await mongoose.createConnection(url, dbName ? { dbName } : {}).asPromise();
  // One schema for every collection: the documents are validated by the domain, so the database stores them as given.
  // id: false drops Mongoose's `id` virtual, so a document's own `id` field is stored like any other.
  const schema = new mongoose.Schema({ _id: { type: String, required: true } }, { strict: false, versionKey: false, minimize: false, id: false });
  const models = new Map<string, Model<Record<string, unknown>>>();
  const modelFor = (name: string): Model<Record<string, unknown>> => {
    let model = models.get(name);
    if (!model) { model = conn.model<Record<string, unknown>>(name, schema, name); models.set(name, model); }
    return model;
  };
  return {
    kind: 'mongodb',
    collection<T extends object>(name: string): Collection<T> {
      const M = modelFor(name);
      return {
        get: (id) => database(`${name}.get`, async () => { const d = await M.findById(id).lean(); return d ? withoutId<T>(d as Record<string, unknown>) : null; }),
        put: (id, doc) => database(`${name}.put`, async () => { await M.replaceOne({ _id: id }, { _id: id, ...clone(doc) }, { upsert: true }); return doc; }),
        insert: async (id, doc) => {
          try { await M.create({ _id: id, ...clone(doc) }); } catch (e) { if (isDuplicateKey(e)) throw new DuplicateKeyError(name, id); throw new InfrastructureError('MongoDB', `MongoDB did not answer ${name}.insert: ${e instanceof Error ? e.message : String(e)}`, { cause: e }); }
          return doc;
        },
        delete: (id) => database(`${name}.delete`, async () => (await M.deleteOne({ _id: id })).deletedCount > 0),
        list: () => database(`${name}.list`, async () => (await M.find().lean()).map((d) => withoutId<T>(d as Record<string, unknown>))),
        find: (where) => database(`${name}.find`, async () => (await M.find(defined(where)).lean()).map((d) => withoutId<T>(d as Record<string, unknown>))),
      };
    },
    // empties the collections rather than dropping the database: a drop makes Mongoose re-initialise every model and buffer
    reset: async () => {
      const names = (await conn.db!.listCollections().toArray()).map((c) => c.name);
      await Promise.all(names.map((n) => conn.db!.collection(n).deleteMany({})));
    },
    close: async () => { await conn.close(); },
  };
}

// ---------------------------------------------------------------- the store of one service, chosen by configuration
export interface ServiceStore {
  readonly service: string;
  /** Which implementation answers right now. */
  kind(): StoreKind;
  /** A collection handle; usable from module load, it follows the implementation chosen by connect(). */
  collection<T extends object>(name: string): Collection<T>;
  /** Chooses the implementation: `url` as given, else <SERVICE>_MONGO_URL, else MONGO_URL with the database
   *  seats_<service>, else memory. Call once before serving requests (and before seeding). */
  connect(url?: string): Promise<void>;
  /** Empties every collection of the current implementation (the tests). */
  reset(): Promise<void>;
  /** Closes the database connection and goes back to memory. */
  close(): Promise<void>;
}

export function serviceStore(service: string): ServiceStore {
  const envName = `${service.toUpperCase().replace(/-/g, '_')}_MONGO_URL`;
  let backend: Store = memoryStore();
  const collection = <T extends object>(name: string): Collection<T> => ({
    get: (id) => backend.collection<T>(name).get(id),
    put: (id, doc) => backend.collection<T>(name).put(id, doc),
    insert: (id, doc) => backend.collection<T>(name).insert(id, doc),
    delete: (id) => backend.collection<T>(name).delete(id),
    list: () => backend.collection<T>(name).list(),
    find: (where) => backend.collection<T>(name).find(where),
  });
  return {
    service,
    kind: () => backend.kind,
    collection,
    async connect(url?: string) {
      const own = url ?? process.env[envName];
      const target = own ?? process.env.MONGO_URL;
      if (!target) {
        console.log(`[${service}] no ${envName} or MONGO_URL: the ${service} DB is in memory (ADR-06 persistence is off)`);
        return;
      }
      const dbName = own ? undefined : `seats_${service.replace(/-/g, '_')}`;   // MONGO_URL names the cluster: one database per service
      const next = await mongoStore(target, dbName);
      const previous = backend;
      backend = next;
      await previous.close();
      console.log(`[${service}] the ${service} DB is on MongoDB${dbName ? ` (database ${dbName})` : ` (${envName})`}`);
    },
    reset: () => backend.reset(),
    async close() {
      const previous = backend;
      backend = memoryStore();
      await previous.close();
    },
  };
}
