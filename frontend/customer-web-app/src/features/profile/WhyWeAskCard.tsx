import { Card, type CustomerProfile } from '@seats/frontend-shared';
import { fmtDayClock } from '../../app/format';

/** On the first booking, why the name and the phone are asked for (FR-10); later, that the stored details are shown
 *  to confirm or correct. */
export function WhyWeAskCard({ saved }: { saved: CustomerProfile | null }) {
  if (saved) {
    return (
      <Card soft title="Your saved details">
        <div className="muted">Stored on your first booking, consent given {fmtDayClock(saved.consentAt)}. Confirm or correct them below.</div>
      </Card>
    );
  }
  return (
    <Card soft title="Why we ask">
      <div className="muted">Your name and phone are used for this booking, its payment, check-in and contact about it only. They are collected once and pre-filled on your next booking.</div>
    </Card>
  );
}
