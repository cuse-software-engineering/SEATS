// The steps every scenario shares, on the real screens: C1 login, C2 → C3, a tap on a table, B1 sign-in.
import { expect, type Locator, type Page } from '@playwright/test';

/** "4,800 THB": money as the Customer Web App prints it (customer-web-app/src/format.ts). */
export const thbText = (n: number): string => `${n.toLocaleString('en-US')} THB`;

/** The start of a seeded round: 20:00Z of its day (helpers/seed.ts, seedRound). */
export const startAtOf = (day: string): string => `${day}T20:00:00Z`;

/** "Sat 26 Sep 2026 · 20:00": a round as the Customer Web App titles it, in this machine's time zone, the parts
 *  picked by hand as the app does (customer-web-app/src/format.ts, roundTitle). */
export function roundTitle(startAt: string, year = true): string {
  const d = new Date(startAt);
  const p: Record<string, string> = {};
  for (const part of new Intl.DateTimeFormat('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).formatToParts(d)) p[part.type] = part.value;
  const clock = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d);
  return `${p.weekday} ${p.day} ${p.month}${year ? ` ${p.year}` : ''} · ${clock}`;
}

/** C1 (UC-01 steps 1–2): the LINE Login dialog takes a LINE user id (the stub of progress 1); Allow then shows C2. */
export async function loginAsLineUser(page: Page, userId: string): Promise<void> {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'LINE Login' })).toBeVisible();
  await page.getByLabel('LINE user id').fill(userId);
  await page.getByRole('button', { name: 'Allow' }).click();
  await expect(page.getByRole('heading', { name: 'Concert rounds' })).toBeVisible();
  await expect(page.locator('.identity')).toHaveText(userId);   // the signed-in LINE user, in the build footer
}

/** C2: the card of a round. */
export const roundCard = (page: Page, roundId: string): Locator => page.locator(`[data-testid="round"][data-round="${roundId}"]`);

/** C9: the card of a booking, by its round (one booking per round in every scenario). */
export const bookingCard = (page: Page, roundId: string): Locator => page.locator(`[data-testid="booking"][data-round="${roundId}"]`);

/** C2 → C3 (UC-01 steps 3–5): Select this round on its card and wait for the table map under the round's title. */
export async function openRound(page: Page, round: { id: string; date: string }): Promise<void> {
  await page.goto('/');
  const card = roundCard(page, round.id);
  await expect(card).toBeVisible();
  await card.getByRole('link', { name: 'Select this round' }).click();
  await expect(page).toHaveURL(new RegExp(`/rounds/${round.id}$`));
  await expect(page.getByRole('heading', { level: 1 })).toContainText(roundTitle(startAtOf(round.date), false));
  await expect(page.getByTestId('table-map').getByRole('button', { name: /^table \d+, / }).first()).toBeVisible();
}

/** The table shape of C3 / B4 / the B3 preview: aria-label "table N, status". */
export const tableButton = (page: Page, n: number, status: 'available' | 'held' | 'booked' | 'occupied' | 'not for sale'): Locator =>
  page.getByRole('button', { name: `table ${n}, ${status}`, exact: true });

/** C3 → C4 (UC-01 steps 6–8): tap an available table; C4 shows the hold countdown in its app bar. */
export async function holdTable(page: Page, n: number): Promise<void> {
  await tableButton(page, n, 'available').click();
  await expect(page.getByRole('heading', { name: 'Your table is held' })).toBeVisible();
  await expect(page.getByTestId('countdown')).toBeVisible();
}

/** B1 (UC-08): the seeded manager account on the sign-in card; the app then shows B3 and the top bar names the account. */
export async function signInAsManager(page: Page): Promise<void> {
  await page.goto('/sign-in');
  await expect(page.getByRole('heading', { name: 'SEATS back-office' })).toBeVisible();
  await page.getByLabel('Username').fill('manager');
  await page.getByLabel('Password').fill('manager');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Concert rounds' })).toBeVisible();
  await expect(page.locator('.identity')).toContainText('signed in as manager');
}
