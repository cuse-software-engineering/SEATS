// UC-04 Create Venue Zone Map (Section 2.2.4) on the Back-office Web App, screen B2; the table types (FR-37) too.
// The screen is laid out as the wireframe (Table D.11): the map list, the map canvas with one shape per table, the
// properties card of the selected table, the tables and capacity per zone, the table types.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { tag } from '../helpers/seed';
import { signInAsManager, tableButton } from '../helpers/ui';

const t = tag();
const TYPE = { id: `e2e-sofa4-${t}`, name: `E2E sofa 4 ${t}`, capacity: 4 };

test.beforeEach(async ({ page }) => {
  await signInAsManager(page);
  await page.getByRole('link', { name: 'Zone maps' }).click();
  await expect(page.getByRole('heading', { name: 'Zone maps' })).toBeVisible();
});

/** UC-04 steps 1–2: a new, empty map editor. */
async function newMap(page: Page, name: string): Promise<void> {
  await page.getByPlaceholder('New map name').fill(name);
  await page.getByRole('button', { name: '+ New map' }).click();
  const head = page.getByTestId('map-head');
  await expect(head).toContainText(name);
  await expect(head).toContainText('Draft');
  await expect(page.getByTestId('zone-summary').locator('tbody tr')).toHaveCount(0);
}

const properties = (page: Page): Locator => page.getByTestId('table-properties');
const zoneRows = (page: Page): Locator => page.getByTestId('zone-summary').locator('tbody tr');
const canvasTables = (page: Page): Locator => page.getByTestId('map-canvas').getByRole('button', { name: /^table \d+, / });

/** A zone added with its name in the "Tables and capacity per zone" card. */
async function addZone(page: Page, name: string): Promise<void> {
  await page.getByLabel('new zone name').fill(name);
  await page.getByRole('button', { name: '+ Add zone' }).click();
}

/** The selected table set in the properties card: number, zone, table type, capacity. */
async function setTable(page: Page, o: { number: number; zone: string; type: string | null; capacity: number | null }): Promise<void> {
  const card = properties(page);
  await card.getByLabel('Number').fill(String(o.number));
  await card.getByLabel('Zone', { exact: true }).selectOption(o.zone);
  await card.getByLabel('Table type').selectOption(o.type === null ? { label: '—' } : o.type);
  await card.getByLabel('Capacity').fill(o.capacity === null ? '' : String(o.capacity));
}

/** A new table placed on the map (it is selected) and set in the properties card. */
async function addTable(page: Page, o: { number: number; zone: string; type: string | null; capacity: number | null }): Promise<void> {
  await page.getByRole('button', { name: '+ Add table', exact: true }).click();
  await expect(properties(page)).toContainText('selected');
  await setTable(page, o);
}

test('UC-04 basic flow Create Venue Zone Map', async ({ page }) => {
  // precondition: the venue's table types are known; define one (FR-37) in the "Table types" card
  const types = page.getByTestId('table-types');
  await types.getByRole('button', { name: '+ Add table type' }).click();
  await types.getByLabel('Id', { exact: true }).fill(TYPE.id);
  await types.getByLabel('Name', { exact: true }).fill(TYPE.name);
  await types.getByLabel('Capacity').fill(String(TYPE.capacity));
  await types.getByLabel('Package content').fill('a bottle and four mixers');
  await types.getByRole('button', { name: 'Define table type' }).click();
  const typeRow = types.locator('tbody tr').filter({ hasText: TYPE.name });
  await expect(typeRow).toContainText(String(TYPE.capacity));
  await expect(typeRow).toContainText('a bottle and four mixers');

  // steps 1–2
  const name = `E2E hall ${t}`;
  await newMap(page, name);

  // step 3: the image of the venue (the media upload is a stub in progress 1); the canvas names it
  await page.getByPlaceholder(/venue image file name/).fill('main-hall.png');
  await page.getByRole('button', { name: 'Upload image' }).click();
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
  await page.getByRole('button', { name: 'Save', exact: true }).click();

  // step 7: the number of tables and the capacity of each zone
  await expect(zoneRows(page)).toHaveCount(2);
  await expect(zoneRows(page).nth(0)).toContainText('Front stage');
  await expect(zoneRows(page).nth(0).locator('td').nth(1)).toHaveText('2');
  await expect(zoneRows(page).nth(0).locator('td').nth(2)).toHaveText('8');
  await expect(zoneRows(page).nth(1)).toContainText('Bar');
  await expect(zoneRows(page).nth(1).locator('td').nth(1)).toHaveText('1');
  await expect(zoneRows(page).nth(1).locator('td').nth(2)).toHaveText('4');
  await expect(page.locator('.list .it').filter({ hasText: name })).toContainText('3 tables');

  // steps 8–9: validation passes, and only then Activate opens
  await expect(page.getByRole('button', { name: 'Activate' })).toBeDisabled();
  await page.getByRole('button', { name: 'Validate' }).click();
  await expect(page.getByTestId('validation')).toContainText('Validation result · no problems');
  await expect(page.getByRole('button', { name: 'Activate' })).toBeEnabled();

  // steps 11–12: Active, and so selectable in UC-03
  await page.getByRole('button', { name: 'Activate' }).click();
  await expect(page.getByTestId('map-head')).toContainText('Active');
  await expect(page.getByRole('button', { name: 'Activate' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Discard' })).toHaveCount(0);
  await expect(page.locator('.list .it').filter({ hasText: name })).toContainText('Active');
  await page.getByRole('link', { name: 'Concert rounds' }).click();
  await page.getByPlaceholder('New round name').fill(`E2E ${t} map check`);   // B3 shows the zone map choice of a round
  await page.getByRole('button', { name: '+ New round' }).click();
  await expect(page.getByLabel('Zone map', { exact: true })).toContainText(`${name} (Active, 3 tables)`);
});

test('UC-04 EF-1 Validation Fails', async ({ page }) => {
  const name = `E2E bad map ${t}`;
  await newMap(page, name);

  // an unnamed zone, two tables with the same number, one with no table type and no capacity
  await addZone(page, '');
  await expect(zoneRows(page).nth(0)).toContainText('(no name)');
  await page.getByRole('button', { name: '+ Add table', exact: true }).click();
  const typeId = await properties(page).getByLabel('Table type').locator('option').nth(1).getAttribute('value');   // any defined table type
  expect(typeId).toBeTruthy();
  await setTable(page, { number: 1, zone: 'A', type: typeId, capacity: 4 });
  await addTable(page, { number: 1, zone: 'A', type: null, capacity: null });
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(zoneRows(page)).toHaveCount(1);
  await expect(zoneRows(page).nth(0).locator('td').nth(1)).toHaveText('2');

  // EF-1 step 1: the invalid zones and tables with the reason; Activate stays closed
  await page.getByRole('button', { name: 'Validate' }).click();
  const validation = page.getByTestId('validation');
  await expect(validation).toContainText('Validation result · 4 problems');
  await expect(validation).toContainText('zone A has no name');
  await expect(validation).toContainText('table number 1 is used twice');
  await expect(validation).toContainText('table 1 has no table type');
  await expect(validation).toContainText('table 1 has no seating capacity');
  await expect(validation.locator('li')).toHaveCount(4);
  await expect(page.getByRole('button', { name: 'Activate' })).toBeDisabled();
  await expect(page.getByTestId('map-head')).toContainText('Draft');

  // EF-1 steps 2–3: corrected (the zone named in its row, the second table renumbered and typed), the map validates
  await zoneRows(page).nth(0).click();
  await page.getByLabel('Name of zone A').fill('Front stage');
  await expect(zoneRows(page).nth(0)).toContainText('Zone A · Front stage');
  await tableButton(page, 1, 'available').nth(1).click();   // the second table numbered 1
  await setTable(page, { number: 2, zone: 'A', type: typeId, capacity: 4 });
  await page.getByRole('button', { name: 'Validate' }).click();   // saves the draft, then validates it
  await expect(validation).toContainText('Validation result · no problems');
  await expect(page.getByRole('button', { name: 'Activate' })).toBeEnabled();
});
