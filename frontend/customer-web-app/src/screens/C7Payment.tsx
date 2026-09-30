import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, type ApiError, type Booking, ErrorAlert, fmtTHB, type PaymentRequest, type PaymentStatus, poll, toApiError, useAction, useLoad } from '@seats/frontend-shared';

/** C7 Payment (UC-01 step 15; UC-10): the amount, the hosted checkout of the Payment Gateway, Cancel. In progress 1
 *  POST /api/bookings/{id}/payment answers 501, shown as "Payment comes in progress 2". */
export default function C7Payment() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const booking = useLoad(() => api.get<Booking>(`/api/bookings/${id}`), [id]);
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

  return (
    <>
      <h1>Payment</h1>
      <ErrorAlert error={booking.error} />
      <ErrorAlert error={startError} />
      <ErrorAlert error={action.error} onClose={action.clear} />
      <div className="card">
        <h4>Amount</h4>
        <p className="countdown">{fmtTHB(booking.data?.fee?.fullTableFee)}</p>
        {notBuilt && (
          <div className="notice" data-testid="payment-notice">
            <strong>Payment comes in progress 2.</strong> The gateway answered {notBuilt.status}: {notBuilt.error}
          </div>
        )}
        {payment?.checkoutUrl && (
          <p>Checkout: <a href={payment.checkoutUrl} target="_blank" rel="noreferrer">{payment.checkoutUrl}</a> · status {status?.status ?? 'Pending'}…</p>
        )}
        {!notBuilt && !payment && !startError && <p className="muted">Starting the payment…</p>}
        <div className="row">
          <button type="button" className="secondary" onClick={cancel} disabled={action.busy}>Cancel the booking</button>
          <Link className="btn secondary" to={`/bookings/${id}`}>Back to the summary</Link>
          {notBuilt && <Link className="btn secondary" to={`/bookings/${id}/confirmation`}>Show the confirmation screen (preview)</Link>}
        </div>
      </div>
    </>
  );
}
