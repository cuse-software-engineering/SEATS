import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { SeatsLogo } from '@seats/frontend-shared';
import { AppMenu } from './AppMenu';
import { usePageTitle } from './usePageTitle';

/** The app bar of every screen: a back chevron, the SEATS wordmark, the bold title, a right slot (the hold countdown
 *  on the booking screens) and the ⋮ menu; then the content column. The browser tab takes the title too. */
export function Screen({ title, pageTitle, back, right, children, padTop }: { title: ReactNode; pageTitle?: string; back?: string; right?: ReactNode; children: ReactNode; padTop?: number }) {
  usePageTitle(pageTitle ?? (typeof title === 'string' ? title : undefined));
  return (
    <>
      <header className="appbar">
        {back && <Link to={back} className="back" aria-label="Back">‹</Link>}
        <SeatsLogo className="logo" height={14} />
        <h1>{title}</h1>
        <span className="right">{right}</span>
        <AppMenu />
      </header>
      <div className="content" style={padTop !== undefined ? { paddingTop: padTop } : undefined}>{children}</div>
    </>
  );
}
