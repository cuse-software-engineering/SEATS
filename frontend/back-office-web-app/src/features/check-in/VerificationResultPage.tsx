import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api, type Booking, useMutate } from '@seats/frontend-shared';
import { usePageTitle } from '../../app/use-page-title';
import { PhoneScreen } from '../../components/PhoneScreen';
import { EntryConfirmed } from './EntryConfirmed';
import type { ScanState } from './scan-state';
import { VerificationResult } from './VerificationResult';

/** The two states of the result screen on one phone screen: the verification result with Confirm entry, then
 *  "Checked in" with the mini map and Next scan. */
export default function VerificationResultPage() {
  usePageTitle('Verification result');
  const scan = useLocation().state as ScanState | null;
  const [checkedIn, setCheckedIn] = useState<{ booking: Booking; at: string } | null>(null);
  const confirmEntry = useMutate(() => api.post<Booking>('/api/check-ins', { bookingReference: scan?.reference }), {
    success: 'Entry confirmed', failure: 'Could not confirm the entry', onSuccess: (booking) => setCheckedIn({ booking, at: new Date().toISOString() }),
  });

  if (!scan) {
    return (
      <PhoneScreen title="Verification result" back="/check-in">
        <div className="muted">No scan yet. <Link to="/check-in">Scan a ticket</Link>.</div>
      </PhoneScreen>
    );
  }
  if (checkedIn) {
    return (
      <PhoneScreen title="Entry confirmed" testId="entry-confirmed">
        <EntryConfirmed booking={checkedIn.booking} at={checkedIn.at} />
      </PhoneScreen>
    );
  }
  return (
    <PhoneScreen title="Verification result" back="/check-in" testId="verification-result">
      <VerificationResult scan={scan} onConfirm={() => confirmEntry.mutate()} confirming={confirmEntry.isPending} />
    </PhoneScreen>
  );
}
