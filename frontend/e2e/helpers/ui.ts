// The steps every scenario shares, on the real screens: C1 login, C2 → C3, a tap on a table, B1 sign-in.
import { expect, type Locator, type Page } from '@playwright/test';

/** C1 (UC-01 steps 1–2): the LINE Login stub takes a LINE user id; the app then shows C2. */
export async function loginAsLineUser(page: Page, userId: string): Promise<void> {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'LINE Login (stub, progress 1)' })).toBeVisible();
  await page.getByLabel('LINE user id').fill(userId);
  await page.getByRole('button', { name: 'Log in with LINE' }).click();
  await expect(page.getByRole('heading', { name: 'Concert rounds' })).toBeVisible();
  await expect(page.locator('.identity')).toContainText(userId);
}

/** C2 → C3 (UC-01 steps 3–5): choose the round by its name and wait for the table map. */
export async function openRound(page: Page, roundName: string): Promise<void> {
  await page.goto('/');
  const row = page.getByRole('row', { name: roundName });
  await expect(row).toBeVisible();
  await row.getByRole('link', { name: 'Choose a table' }).click();
  await expect(page.getByRole('heading', { name: roundName })).toBeVisible();
  await expect(page.getByTestId('table-map').getByRole('button', { name: /^table \d+, / }).first()).toBeVisible();
}

/** The table shape of C3 / B4 / the B3 preview: aria-label "table N, status". */
export const tableButton = (page: Page, n: number, status: 'available' | 'held' | 'booked' | 'occupied' | 'not for sale'): Locator =>
  page.getByRole('button', { name: `table ${n}, ${status}`, exact: true });

/** C3 → C4 (UC-01 steps 6–8): tap an available table; C4 shows the hold countdown. */
export async function holdTable(page: Page, n: number): Promise<void> {
  await tableButton(page, n, 'available').click();
  await expect(page.getByRole('heading', { name: 'Your hold' })).toBeVisible();
  await expect(page.getByTestId('countdown')).toBeVisible();
}

/** B1 (UC-08): the seeded manager account; the app then shows B3. */
export async function signInAsManager(page: Page): Promise<void> {
  await page.goto('/sign-in');
  await page.getByLabel('Username').fill('manager');
  await page.getByLabel('Password').fill('manager');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Concert rounds' })).toBeVisible();
  await expect(page.locator('.identity')).toContainText('manager');
}
