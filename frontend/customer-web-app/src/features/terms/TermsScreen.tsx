import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, type Booking, type BookingTerms, Button, Card, Checkbox, LoadError, Loading, useGet, useMutate } from '@seats/frontend-shared';
import { paths } from '../../app/paths';
import { thb } from '../../app/format';
import { Screen } from '../../app/Screen';
import { HoldCountdown } from '../booking/HoldCountdown';
import { HoldStateNotice } from '../booking/HoldStateNotice';
import { useBooking } from '../booking/useBooking';
import { useCancelBooking } from '../booking/useCancelBooking';
import { TermsList } from './TermsList';

/** The booking terms (UC-01 steps 13–14): the numbered terms with the check-in window, the acceptance box, Pay with
 *  the full table fee (records the acceptance, then the payment), or Decline and cancel. */
export function TermsScreen() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { booking, remaining, held } = useBooking(id);
  const terms = useGet<BookingTerms>(['terms', id], `/api/bookings/${id}/terms`);
  const [accepted, setAccepted] = useState(false);
  useEffect(() => { if (booking?.termsAccepted) setAccepted(true); }, [booking?.termsAccepted]);
  const amount = booking?.fee?.fullTableFee;

  const accept = useMutate<void, Booking>(() => api.post<Booking>(`/api/bookings/${id}/terms-acceptance`), {
    success: 'Terms accepted', failure: 'Could not record your acceptance', invalidate: [['booking', id]], onSuccess: () => navigate(paths.payment(id)),
  });
  const { ask, busy: cancelling } = useCancelBooking(id, { what: 'booking', onCancelled: () => navigate(paths.rounds) });
  const decline = () => ask({ title: 'Decline the terms?', message: 'Your booking will be cancelled and the table released.', confirmLabel: 'Decline and cancel', cancelLabel: 'Keep the booking' });

  return (
    <Screen title="Booking terms" back={paths.profile(id)} right={<HoldCountdown remaining={remaining} held={held} />}>
      {booking && <HoldStateNotice booking={booking} held={held} />}
      <Card>
        {terms.isPending && <Loading what="Loading the terms" />}
        {terms.isError && <LoadError error={terms.error} retry={() => void terms.refetch()} what="load the terms" />}
        {terms.data && <TermsList terms={terms.data.terms ?? []} />}
      </Card>
      <Checkbox label="I have read and accept the booking terms" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} disabled={!held} />
      <Button variant="primary" block onClick={() => accept.mutate()} disabled={!accepted || !held || !terms.data || amount === undefined || cancelling} busy={accept.isPending}>Pay {thb(amount)}</Button>
      <Button block onClick={decline} disabled={!booking || booking.status !== 'Held' || accept.isPending} busy={cancelling}>Decline the terms and cancel the booking</Button>
      <div className="tiny" style={{ marginTop: 8 }}>The terms are sent again with your e-ticket.</div>
    </Screen>
  );
}
