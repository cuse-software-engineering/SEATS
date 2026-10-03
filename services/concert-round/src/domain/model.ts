// Data model of the Round DB (docs/data-model.md): zone maps, table types, rounds, business parameters.
export type ZoneMapStatus = 'Draft' | 'Active';
export type RoundStatus = 'Draft' | 'Published';

export interface Zone { id: string; name: string }

export interface ZoneMapTable {
  tableNumber: number;   // unique in the map (FR-74)
  zoneId: string;
  tableTypeId: string;
  capacity: number;
  x: number;
  y: number;
}

export interface ZoneMap {
  id: string;
  name: string;
  status: ZoneMapStatus;
  imageUrl: string;      // Media Storage Adapter (FR-39)
  zones: Zone[];
  tables: ZoneMapTable[];
  createdAt: string;
}

export interface TableType { id: string; name: string; capacity: number; packageContent: string }   // FR-37

export interface BusinessParameters {   // FR-38
  holdPeriodMinutes: number;            // BRULE-02
  checkInWindowHours: number;           // BRULE-04
  gracePeriodMinutes: number;           // BRULE-05
  extraPersonFee: number;               // BRULE-09, THB
}

export interface PackagePrice { zoneId: string; tableTypeId: string; packagePrice: number; packageContent?: string }   // BRULE-08

export interface CheckInWindow { opensAt: string; startAt: string; graceEndsAt: string }

export interface Round {
  id: string;
  name: string;
  artist: string;
  status: RoundStatus;
  date: string;                 // YYYY-MM-DD
  doorsOpenAt: string;          // RFC 3339
  startAt: string;
  bookingOpenAt: string;        // BRULE-07
  zoneMapId: string;
  tablesNotForSale: number[];
  prices: PackagePrice[];
  checkInWindow: CheckInWindow | null;
  parameters: BusinessParameters | null;   // snapshot at publish: the values in force for this round
  createdAt: string;
}

/** A table of a round as the Customer and the Booking Service see it: map, type and price joined. */
export interface RoundTable {
  tableNumber: number;
  zoneId: string;
  zoneName: string;
  tableTypeId: string;
  tableTypeName: string;
  capacity: number;
  x: number;
  y: number;
  forSale: boolean;
  packagePrice: number | null;
  packageContent: string;
}

export interface ValidationResult { valid: boolean; problems: string[] }

export type RoundListStatus = 'not yet open' | 'open' | 'sold out';
export interface UpcomingRound {
  id: string; name: string; artist: string; date: string; startAt: string; bookingOpenAt: string;
  status: RoundListStatus; availableTables: number; tablesForSale: number;
}
