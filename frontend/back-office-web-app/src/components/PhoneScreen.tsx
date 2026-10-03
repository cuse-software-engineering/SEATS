import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

/** The front staff's phone screen: an app bar (with a back link and something at the right) over a content column. */
export function PhoneScreen({ title, back, right, children, testId }: { title: ReactNode; back?: string; right?: ReactNode; children: ReactNode; testId?: string }) {
  return (
    <div className="phone-screen" data-testid={testId}>
      <div className="appbar">
        {back && <Link className="back" to={back} aria-label="back to the scanner">‹</Link>}
        <span>{title}</span>
        {right && <span className="right">{right}</span>}
      </div>
      <div className="content">{children}</div>
    </div>
  );
}
