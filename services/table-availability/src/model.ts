// Data model of the Table Status DB (docs/data-model.md). The gRPC messages of table_availability.proto mirror it.
export type TableStatusValue = 'AVAILABLE' | 'HELD' | 'BOOKED' | 'OCCUPIED' | 'NOT_FOR_SALE';

export interface TableStatus {
  tableNumber: number;
  status: TableStatusValue;
  bookingId: string;      // reference to the Booking DB; '' when free
  holdEndsAt: string;     // RFC 3339; set by the Booking Service, which owns the timer (ADR-08)
}

/** One document per round; holdTable() is one conditional update of it (ADR-08). */
export interface RoundTableStatus {
  roundId: string;        // reference to the Round DB of the Concert Round Service
  version: number;        // grows on every change; the ETag of the polled read (ADR-09)
  tables: Record<number, TableStatus>;
}

/** What callers see: the same document with the tables as a sorted list. */
export interface RoundTableStatusView {
  roundId: string;
  version: number;
  tables: TableStatus[];
}

export interface RoundCount { roundId: string; available: number; forSale: number }
