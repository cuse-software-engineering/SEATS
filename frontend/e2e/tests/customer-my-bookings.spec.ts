// My bookings on the Customer Web App: the held and the cancelled bookings with their badges, newest first, and
// Continue to payment reopening the hold.
import { expect, test } from '../helpers/fixtures';
import { freeDays, seedRound, ZONE, type SeededRound } from '../helpers/seed';
import { cancelBookingAs, holdTableAs } from '../helpers/seed-customers';
import { loginAsLineUser } from '../helpers/ui';
import { chooseMenuItem } from '../helpers/customer';

let round: SeededRound;
let t = '';
let user = '';
const bookings = { held: '', cancelled: '' };

test.beforeAll(async ({ seed }) => {
  t = seed.t;
  user = `U-e2e-${t}-mine`;
  const [day] = await freeDays(seed.api, 1);
  round = await seedRound(seed.api, seed.map.id, { name: `E2E ${t} my bookings`, day });
  bookings.held = await holdTableAs(user, round.id, 1);
  bookings.cancelled = await holdTableAs(user, round.id, 2);
  await cancelBookingAs(user, bookings.cancelled);
});

test('My bookings lists the held and the cancelled bookings with their badges, newest first', async ({ page }) => {
  await loginAsLineUser(page, user);
  await chooseMenuItem(page, 'My bookings');
  await expect(page.getByRole('heading', { name: 'My bookings' })).toBeVisible();
  const cards = page.getByTestId('booking');
  await expect(cards).toHaveCount(2);

  // newest first: the cancelled one was made last
  const cancelled = cards.nth(0);
  await expect(cancelled).toHaveAttribute('data-booking', bookings.cancelled);
  await expect(cancelled.locator('.badge')).toHaveText('Cancelled');
  await expect(cancelled.locator('.badge')).toHaveClass(/dim/);
  await expect(cancelled).toContainText(`The E2E Band · Table ${ZONE.id}2 · Zone ${ZONE.id}`);
  await expect(cancelled).toContainText('Cancelled by you on');
  await expect(cancelled).toContainText('nothing charged');
  await expect(cancelled.getByRole('link')).toHaveCount(0);

  const held = cards.nth(1);
  await expect(held).toHaveAttribute('data-booking', bookings.held);
  await expect(held.locator('.badge')).toHaveText('Held');
  await expect(held.locator('.badge')).toHaveClass(/hatch/);
  await expect(held).toContainText(`The E2E Band · Table ${ZONE.id}1 · Zone ${ZONE.id}`);
  await expect(held).toContainText(/Hold ends in \d\d:\d\d · pay to confirm/);
  await expect(held.getByRole('link', { name: 'Continue to payment' })).toBeVisible();
  await expect(page.getByText('Bookings are listed newest first.')).toBeVisible();
});

test('Continue to payment reopens the hold', async ({ page }) => {
  await loginAsLineUser(page, user);
  await page.goto('/my-bookings');
  await page.getByTestId('booking').filter({ has: page.getByRole('link', { name: 'Continue to payment' }) }).getByRole('link', { name: 'Continue to payment' }).click();
  await expect(page).toHaveURL(new RegExp(`/bookings/${bookings.held}$`));
  await expect(page.getByRole('heading', { name: 'Your table is held' })).toBeVisible();
  await expect(page.getByTestId('countdown')).toHaveText(/^\d\d:\d\d$/);
  await expect(page.getByTestId('summary')).toContainText(`Table ${ZONE.id}1 · Zone ${ZONE.id}`);
  await expect(page.getByTestId('fee-total')).toHaveText(/THB$/);   // the party size defaults to the capacity
  await expect(page.getByRole('button', { name: 'Continue' })).toBeEnabled();
});
