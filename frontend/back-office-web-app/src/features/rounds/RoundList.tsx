import { type FormEvent, useState } from 'react';
import { Badge, Button, EmptyState, LoadError, Loading, TextInput } from '@seats/frontend-shared';
import { roundWhen } from '../../app/format';
import type { useRounds } from '../../app/queries';

/** The left column of the round editor: the new-round form and every round of the venue, newest first, with its status. */
export function RoundList({ rounds, selected, onSelect, onCreate, creating, canEdit }: {
  rounds: ReturnType<typeof useRounds>; selected: string | null; onSelect: (id: string) => void; onCreate: (name: string) => void; creating: boolean; canEdit: boolean;
}) {
  const [name, setName] = useState('');
  const create = (e: FormEvent) => { e.preventDefault(); onCreate(name.trim()); setName(''); };
  return (
    <div className="list col-list">
      <h1>Concert rounds</h1>
      {canEdit && (
        <form className="new" onSubmit={create}>
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="New round name" aria-label="New round name" />
          <Button type="submit" size="sm" block busy={creating}>+ New round</Button>
        </form>
      )}
      {rounds.isLoading && <Loading what="Loading the rounds" />}
      {rounds.isError && <LoadError error={rounds.error} retry={() => void rounds.refetch()} what="load the rounds" />}
      {rounds.data?.length === 0 && <EmptyState title="No round yet" hint={canEdit ? 'Create the first one above.' : 'The Manager creates them.'} />}
      <div className="items">
        {rounds.data?.map((r) => (
          <button key={r.id} type="button" className={`it${r.id === selected ? ' cur' : ''}`} data-testid="round-item" data-round={r.id} onClick={() => r.id && onSelect(r.id)} aria-current={r.id === selected || undefined}>
            <div className="name">{r.name || '(unnamed)'}</div>
            <div className="tiny">{roundWhen(r)}{r.artist ? ` · ${r.artist}` : ''}</div>
            <Badge fill={r.status === 'Published'}>{r.status}</Badge>
          </button>
        ))}
      </div>
    </div>
  );
}
