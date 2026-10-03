import { useEffect } from 'react';
import { VENUE } from './venue';

/** The browser tab: "Concert rounds · La Loy Bar"; the venue alone when a screen has no title yet. */
export function usePageTitle(title?: string): void {
  useEffect(() => {
    document.title = title ? `${title} · ${VENUE.name}` : `${VENUE.name} · SEATS Booking`;
  }, [title]);
}
