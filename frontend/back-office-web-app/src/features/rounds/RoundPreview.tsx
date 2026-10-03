import { Card, fmtTHB, LoadError, Loading, TableGrid } from '@seats/frontend-shared';
import type { useRoundTables } from '../../app/queries';

/** The preview of the saved round as the customer sees it: the shapes labelled A1… with the price line of each zone. */
export function RoundPreview({ tables, dirty }: { tables: ReturnType<typeof useRoundTables>; dirty: boolean }) {
  return (
    <Card title={<>Preview: as the customer sees it{dirty ? <span className="tiny"> · of the saved draft, not of your unsaved changes</span> : null}</>} data-testid="preview">
      {tables.isLoading && <Loading what="Loading the preview" />}
      {tables.isError && <LoadError error={tables.error} retry={() => void tables.refetch()} what="load the preview" />}
      {tables.data && (
        <TableGrid tables={tables.data} size={0.85}
          zoneFooter={(z) => {
            const lines = new Map<string, string>();
            for (const t of z.tables) if (t.forSale !== false && t.tableTypeId && !lines.has(t.tableTypeId)) lines.set(t.tableTypeId, `${t.tableTypeName ?? t.tableTypeId} ${fmtTHB(t.packagePrice)}`);
            return <div className="tiny">{[...lines.values()].join(' · ') || 'no table for sale'}</div>;
          }} />
      )}
    </Card>
  );
}
