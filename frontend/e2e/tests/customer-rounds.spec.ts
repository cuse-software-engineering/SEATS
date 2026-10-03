// The round list and the shell of the Customer Web App: the badge of every kind of round, the ⋮ menu, logging out,
// the return to the screen asked for after the login, Cancel on the login dialog, and the not-found screen.
import { expect, test } from '../helpers/fixtures';
import { freeDays, seedRound, TABLES, type SeededRound } from '../helpers/seed';
import { holdEveryTableAs } from '../helpers/seed-customers';
import { loginAsLineUser, roundCard, roundTitle, startAtOf, toastWith } from '../helpers/ui';
import { chooseMenuItem, logOut, openMenu } from '../helpers/customer';

const rounds = {} as Record<'open' | 'later' | 'soldOut', SeededRound>;
let t = '';

test.beforeAll(async ({ seed }) => {
  t = seed.t;
  const [d1, d2, d3] = (await freeDays(seed.api, 3)).sort();
  rounds.open = await seedRound(seed.api, seed.map.id, { name: `E2E ${t} open`, day: d1 });
  rounds.later = await seedRound(seed.api, seed.map.id, { name: `E2E ${t} not yet open`, day: d2, bookingOpenAt: new Date(Date.now() + 2 * 864e5).toISOString() });
  rounds.soldOut = await seedRound(seed.api, seed.map.id, { name: `E2E ${t} sold out`, day: d3 });
  await holdEveryTableAs(`U-e2e-${t}-other`, rounds.soldOut.id, TABLES.map((x) => x.tableNumber));   // every table held by someone else
});

test('the round list shows the rounds in date order with the right badge', async ({ page }) => {
  await loginAsLineUser(page, `U-e2e-${t}-list`);

  // open: the badge, the booking-open time, Select this round
  const open = roundCard(page, rounds.open.id);
  await expect(open).toContainText(roundTitle(startAtOf(rounds.open.date)));
  await expect(open).toContainText('The E2E Band');
  await expect(open.locator('.badge')).toHaveText('Open');
  await expect(open).toContainText('Booking opened');
  await expect(open.getByRole('link', { name: 'Select this round' })).toBeVisible();

  // not yet open: the hatched badge, when the booking opens, a disabled "Opens in …" and no link
  const later = roundCard(page, rounds.later.id);
  await expect(later.locator('.badge')).toHaveText('Not yet open');
  await expect(later).toContainText('Booking opens');
  await expect(later.getByRole('button', { name: /^Opens in \d+ (day|hour)s?$/ })).toBeDisabled();
  await expect(later.getByRole('link')).toHaveCount(0);

  // sold out: the filled badge, "All tables booked", a disabled Sold out and no link
  const soldOut = roundCard(page, rounds.soldOut.id);
  await expect(soldOut.locator('.badge')).toHaveText('Sold out');
  await expect(soldOut).toContainText('All tables booked');
  await expect(soldOut.getByRole('button', { name: 'Sold out' })).toBeDisabled();
  await expect(soldOut.getByRole('link')).toHaveCount(0);

  // in date order: the three rounds of this run appear in the order of their days, whatever else is listed
  const mine = new Set([rounds.open.id, rounds.later.id, rounds.soldOut.id]);
  const shown = (await page.getByTestId('round').evaluateAll((cards) => cards.map((c) => c.getAttribute('data-round') ?? ''))).filter((id) => mine.has(id));
  expect(shown).toEqual([rounds.open, rounds.later, rounds.soldOut].sort((a, b) => a.date.localeCompare(b.date)).map((r) => r.id));
  await expect(page.getByText('Rounds are listed by date.')).toBeVisible();
});

test('the ⋮ menu opens My bookings, returns to the concert rounds and logs out', async ({ page }) => {
  await loginAsLineUser(page, `U-e2e-${t}-menu`);
  await openMenu(page);
  await expect(page.getByRole('menuitem', { name: 'Concert rounds' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'My bookings' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: /^Log out/ })).toContainText(`U-e2e-${t}-menu`);

  // My bookings: empty for a new customer, with the way to a round
  await page.getByRole('menuitem', { name: 'My bookings' }).click();
  await expect(page).toHaveURL(/\/my-bookings$/);
  await expect(page.getByRole('heading', { name: 'My bookings' })).toBeVisible();
  await expect(page.getByText('No booking yet')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Choose a concert round' })).toBeVisible();

  // back to the concert rounds
  await chooseMenuItem(page, 'Concert rounds');
  await expect(page.getByRole('heading', { name: 'Concert rounds' })).toBeVisible();
  await expect(roundCard(page, rounds.open.id)).toBeVisible();

  // Log out: the login dialog is back, the toast says so, the footer no longer names anyone
  await logOut(page);
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator('.identity')).toHaveCount(0);

  // the next visit asks to log in again
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'LINE Login' })).toBeVisible();
  await page.goto('/my-bookings');
  await expect(page).toHaveURL(/\/login$/);
});

test('after the login the customer lands on the screen they asked for', async ({ page }) => {
  await page.goto('/my-bookings');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'LINE Login' })).toBeVisible();
  const user = `U-e2e-${t}-return`;
  await page.getByLabel('LINE user id').fill(user);
  await page.getByRole('button', { name: 'Allow' }).click();
  await expect(toastWith(page, 'Logged in as')).toHaveText(`Logged in as ${user}`);
  await expect(page).toHaveURL(/\/my-bookings$/);
  await expect(page.getByRole('heading', { name: 'My bookings' })).toBeVisible();
});

test('Cancel on the LINE Login dialog stays on the chat and says so', async ({ page }) => {
  await page.goto('/login');
  const field = page.getByLabel('LINE user id');
  await field.fill('U-nobody');
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(toastWith(page, 'Login cancelled')).toHaveText('Login cancelled. Log in to reserve a table.');
  await expect(field).toHaveValue('');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'LINE Login' })).toBeVisible();
});

test('an unknown address shows the not-found screen with a way home', async ({ page }) => {
  await loginAsLineUser(page, `U-e2e-${t}-lost`);
  await page.goto('/no-such-screen');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  await expect(page.getByText('There is no screen at this address.')).toBeVisible();
  await expect(page).toHaveTitle(/^Page not found · /);
  await page.getByRole('link', { name: 'Go to the concert rounds' }).click();
  await expect(page.getByRole('heading', { name: 'Concert rounds' })).toBeVisible();
  await expect(page).toHaveTitle(/^Concert rounds · /);
});
