import { useEffect } from 'react';

/** The browser tab names the screen: "Zone maps · SEATS back-office". */
export function usePageTitle(title: string): void {
  useEffect(() => {
    document.title = `${title} · SEATS back-office`;
  }, [title]);
}
