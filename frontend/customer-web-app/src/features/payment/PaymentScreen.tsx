import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, Button, describeError, LoadError, Loading, type PaymentRequest, type PaymentStatus, tableLabel, useMutate, usePolled } from '@seats/frontend-shared';
import { paths } from '../../app/paths';
import { thb } from '../../app/format';
import { Screen } from '../../app/Screen';
import { HoldCountdown } from '../booking/HoldCountdown';
import { HoldStateNotice } from '../booking/HoldStateNotice';
import { useBooking } from '../booking/useBooking';
import { useCancelBooking } from '../booking/useCancelBooking';
import { HostedCheckoutCard } from './HostedCheckoutCard';

/** The payment (UC-01 step 15; UC-10): the amount, the hosted checkout with PromptPay QR selected, the result
 *  polled every 2 s, Cancel the booking. While the Payment Service is not there the gateway refuses to start a
 *  payment: the notice takes the place of the QR and the layout stays. */
export function PaymentScreen() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { query, booking, remaining, held } = useBooking(id);
  const [payment, setPayment] = useState<PaymentRequest | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  const start = useMutate<void, PaymentRequest>(() => api.post<PaymentRequest>(`/api/bookings/${id}/payment`), {
    quiet: (e) => e.status === 501,   // the screen explains that case itself
    failure: 'Could not start the payment',
    onSuccess: (p) => setPayment(p),
    onError: (e) => { if (e.status === 501) setUnavailable(true); else setFailed(describeError(e)); },
  });
  const started = useRef(false);
  useEffect(() => {
    if (started.current || !held) return;
    started.current = true;
    start.mutate();
  }, [held]);   // eslint-disable-line react-hooks/exhaustive-deps

  // with a real Payment Service the status is polled until the result (UC-10 steps 5–7)
  const status = usePolled<PaymentStatus>(payment?.paymentId ? `/api/payments/${payment.paymentId}` : null, 2000);
  useEffect(() => { if (status.data?.status === 'Paid') navigate(paths.confirmation(id)); }, [status.data?.status, id, navigate]);

  const label = tableLabel(booking?.zoneId, booking?.tableNumber);
  const { ask, busy: cancelling } = useCancelBooking(id, { what: 'booking', onCancelled: () => navigate(paths.rounds) });
  const cancel = () => ask({ title: 'Cancel the booking?', message: `Table ${label} will be released and nothing is charged.`, confirmLabel: 'Yes, cancel it', cancelLabel: 'Keep the booking' });

  const waiting = payment ? `Waiting for the payment result…${status.data?.status ? ` (${status.data.status})` : ''}` : unavailable ? 'No payment to wait for.' : failed ? 'The payment did not start.' : start.isPending ? 'Starting the payment…' : '';
  return (
    <Screen title="Payment" back={paths.terms(id)} right={<HoldCountdown remaining={remaining} held={held} />}>
      {query.isPending && <Loading what="Loading your booking" />}
      {query.isError && <LoadError error={query.error} retry={() => void query.refetch()} what="load your booking" />}
      {booking && <HoldStateNotice booking={booking} held={held} />}
      <div className="row">
        <span className="muted">Amount to pay</span>
        <span className="b amount" data-testid="amount">{thb(booking?.fee?.fullTableFee)}</span>
      </div>
      <HostedCheckoutCard payment={payment} unavailable={unavailable} starting={!payment && !unavailable && !failed} previewTo={paths.confirmation(id)} />
      {failed && <div className="alert" role="alert">The payment could not be started: {failed}. <Button variant="link" onClick={() => { setFailed(null); start.mutate(); }}>Try again</Button></div>}
      <div className="row" style={{ marginTop: 8 }}>
        <span className="muted">{waiting}</span>
        {payment && <span className="tiny">checked every 2 s</span>}
      </div>
      <Button block onClick={cancel} disabled={!booking || booking.status !== 'Held'} busy={cancelling}>Cancel the booking</Button>
      <div className="tiny" style={{ marginTop: 8 }}>Pay before the hold expires. The confirmation appears here automatically once the payment is received.</div>
    </Screen>
  );
}
