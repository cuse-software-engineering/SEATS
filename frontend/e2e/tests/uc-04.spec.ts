// UC-04 Create Venue Zone Map (Section 2.2.4) on the Back-office Web App, screen B2; the table types (FR-37) too.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { tag } from '../helpers/seed';
import { signInAsManager } from '../helpers/ui';

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
  await page.getByRole('button', { name: 'New map' }).click();
  const head = page.getByTestId('map-head');
  await expect(head).toContainText(name);
  await expect(head).toContainText('Draft');
  await expect(page.getByTestId('zones').locator('tbody tr')).toHaveCount(0);
}

const zoneRows = (page: Page): Locator => page.getByTestId('zones').locator('tbody tr');
const tableRows = (page: Page): Locator => page.getByTestId('tables').locator('tbody tr');

/** One table row of the editor: number, zone, table type, capacity. */
async function setTable(row: Locator, o: { number: number; zone: string; type: string | null; capacity: number | null }): Promise<void> {
  await row.getByRole('spinbutton').nth(0).fill(String(o.number));
  await row.locator('select').nth(0).selectOption(o.zone);
  await row.locator('select').nth(1).selectOption(o.type === null ? { label: '—' } : o.type);
  await row.getByRole('spinbutton').nth(1).fill(o.capacity === null ? '' : String(o.capacity));
}

test('UC-04 basic flow Create Venue Zone Map', async ({ page }) => {
  // precondition: the venue's table types are known; define one (FR-37)
  const types = page.locator('form').filter({ hasText: 'Table types (FR-37)' });
  await types.getByLabel('Id').fill(TYPE.id);
  await types.getByLabel('Name', { exact: true }).fill(TYPE.name);
  await types.getByLabel('Capacity').fill(String(TYPE.capacity));
  await types.getByLabel('Package content').fill('a bottle and four mixers');
  await types.getByRole('button', { name: 'Define table type' }).click();
  const typeRow = types.locator('tbody tr').filter({ hasText: TYPE.id });
  await expect(typeRow).toContainText(TYPE.name);
  await expect(typeRow).toContainText(String(TYPE.capacity));

  // steps 1–2
  const name = `E2E hall ${t}`;
  await newMap(page, name);

  // step 3: the image of the venue (the media upload is a stub in progress 1)
  await page.getByPlaceholder(/venue image file name/).fill('main-hall.png');
  await page.getByRole('button', { name: 'Upload image name' }).click();
  await expect(page.getByText(/^Image: /)).toContainText('main-hall.png');

  // step 4: two named zones
  await page.getByRole('button', { name: 'Add zone' }).click();
  await page.getByRole('button', { name: 'Add zone' }).click();
  await expect(zoneRows(page)).toHaveCount(2);
  await expect(zoneRows(page).nth(0).getByRole('textbox').nth(0)).toHaveValue('A');
  await zoneRows(page).nth(0).getByRole('textbox').nth(1).fill('Front stage');
  await expect(zoneRows(page).nth(1).getByRole('textbox').nth(0)).toHaveValue('B');
  await zoneRows(page).nth(1).getByRole('textbox').nth(1).fill('Bar');

  // steps 5–6: three tables with number, zone, table type and capacity
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Add table' }).click();
  await expect(tableRows(page)).toHaveCount(3);
  await setTable(tableRows(page).nth(0), { number: 1, zone: 'A', type: TYPE.id, capacity: 4 });
  await setTable(tableRows(page).nth(1), { number: 2, zone: 'A', type: TYPE.id, capacity: 4 });
  await setTable(tableRows(page).nth(2), { number: 3, zone: 'B', type: TYPE.id, capacity: 4 });
  await page.getByRole('button', { name: 'Save', exact: true }).click();

  // step 7: the number of tables and the capacity of each zone
  const summary = page.getByTestId('zone-summary').locator('tbody tr');
  await expect(summary).toHaveCount(2);
  await expect(summary.nth(0)).toContainText('A Front stage');
  await expect(summary.nth(0).locator('td').nth(1)).toHaveText('2');
  await expect(summary.nth(0).locator('td').nth(2)).toHaveText('8');
  await expect(summary.nth(1)).toContainText('B Bar');
  await expect(summary.nth(1).locator('td').nth(1)).toHaveText('1');
  await expect(summary.nth(1).locator('td').nth(2)).toHaveText('4');
  await expect(page.locator('.list-item').filter({ hasText: name })).toContainText('3 tables');

  // steps 8–9: validation passes
  await page.getByRole('button', { name: 'Validate' }).click();
  await expect(page.getByTestId('validation')).toHaveText('The map is valid.');

  // steps 11–12: Active, and so selectable in UC-03
  await page.getByRole('button', { name: 'Activate' }).click();
  await expect(page.getByTestId('map-head')).toContainText('Active');
  await expect(page.getByRole('button', { name: 'Activate' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Discard' })).toHaveCount(0);
  await expect(page.locator('.list-item').filter({ hasText: name })).toContainText('Active');
  await page.getByRole('link', { name: 'Rounds' }).click();
  await page.getByPlaceholder('New round name').fill(`E2E ${t} map check`);   // B3 shows the zone map choice of a round
  await page.getByRole('button', { name: 'New round' }).click();
  await expect(page.getByLabel('Zone map (Active)')).toContainText(`${name} (3 tables)`);
});

test('UC-04 EF-1 Validation Fails', async ({ page }) => {
  const name = `E2E bad map ${t}`;
  await newMap(page, name);

  // an unnamed zone, two tables with the same number, one with no table type and no capacity
  await page.getByRole('button', { name: 'Add zone' }).click();
  await page.getByRole('button', { name: 'Add table' }).click();
  await page.getByRole('button', { name: 'Add table' }).click();
  const typeId = await tableRows(page).nth(0).locator('select').nth(1).inputValue();   // any defined table type
  expect(typeId).not.toBe('');
  await setTable(tableRows(page).nth(0), { number: 1, zone: 'A', type: typeId, capacity: 4 });
  await setTable(tableRows(page).nth(1), { number: 1, zone: 'A', type: null, capacity: null });
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByTestId('zone-summary').locator('tbody tr')).toHaveCount(1);

  // EF-1 step 1: the invalid zones and tables with the reason
  await page.getByRole('button', { name: 'Validate' }).click();
  const validation = page.getByTestId('validation');
  await expect(validation).toContainText('The map is not valid:');
  await expect(validation).toContainText('zone A has no name');
  await expect(validation).toContainText('table number 1 is used twice');
  await expect(validation).toContainText('table 1 has no table type');
  await expect(validation).toContainText('table 1 has no seating capacity');
  await expect(validation.locator('li')).toHaveCount(4);

  // and the map cannot be activated as it is
  await page.getByRole('button', { name: 'Activate' }).click();
  await expect(page.getByRole('alert')).toContainText('Error 400');
  await expect(page.getByRole('alert')).toContainText('the zone map is not valid');
  await expect(page.getByTestId('map-head')).toContainText('Draft');
  await page.getByRole('button', { name: 'dismiss' }).click();

  // EF-1 steps 2–3: corrected, the map validates
  await zoneRows(page).nth(0).getByRole('textbox').nth(1).fill('Front stage');
  await setTable(tableRows(page).nth(1), { number: 2, zone: 'A', type: typeId, capacity: 4 });
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('button', { name: 'Validate' }).click();
  await expect(validation).toHaveText('The map is valid.');
});
