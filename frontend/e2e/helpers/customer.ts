// Page helpers of the customer feature tests (tests/customer-*.spec.ts): the ⋮ menu, the confirm dialog, the field
// errors, the steps from the hold summary to the payment, and a map held stale for the "just taken" scenario.
import { expect, type Locator, type Page } from '@playwright/test';
import { thbText, toastWith } from './ui';

/** Opens the ⋮ menu of the app bar. */
export async function openMenu(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Menu' }).click();
  await expect(page.getByRole('menu')).toBeVisible();
}

/** Opens the ⋮ menu and picks an item by its name. */
export async function chooseMenuItem(page: Page, name: string | RegExp): Promise<void> {
  await openMenu(page);
  await page.getByRole('menuitem', { name }).click();
}

/** Log out from the ⋮ menu: the LINE Login dialog is back and the toast says so. */
export async function logOut(page: Page): Promise<void> {
  await chooseMenuItem(page, /^Log out/);
  await expect(page.getByRole('heading', { name: 'LINE Login' })).toBeVisible();
  await expect(toastWith(page, 'Logged out')).toHaveText('Logged out');
}

/** The confirm dialog titled `title`. */
export const confirmDialog = (page: Page, title: string): Locator => page.getByRole('dialog', { name: title });

/** Waits for the confirm dialog titled `title` and presses the button `choice`; the dialog then closes. */
export async function answerDialog(page: Page, title: string, choice: string): Promise<void> {
  const dialog = confirmDialog(page, title);
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: choice }).click();
  await expect(dialog).toBeHidden();
}

/** An error under a field that says `text`. */
export const fieldError = (page: Page, text: string): Locator => page.locator('.field-error').filter({ hasText: text });

/** Hold summary → details (UC-01 step 12): the fee exists (the party size defaulted to the capacity), Continue. */
export async function continueToDetails(page: Page): Promise<void> {
  await expect(page.getByTestId('fee-total')).toHaveText(/THB$/);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Your details' })).toBeVisible();
}

/** Fills the details form of a first booking: the name, the mobile phone and, unless told otherwise, the consent. */
export async function fillDetails(page: Page, { name, phone, consent = true }: { name: string; phone: string; consent?: boolean }): Promise<void> {
  await page.getByLabel('Name', { exact: true }).fill(name);
  await page.getByLabel('Mobile phone', { exact: true }).fill(phone);
  if (consent) await page.getByRole('checkbox', { name: /I consent/ }).check();
}

/** Details → terms (UC-01 step 12 → 13): Continue, the toast says the details are saved, the terms show. */
export async function submitDetails(page: Page, saved: 'Details saved' | 'Details updated' = 'Details saved'): Promise<void> {
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(toastWith(page, saved)).toHaveText(saved);
  await expect(page.getByRole('heading', { name: 'Booking terms' })).toBeVisible();
}

/** Terms → payment (UC-01 steps 13–15): tick the box, Pay the amount; the toast says the terms are accepted. */
export async function acceptTermsAndPay(page: Page, amount: number): Promise<void> {
  const pay = page.getByRole('button', { name: `Pay ${thbText(amount)}` });
  await expect(pay).toBeDisabled();
  await page.getByRole('checkbox', { name: 'I have read and accept the booking terms' }).check();
  await pay.click();
  await expect(toastWith(page, 'Terms accepted')).toHaveText('Terms accepted');
  await expect(page.getByRole('heading', { name: 'Payment' })).toBeVisible();
}

/** Keeps a customer's table map stale on demand: once frozen, the polled read of the table status (ADR-09) is held
 *  back until released, which is the window between another customer's hold and the refresh of this map. Call
 *  before the map is opened; the first read goes through. */
export async function freezeTableMap(page: Page): Promise<{ freeze: () => void; release: () => void }> {
  let stale = false;
  const waiting: (() => void)[] = [];
  await page.route('**/api/rounds/*/table-status', async (route) => {
    if (stale) await new Promise<void>((r) => waiting.push(r));
    await route.continue();
  });
  return {
    freeze: () => { stale = true; },
    release: () => { stale = false; waiting.splice(0).forEach((r) => r()); },
  };
}
