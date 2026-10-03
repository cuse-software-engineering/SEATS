import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, type ApiError, type Booking, ErrorAlert, mmss, type PaymentRequest, type PaymentStatus, poll, toApiError, useAction } from '@seats/frontend-shared';
import { Screen } from '../Screen';
import { thb } from '../format';
import { useHeldBooking } from '../hooks';

/** C7 Payment (UC-01 step 15; UC-10): the amount, the hosted checkout of the Payment Gateway with PromptPay QR
 *  selected, the result polled every 2 s, Cancel the booking. In progress 1 POST /api/bookings/{id}/payment answers
 *  501: the notice takes the place of the QR and the layout stays. */
export default function C7Payment() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { booking, remaining, held } = useHeldBooking(id);
  const action = useAction();
  const [payment, setPayment] = useState<PaymentRequest | null>(null);
  const [status, setStatus] = useState<PaymentStatus | null>(null);
  const [notBuilt, setNotBuilt] = useState<ApiError | null>(null);
  const [startError, setStartError] = useState<ApiError | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    api.post<PaymentRequest>(`/api/bookings/${id}/payment`).then(setPayment, (e: unknown) => {
      const err = toApiError(e);
      if (err.status === 501) setNotBuilt(err); else setStartError(err);
    });
  }, [id]);

  // With a real Payment Service: the status is polled until the result (UC-10 steps 5–7).
  useEffect(() => {
    if (!payment?.paymentId) return;
    return poll<PaymentStatus>(`/api/payments/${payment.paymentId}`, 2000, (s) => {
      setStatus(s);
      if (s.status === 'Paid') navigate(`/bookings/${id}/confirmation`);
    }, setStartError);
  }, [payment?.paymentId, id, navigate]);

  const cancel = async () => {
    const cancelled = await action.run(() => api.post<Booking>(`/api/bookings/${id}/cancel`));
    if (cancelled) navigate('/');
  };

  const Method = ({ name }: { name: string }) => <label className="check-line" style={{ margin: 0 }}><input type="checkbox" disabled />{name}</label>;

  return (
    <Screen title="Payment" back={`/bookings/${id}/terms`} right={held ? <span data-testid="countdown">{mmss(remaining ?? 0)}</span> : undefined}>
      <ErrorAlert error={booking.error} />
      <ErrorAlert error={startError} />
      <ErrorAlert error={action.error} onClose={action.clear} />
      <div className="row">
        <span className="muted">Amount to pay</span>
        <span className="b" style={{ fontSize: 18 }} data-testid="amount">{thb(booking.data?.fee?.fullTableFee)}</span>
      </div>
      <div className="card thick">
        <div className="row"><span className="b">Hosted checkout</span><span className="tiny">Payment Gateway</span></div>
        <div className="hr" />
        <div className="row">
          <label className="check-line" style={{ margin: 0 }}><input type="checkbox" checked readOnly />PromptPay QR</label>
          <span className="tiny">selected</span>
        </div>
        {notBuilt && (
          <div className="notice" data-testid="payment-notice">
            <strong>The Payment Gateway comes with progress 2.</strong> The gateway answered {notBuilt.status}: {notBuilt.error}.{' '}
            <Link to={`/bookings/${id}/confirmation`}>Preview the confirmation screen</Link>.
          </div>
        )}
        {payment?.checkoutUrl && (
          <>
            <div className="qr small" role="img" aria-label="PromptPay QR" />
            <div className="tiny" style={{ textAlign: 'center' }}>Scan with your banking app · <a href={payment.checkoutUrl} target="_blank" rel="noreferrer">open the checkout</a></div>
          </>
        )}
        {!notBuilt && !payment && !startError && (
          <>
            <div className="qr small" style={{ opacity: 0.35 }} aria-hidden="true" />
            <div className="tiny" style={{ textAlign: 'center' }}>Starting the payment…</div>
          </>
        )}
        <div className="hr" />
        <div><Method name="Credit / debit card" /></div>
        <div style={{ marginTop: 6 }}><Method name="Mobile banking" /></div>
        <div style={{ marginTop: 6 }}><Method name="E-wallet" /></div>
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <span className="muted">{payment ? `Waiting for the payment result… ${status?.status ? `(${status.status})` : ''}` : notBuilt ? 'No payment to wait for in progress 1.' : 'Starting the payment…'}</span>
        {payment && <span className="tiny">checked every 2 s</span>}
      </div>
      <button type="button" className="btn secondary" onClick={cancel} disabled={action.busy}>Cancel the booking</button>
      <div className="tiny" style={{ marginTop: 8 }}>Pay before the hold expires. The confirmation appears here automatically once the payment is received.</div>
    </Screen>
  );
}
