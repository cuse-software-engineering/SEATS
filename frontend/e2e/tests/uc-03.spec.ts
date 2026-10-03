// UC-03 Create Concert Round (Section 2.2.3) on the Back-office Web App, the round editor laid out as the wireframe
// (Table D.12): the round list, the concert details, the zone map, the tables for sale per zone, the price matrix,
// the validation result, the preview, Save draft / Validate / Preview / Publish. The Active zone map of the
// precondition is seeded through the gateway; the round itself is made on the screen, and every click is checked
// by what it says (the toast, the badge, the validation box).
import { expect, test, type APIRequestContext } from '@playwright/test';
import { freeDays, managerApi, ROUND2, seedZoneMap, SOFA6, tag, TABLES, ZONE, type SeededMap } from '../helpers/seed';
import { chooseZoneMap, enterDetails, expectToast, newRound, prices, priceRow, publishButton, publishRound, roundHead, roundItem, saveDraft, setPrice, validateRound } from '../helpers/backoffice';
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

test('UC-03 basic flow Create Concert Round', async ({ page }) => {
  const name = `E2E ${t} Friday Live`;
  const day = days[0];
  // steps 1–2: the new Draft, its toast, the highlighted item of the list
  await newRound(page, name);

  // steps 3–4: the details; the head shows the unsaved changes
  await enterDetails(page, { artist: 'The E2E Band', day, doors: `${day}T18:00`, start: `${day}T20:00`, bookingOpens: `${yesterday}T09:00` });

  // steps 6–7: the Active zone map; its zones become the columns and its table types the rows of the price matrix
  await chooseZoneMap(page, map, TABLES.length);
  await expect(prices(page).locator('thead')).toContainText(ZONE.name);
  await expect(prices(page).locator('tbody tr')).toHaveCount(2);
  await expect(priceRow(page, SOFA6.name)).toBeVisible();
  await expect(priceRow(page, ROUND2.name)).toBeVisible();

  // step 9: the package price and content of each table type in each zone; Save draft says Saved
  await setPrice(page, SOFA6.name, 7200, 'a bottle of whisky and mixers');
  await setPrice(page, ROUND2.name, 2400);
  await saveDraft(page);

  // step 5: the check-in window derived from the business parameters
  await expect(page.getByText(/^Check-in window .*: from .* h before the start until .* min after it \(business parameters\)\.$/)).toBeVisible();
  // step 10: the tables for sale and the capacity of each zone
  const perZone = page.getByTestId('sale-summary').locator('tbody tr').filter({ hasText: ZONE.name });
  await expect(perZone.locator('td').nth(1)).toHaveText(`${TABLES.length} of ${TABLES.length}`);
  await expect(perZone.locator('td').nth(2)).toHaveText(String(TABLES.reduce((s, x) => s + x.capacity, 0)));

  // steps 11–12: validation passes (the box and the toast say so), and only then Publish opens
  await expect(publishButton(page)).toBeDisabled();
  const validation = await validateRound(page);
  await expect(validation).toContainText('Validation result · no problems');
  await expect(validation).toContainText('Publish is open');
  await expectToast(page, 'Validation passed');
  await expect(publishButton(page)).toBeEnabled();

  // step 13: the preview as the customer sees it: the shapes labelled A1.. with the prices
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  const preview = page.getByTestId('preview');
  await expect(preview).toContainText('Preview: as the customer sees it');
  await expect(tableButton(page, 1, 'available')).toBeVisible();
  await expect(tableButton(page, 1, 'available')).toHaveAttribute('title', /7,200 THB/);
  await expect(tableButton(page, 2, 'available')).toHaveAttribute('title', /2,400 THB/);
  await expect(preview).toContainText(`${SOFA6.name} ฿7,200`);
  await expect(preview).toContainText(`${ROUND2.name} ฿2,400`);

  // steps 14–15: Published with its toast and the parameters it was published with; Discard is gone and the list shows the badge
  await publishRound(page);
  await expect(page.getByText(/^Published with: hold \d+ min · check-in window \d+ h · grace \d+ min · extra person \d+ THB\.$/)).toBeVisible();
  await expect(page.getByText('Only a draft can be discarded.')).toBeVisible();
  await expect(validation).toContainText('The round is valid and published');
  await expect(roundItem(page, name)).toContainText('Published');
});

test('UC-03 EF-1 Validation Fails', async ({ page }) => {
  const name = `E2E ${t} out of order`;
  const day = days[1];
  await newRound(page, name);

  // times out of order (doors after the start, booking opens after the start): the fields say so at once; a zone map with no prices
  await enterDetails(page, { artist: 'The E2E Band', day, doors: `${day}T21:00`, start: `${day}T20:00`, bookingOpens: `${day}T22:00` });
  await expect(page.getByText('Must be before the start')).toHaveCount(2);
  await chooseZoneMap(page, map, TABLES.length);
  await expect(prices(page).locator('tbody tr')).toHaveCount(2);
  await expect(prices(page).locator('td.err')).toHaveCount(2);   // the two prices missing are outlined
  await saveDraft(page);
  await expect(page.getByText(/^Check-in window /)).toBeVisible();

  // EF-1 step 1: the reasons are stated in the box and counted in the toast; Publish stays closed
  const validation = await validateRound(page);
  await expectToast(page, 'Validation found 4 problems');
  await expect(validation).toContainText('Validation result · 4 problems');
  await expect(validation).toContainText('the doors-open time must be before the start time');
  await expect(validation).toContainText('the booking-open time must be before the start time');
  await expect(validation).toContainText(`no package price for ${SOFA6.name} in ${ZONE.name}`);
  await expect(validation).toContainText(`no package price for ${ROUND2.name} in ${ZONE.name}`);
  await expect(validation.locator('li')).toHaveCount(4);
  await expect(validation).toContainText('Publish opens once the round passes validation');
  await expect(publishButton(page)).toBeDisabled();
  await expect(roundHead(page)).toContainText('Draft');

  // EF-1 steps 2–3: corrected, the field errors and the outlines go, and the round validates (Validate saves the draft first)
  await page.getByLabel('Doors open').fill(`${day}T18:00`);
  await page.getByLabel('Booking opens').fill(`${yesterday}T09:00`);
  await expect(page.getByText('Must be before the start')).toHaveCount(0);
  await setPrice(page, SOFA6.name, 7200);
  await setPrice(page, ROUND2.name, 2400);
  await expect(prices(page).locator('td.err')).toHaveCount(0);
  await expect(roundHead(page)).toContainText('Unsaved changes');
  await validateRound(page);
  await expectToast(page, 'Saved');
  await expectToast(page, 'Validation passed');
  await expect(validation).toContainText('Validation result · no problems');
  await expect(roundHead(page)).toContainText('Saved');
  await expect(publishButton(page)).toBeEnabled();
});
