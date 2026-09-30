// In-memory store (progress 1). Same interface as a Mongoose-backed store would offer, so domain.ts does not change.
export interface Collection<T> {
  get(id: string): T | null;
  put(id: string, doc: T): T;
  delete(id: string): boolean;
  list(): T[];
}

const collections = new Map<string, Map<string, unknown>>();

export function collection<T>(name: string): Collection<T> {
  if (!collections.has(name)) collections.set(name, new Map());
  const m = collections.get(name) as Map<string, T>;
  return {
    get: (id) => m.get(id) ?? null,
    put: (id, doc) => { m.set(id, doc); return doc; },
    delete: (id) => m.delete(id),
    list: () => [...m.values()],
  };
}

/** Empties every collection; the unit tests call it before each case. */
export function resetStore(): void {
  for (const m of collections.values()) m.clear();
}
