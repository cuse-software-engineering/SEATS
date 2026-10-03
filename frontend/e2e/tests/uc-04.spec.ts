// UC-04 Create Venue Zone Map (Section 2.2.4) on the Back-office Web App, the zone map editor; the table types too.
// The screen is laid out as the wireframe (Table D.11): the map list, the map canvas with one shape per table, the
// properties card of the selected table, the tables and capacity per zone, the table types. Every click is checked
// by what it says (the toast, the badge, the validation box).
import { expect, test } from '@playwright/test';
import { tag } from '../helpers/seed';
import { addTable, addZone, canvasTables, expectToast, mapHead, mapItem, newMap, openScreen, properties, saveMap, setTable, validateMap, zoneRows } from '../helpers/backoffice';
import { signInAsManager, tableButton } from '../helpers/ui';

const t = tag();
const TYPE = { id: `e2e-sofa4-${t}`, name: `E2E sofa 4 ${t}`, capacity: 4 };

test.beforeEach(async ({ page }) => {
  await signInAsManager(page);
  await openScreen(page, 'Zone maps');
});

test('UC-04 basic flow Create Venue Zone Map', async ({ page }) => {
  // precondition: the venue's table types are known; define one in the "Table types" card
  const types = page.getByTestId('table-types');
  await types.getByRole('button', { name: '+ Add table type' }).click();
  await types.getByLabel('Id', { exact: true }).fill(TYPE.id);
  await types.getByLabel('Name', { exact: true }).fill(TYPE.name);
  await types.getByLabel('Capacity').fill(String(TYPE.capacity));
  await types.getByLabel('Package content').fill('a bottle and four mixers');
  await types.getByRole('button', { name: 'Define table type' }).click();
  await expectToast(page, `Table type "${TYPE.name}" defined`);
  const typeRow = types.locator('tbody tr').filter({ hasText: TYPE.name });
  await expect(typeRow).toContainText(String(TYPE.capacity));
  await expect(typeRow).toContainText('a bottle and four mixers');

  // steps 1–2
  const name = `E2E hall ${t}`;
  await newMap(page, name);

  // step 3: the image of the venue (by its file name for now); the canvas names it and the toast confirms it
  await page.getByPlaceholder(/venue image file name/).fill('main-hall.png');
  await page.getByRole('button', { name: 'Upload image' }).click();
  await expectToast(page, 'Venue image uploaded');
  await expect(page.getByText(/^venue image: /)).toContainText('main-hall.png');

  // step 4: two named zones
  await addZone(page, 'Front stage');
  await addZone(page, 'Bar');
  await expect(zoneRows(page)).toHaveCount(2);
  await expect(zoneRows(page).nth(0)).toContainText('Zone A · Front stage');
  await expect(zoneRows(page).nth(1)).toContainText('Zone B · Bar');

  // steps 5–6: three tables placed on the map, each with number, zone, table type and capacity; labelled A1, A2, B3
  await addTable(page, { number: 1, zone: 'A', type: TYPE.id, capacity: 4 });
  await addTable(page, { number: 2, zone: 'A', type: TYPE.id, capacity: 4 });
  await addTable(page, { number: 3, zone: 'B', type: TYPE.id, capacity: 4 });
  await expect(canvasTables(page)).toHaveCount(3);
  await expect(tableButton(page, 3, 'available')).toContainText('B3');
  await saveMap(page);

  // step 7: the number of tables and the capacity of each zone
  await expect(zoneRows(page)).toHaveCount(2);
  await expect(zoneRows(page).nth(0)).toContainText('Front stage');
  await expect(zoneRows(page).nth(0).locator('td').nth(1)).toHaveText('2');
  await expect(zoneRows(page).nth(0).locator('td').nth(2)).toHaveText('8');
  await expect(zoneRows(page).nth(1)).toContainText('Bar');
  await expect(zoneRows(page).nth(1).locator('td').nth(1)).toHaveText('1');
  await expect(zoneRows(page).nth(1).locator('td').nth(2)).toHaveText('4');
  await expect(mapItem(page, name)).toContainText('3 tables');

  // steps 8–9: validation passes (the box and the toast say so), and only then Activate opens
  await expect(page.getByRole('button', { name: 'Activate' })).toBeDisabled();
  const validation = await validateMap(page);
  await expectToast(page, 'Validation passed');
  await expect(validation).toContainText('Validation result · no problems');
  await expect(validation).toContainText('Activate makes it available');
  await expect(page.getByRole('button', { name: 'Activate' })).toBeEnabled();

  // steps 11–12: Active with its toast; no Discard any more; the list shows the badge; and so selectable for a round
  await page.getByRole('button', { name: 'Activate' }).click();
  await expectToast(page, 'Zone map activated');
  await expect(mapHead(page)).toContainText('Active');
  await expect(page.getByRole('button', { name: 'Activate' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Discard' })).toHaveCount(0);
  await expect(page.getByText('An active map cannot be discarded')).toBeVisible();
  await expect(mapItem(page, name)).toContainText('Active');
  await openScreen(page, 'Concert rounds');
  await page.getByPlaceholder('New round name').fill(`E2E ${t} map check`);   // the round editor offers the Active maps
  await page.getByRole('button', { name: '+ New round' }).click();
  await expectToast(page, `Round "E2E ${t} map check" created`);
  await expect(page.getByLabel('Zone map', { exact: true })).toContainText(`${name} (Active, 3 tables)`);
});

test('UC-04 EF-1 Validation Fails', async ({ page }) => {
  const name = `E2E bad map ${t}`;
  await newMap(page, name);

  // an unnamed zone (its name field says so), two tables with the same number (the second says so), one with no table type and no capacity
  await addZone(page, '');
  await expect(zoneRows(page).nth(0)).toContainText('(no name)');
  await expect(page.getByText('Give the zone a name')).toBeVisible();
  await page.getByRole('button', { name: '+ Add table', exact: true }).click();
  const typeId = await properties(page).getByLabel('Table type').locator('option').nth(1).getAttribute('value');   // any defined table type
  expect(typeId).toBeTruthy();
  await setTable(page, { number: 1, zone: 'A', type: typeId, capacity: 4 });
  await addTable(page, { number: 1, zone: 'A', type: null, capacity: null });
  await expect(properties(page)).toContainText('Number 1 is used by another table');
  await expect(properties(page)).toContainText('Choose a table type');
  await expect(properties(page)).toContainText('At least 1 seat');
  await saveMap(page);
  await expect(zoneRows(page)).toHaveCount(1);
  await expect(zoneRows(page).nth(0).locator('td').nth(1)).toHaveText('2');

  // EF-1 step 1: the invalid zones and tables with the reason; Activate stays closed
  const validation = await validateMap(page);
  await expectToast(page, 'Validation found 4 problems');
  await expect(validation).toContainText('Validation result · 4 problems');
  await expect(validation).toContainText('zone A has no name');
  await expect(validation).toContainText('table number 1 is used twice');
  await expect(validation).toContainText('table 1 has no table type');
  await expect(validation).toContainText('table 1 has no seating capacity');
  await expect(validation.locator('li')).toHaveCount(4);
  await expect(validation).toContainText('Activate opens once the map passes validation');
  await expect(page.getByRole('button', { name: 'Activate' })).toBeDisabled();
  await expect(mapHead(page)).toContainText('Draft');

  // EF-1 steps 2–3: corrected (the zone named in its row, the second table renumbered and typed), the map validates
  await zoneRows(page).nth(0).click();
  await page.getByLabel('Name of zone A').fill('Front stage');
  await expect(zoneRows(page).nth(0)).toContainText('Zone A · Front stage');
  await tableButton(page, 1, 'available').nth(1).click();   // the second table numbered 1
  await setTable(page, { number: 2, zone: 'A', type: typeId, capacity: 4 });
  await expect(properties(page)).not.toContainText('is used by another table');
  await expect(mapHead(page)).toContainText('Unsaved changes');
  await validateMap(page);   // saves the draft, then validates it
  await expectToast(page, 'Saved');
  await expectToast(page, 'Validation passed');
  await expect(validation).toContainText('Validation result · no problems');
  await expect(page.getByRole('button', { name: 'Activate' })).toBeEnabled();
});
