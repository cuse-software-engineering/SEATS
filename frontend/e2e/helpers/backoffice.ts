// The steps the back-office scenarios share, on the real screens: the sign-in of any staff account and the
// sidebar, the toast and the confirm dialog every click answers with, the round editor, the zone map editor, and
// the holds a customer makes through the gateway while the back-office watches.
import { expect, request, type APIRequestContext, type Locator, type Page } from '@playwright/test';
import { GATEWAY } from './seed';

// ---------------------------------------------------------------- what the user sees after a click
/** The toasts that say `text` (data-testid toast, role status or alert). */
export const toast = (page: Page, text: string | RegExp): Locator => page.getByTestId('toast').filter({ hasText: text });
export async function expectToast(page: Page, text: string | RegExp): Promise<void> {
  await expect(toast(page, text).first()).toBeVisible();
}
/** The confirm dialog titled `title`, answered with the button named `button` (Cancel keeps things as they are). */
export async function confirmDialog(page: Page, title: string | RegExp, button: string): Promise<void> {
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(title);
  await dialog.getByRole('button', { name: button, exact: true }).click();
  await expect(dialog).toBeHidden();
}
/** The validation box of the zone map and round editors. */
export const validation = (page: Page): Locator => page.getByTestId('validation');
/** An RFC 3339 time as a datetime-local input takes it, in this machine's time zone (the browser shares it). */
export function localInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ---------------------------------------------------------------- sign-in and the sidebar
/** The sign-in card with any staff account; what follows (the landing screen, or a refusal) is the test's to assert. */
export async function signIn(page: Page, username: string, password: string): Promise<void> {
  await page.goto('/sign-in');
  await expect(page.getByRole('heading', { name: 'SEATS back-office' })).toBeVisible();
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}
/** Sign out from the sidebar: back on the sign-in card with its toast. */
export async function signOut(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await expectToast(page, 'Signed out');
  await expect(page.locator('.identity')).toHaveText('not signed in');
}
export type Screen = 'Concert rounds' | 'Zone maps' | 'Live view' | 'Check-in' | 'Business parameters' | 'Staff accounts';
const SCREEN_URL: Record<Screen, RegExp> = {
  'Concert rounds': /\/rounds$/, 'Zone maps': /\/zone-maps$/, 'Live view': /\/live$/, 'Check-in': /\/check-in$/,
  'Business parameters': /\/settings#business-parameters$/, 'Staff accounts': /\/settings#staff-accounts$/,
};
/** A screen from the sidebar, by its item. */
export async function openScreen(page: Page, screen: Screen): Promise<void> {
  await page.getByRole('navigation', { name: 'screens' }).getByRole('link', { name: screen }).click();
  await expect(page).toHaveURL(SCREEN_URL[screen]);
  if (screen === 'Concert rounds' || screen === 'Zone maps') await expect(page.getByRole('heading', { name: screen })).toBeVisible();
  if (screen === 'Business parameters' || screen === 'Staff accounts') await expect(page.getByTestId(screen.toLowerCase().replace(' ', '-'))).toBeVisible();
}

// ---------------------------------------------------------------- the round editor
export const roundHead = (page: Page): Locator => page.getByTestId('round-head');
/** The item of a round in the list at the left, by its name. */
export const roundItem = (page: Page, name: string): Locator => page.getByTestId('round-item').filter({ hasText: name });
export const publishButton = (page: Page): Locator => page.getByRole('button', { name: 'Publish', exact: true });
export const zoneMapSelect = (page: Page): Locator => page.getByLabel('Zone map', { exact: true });
export const prices = (page: Page): Locator => page.getByTestId('prices');
/** One row of the price matrix: the table type, then one cell per zone with the price and the package content. */
export const priceRow = (page: Page, typeName: string): Locator => prices(page).locator('tbody tr').filter({ hasText: typeName });

/** A new, empty round: its toast, the highlighted item of the list, the empty form. */
export async function newRound(page: Page, name: string): Promise<void> {
  await page.getByPlaceholder('New round name').fill(name);
  await page.getByRole('button', { name: '+ New round' }).click();
  await expectToast(page, `Round "${name}" created`);
  await expect(roundHead(page)).toContainText(name);
  await expect(roundHead(page)).toContainText('Draft');
  await expect(roundItem(page, name)).toHaveAttribute('aria-current', 'true');
  await expect(page.getByLabel('Artist')).toHaveValue('');
}
/** The concert details and the booking-open time; the form then shows its unsaved changes. */
export async function enterDetails(page: Page, o: { artist: string; day: string; doors: string; start: string; bookingOpens: string }): Promise<void> {
  await page.getByLabel('Artist').fill(o.artist);
  await page.getByLabel('Date', { exact: true }).fill(o.day);
  await page.getByLabel('Doors open').fill(o.doors);
  await page.getByLabel('Start', { exact: true }).fill(o.start);
  await page.getByLabel('Booking opens').fill(o.bookingOpens);
  await expect(roundHead(page)).toContainText('Unsaved changes');
}
/** The Active zone map of the round; its name and table count appear in the choice. */
export async function chooseZoneMap(page: Page, map: { id: string; name: string }, tables: number): Promise<void> {
  await zoneMapSelect(page).selectOption(map.id);
  await expect(zoneMapSelect(page)).toContainText(`${map.name} (Active, ${tables} tables)`);
}
/** The price (and package content) of a table type in the one zone of the seeded map. */
export async function setPrice(page: Page, typeName: string, price: number, content?: string): Promise<void> {
  await priceRow(page, typeName).getByRole('spinbutton').fill(String(price));
  if (content !== undefined) await priceRow(page, typeName).getByRole('textbox').fill(content);
}
/** Save draft: the toast, and the head says Saved. */
export async function saveDraft(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expectToast(page, 'Saved');
  await expect(roundHead(page)).toContainText('Saved');
}
/** Validate (it saves the draft first): the box with the result. */
export async function validateRound(page: Page): Promise<Locator> {
  await page.getByRole('button', { name: 'Validate' }).click();
  await expect(validation(page)).toBeVisible();
  return validation(page);
}
/** Publish: the toast, the Published badge, no Discard any more. */
export async function publishRound(page: Page): Promise<void> {
  await publishButton(page).click();
  await expectToast(page, 'Round published');
  await expect(roundHead(page)).toContainText('Published');
  await expect(page.getByRole('button', { name: 'Discard' })).toHaveCount(0);
}
/** The whole of the basic flow on one round: created, filled, priced, validated and published. */
export async function createAndPublishRound(page: Page, o: { name: string; day: string; map: { id: string; name: string }; tables: number; prices: Record<string, number> }): Promise<void> {
  await newRound(page, o.name);
  await enterDetails(page, { artist: 'The E2E Band', day: o.day, doors: localInput(`${o.day}T18:00:00Z`), start: localInput(`${o.day}T20:00:00Z`), bookingOpens: localInput(new Date(Date.now() - 864e5).toISOString()) });
  await chooseZoneMap(page, o.map, o.tables);
  for (const [typeName, price] of Object.entries(o.prices)) await setPrice(page, typeName, price);
  await saveDraft(page);
  await expect(publishButton(page)).toBeDisabled();
  const v = await validateRound(page);
  await expect(v).toContainText('Validation result · no problems');
  await expectToast(page, 'Validation passed');
  await expect(publishButton(page)).toBeEnabled();
  await publishRound(page);
  await expect(roundItem(page, o.name)).toContainText('Published');
}

// ---------------------------------------------------------------- the zone map editor
export const mapHead = (page: Page): Locator => page.getByTestId('map-head');
export const mapItem = (page: Page, name: string): Locator => page.getByTestId('map-item').filter({ hasText: name });
export const properties = (page: Page): Locator => page.getByTestId('table-properties');
export const zoneRows = (page: Page): Locator => page.getByTestId('zone-summary').locator('tbody tr');
export const canvasTables = (page: Page): Locator => page.getByTestId('map-canvas').getByRole('button', { name: /^table \d+, / });

/** A new, empty map editor: its toast, the Draft head, no zone yet. */
export async function newMap(page: Page, name: string): Promise<void> {
  await page.getByPlaceholder('New map name').fill(name);
  await page.getByRole('button', { name: '+ New map' }).click();
  await expectToast(page, `Zone map "${name}" created`);
  await expect(mapHead(page)).toContainText(name);
  await expect(mapHead(page)).toContainText('Draft');
  await expect(mapItem(page, name)).toHaveAttribute('aria-current', 'true');
  await expect(zoneRows(page)).toHaveCount(0);
}
/** A zone added with its name in the "Tables and capacity per zone" card; the head shows the unsaved change. */
export async function addZone(page: Page, name: string): Promise<void> {
  await page.getByLabel('new zone name').fill(name);
  await page.getByRole('button', { name: '+ Add zone' }).click();
  await expect(mapHead(page)).toContainText('Unsaved changes');
}
/** The selected table set in the properties card: number, zone, table type, capacity. */
export async function setTable(page: Page, o: { number: number; zone: string; type: string | null; capacity: number | null }): Promise<void> {
  const card = properties(page);
  await card.getByLabel('Number').fill(String(o.number));
  await card.getByLabel('Zone', { exact: true }).selectOption(o.zone);
  await card.getByLabel('Table type').selectOption(o.type === null ? { label: '—' } : o.type);
  await card.getByLabel('Capacity').fill(o.capacity === null ? '' : String(o.capacity));
}
/** A new table placed on the map (it is selected) and set in the properties card. */
export async function addTable(page: Page, o: { number: number; zone: string; type: string | null; capacity: number | null }): Promise<void> {
  await page.getByRole('button', { name: '+ Add table', exact: true }).click();
  await expect(properties(page)).toContainText('selected');
  await setTable(page, o);
}
/** Save: the toast, and the head says Saved. */
export async function saveMap(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expectToast(page, 'Saved');
  await expect(mapHead(page)).toContainText('Saved');
}
/** Validate (it saves the draft first): the box with the result. */
export async function validateMap(page: Page): Promise<Locator> {
  await page.getByRole('button', { name: 'Validate' }).click();
  await expect(validation(page)).toBeVisible();
  return validation(page);
}

// ---------------------------------------------------------------- a customer, through the gateway
export interface HeldBooking { id: string; roundId: string; tableNumber: number; status: string; holdEndsAt: string; createdAt: string; remainingHoldSeconds: number }
/** A customer's identity on the gateway (the fake auth of the LINE user id). */
export const customerApi = (userId: string): Promise<APIRequestContext> =>
  request.newContext({ baseURL: GATEWAY, extraHTTPHeaders: { 'x-user-id': userId, 'x-role': 'customer' } });
/** A tap on a table of the round, as the customer app makes it. */
export async function holdTable(api: APIRequestContext, roundId: string, tableNumber: number): Promise<HeldBooking> {
  const r = await api.post('/api/bookings', { data: { roundId, tableNumber } });
  expect(r.ok(), `POST /api/bookings -> ${r.status()} ${await r.text()}`).toBeTruthy();
  return (await r.json()) as HeldBooking;
}
export async function cancelBooking(api: APIRequestContext, bookingId: string): Promise<void> {
  const r = await api.post(`/api/bookings/${bookingId}/cancel`);
  expect(r.ok(), `cancel -> ${r.status()} ${await r.text()}`).toBeTruthy();
}
