// The repositories of the Round DB (the interfaces of domain/repository.ts) implemented once over collection<T>() of
// store.ts, so memory and MongoDB are served alike (ADR-06). wire() of index.ts binds them to the domain's ports; no
// other module of the service touches a collection.
import { collection } from './store.js';
import type { BusinessParametersRepository, RoundRepository, TableTypeRepository, ZoneMapRepository } from '../domain/repository.js';
import type { BusinessParameters, Round, TableType, ZoneMap } from '../domain/model.js';

const zoneMapDocs = collection<ZoneMap>('zoneMaps');
const tableTypeDocs = collection<TableType>('tableTypes');
const roundDocs = collection<Round>('rounds');
const settings = collection<BusinessParameters>('settings');
const PARAMETERS = 'parameters';   // the id of the single settings document

export const zoneMaps: ZoneMapRepository = {
  get: (id) => zoneMapDocs.get(id),
  save: (map) => zoneMapDocs.put(map.id, map),
  remove: (id) => zoneMapDocs.delete(id),
  all: () => zoneMapDocs.list(),
  withStatus: (status) => zoneMapDocs.find({ status }),
};
export const tableTypes: TableTypeRepository = {
  get: (id) => tableTypeDocs.get(id),
  save: (type) => tableTypeDocs.put(type.id, type),
  all: () => tableTypeDocs.list(),
};
export const rounds: RoundRepository = {
  get: (id) => roundDocs.get(id),
  save: (round) => roundDocs.put(round.id, round),
  remove: (id) => roundDocs.delete(id),
  all: () => roundDocs.list(),
  published: () => roundDocs.find({ status: 'Published' }),
  publishedOnMap: (zoneMapId) => roundDocs.find({ status: 'Published', zoneMapId }),
};
export const businessParameters: BusinessParametersRepository = {
  get: () => settings.get(PARAMETERS),
  save: (p) => settings.put(PARAMETERS, p),
};
