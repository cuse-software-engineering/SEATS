import { Link } from 'react-router-dom';
import { Card, Divider, type PaymentRequest } from '@seats/frontend-shared';

const Method = ({ name }: { name: string }) => <label className="check-line" style={{ margin: 0 }}><input type="checkbox" disabled />{name}</label>;

/** The hosted checkout of the Payment Gateway with PromptPay QR selected: the QR once the payment has started, a
 *  notice in its place while the payment step is not available, and the other methods greyed out. */
export function HostedCheckoutCard({ payment, unavailable, starting, previewTo }: { payment: PaymentRequest | null; unavailable: boolean; starting: boolean; previewTo: string }) {
  return (
    <Card thick>
      <div className="row"><span className="b">Hosted checkout</span><span className="tiny">Payment Gateway</span></div>
      <Divider />
      <div className="row">
        <label className="check-line" style={{ margin: 0 }}><input type="checkbox" checked readOnly />PromptPay QR</label>
        <span className="tiny">selected</span>
      </div>
      {unavailable && (
        <div className="notice" data-testid="payment-notice">
          <strong>The payment step is not available yet.</strong> The venue is still connecting its payment gateway, so nothing is charged and this booking cannot be paid for now.{' '}
          <Link to={previewTo}>Preview the confirmation screen</Link>.
        </div>
      )}
      {payment?.checkoutUrl && (
        <>
          <div className="qr small" role="img" aria-label="PromptPay QR" />
          <div className="tiny" style={{ textAlign: 'center' }}>Scan with your banking app · <a href={payment.checkoutUrl} target="_blank" rel="noreferrer">open the checkout</a></div>
        </>
      )}
      {starting && (
        <>
          <div className="qr small" style={{ opacity: 0.35 }} aria-hidden="true" />
          <div className="tiny" style={{ textAlign: 'center' }}>Starting the payment…</div>
        </>
      )}
      <Divider />
      <div><Method name="Credit / debit card" /></div>
      <div style={{ marginTop: 6 }}><Method name="Mobile banking" /></div>
      <div style={{ marginTop: 6 }}><Method name="E-wallet" /></div>
    </Card>
  );
}
