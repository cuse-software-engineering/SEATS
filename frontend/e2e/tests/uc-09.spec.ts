// UC-09 Maintain Customer Profile (Section 2.2.5), included by UC-01 at {Complete the Customer Profile}: the details
// screen. Every step asserts what the customer sees after the click: the error under the field, the dialog, the toast.
import { expect, test, type APIRequestContext } from '@playwright/test';
import { freeDays, managerApi, seedRound, seedZoneMap, tag, ZONE, type SeededRound } from '../helpers/seed';
import { bookingCard, holdTable, loginAsLineUser, openRound, toastWith } from '../helpers/ui';
import { answerDialog, confirmDialog } from '../helpers/customer';

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

/** UC-01 steps 1–11 on a fresh LINE user (no profile yet), then Continue to the details. */
async function reachProfile(page: import('@playwright/test').Page, user: string, table: number): Promise<void> {
  await loginAsLineUser(page, user);
  await openRound(page, round);
  await holdTable(page, table);
  await expect(page.getByTestId('fee-total')).toHaveText(/THB$/);   // the party size defaults to the capacity, so the fee exists
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Your details' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Why we ask' })).toBeVisible();   // step 3: the purpose, no profile yet
}

test('UC-09 AF-1 Consent Refused', async ({ page }) => {
  await reachProfile(page, `U-e2e-${t}-noconsent`, 1);
  await page.getByLabel('Name', { exact: true }).fill('Malee E2E');
  await page.getByLabel('Mobile phone', { exact: true }).fill('0891234567');
  await expect(page.getByRole('checkbox')).not.toBeChecked();

  // AF-1 step 1: without the consent the booking cannot go on; the error says so under the box and nothing is stored
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.locator('.field-error')).toHaveText('Tick the box to let us keep your name and phone for this booking.');
  await expect(page).toHaveURL(/\/profile$/);

  // AF-1 step 2: the customer declines; the dialog asks first, then the including use case cancels the booking
  // (UC-01 AF-5), the toast says the table is free again and the round list is back
  await page.getByRole('button', { name: 'Decline and cancel the booking' }).click();
  await expect(confirmDialog(page, 'Decline and cancel the booking?')).toContainText('Nothing about you is stored and the table is released.');
  await answerDialog(page, 'Decline and cancel the booking?', 'Decline and cancel');
  await expect(toastWith(page, 'Booking cancelled')).toHaveText(`Booking cancelled. Table ${ZONE.id}1 is available again.`);
  await expect(page.getByRole('heading', { name: 'Concert rounds' })).toBeVisible();
  await page.goto('/my-bookings');
  await expect(bookingCard(page, round.id).locator('.badge')).toHaveText('Cancelled');

  // no profile was stored: the next booking asks for the consent again
  await openRound(page, round);
  await holdTable(page, 3);
  await expect(page.getByTestId('fee-total')).toHaveText(/THB$/);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Why we ask' })).toBeVisible();
  await expect(page.getByRole('checkbox')).not.toBeChecked();
});

test('UC-09 AF-2 Invalid Profile Data', async ({ page }) => {
  await reachProfile(page, `U-e2e-${t}-invalid`, 2);
  const problem = page.locator('.field-error');
  const name = page.getByLabel('Name', { exact: true });
  const phone = page.getByLabel('Mobile phone', { exact: true });

  // AF-2 step 1: an empty name is marked, with the error under the field
  await phone.fill('0891234567');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(problem).toHaveText('Name is required.');
  await expect(name).toHaveClass(/err/);
  await expect(name).toHaveAttribute('aria-invalid', 'true');
  await expect(page).toHaveURL(/\/profile$/);

  // AF-2 step 1: a phone that is not a Thai mobile number is marked with the thick border and the message
  await name.fill('Malee E2E');
  await expect(problem).toHaveCount(0);   // corrected as typed
  await phone.fill('12345');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(problem).toHaveText('Enter a 10-digit Thai mobile number.');
  await expect(phone).toHaveClass(/err/);
  await phone.fill('0212345678');   // a landline
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(problem).toHaveText('Enter a 10-digit Thai mobile number.');
  await expect(page).toHaveURL(/\/profile$/);

  // AF-2 step 2: corrected, the profile is stored (the toast says so) and UC-01 goes on to the terms
  await phone.fill('0891234567');
  await expect(problem).toHaveCount(0);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(toastWith(page, 'Details saved')).toHaveText('Details saved');
  await expect(page.getByRole('heading', { name: 'Booking terms' })).toBeVisible();
});
