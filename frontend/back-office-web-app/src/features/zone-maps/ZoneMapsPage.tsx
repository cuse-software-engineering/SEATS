import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  api, Button, confirm, EmptyState, type GridTable, LoadError, Loading, type Removed, tableLabel, toast, useMutate, useSession,
  type ValidationResult as Outcome, type ZoneMap,
} from '@seats/frontend-shared';
import { plural, zoneTitle } from '../../app/format';
import { keys, useTableTypes, useZoneMap, useZoneMaps } from '../../app/queries';
import { queryClient } from '../../app/query-client';
import { usePageTitle } from '../../app/use-page-title';
import { ValidationResult } from '../../components/ValidationResult';
import { tableProblems, useZoneMapEditor, zoneRows } from './editor-state';
import { TablePropertiesPanel } from './TablePropertiesPanel';
import { TableTypesPanel } from './TableTypesPanel';
import { ZoneMapCanvas } from './ZoneMapCanvas';
import { ZoneMapList } from './ZoneMapList';
import { ZoneSummaryPanel } from './ZoneSummaryPanel';

/** The zone map editor in three columns: the list of maps; the canvas with Upload image, Save, Validate, Activate,
 *  Discard and the validation result; the properties of the selected table, the tables and capacity per zone and
 *  the table types. The map in the URL (?map=) survives a reload. Activate opens once the saved map passes
 *  validation; Validate saves the draft first. */
export default function ZoneMapsPage() {
  usePageTitle('Zone maps');
  const canEdit = useSession()?.role === 'manager';
  const [params, setParams] = useSearchParams();
  const selected = params.get('map');
  const select = (id: string | null) => setParams(id ? { map: id } : {}, { replace: true });
  const maps = useZoneMaps();
  const types = useTableTypes();
  const map = useZoneMap(selected);
  const editor = useZoneMapEditor(map.data);
  const id = selected ?? '';
  const m = map.data;
  const { draft } = editor;

  const create = useMutate((name: string) => api.post<ZoneMap>('/api/zone-maps', { name: name || undefined }), {
    success: (created) => `Zone map "${created.name}" created`, failure: 'Could not create the map', invalidate: [keys.zoneMaps], onSuccess: (created) => select(created.id ?? null),
  });
  const save = useMutate(() => api.put<ZoneMap>(`/api/zone-maps/${id}`, { name: m?.name, zones: draft.zones, tables: draft.tables }), {
    success: 'Saved', failure: 'Could not save', invalidate: [keys.zoneMaps],
    onSuccess: (saved) => { editor.loadSaved(saved); queryClient.setQueryData(keys.zoneMap(id), saved); },
  });
  const upload = useMutate((fileName: string) => api.post<ZoneMap>(`/api/zone-maps/${id}/image`, { fileName }), {
    success: 'Venue image uploaded', failure: 'Could not upload the image', invalidate: [keys.zoneMap(id)],
  });
  const validate = useMutate(async () => {
    if (draft.dirty) { try { await save.mutateAsync(); } catch { return null; } }   // the save says why it failed
    return api.post<Outcome>(`/api/zone-maps/${id}/validate`);
  }, {
    failure: 'Could not validate',
    onSuccess: (result) => {
      if (!result) return;
      editor.setValidation(result);
      if (result.valid) toast.success('Validation passed'); else toast.info(`Validation found ${plural(result.problems?.length ?? 0, 'problem')}`);
    },
  });
  const activate = useMutate(() => api.post<ZoneMap>(`/api/zone-maps/${id}/activate`), {
    success: 'Zone map activated', failure: 'Could not activate', invalidate: [keys.zoneMaps, keys.zoneMap(id)],
  });
  const discard = useMutate(() => api.delete<Removed>(`/api/zone-maps/${id}`), {
    success: 'Zone map discarded', failure: 'Could not discard', invalidate: [keys.zoneMaps], onSuccess: () => select(null),
  });

  const askDiscard = async () => {
    if (await confirm({ title: `Discard the draft "${m?.name || '(unnamed)'}"?`, message: 'The map, its zones and its tables are removed. This cannot be undone.', confirmLabel: 'Discard', danger: true })) discard.mutate();
  };
  const askRemoveTable = async () => {
    const cur = editor.current;
    if (!cur) return;
    if (await confirm({ title: `Remove table ${tableLabel(cur.zoneId, cur.tableNumber)}?`, message: 'The table is taken off the map; Save makes it final.', confirmLabel: 'Remove', danger: true })) editor.removeTable();
  };
  const askRemoveZone = async (zoneId: string) => {
    const z = draft.zones.find((x) => x.id === zoneId);
    if (!z) return;
    const n = draft.tables.filter((t) => t.zoneId === zoneId).length;
    if (await confirm({ title: `Remove ${zoneTitle(z)}?`, message: n ? `Its ${plural(n, 'table')} stay on the map without a zone; Save makes it final.` : 'Save makes it final.', confirmLabel: 'Remove', danger: true })) editor.removeZone(zoneId);
  };

  const typeList = types.data ?? [];
  const gridTables: GridTable[] = useMemo(
    () => draft.tables.map((t) => ({ ...t, zoneName: draft.zones.find((z) => z.id === t.zoneId)?.name, tableTypeName: typeList.find((ty) => ty.id === t.tableTypeId)?.name })),
    [draft.tables, draft.zones, typeList],
  );
  const cur = editor.current;
  const busy = save.isPending || validate.isPending || activate.isPending || discard.isPending;
  const hint = m?.status === 'Active'
    ? 'This map is active: a concert round can use it.'
    : `Validate ${draft.dirty ? 'saves your changes and ' : ''}checks the map; Activate opens once it passes.`;
  const validationHint = !editor.validation?.valid ? 'Activate opens once the map passes validation.'
    : m?.status === 'Active' ? 'The map is valid and active.' : 'The map is valid: Activate makes it available to concert rounds.';

  return (
    <div className="editor">
      <ZoneMapList maps={maps} selected={selected} onSelect={select} onCreate={(name) => create.mutate(name)} creating={create.isPending} canEdit={canEdit} />
      <div className="col-main">
        {!selected && <EmptyState title="No zone map open" hint={maps.data?.length ? 'Choose a map on the left, or create a new one.' : canEdit ? 'Create your first zone map with the form on the left.' : 'There is no zone map yet.'} />}
        {selected && map.isLoading && <Loading what="Loading the map" />}
        {selected && map.isError && <LoadError error={map.error} retry={() => void map.refetch()} what="load the map" />}
        {m && (
          <>
            <ZoneMapCanvas map={m} draft={draft} gridTables={gridTables} selected={cur?.tableNumber}
              onSelect={(t) => { const i = gridTables.indexOf(t); if (i >= 0) editor.setSel(i); }}
              onUpload={(f) => upload.mutate(f)} uploading={upload.isPending} canEdit={canEdit} />
            <div className="btnrow">
              <Button onClick={() => save.mutate()} disabled={!canEdit || !draft.dirty || busy} busy={save.isPending}>Save</Button>
              <Button onClick={() => validate.mutate()} disabled={!canEdit || busy} busy={validate.isPending}>Validate</Button>
              <Button variant="primary" onClick={() => activate.mutate()} disabled={!canEdit || busy || m.status === 'Active' || draft.dirty || !editor.validation?.valid} busy={activate.isPending}>Activate</Button>
              {m.status === 'Draft' && <Button variant="danger" onClick={() => void askDiscard()} disabled={!canEdit || busy} busy={discard.isPending}>Discard</Button>}
              {m.status === 'Active' && <span className="tiny">An active map cannot be discarded.</span>}
            </div>
            {editor.validation ? <ValidationResult result={editor.validation} hint={validationHint} /> : <div className="tiny" style={{ marginTop: 8 }}>{hint}</div>}
            {!canEdit && <div className="notice">You are signed in as the Owner: the maps are shown for reading only.</div>}
          </>
        )}
      </div>
      <div className="col-side">
        <TablePropertiesPanel table={cur} label={cur ? tableLabel(cur.zoneId, cur.tableNumber) : ''} zones={draft.zones} types={typeList} problems={tableProblems(draft, editor.sel, typeList)}
          onChange={editor.setCurrent} onAdd={editor.addTable} onRemove={() => void askRemoveTable()} canAdd={Boolean(m)} canEdit={canEdit} />
        <ZoneSummaryPanel rows={zoneRows(draft)} zones={draft.zones} selected={editor.selZone} onSelect={editor.setSelZone} onRename={editor.renameZone}
          onRemove={(zoneId) => void askRemoveZone(zoneId)} onAdd={editor.addZone} canEdit={canEdit} enabled={Boolean(m)} />
        <TableTypesPanel types={types} canEdit={canEdit} />
      </div>
    </div>
  );
}
