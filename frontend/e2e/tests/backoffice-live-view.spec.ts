// The live view of the Back-office Web App: the seeded round picked, a table held through the gateway as a customer
// turns held on the map within 3 seconds and appears in the bookings; cancelled, it turns available again.
import { expect, test, type APIRequestContext } from '@playwright/test';
import { freeDays, managerApi, seedRound, seedZoneMap, tag, TABLES, type SeededRound } from '../helpers/seed';
import { cancelBooking, customerApi, holdTable, openScreen } from '../helpers/backoffice';
import { signInAsManager, tableButton } from '../helpers/ui';

const t = tag();
let api: APIRequestContext;
let round: SeededRound;

test.beforeAll(async () => {
  api = await managerApi();
  const map = await seedZoneMap(api, t);
  const [day] = await freeDays(api, 1);
  round = await seedRound(api, map.id, { name: `E2E ${t} live`, day });
});
test.afterAll(async () => { await api.dispose(); });

test('a table held by a customer turns held within 3 seconds and shows in the bookings; cancelled, it turns available', async ({ page }) => {
  await signInAsManager(page);
  await openScreen(page, 'Live view');
  await expect(page.getByText('No round chosen')).toBeVisible();

  // the seeded round: its map with every table available, the counts, no booking yet
  await page.getByLabel('Round').selectOption(round.id);
  await expect(tableButton(page, 1, 'available')).toBeVisible();
  await expect(page.getByTestId('counts')).toContainText(`Available ${TABLES.length}`);
  await expect(page.getByText('No booking yet.')).toBeVisible();

  // a customer holds table 1 through the gateway: within 3 s the shape is held and the bookings table has the row
  const user = `U-e2e-${t}-live`;
  const customer = await customerApi(user);
  const booking = await holdTable(customer, round.id, 1);
  await expect(tableButton(page, 1, 'held')).toBeVisible({ timeout: 3000 });
  const row = page.getByTestId('bookings').locator('tbody tr').filter({ hasText: user });
  await expect(row).toContainText('A1', { timeout: 3000 });
  await expect(row).toContainText('Held');
  await expect(page.getByTestId('counts')).toContainText('Held 1');
  await expect(page.getByTestId('counts')).toContainText(`Available ${TABLES.length - 1}`);
  await expect(page.getByText(/last change \d\d:\d\d:\d\d/)).toBeVisible();

  // cancelled through the gateway: the table turns available again and the row no longer says Held
  await cancelBooking(customer, booking.id);
  await expect(tableButton(page, 1, 'available')).toBeVisible({ timeout: 3000 });
  await expect(page.getByTestId('counts')).toContainText(`Available ${TABLES.length}`);
  await expect(row.filter({ hasText: 'Held' })).toHaveCount(0, { timeout: 3000 });
  await customer.dispose();
});
