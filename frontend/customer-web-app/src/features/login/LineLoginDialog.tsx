import { type FormEvent, useState } from 'react';
import { Button, Field, TextInput } from '@seats/frontend-shared';
import { VENUE } from '../../app/venue';

export const DEMO_USER = 'U-demo';

/** The LINE Login consent dialog, with the demo id field in place of LINE's own sign-in: Allow logs in as that id
 *  (the demo id when left empty), Cancel clears the field and stays on the chat. */
export function LineLoginDialog({ onAllow, onCancel }: { onAllow: (userId: string) => void; onCancel: () => void }) {
  const [userId, setUserId] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onAllow(userId.trim() || DEMO_USER);
  };
  return (
    <>
      <div className="modal-bg" />
      <form className="modal" role="dialog" aria-labelledby="line-login-title" onSubmit={submit}>
        <h2 id="line-login-title">LINE Login</h2>
        <div className="muted" style={{ margin: '4px 0 8px' }}>SEATS Booking ({VENUE.name}) wants to use:</div>
        <div>• your LINE profile name<br />• your LINE user ID</div>
        <div className="tiny" style={{ marginTop: 6 }}>No separate registration: one LINE account is one customer.</div>
        <Field label="LINE user id" hint="Any id works here; it stands in for your LINE account.">
          {(id) => <TextInput id={id} value={userId} onChange={(e) => setUserId(e.target.value)} placeholder={`${DEMO_USER} (demo login)`} autoFocus autoComplete="off" />}
        </Field>
        <Button type="submit" className="line" block size="sm">Allow</Button>
        <Button type="button" block size="sm" onClick={() => { setUserId(''); onCancel(); }}>Cancel</Button>
      </form>
    </>
  );
}
