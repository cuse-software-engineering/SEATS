import { type FormEvent, useState } from 'react';
import { Badge, Button, EmptyState, LoadError, Loading, TextInput } from '@seats/frontend-shared';
import { plural } from '../../app/format';
import type { useZoneMaps } from '../../app/queries';

/** The left column of the zone map editor: the new-map form and one item per map with its status. */
export function ZoneMapList({ maps, selected, onSelect, onCreate, creating, canEdit }: {
  maps: ReturnType<typeof useZoneMaps>; selected: string | null; onSelect: (id: string) => void; onCreate: (name: string) => void; creating: boolean; canEdit: boolean;
}) {
  const [name, setName] = useState('');
  const create = (e: FormEvent) => { e.preventDefault(); onCreate(name.trim()); setName(''); };
  return (
    <div className="list col-list">
      <h1>Zone maps</h1>
      {canEdit && (
        <form className="new" onSubmit={create}>
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="New map name" aria-label="New map name" />
          <Button type="submit" size="sm" block busy={creating}>+ New map</Button>
        </form>
      )}
      {maps.isLoading && <Loading what="Loading the maps" />}
      {maps.isError && <LoadError error={maps.error} retry={() => void maps.refetch()} what="load the maps" />}
      {maps.data?.length === 0 && <EmptyState title="No zone map yet" hint={canEdit ? 'Create the first one above.' : 'The Manager creates them.'} />}
      <div className="items">
        {maps.data?.map((z) => (
          <button key={z.id} type="button" className={`it${z.id === selected ? ' cur' : ''}`} data-testid="map-item" data-map={z.id} onClick={() => z.id && onSelect(z.id)} aria-current={z.id === selected || undefined}>
            <div className="name">{z.name || '(unnamed)'}</div>
            <div className="tiny">{plural(z.tables ?? 0, 'table')}</div>
            <Badge fill={z.status === 'Active'}>{z.status}</Badge>
          </button>
        ))}
      </div>
    </div>
  );
}
