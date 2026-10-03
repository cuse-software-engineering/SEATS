// The details form of the Customer Web App: the field errors, a valid form, a returning customer's prefilled
// details, and the decline with its dialog.
import { expect, test } from '../helpers/fixtures';
import { freeDays, seedRound, ZONE, type SeededRound } from '../helpers/seed';
import { createProfileAs } from '../helpers/seed-customers';
import { bookingCard, holdTable, loginAsLineUser, openRound, toastWith } from '../helpers/ui';
import { answerDialog, confirmDialog, continueToDetails, fieldError, fillDetails, submitDetails } from '../helpers/customer';

let round: SeededRound;
let t = '';
const RETURNING = { name: 'Pranee Returning', phone: '0891112222' };

test.beforeAll(async ({ seed }) => {
  t = seed.t;
  const [day] = await freeDays(seed.api, 1);
  round = await seedRound(seed.api, seed.map.id, { name: `E2E ${t} profile`, day });
  await createProfileAs(`U-e2e-${t}-returning`, RETURNING);
});

test('the details form refuses an empty name and an invalid phone with an error under each field', async ({ page }) => {
  await loginAsLineUser(page, `U-e2e-${t}-invalid`);
  await openRound(page, round);
  await holdTable(page, 1);
  await continueToDetails(page);
  const name = page.getByLabel('Name', { exact: true });
  const phone = page.getByLabel('Mobile phone', { exact: true });

  // nothing filled: every field says what is missing, nothing is sent
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(fieldError(page, 'Name is required.')).toBeVisible();
  await expect(fieldError(page, 'Enter a 10-digit Thai mobile number.')).toBeVisible();
  await expect(fieldError(page, 'Tick the box to let us keep your name and phone for this booking.')).toBeVisible();
  await expect(name).toHaveAttribute('aria-invalid', 'true');
  await expect(phone).toHaveAttribute('aria-invalid', 'true');
  await expect(page).toHaveURL(/\/profile$/);

  // corrected as typed: each error goes when its field is right, a wrong phone keeps its error
  await name.fill('Somsak E2E');
  await expect(fieldError(page, 'Name is required.')).toHaveCount(0);
  await phone.fill('12345');
  await expect(fieldError(page, 'Enter a 10-digit Thai mobile number.')).toBeVisible();
  await phone.fill('0212345678');   // a landline
  await expect(fieldError(page, 'Enter a 10-digit Thai mobile number.')).toBeVisible();
  await page.getByRole('checkbox', { name: /I consent/ }).check();
  await expect(fieldError(page, 'Tick the box')).toHaveCount(0);
  await phone.fill('0898765432');
  await expect(page.locator('.field-error')).toHaveCount(0);

  // a valid form continues: the toast says the details are saved and the terms show
  await submitDetails(page);
});

test('a returning customer sees the saved details prefilled and continues without retyping them', async ({ page }) => {
  await loginAsLineUser(page, `U-e2e-${t}-returning`);
  await openRound(page, round);
  await holdTable(page, 2);
  await continueToDetails(page);

  // the saved details, no consent box, no "Why we ask"
  await expect(page.getByRole('heading', { name: 'Your saved details' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Why we ask' })).toHaveCount(0);
  await expect(page.getByText('consent given')).toBeVisible();
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue(RETURNING.name);
  await expect(page.getByLabel('Mobile phone', { exact: true })).toHaveValue(RETURNING.phone);
  await expect(page.getByRole('checkbox')).toHaveCount(0);

  // unchanged: straight on to the terms
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Booking terms' })).toBeVisible();

  // corrected: the toast says the details are updated
  await page.getByRole('link', { name: 'Back' }).click();
  await expect(page.getByRole('heading', { name: 'Your details' })).toBeVisible();
  await page.getByLabel('Name', { exact: true }).fill('Pranee R.');
  await submitDetails(page, 'Details updated');
  await page.getByRole('link', { name: 'Back' }).click();
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Pranee R.');
});

test('declining the consent asks first and then cancels the booking', async ({ page }) => {
  await loginAsLineUser(page, `U-e2e-${t}-decline`);
  await openRound(page, round);
  await holdTable(page, 3);
  await continueToDetails(page);
  await fillDetails(page, { name: 'Nobody E2E', phone: '0812223333', consent: false });

  // Go back keeps the form and the hold
  await page.getByRole('button', { name: 'Decline and cancel the booking' }).click();
  const dialog = confirmDialog(page, 'Decline and cancel the booking?');
  await expect(dialog).toContainText('Nothing about you is stored and the table is released.');
  await dialog.getByRole('button', { name: 'Go back' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Your details' })).toBeVisible();
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Nobody E2E');
  await expect(page.getByTestId('countdown')).toBeVisible();

  // Decline and cancel: the toast says the table is free again, the round list is back, the booking is Cancelled
  await page.getByRole('button', { name: 'Decline and cancel the booking' }).click();
  await answerDialog(page, 'Decline and cancel the booking?', 'Decline and cancel');
  await expect(toastWith(page, 'Booking cancelled')).toHaveText(`Booking cancelled. Table ${ZONE.id}3 is available again.`);
  await expect(page.getByRole('heading', { name: 'Concert rounds' })).toBeVisible();
  await page.goto('/my-bookings');
  await expect(bookingCard(page, round.id).locator('.badge')).toHaveText('Cancelled');
});
