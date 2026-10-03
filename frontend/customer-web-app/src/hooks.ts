// Hooks shared by the booking screens C4 to C9: the booking with its hold countdown (the app bar's mm:ss), and the
// round behind a booking with the table's type name, package and price, which the booking itself does not carry.
import { useEffect, useState } from 'react';
import { api, type Booking, type Loaded, type Round, type RoundTable, useLoad } from '@seats/frontend-shared';

export interface HeldBooking {
  booking: Loaded<Booking>;
  /** Seconds left on the hold; null unless the booking is Held. */
  remaining: number | null;
  /** Held with time left. */
  held: boolean;
}

/** GET /api/bookings/{id}; the countdown runs locally from remainingHoldSeconds and at zero the booking is read
 *  again (Expired, UC-01 EF-1). */
export function useHeldBooking(id: string): HeldBooking {
  const booking = useLoad(() => api.get<Booking>(`/api/bookings/${id}`), [id]);
  const [remaining, setRemaining] = useState<number | null>(null);
  useEffect(() => {
    if (!booking.data) return;
    setRemaining(booking.data.status === 'Held' ? booking.data.remainingHoldSeconds ?? 0 : null);
  }, [booking.data]);
  const ticking = remaining !== null && remaining > 0;
  useEffect(() => {
    if (!ticking) return;
    const timer = setInterval(() => setRemaining((r) => (r === null ? null : r - 1)), 1000);
    return () => clearInterval(timer);
  }, [ticking]);
  useEffect(() => { if (remaining === 0 && booking.data?.status === 'Held') booking.reload(); }, [remaining]);   // eslint-disable-line react-hooks/exhaustive-deps
  return { booking, remaining, held: booking.data?.status === 'Held' && (remaining ?? 0) > 0 };
}

export interface RoundOfBooking {
  round: Loaded<Round | null>;
  tables: Loaded<RoundTable[] | null>;
  /** The booked table as the round lists it: type name, capacity, package and price. */
  table: RoundTable | undefined;
}

/** GET /api/rounds/{id} and its tables, once the booking says which round. */
export function useRoundOf(b: Booking | null): RoundOfBooking {
  const roundId = b?.roundId;
  const round = useLoad<Round | null>(() => (roundId ? api.get<Round>(`/api/rounds/${roundId}`) : Promise.resolve(null)), [roundId]);
  const tables = useLoad<RoundTable[] | null>(() => (roundId ? api.get<RoundTable[]>(`/api/rounds/${roundId}/tables`) : Promise.resolve(null)), [roundId]);
  return { round, tables, table: tables.data?.find((t) => t.tableNumber === b?.tableNumber) };
}

export interface RoundInfo { round: Round | null; tables: RoundTable[] }

/** The rounds of a list of bookings (C9), by round id; a round that cannot be read leaves a null. */
export function useRounds(roundIds: string[]): Loaded<Map<string, RoundInfo>> {
  const key = [...new Set(roundIds)].sort().join(',');
  return useLoad(async () => {
    const ids = key ? key.split(',') : [];
    const entries = await Promise.all(ids.map(async (id): Promise<[string, RoundInfo]> => {
      try {
        const [round, tables] = await Promise.all([api.get<Round>(`/api/rounds/${id}`), api.get<RoundTable[]>(`/api/rounds/${id}/tables`)]);
        return [id, { round, tables }];
      } catch {
        return [id, { round: null, tables: [] }];
      }
    }));
    return new Map(entries);
  }, [key]);
}
