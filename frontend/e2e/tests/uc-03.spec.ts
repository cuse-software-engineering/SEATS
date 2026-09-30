// UC-03 Create Concert Round (Section 2.2.3) on the Back-office Web App, screen B3. The Active zone map of the
// precondition is seeded through the gateway; the round itself is made on the screen.
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { freeDays, managerApi, ROUND2, seedZoneMap, SOFA6, tag, TABLES, ZONE, type SeededMap } from '../helpers/seed';
import { signInAsManager, tableButton } from '../helpers/ui';

const t = tag();
let api: APIRequestContext;
let map: SeededMap;
let days: string[];
const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);

test.beforeAll(async () => {
  api = await managerApi();
  map = await seedZoneMap(api, t);
  days = await freeDays(api, 2);
});
test.afterAll(async () => { await api.dispose(); });
test.beforeEach(async ({ page }) => { await signInAsManager(page); });

/** UC-03 steps 1–2: a new, empty round form. */
async function newRound(page: Page, name: string): Promise<void> {
  await page.getByPlaceholder('New round name').fill(name);
  await page.getByRole('button', { name: 'New round' }).click();
  const head = page.getByTestId('round-head');
  await expect(head).toContainText(name);
  await expect(head).toContainText('Draft');
  await expect(page.getByLabel('Artist')).toHaveValue('');
}

/** UC-03 steps 3–4: the concert details and the booking-open time. */
async function enterDetails(page: Page, o: { artist: string; day: string; doors: string; start: string; bookingOpens: string }): Promise<void> {
  await page.getByLabel('Artist').fill(o.artist);
  await page.getByLabel('Date (venue local)').fill(o.day);
  await page.getByLabel('Doors open').fill(o.doors);
  await page.getByLabel('Start', { exact: true }).fill(o.start);
  await page.getByLabel('Booking opens (BRULE-07)').fill(o.bookingOpens);
}

const priceRow = (page: Page, typeName: string) => page.getByTestId('prices').locator('tbody tr').filter({ hasText: typeName });

test('UC-03 basic flow Create Concert Round', async ({ page }) => {
  const name = `E2E ${t} Friday Live`;
  const day = days[0];
  await newRound(page, name);

  // steps 3–4
  await enterDetails(page, { artist: 'The E2E Band', day, doors: `${day}T18:00`, start: `${day}T20:00`, bookingOpens: `${yesterday}T09:00` });

  // steps 6–7: the Active zone map; its zones and table types appear as one price row each (BRULE-08)
  await page.getByLabel('Zone map (Active)').selectOption(map.id);
  await expect(page.getByLabel('Zone map (Active)')).toContainText(`${map.name} (${TABLES.length} tables)`);
  await expect(page.getByTestId('prices').locator('tbody tr')).toHaveCount(2);
  await expect(priceRow(page, SOFA6.name)).toContainText(ZONE.name);
  await expect(priceRow(page, ROUND2.name)).toContainText(ZONE.name);

  // step 9: the package price and content of each table type in each zone
  await priceRow(page, SOFA6.name).getByRole('spinbutton').fill('7200');
  await priceRow(page, SOFA6.name).getByRole('textbox').fill('a bottle of whisky and mixers');
  await priceRow(page, ROUND2.name).getByRole('spinbutton').fill('2400');
  await page.getByRole('button', { name: 'Save', exact: true }).click();

  // step 5: the check-in window derived from the business parameters (BRULE-04, BRULE-05)
  await expect(page.getByText(/^Check-in window: .* until .* \(BRULE-04, BRULE-05\)\.$/)).toBeVisible();
  // step 10: the tables for sale and the capacity of each zone
  const perZone = page.getByTestId('preview-summary').locator('tbody tr').filter({ hasText: ZONE.name });
  await expect(perZone.locator('td').nth(1)).toHaveText(String(TABLES.length));
  await expect(perZone.locator('td').nth(2)).toHaveText(String(TABLES.reduce((s, x) => s + x.capacity, 0)));

  // steps 11–12: validation passes
  await page.getByRole('button', { name: 'Validate' }).click();
  await expect(page.getByTestId('validation')).toHaveText('The round is valid.');
  // step 13: the preview as the customer sees it (the elements of C3) with the prices
  await expect(tableButton(page, 1, 'available')).toContainText('฿7,200');
  await expect(tableButton(page, 2, 'available')).toContainText('฿2,400');

  // steps 14–15: Published, with the parameters snapshotted; the round is now in the list of upcoming rounds
  await page.getByRole('button', { name: 'Publish' }).click();
  await expect(page.getByTestId('round-head')).toContainText('Published');
  await expect(page.getByText(/^Parameters snapshot at publish \(FR-38\)/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Discard' })).toHaveCount(0);
  await expect(page.locator('.list-item').filter({ hasText: name })).toContainText('open');
});

test('UC-03 EF-1 Validation Fails', async ({ page }) => {
  const name = `E2E ${t} out of order`;
  const day = days[1];
  await newRound(page, name);

  // times out of order (doors after the start, booking opens after the start), a zone map with no prices
  await enterDetails(page, { artist: 'The E2E Band', day, doors: `${day}T21:00`, start: `${day}T20:00`, bookingOpens: `${day}T22:00` });
  await page.getByLabel('Zone map (Active)').selectOption(map.id);
  await expect(page.getByTestId('prices').locator('tbody tr')).toHaveCount(2);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText(/^Check-in window: /)).toBeVisible();

  // EF-1 step 1: the reasons are stated
  await page.getByRole('button', { name: 'Validate' }).click();
  const validation = page.getByTestId('validation');
  await expect(validation).toContainText('The round is not valid:');
  await expect(validation).toContainText('the doors-open time must be before the start time');
  await expect(validation).toContainText('the booking-open time must be before the start time');
  await expect(validation).toContainText(`no package price for ${SOFA6.name} in ${ZONE.name}`);
  await expect(validation).toContainText(`no package price for ${ROUND2.name} in ${ZONE.name}`);
  await expect(validation.locator('li')).toHaveCount(4);

  // and the round cannot be published as it is
  await page.getByRole('button', { name: 'Publish' }).click();
  await expect(page.getByRole('alert')).toContainText('Error 400');
  await expect(page.getByRole('alert')).toContainText('the round is not valid');
  await expect(page.getByTestId('round-head')).toContainText('Draft');
  await page.getByRole('button', { name: 'dismiss' }).click();

  // EF-1 steps 2–3: corrected, the round validates
  await page.getByLabel('Doors open').fill(`${day}T18:00`);
  await page.getByLabel('Booking opens (BRULE-07)').fill(`${yesterday}T09:00`);
  await priceRow(page, SOFA6.name).getByRole('spinbutton').fill('7200');
  await priceRow(page, ROUND2.name).getByRole('spinbutton').fill('2400');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('button', { name: 'Validate' }).click();
  await expect(validation).toHaveText('The round is valid.');
});
