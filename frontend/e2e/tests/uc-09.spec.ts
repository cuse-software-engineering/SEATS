// UC-09 Maintain Customer Profile (Section 2.2.5), included by UC-01 at {Complete the Customer Profile}: screen C5.
import { expect, test, type APIRequestContext } from '@playwright/test';
import { freeDays, managerApi, seedRound, seedZoneMap, tag, type SeededRound } from '../helpers/seed';
import { holdTable, loginAsLineUser, openRound } from '../helpers/ui';

const t = tag();
let api: APIRequestContext;
let round: SeededRound;

test.beforeAll(async () => {
  api = await managerApi();
  const map = await seedZoneMap(api, t);
  const [day] = await freeDays(api, 1);
  round = await seedRound(api, map.id, { name: `E2E ${t} UC-09`, day });
});
test.afterAll(async () => { await api.dispose(); });

/** UC-01 steps 1–11 on a fresh LINE user (no profile yet), then Continue to C5. */
async function reachProfile(page: import('@playwright/test').Page, user: string, table: number): Promise<void> {
  await loginAsLineUser(page, user);
  await openRound(page, round.name);
  await holdTable(page, table);
  await page.getByRole('button', { name: /^Set \d+ people$/ }).click();   // the party size, so that the fee exists
  await expect(page.getByTestId('fee-total')).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Your details' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Why we ask (UC-09)' })).toBeVisible();   // step 3: the purpose, no profile yet
}

test('UC-09 AF-1 Consent Refused', async ({ page }) => {
  await reachProfile(page, `U-e2e-${t}-noconsent`, 1);
  await page.getByLabel('Name', { exact: true }).fill('Malee E2E');
  await page.getByLabel('Phone', { exact: true }).fill('0891234567');
  await expect(page.getByRole('checkbox')).not.toBeChecked();

  // AF-1 step 1: without the consent the booking cannot go on; nothing is stored
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByTestId('profile-problem')).toHaveText('Consent is needed to keep your name and phone (BRULE-11).');
  await expect(page).toHaveURL(/\/profile$/);

  // AF-1 step 2: the customer declines; the including use case cancels the booking (UC-01 AF-5) and returns to C2
  await page.getByRole('button', { name: 'Decline and cancel the booking' }).click();
  await expect(page.getByRole('heading', { name: 'Concert rounds' })).toBeVisible();
  await page.getByRole('link', { name: 'My Bookings' }).click();
  await expect(page.getByRole('row', { name: round.id })).toContainText('Cancelled');

  // no profile was stored: the next booking asks for the consent again
  await openRound(page, round.name);
  await holdTable(page, 3);
  await page.getByRole('button', { name: /^Set \d+ people$/ }).click();
  await expect(page.getByTestId('fee-total')).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Why we ask (UC-09)' })).toBeVisible();
  await expect(page.getByRole('checkbox')).not.toBeChecked();
});

test('UC-09 AF-2 Invalid Profile Data', async ({ page }) => {
  await reachProfile(page, `U-e2e-${t}-invalid`, 2);
  const problem = page.getByTestId('profile-problem');

  // AF-2 step 1: an empty name is marked
  await page.getByLabel('Phone', { exact: true }).fill('0891234567');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(problem).toHaveText('Name is required.');
  await expect(page).toHaveURL(/\/profile$/);

  // AF-2 step 1: a phone that is not a Thai mobile number is marked
  await page.getByLabel('Name', { exact: true }).fill('Malee E2E');
  await page.getByLabel('Phone', { exact: true }).fill('12345');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(problem).toHaveText('Phone must be 10 digits starting with 06, 08 or 09.');
  await page.getByLabel('Phone', { exact: true }).fill('0212345678');   // a landline
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(problem).toHaveText('Phone must be 10 digits starting with 06, 08 or 09.');

  // AF-2 step 2: corrected, the profile is stored and UC-01 goes on to the terms (C6)
  await page.getByLabel('Phone', { exact: true }).fill('0891234567');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Booking terms' })).toBeVisible();
});
