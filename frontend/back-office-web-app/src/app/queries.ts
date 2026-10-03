// The server state of the back-office through TanStack Query: the query keys (a mutation invalidates what it touched
// by prefix) and one hook per read of the gateway.
import {
  type Booking, type BusinessParameters, type Round, type RoundTable, type StaffAccount, type TableType, type UpcomingRound, useGet,
  type ZoneMap, type ZoneMapSummary,
} from '@seats/frontend-shared';

export const keys = {
  /** Every list of rounds: the back-office's and the customer-facing one. */
  roundLists: ['rounds'] as const,
  rounds: ['rounds', 'all'] as const,
  upcomingRounds: ['rounds', 'upcoming'] as const,
  round: (id: string) => ['round', id] as const,
  roundTables: (id: string) => ['round', id, 'tables'] as const,
  roundBookings: (id: string) => ['round-bookings', id] as const,
  zoneMaps: ['zone-maps'] as const,
  activeZoneMaps: ['zone-maps', 'active'] as const,
  zoneMap: (id: string) => ['zone-map', id] as const,
  tableTypes: ['table-types'] as const,
  businessParameters: ['business-parameters'] as const,
  staffAccounts: ['staff-accounts'] as const,
};

/** Every round of the venue, Draft and Published, newest first (manager and owner). */
export const useRounds = () => useGet<Round[]>(keys.rounds, '/api/rounds/all');
/** The upcoming Published rounds, as the customer sees them (every role). */
export const useUpcomingRounds = () => useGet<UpcomingRound[]>(keys.upcomingRounds, '/api/rounds');
export const useRound = (id: string | null) => useGet<Round>(keys.round(id ?? ''), id && `/api/rounds/${id}`);
export const useRoundTables = (id: string | null) => useGet<RoundTable[]>(keys.roundTables(id ?? ''), id && `/api/rounds/${id}/tables`);
/** The bookings of a round; manager and owner only, so `enabled` follows the role. */
export const useRoundBookings = (id: string | null, enabled = true) => useGet<Booking[]>(keys.roundBookings(id ?? ''), id && `/api/rounds/${id}/bookings`, { enabled });
export const useZoneMaps = () => useGet<ZoneMapSummary[]>(keys.zoneMaps, '/api/zone-maps');
export const useActiveZoneMaps = () => useGet<ZoneMapSummary[]>(keys.activeZoneMaps, '/api/zone-maps?status=Active');
export const useZoneMap = (id: string | null) => useGet<ZoneMap>(keys.zoneMap(id ?? ''), id && `/api/zone-maps/${id}`);
export const useTableTypes = () => useGet<TableType[]>(keys.tableTypes, '/api/table-types');
export const useBusinessParameters = () => useGet<BusinessParameters>(keys.businessParameters, '/api/business-parameters');
export const useStaffAccounts = () => useGet<StaffAccount[]>(keys.staffAccounts, '/api/staff-accounts');
