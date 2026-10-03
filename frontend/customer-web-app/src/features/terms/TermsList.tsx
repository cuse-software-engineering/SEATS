/** "Full payment confirms the booking; there is no deposit…" → the bold lead clause and the rest, as the wireframe
 *  prints a term: up to the first ".", ";" or ":" followed by a space, else up to a parenthesis, else all bold. */
function splitTerm(text: string): [string, string] {
  const clause = /^(.*?[.;:])\s+(.*)$/s.exec(text);
  if (clause) return [clause[1], clause[2]];
  const paren = /^(.*?)\s+(\(.*)$/s.exec(text);
  if (paren) return [paren[1], paren[2]];
  return [text, ''];
}

/** The numbered booking terms with the check-in window, the lead of each in bold. */
export function TermsList({ terms }: { terms: string[] }) {
  return (
    <ol className="terms-list" data-testid="terms">
      {terms.map((t, i) => {
        const [lead, rest] = splitTerm(t);
        return <li key={i}><b>{lead}</b>{rest ? ` ${rest}` : ''}</li>;
      })}
    </ol>
  );
}
