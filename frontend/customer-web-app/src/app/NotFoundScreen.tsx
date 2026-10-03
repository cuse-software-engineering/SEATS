import { Link } from 'react-router-dom';
import { EmptyState } from '@seats/frontend-shared';
import { paths } from './paths';
import { Screen } from './Screen';

/** Any address that is not a screen: say so and offer the way home. */
export function NotFoundScreen() {
  return (
    <Screen title="Page not found" back={paths.rounds}>
      <EmptyState
        title="There is no screen at this address."
        hint="The link may be old or mistyped."
        action={<Link className="btn primary" to={paths.rounds}>Go to the concert rounds</Link>}
      />
    </Screen>
  );
}
