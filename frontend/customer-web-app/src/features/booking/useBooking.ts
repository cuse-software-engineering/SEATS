import { useEffect } from 'react';
import { type Booking, type Round, type RoundTable, useCountdown, useGet } from '@seats/frontend-shared';

export interface HeldBooking {
  query: ReturnType<typeof useGet<Booking>>;
  booking: Booking | undefined;
  /** Seconds left on the hold; null unless the booking is Held. */
  remaining: number | null;
  /** Held with time left. */
  held: boolean;
}

/** The booking with its hold countdown (the app bar's mm:ss). The countdown runs locally from holdEndsAt; at zero the
 *  booking is read again until the expiry job has marked it Expired (UC-01 EF-1). */
export function useBooking(id: string): HeldBooking {
  const query = useGet<Booking>(['booking', id], `/api/bookings/${id}`, {
    refetchInterval: (q) => (q.state.data?.status === 'Held' && (q.state.data.remainingHoldSeconds ?? 1) <= 0 ? 3000 : false),
  });
  const booking = query.data;
  const remaining = useCountdown(booking?.status === 'Held' ? booking.holdEndsAt : null);
  const { refetch } = query;
  const status = booking?.status;
  useEffect(() => { if (remaining === 0 && status === 'Held') void refetch(); }, [remaining, status, refetch]);
  return { query, booking, remaining, held: status === 'Held' && (remaining ?? 0) > 0 };
}

/** The round behind a booking, with the booked table as the round lists it: type name, capacity, package, price. */
export function useRoundOfBooking(b: Booking | undefined) {
  const roundId = b?.roundId;
  const round = useGet<Round>(['round', roundId ?? ''], roundId ? `/api/rounds/${roundId}` : null);
  const table: RoundTable | undefined = round.data?.tables?.find((t) => t.tableNumber === b?.tableNumber);
  return { round, table };
}
