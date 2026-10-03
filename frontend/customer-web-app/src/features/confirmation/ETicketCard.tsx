import { type Booking, Card, Divider, type ETicket, KeyValue, type Round, type RoundTable, tableLabel } from '@seats/frontend-shared';
import { extraPersons, fmtClock, roundTitle, typeLabel, zoneLabel } from '../../app/format';

/** "SEATS-260926-A12-····": the shape of a booking reference while there is no e-ticket yet. */
const placeholderReference = (date: string | undefined, label: string): string => `SEATS-${(date ?? '').replace(/-/g, '').slice(2, 8) || '······'}-${label || '··'}-····`;

/** The e-ticket: the QR, the booking reference and the booking details (round, table, party size, check-in). */
export function ETicketCard({ booking: b, round: r, table, ticket, unavailable }: { booking: Booking | undefined; round: Round | undefined; table: RoundTable | undefined; ticket: ETicket | undefined; unavailable: boolean }) {
  const label = tableLabel(b?.zoneId, b?.tableNumber);
  const extra = b?.fee?.extraPersons ?? 0;
  const w = r?.checkInWindow;
  return (
    <Card className="center">
      <div className="tiny">E-TICKET</div>
      <div className="qr" role="img" aria-label="e-ticket QR" />
      <div className="mono" style={{ fontSize: 13 }} data-testid="booking-reference">{ticket?.bookingReference ?? placeholderReference(r?.date, label)}</div>
      {unavailable && (
        <div className="notice" style={{ textAlign: 'left' }} data-testid="eticket-notice">
          <strong>The e-ticket is not available yet.</strong> It is issued with the payment; this is how it will look.
        </div>
      )}
      <Divider />
      {b && (
        <KeyValue rows={[
          ['Round', roundTitle(r)],
          ['Table', `${label} · ${zoneLabel(b.zoneId, b.zoneName)} · ${typeLabel(table ?? b)}`],
          ['Party size', `${b.partySize ?? '–'}${extra > 0 ? ` (${extraPersons(extra)} paid)` : ''}`],
          ['Check-in', w ? `from ${fmtClock(w.opensAt)} · table kept until ${fmtClock(w.graceEndsAt)}` : '–'],
        ]} />
      )}
    </Card>
  );
}
