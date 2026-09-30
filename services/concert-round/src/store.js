// In-memory store (progress 1). Same interface as a Mongoose-backed store would offer, so domain.js does not change.
const collections = new Map();

export function collection(name) {
  if (!collections.has(name)) collections.set(name, new Map());
  const m = collections.get(name);
  return {
    get: (id) => m.get(id) ?? null,
    put: (id, doc) => { m.set(id, doc); return doc; },
    delete: (id) => m.delete(id),
    list: () => [...m.values()],
  };
}
