import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  api, Badge, Button, confirm, EmptyState, fmtDay, LoadError, Loading, type Removed, type Round, toast, useMutate, useSession,
  type ValidationResult as Outcome,
} from '@seats/frontend-shared';
import { plural } from '../../app/format';
import { keys, useActiveZoneMaps, useRound, useRounds, useRoundTables, useTableTypes, useZoneMap } from '../../app/queries';
import { queryClient } from '../../app/query-client';
import { usePageTitle } from '../../app/use-page-title';
import { ValidationResult } from '../../components/ValidationResult';
import { changedFields, formErrors, useRoundEditor } from './editor-state';
import { PriceMatrix } from './PriceMatrix';
import { RoundDetailsForm } from './RoundDetailsForm';
import { RoundList } from './RoundList';
import { RoundPreview } from './RoundPreview';
import { RoundZoneMapPanel } from './RoundZoneMapPanel';
import { TablesForSalePanel } from './TablesForSalePanel';

/** The round editor in three columns: every round of the venue; the concert details, the zone map with the tables
 *  not for sale and the tables for sale per zone; the price matrix, the validation result, the preview and
 *  Save draft · Validate · Preview · Publish · Discard. Publish opens once the saved round passes validation;
 *  Validate saves the draft first. The round in the URL (?round=) survives a reload. */
export default function RoundsPage() {
  usePageTitle('Concert rounds');
  const canEdit = useSession()?.role === 'manager';
  const [params, setParams] = useSearchParams();
  const selected = params.get('round');
  const select = (id: string | null) => setParams(id ? { round: id } : {}, { replace: true });
  const rounds = useRounds();
  const activeMaps = useActiveZoneMaps();
  const types = useTableTypes();
  const round = useRound(selected);
  const editor = useRoundEditor(round.data);
  const zoneMap = useZoneMap(editor.form.zoneMapId || null);
  const [showPreview, setShowPreview] = useState(false);
  const preview = useRoundTables(showPreview ? selected : null);
  const id = selected ?? '';
  const r = round.data;
  const { form, dirty } = editor;

  const create = useMutate((name: string) => api.post<Round>('/api/rounds', { name: name || undefined }), {
    success: (created) => `Round "${created.name}" created`, failure: 'Could not create the round', invalidate: [keys.roundLists], onSuccess: (created) => select(created.id ?? null),
  });
  const save = useMutate(() => api.put<Round>(`/api/rounds/${id}`, r ? changedFields(form, r) : {}), {
    success: 'Saved', failure: 'Could not save', invalidate: [keys.roundLists, keys.roundTables(id)],
    onSuccess: (saved) => { editor.loadSaved(saved); queryClient.setQueryData(keys.round(id), saved); },
  });
  const validate = useMutate(async () => {
    if (dirty) { try { await save.mutateAsync(); } catch { return null; } }   // the save says why it failed
    return api.post<Outcome>(`/api/rounds/${id}/validate`);
  }, {
    failure: 'Could not validate',
    onSuccess: (result) => {
      if (!result) return;
      editor.setValidation(result);
      if (result.valid) toast.success('Validation passed'); else toast.info(`Validation found ${plural(result.problems?.length ?? 0, 'problem')}`);
    },
  });
  const publish = useMutate(() => api.post<Round>(`/api/rounds/${id}/publish`), {
    success: 'Round published', failure: 'Could not publish', invalidate: [keys.roundLists, keys.roundTables(id)],
    onSuccess: (published) => { editor.loadSaved(published); queryClient.setQueryData(keys.round(id), published); },
  });
  const discard = useMutate(() => api.delete<Removed>(`/api/rounds/${id}`), {
    success: 'Round discarded', failure: 'Could not discard', invalidate: [keys.roundLists], onSuccess: () => select(null),
  });
  const askDiscard = async () => {
    if (await confirm({ title: `Discard the draft "${r?.name || '(unnamed)'}"?`, message: 'The round is removed. This cannot be undone.', confirmLabel: 'Discard', danger: true })) discard.mutate();
  };

  const published = r?.status === 'Published';
  const locked = Boolean(published && r?.bookingOpenAt && new Date(r.bookingOpenAt) <= new Date());   // what a published round keeps once booking has opened
  const errors = formErrors(form);
  const busy = save.isPending || validate.isPending || publish.isPending || discard.isPending;
  const hint = published ? 'This round is published: customers can book it.' : `Validate ${dirty ? 'saves the draft and ' : ''}checks the times, the map and the prices; Publish opens once the round passes.`;
  const validationHint = !editor.validation?.valid ? 'Publish opens once the round passes validation.'
    : published ? `The round is valid and published; no other published round overlaps ${fmtDay(form.date)}.`
      : `Times are in order and no published round overlaps ${fmtDay(form.date)}. Publish is open.`;

  return (
    <div className="editor">
      <RoundList rounds={rounds} selected={selected} onSelect={select} onCreate={(name) => create.mutate(name)} creating={create.isPending} canEdit={canEdit} />
      {!selected && <div className="col-main"><EmptyState title="No round open" hint={rounds.data?.length ? 'Choose a round on the left, or create a new one.' : canEdit ? 'Create your first concert round with the form on the left.' : 'There is no round yet.'} /></div>}
      {selected && round.isLoading && <div className="col-main"><Loading what="Loading the round" /></div>}
      {selected && round.isError && <div className="col-main"><LoadError error={round.error} retry={() => void round.refetch()} what="load the round" /></div>}
      {r && (
        <>
          <div className="col-details">
            <div className="editor-head">
              <span className="name" data-testid="round-head">
                {r.name || '(unnamed)'} <Badge fill={published}>{r.status}</Badge>
                {dirty ? <Badge hatch>Unsaved changes</Badge> : editor.saved ? <Badge ok>Saved</Badge> : null}
              </span>
            </div>
            <RoundDetailsForm form={form} errors={errors} round={r} onChange={editor.edit} disabled={!canEdit} locked={locked} />
            <RoundZoneMapPanel zoneMapId={form.zoneMapId} activeMaps={activeMaps.data ?? []} zoneMap={zoneMap.data} types={types.data ?? []} tablesNotForSale={form.tablesNotForSale}
              onChangeMap={(zoneMapId) => editor.edit({ zoneMapId, tablesNotForSale: [], prices: [] })} onMark={editor.mark} onUnmark={editor.unmark} disabled={!canEdit || locked} />
            {activeMaps.isError && <LoadError error={activeMaps.error} retry={() => void activeMaps.refetch()} what="load the zone maps" />}
            {zoneMap.isError && <LoadError error={zoneMap.error} retry={() => void zoneMap.refetch()} what="load the zone map" />}
            <TablesForSalePanel zoneMap={zoneMap.data} tablesNotForSale={form.tablesNotForSale} />
          </div>
          <div className="col-main">
            <PriceMatrix zoneMap={zoneMap.data} types={types.data ?? []} prices={form.prices} onChange={editor.setPrice} disabled={!canEdit || locked} />
            <div className="cols-2">
              <div style={{ flex: 1, minWidth: 160 }}>
                {editor.validation ? <ValidationResult result={editor.validation} hint={validationHint} /> : <div className="tiny" style={{ marginTop: 10 }}>{hint}</div>}
              </div>
              <button type="button" className="placeholder preview-box" onClick={() => setShowPreview((s) => !s)} aria-pressed={showPreview} title="the table map as the customer sees it">
                Preview:<br />as the customer<br />sees it
              </button>
            </div>
            {showPreview && <RoundPreview tables={preview} dirty={dirty} />}
            <div className="btnrow">
              <Button onClick={() => save.mutate()} disabled={!canEdit || !dirty || busy} busy={save.isPending}>{published ? 'Save' : 'Save draft'}</Button>
              <Button onClick={() => validate.mutate()} disabled={!canEdit || busy} busy={validate.isPending}>Validate</Button>
              <Button onClick={() => setShowPreview((s) => !s)} aria-pressed={showPreview}>Preview</Button>
              <Button variant="primary" onClick={() => publish.mutate()} disabled={!canEdit || busy || published || dirty || !editor.validation?.valid} busy={publish.isPending}>Publish</Button>
              {!published && <Button variant="danger" onClick={() => void askDiscard()} disabled={!canEdit || busy} busy={discard.isPending}>Discard</Button>}
              {published && <span className="tiny">Only a draft can be discarded.</span>}
            </div>
            {!canEdit && <div className="notice">You are signed in as the Owner: the rounds are shown for reading only.</div>}
          </div>
        </>
      )}
    </div>
  );
}
