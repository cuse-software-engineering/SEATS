import type { ReactNode } from 'react';
import type { ValidationResult as Outcome } from '@seats/frontend-shared';
import { plural } from '../app/format';

/** The validation box of the zone map and round editors: "Validation result · 2 problems" with the list, or
 *  "no problems", and a line on what the result opens (Activate, Publish). The result stays in its box. */
export function ValidationResult({ result, hint }: { result: Outcome; hint: ReactNode }) {
  const problems = result.problems ?? [];
  const ok = Boolean(result.valid) && problems.length === 0;
  return (
    <div className={`vbox${ok ? ' ok' : ''}`} data-testid="validation" role="status">
      <div className="t">Validation result · {ok ? 'no problems' : plural(problems.length, 'problem')}</div>
      {problems.length > 0 && <ul>{problems.map((p, i) => <li key={i}>{p}</li>)}</ul>}
      <div className="tiny" style={{ marginTop: 4 }}>{hint}</div>
    </div>
  );
}
