import { api, type Booking, confirm, type ConfirmOptions, tableLabel, useMutate } from '@seats/frontend-shared';

/** Cancelling a booking (UC-01 AF-4, AF-5, AF-6), always behind a confirm dialog: `ask(options)` opens it and cancels
 *  on Confirm; the toast names the released table. */
export function useCancelBooking(id: string, { what, onCancelled }: { what: 'hold' | 'booking'; onCancelled?: (b: Booking) => void }) {
  const cancel = useMutate<void, Booking>(() => api.post<Booking>(`/api/bookings/${id}/cancel`), {
    success: (b) => `${what === 'hold' ? 'Hold' : 'Booking'} cancelled. Table ${tableLabel(b.zoneId, b.tableNumber)} is available again.`,
    failure: `Could not cancel the ${what}`,
    invalidate: [['booking', id], ['my-bookings'], ['rounds']],
    onSuccess: onCancelled,
  });
  const ask = async (options: ConfirmOptions): Promise<void> => {
    if (await confirm({ danger: true, ...options })) cancel.mutate();
  };
  return { ask, busy: cancel.isPending };
}
