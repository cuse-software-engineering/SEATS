// The repositories of the Round DB, one per aggregate (zone maps, table types, rounds) plus the single document of the
// business parameters, as interfaces in the words of the domain. infrastructure/repositories.ts implements them once
// over collection<T>() of the store, so memory and MongoDB are served alike (ADR-06); the rules reach them through
// ports.ts and never touch a collection.
import type { BusinessParameters, Round, TableType, ZoneMap, ZoneMapStatus } from './model.js';

export interface ZoneMapRepository {
  /** The zone map with this id, or null. */
  get(id: string): Promise<ZoneMap | null>;
  /** Stores the zone map, new or changed; answers it as given. */
  save(map: ZoneMap): Promise<ZoneMap>;
  /** Removes the zone map; true when it existed. */
  remove(id: string): Promise<boolean>;
  /** Every zone map. */
  all(): Promise<ZoneMap[]>;
  /** The zone maps in this status (Draft or Active). */
  withStatus(status: ZoneMapStatus): Promise<ZoneMap[]>;
}

export interface TableTypeRepository {
  /** The table type with this id, or null. */
  get(id: string): Promise<TableType | null>;
  /** Stores the table type, new or redefined; answers it as given. */
  save(type: TableType): Promise<TableType>;
  /** Every table type, in one read (the domain joins them by id from a map rather than asking for each). */
  all(): Promise<TableType[]>;
}

export interface RoundRepository {
  /** The round with this id, or null. */
  get(id: string): Promise<Round | null>;
  /** Stores the round, new or changed; answers it as given. */
  save(round: Round): Promise<Round>;
  /** Removes the round; true when it existed. */
  remove(id: string): Promise<boolean>;
  /** The Published rounds (the customer's list, the overlap check of validation). */
  published(): Promise<Round[]>;
  /** The Published rounds on this zone map (whose booked tables the map must keep). */
  publishedOnMap(zoneMapId: string): Promise<Round[]>;
}

export interface BusinessParametersRepository {
  /** The business parameters in force, or null while none were ever stored. */
  get(): Promise<BusinessParameters | null>;
  /** Stores the business parameters; answers them as given. */
  save(p: BusinessParameters): Promise<BusinessParameters>;
}
