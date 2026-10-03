import { type FormEvent, useState } from 'react';
import { Badge, Button, type GridTable, TableGrid, TextInput, type ZoneMap } from '@seats/frontend-shared';
import type { MapDraft } from './editor-state';

/** The middle of the zone map editor: the map's name and status, the canvas (the stage, one dashed box per zone,
 *  one shape per table over the venue image placeholder; a click selects a table) and the venue image row. */
export function ZoneMapCanvas({ map, draft, gridTables, selected, onSelect, onUpload, uploading, canEdit }: {
  map: ZoneMap; draft: MapDraft; gridTables: GridTable[]; selected?: number; onSelect: (t: GridTable) => void; onUpload: (fileName: string) => void; uploading: boolean; canEdit: boolean;
}) {
  const [fileName, setFileName] = useState('');
  const upload = (e: FormEvent) => { e.preventDefault(); if (fileName.trim()) { onUpload(fileName.trim()); setFileName(''); } };
  return (
    <>
      <div className="editor-head">
        <span className="name" data-testid="map-head">
          {map.name || '(unnamed)'} <Badge fill={map.status === 'Active'}>{map.status}</Badge>
          {draft.dirty ? <Badge hatch>Unsaved changes</Badge> : draft.saved ? <Badge ok>Saved</Badge> : null}
        </span>
        <span className="tiny">{draft.zones.length === 0 ? 'Add a zone, then place tables in it' : 'Click a table to edit it in the properties panel'}</span>
      </div>
      <div className="map-canvas" data-testid="map-canvas">
        <TableGrid tables={gridTables} zones={draft.zones.map((z) => ({ id: z.id ?? '', name: z.name }))} selected={selected} onSelect={onSelect} />
        <span className="venue-image" title={map.imageUrl}>venue image: {map.imageUrl ? map.imageUrl.split('/').pop() : 'none yet'}</span>
      </div>
      <form className="btnrow upload" onSubmit={upload}>
        <TextInput value={fileName} onChange={(e) => setFileName(e.target.value)} placeholder="venue image file name, e.g. main-hall.png" aria-label="venue image file name" disabled={!canEdit} />
        <Button type="submit" disabled={!canEdit || !fileName.trim()} busy={uploading}>Upload image</Button>
      </form>
    </>
  );
}
