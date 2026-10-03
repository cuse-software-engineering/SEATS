// The zone map editor of the Back-office Web App beyond the use-case flows: zones and tables added, a table's type
// and capacity changed in the properties panel, a table removed through the dialog, the per-zone summary following
// every change, validation naming a missing table type, activation with its toast, an active map refusing a
// discard, and a draft map discarded through the dialog.
import { expect, test, type APIRequestContext } from '@playwright/test';
import { managerApi, ROUND2, SOFA6, tag } from '../helpers/seed';
import { addTable, addZone, canvasTables, confirmDialog, expectToast, mapHead, mapItem, newMap, openScreen, properties, saveMap, setTable, validateMap, zoneRows } from '../helpers/backoffice';
import { signInAsManager, tableButton } from '../helpers/ui';

const t = tag();
let api: APIRequestContext;

test.beforeAll(async () => {
  api = await managerApi();   // the two table types every run uses
  for (const ty of [SOFA6, ROUND2]) expect((await api.put(`/api/table-types/${ty.id}`, { data: { name: ty.name, capacity: ty.capacity } })).ok()).toBeTruthy();
});
test.afterAll(async () => { await api.dispose(); });
test.beforeEach(async ({ page }) => {
  await signInAsManager(page);
  await openScreen(page, 'Zone maps');
});

const row = (page: Parameters<typeof zoneRows>[0], i: number) => zoneRows(page).nth(i);
const cell = (page: Parameters<typeof zoneRows>[0], i: number, col: number) => row(page, i).locator('td').nth(col);

test('zones and tables are added, a table is retyped, resized and removed, the summary follows, validation names a missing type, activation and the refusal of a discard', async ({ page }) => {
  const name = `E2E ${t} editor hall`;
  await newMap(page, name);
  await expect(page.getByText('Add a zone, then place tables in it')).toBeVisible();

  // a zone: the summary has its row with no table yet
  await addZone(page, 'Front stage');
  await expect(zoneRows(page)).toHaveCount(1);
  await expect(row(page, 0)).toContainText('Zone A · Front stage');
  await expect(cell(page, 0, 1)).toHaveText('0');
  await expect(cell(page, 0, 2)).toHaveText('–');

  // two tables: the summary counts them and their seats; the canvas labels them A1 and A2
  await addTable(page, { number: 1, zone: 'A', type: SOFA6.id, capacity: 6 });
  await expect(cell(page, 0, 1)).toHaveText('1');
  await expect(cell(page, 0, 2)).toHaveText('6');
  await addTable(page, { number: 2, zone: 'A', type: ROUND2.id, capacity: 2 });
  await expect(canvasTables(page)).toHaveCount(2);
  await expect(tableButton(page, 2, 'available')).toContainText('A2');
  await expect(cell(page, 0, 1)).toHaveText('2');
  await expect(cell(page, 0, 2)).toHaveText('8');

  // the type of table 2 changes in the properties panel: the capacity follows the type, then is set by hand
  await expect(properties(page)).toContainText('selected A2');
  await properties(page).getByLabel('Table type').selectOption(SOFA6.id);
  await expect(properties(page).getByLabel('Capacity')).toHaveValue('6');
  await expect(cell(page, 0, 2)).toHaveText('12');
  await properties(page).getByLabel('Capacity').fill('5');
  await expect(cell(page, 0, 2)).toHaveText('11');

  // table 2 removed through the dialog: the canvas, the summary and the panel follow
  await properties(page).getByRole('button', { name: 'Remove table' }).click();
  await confirmDialog(page, 'Remove table A2?', 'Remove');
  await expect(canvasTables(page)).toHaveCount(1);
  await expect(cell(page, 0, 1)).toHaveText('1');
  await expect(cell(page, 0, 2)).toHaveText('6');
  await expect(properties(page)).toContainText('no table selected');

  // a table without a type and capacity: the panel says so; Save says Saved and the list counts the tables
  await addTable(page, { number: 3, zone: 'A', type: null, capacity: null });
  await expect(properties(page)).toContainText('Choose a table type');
  await expect(properties(page)).toContainText('At least 1 seat');
  await expect(cell(page, 0, 1)).toHaveText('2');
  await saveMap(page);
  await expect(mapItem(page, name)).toContainText('2 tables');

  // validation lists the missing type (and capacity); Activate stays closed
  const validation = await validateMap(page);
  await expectToast(page, 'Validation found 2 problems');
  await expect(validation).toContainText('Validation result · 2 problems');
  await expect(validation).toContainText('table 3 has no table type');
  await expect(validation).toContainText('table 3 has no seating capacity');
  await expect(page.getByRole('button', { name: 'Activate' })).toBeDisabled();

  // corrected, the map validates and activates with its toast; an active map has no Discard and says why
  await tableButton(page, 3, 'available').click();
  await setTable(page, { number: 3, zone: 'A', type: ROUND2.id, capacity: 2 });
  await expect(cell(page, 0, 2)).toHaveText('8');
  await validateMap(page);
  await expectToast(page, 'Saved');
  await expectToast(page, 'Validation passed');
  await expect(validation).toContainText('Validation result · no problems');
  await page.getByRole('button', { name: 'Activate' }).click();
  await expectToast(page, 'Zone map activated');
  await expect(mapHead(page)).toContainText('Active');
  await expect(mapItem(page, name)).toContainText('Active');
  await expect(page.getByRole('button', { name: 'Discard' })).toHaveCount(0);
  await expect(page.getByText('An active map cannot be discarded')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Activate' })).toBeDisabled();
});

test('a draft map is discarded through the confirm dialog', async ({ page }) => {
  const name = `E2E ${t} throwaway map`;
  await newMap(page, name);
  await page.getByRole('button', { name: 'Discard' }).click();
  await confirmDialog(page, `Discard the draft "${name}"?`, 'Cancel');
  await expect(mapHead(page)).toContainText(name);
  await page.getByRole('button', { name: 'Discard' }).click();
  await confirmDialog(page, `Discard the draft "${name}"?`, 'Discard');
  await expectToast(page, 'Zone map discarded');
  await expect(mapItem(page, name)).toHaveCount(0);
  await expect(page.getByText('No zone map open')).toBeVisible();
});
