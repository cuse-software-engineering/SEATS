import { useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, type Booking, type BookingStatus, Button, Divider, LoadError, Loading, tableLabel, useMutate } from '@seats/frontend-shared';
import { paths } from '../../app/paths';
import { fmtClock } from '../../app/format';
import { Screen } from '../../app/Screen';
import { BookingSummaryCard } from './BookingSummaryCard';
import { FeeBreakdown } from './FeeBreakdown';
import { HoldCountdown } from './HoldCountdown';
import { HoldStateNotice } from './HoldStateNotice';
import { PartySizePicker } from './PartySizePicker';
import { useBooking, useRoundOfBooking } from './useBooking';
import { useCancelBooking } from './useCancelBooking';

const TITLE: Partial<Record<BookingStatus, string>> = { Held: 'Your table is held', Expired: 'Hold expired', Cancelled: 'Booking cancelled', Confirmed: 'Booking confirmed', 'Checked-in': 'Checked in' };

/** The held table (UC-01 steps 8–11, AF-4, EF-1): the countdown in the app bar, the booking summary, the party size
 *  with its fee, Continue and Cancel hold. A fresh hold has no party size yet: the screen sets it to the table's
 *  capacity once, so the stepper and the fee start from there (step 10 is the customer's change of it). */
export function HoldSummaryScreen() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { query, booking: b, remaining, held } = useBooking(id);
  const { round, table } = useRoundOfBooking(b);
  const r = round.data;

  const putPartySize = (partySize: number) => api.put<Booking>(`/api/bookings/${id}/party-size`, { partySize });
  const setSize = useMutate<number, Booking>(putPartySize, { success: (u) => `Party size set to ${u.partySize}`, failure: 'Could not change the party size', invalidate: [['booking', id]] });
  const defaultSize = useMutate<number, Booking>(putPartySize, { failure: 'Could not set the party size', invalidate: [['booking', id]] });
  const defaulted = useRef(false);
  useEffect(() => {
    if (!b || b.status !== 'Held' || b.partySize != null || defaulted.current) return;
    defaulted.current = true;
    defaultSize.mutate(b.capacity ?? 1);
  }, [b]);   // eslint-disable-line react-hooks/exhaustive-deps

  const label = tableLabel(b?.zoneId, b?.tableNumber);
  const { ask, busy: cancelling } = useCancelBooking(id, { what: 'hold', onCancelled: (c) => navigate(paths.round(c.roundId ?? '')) });
  const cancel = () => ask({ title: 'Cancel the hold?', message: `Table ${label} will be released and may be taken by someone else.`, confirmLabel: 'Release the table', cancelLabel: 'Keep the hold' });

  const busy = setSize.isPending || defaultSize.isPending || cancelling;
  const size = b?.partySize ?? b?.capacity ?? 1;
  const extraFee = b?.fee?.extraPersonFee ?? r?.parameters?.extraPersonFee;
  const extra = b?.fee?.extraPersons ?? Math.max(0, size - (b?.capacity ?? size));
  const holdMinutes = r?.holdPeriodMinutes ?? r?.parameters?.holdPeriodMinutes ?? 15;

  return (
    <Screen title={(b?.status && TITLE[b.status]) ?? 'Your booking'} pageTitle="Your booking" back={b?.roundId ? paths.round(b.roundId) : paths.rounds} right={<HoldCountdown remaining={remaining} held={held} />}>
      {query.isPending && <Loading what="Loading your booking" />}
      {query.isError && <LoadError error={query.error} retry={() => void query.refetch()} what="load your booking" />}
      {round.isError && <LoadError error={round.error} retry={() => void round.refetch()} what="load the round" />}
      {b && (
        <>
          <HoldStateNotice booking={b} held={held} />
          <BookingSummaryCard booking={b} round={r} table={table} />
          <PartySizePicker value={size} capacity={b.capacity} extra={extra} extraFee={extraFee} disabled={!held || busy} onChange={(v) => setSize.mutate(v)} />
          <Divider />
          <FeeBreakdown fee={b.fee} packagePrice={table?.packagePrice} />
          <Button variant="primary" block onClick={() => navigate(paths.profile(id))} disabled={!held || !b.fee || busy}>Continue</Button>
          <Button block onClick={cancel} disabled={b.status !== 'Held'} busy={cancelling}>Cancel hold</Button>
          <div className="tiny" style={{ marginTop: 8 }}>
            The table is held for you for {holdMinutes} minutes{held ? ` (until ${fmtClock(b.holdEndsAt)})` : ''}. If the hold expires before payment, it returns to the map.
          </div>
        </>
      )}
    </Screen>
  );
}
