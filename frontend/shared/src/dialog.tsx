// The confirm dialog before anything destructive: `await confirm({ title, message, confirmLabel, danger })` answers
// true or false; the ConfirmDialogHost renders the one open dialog (role dialog, aria-modal) and the tests find it.
import { useEffect, useRef } from 'react';
import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';

export interface ConfirmOptions { title: string; message?: string; confirmLabel?: string; cancelLabel?: string; danger?: boolean }
interface Pending extends ConfirmOptions { resolve: (ok: boolean) => void }
interface DialogState { pending: Pending | null; open: (p: Pending) => void; close: (ok: boolean) => void }

export const dialogStore = createStore<DialogState>((set, get) => ({
  pending: null,
  open: (pending) => { get().pending?.resolve(false); set({ pending }); },
  close: (ok) => { get().pending?.resolve(ok); set({ pending: null }); },
}));

/** Asks the user; resolves when a button is pressed (false on Escape or the backdrop). */
export const confirm = (options: ConfirmOptions): Promise<boolean> =>
  new Promise((resolve) => dialogStore.getState().open({ ...options, resolve }));

export function ConfirmDialogHost() {
  const pending = useStore(dialogStore, (s) => s.pending);
  const close = useStore(dialogStore, (s) => s.close);
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!pending) return;
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [pending, close]);
  if (!pending) return null;
  return (
    <div className="dialog-bg" onMouseDown={(e) => { if (e.target === e.currentTarget) close(false); }}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby={pending.message ? 'dialog-message' : undefined}>
        <h2 id="dialog-title">{pending.title}</h2>
        {pending.message && <p id="dialog-message">{pending.message}</p>}
        <div className="dialog-actions">
          <button type="button" className="btn secondary" onClick={() => close(false)}>{pending.cancelLabel ?? 'Cancel'}</button>
          <button type="button" ref={first} className={`btn ${pending.danger ? 'danger' : 'primary'}`} onClick={() => close(true)}>{pending.confirmLabel ?? 'Confirm'}</button>
        </div>
      </div>
    </div>
  );
}
