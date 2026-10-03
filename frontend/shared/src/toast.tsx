// Toasts: the message every action answers with ("Round published", "Could not save: …"). A Zustand store, so a
// mutation helper can speak without a hook; the ToastStack renders them (role status, aria-live) and the tests
// assert them after each click.
import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';

export type ToastKind = 'success' | 'error' | 'info';
export interface Toast { id: number; kind: ToastKind; message: string }
interface ToastState { items: Toast[]; push: (kind: ToastKind, message: string, ms?: number) => void; dismiss: (id: number) => void }

let next = 1;
export const toastStore = createStore<ToastState>((set) => ({
  items: [],
  push: (kind, message, ms = kind === 'error' ? 8000 : 4500) => {
    const id = next++;
    set((s) => ({ items: [...s.items, { id, kind, message }] }));
    setTimeout(() => set((s) => ({ items: s.items.filter((t) => t.id !== id) })), ms);
  },
  dismiss: (id) => set((s) => ({ items: s.items.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (message: string) => toastStore.getState().push('success', message),
  error: (message: string) => toastStore.getState().push('error', message),
  info: (message: string) => toastStore.getState().push('info', message),
};

export function ToastStack() {
  const items = useStore(toastStore, (s) => s.items);
  const dismiss = useStore(toastStore, (s) => s.dismiss);
  return (
    <div className="toast-stack" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`toast ${t.kind}`} role={t.kind === 'error' ? 'alert' : 'status'} data-testid="toast">
          <span>{t.message}</span>
          <button type="button" className="toast-close" aria-label="Dismiss" onClick={() => dismiss(t.id)}>×</button>
        </div>
      ))}
    </div>
  );
}
