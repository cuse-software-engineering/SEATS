// UC-01 Reserve a Specific Table (project document, Section 2.2.1) on the Customer Web App, screens C1 to C7.
// The Active zone map and the rounds are seeded through the gateway as the manager; every test has its own round.
import { expect, test, type APIRequestContext } from '@playwright/test';
import { freeDays, managerApi, PRICES, seedRound, seedZoneMap, SOFA6, tag, TABLES, thb, ZONE, type SeededRound } from '../helpers/seed';
import { holdTable, loginAsLineUser, openRound, tableButton } from '../helpers/ui';

const t = tag();
let api: APIRequestContext;
const rounds = {} as Record<'basic' | 'taken' | 'cancel' | 'notYetOpen', SeededRound>;

test.beforeAll(async () => {
  api = await managerApi();
  const map = await seedZoneMap(api, t);
  const [d1, d2, d3, d4] = await freeDays(api, 4);
  rounds.basic = await seedRound(api, map.id, { name: `E2E ${t} basic flow`, day: d1 });
  rounds.taken = await seedRound(api, map.id, { name: `E2E ${t} AF-3`, day: d2 });
  rounds.cancel = await seedRound(api, map.id, { name: `E2E ${t} AF-4`, day: d3 });
  rounds.notYetOpen = await seedRound(api, map.id, { name: `E2E ${t} AF-1`, day: d4, bookingOpenAt: new Date(Date.now() + 864e5).toISOString() });
});
test.afterAll(async () => { await api.dispose(); });

test('UC-01 basic flow Reserve a Specific Table', async ({ page }) => {
  // steps 1–2: C1, the LINE user id stands in for LINE Login
  const user = `U-e2e-${t}-basic`;
  await loginAsLineUser(page, user);

  // step 3: C2 lists the round with artist, date, booking-open time and status "open"
  const row = page.getByRole('row', { name: rounds.basic.name });
  await expect(row).toContainText('The E2E Band');
  await expect(row).toContainText(rounds.basic.date);
  await expect(row).toContainText(`open · ${TABLES.length}/${TABLES.length} tables`);

  // steps 4–5: C3, the zone map with number, zone, table type, package price and status of every table
  await openRound(page, rounds.basic.name);
  await expect(page.getByTestId('table-map')).toContainText(ZONE.name);
  const table1 = tableButton(page, 1, 'available');
  await expect(table1).toContainText('#1');
  await expect(table1).toContainText(`${SOFA6.name} · ${SOFA6.capacity} seats`);
  await expect(table1).toContainText(thb(PRICES[SOFA6.id]));
  await expect(page.getByTestId('counts').locator('div').first()).toHaveText(`${TABLES.length}available`);

  // steps 6–8: the tap holds the table; C4 shows the remaining hold time (15 minutes, BRULE-02)
  await holdTable(page, 1);
  await expect(page.getByTestId('countdown')).toHaveText(/^1[45]:\d\d$/);
  await expect(page.getByText(/^Table 1 is held for you until /)).toBeVisible();

  // step 9: the booking summary (round, table, type, seats, status Held)
  const summary = page.getByTestId('summary');
  await expect(summary).toContainText(rounds.basic.name);
  await expect(summary).toContainText(`#1 · ${ZONE.name} · ${SOFA6.id} · ${SOFA6.capacity} seats`);
  await expect(summary).toContainText('Held');

  // steps 10–11: the party size stepper; one person above the 6 seats adds the extra-person fee (BRULE-09)
  await expect(page.getByTestId('party-size')).toHaveText(String(SOFA6.capacity));
  await expect(page.getByText('Set the party size to see the full table fee.')).toBeVisible();
  await page.getByRole('button', { name: 'more' }).click();
  await expect(page.getByTestId('party-size')).toHaveText(String(SOFA6.capacity + 1));
  const fee = page.getByTestId('fee');
  await expect(fee).toContainText(`Package price (BRULE-08)${thb(PRICES[SOFA6.id])}`);
  await expect(fee).toContainText('Extra persons: 1 ×');
  const extraFee = Number(/× ฿([\d,]+)/.exec((await fee.locator('tr').nth(1).textContent()) ?? '')?.[1].replace(/,/g, ''));
  expect(extraFee).toBeGreaterThan(0);
  await expect(page.getByTestId('fee-total')).toHaveText(thb(PRICES[SOFA6.id] + extraFee));

  // step 12: C5, the first booking asks for consent, name and phone (UC-09)
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Your details' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Why we ask (UC-09)' })).toBeVisible();
  await page.getByLabel('Name', { exact: true }).fill('Somchai E2E');
  await page.getByLabel('Phone', { exact: true }).fill('0812345678');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Continue' }).click();

  // steps 13–14: C6, the terms with the check-in window; Accept and pay the full table fee
  await expect(page.getByRole('heading', { name: 'Booking terms' })).toBeVisible();
  await expect(page.getByTestId('terms').locator('li').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Check-in window (BRULE-04, BRULE-05)' })).toBeVisible();
  await expect(page.getByText(/^Check-in opens .* the concert starts .* the grace period ends /)).toBeVisible();
  await page.getByRole('button', { name: `Accept and pay ${thb(PRICES[SOFA6.id] + extraFee)}` }).click();

  // step 15: C7, the amount and the payment (UC-10), which progress 1 answers with 501
  await expect(page.getByRole('heading', { name: 'Payment' })).toBeVisible();
  await expect(page.locator('.countdown')).toHaveText(thb(PRICES[SOFA6.id] + extraFee));
  await expect(page.getByTestId('payment-notice')).toContainText('Payment comes in progress 2.');
  await expect(page.getByTestId('payment-notice')).toContainText('501');
});

test('UC-01 AF-3 Table Just Taken by Another Customer', async ({ browser }) => {
  const first = await browser.newContext();
  const second = await browser.newContext();
  const pageA = await first.newPage();
  const pageB = await second.newPage();
  try {
    // The second customer's map is kept stale: its polled read (ADR-09) is held back until released, which is the
    // window between the first customer's hold and the refresh of the map.
    let stale = false;
    const release: (() => void)[] = [];
    await pageB.route('**/api/rounds/*/table-status', async (route) => {
      if (stale) await new Promise<void>((r) => release.push(r));
      await route.continue();
    });
    await loginAsLineUser(pageB, `U-e2e-${t}-second`);
    await openRound(pageB, rounds.taken.name);
    await expect(tableButton(pageB, 1, 'available')).toBeEnabled();
    stale = true;

    // the first customer holds table 1 (first lock wins, BRULE-03)
    await loginAsLineUser(pageA, `U-e2e-${t}-first`);
    await openRound(pageA, rounds.taken.name);
    await holdTable(pageA, 1);
    await expect(pageA.getByText(/^Table 1 is held for you until /)).toBeVisible();

    // AF-3 step 1: the second customer taps the same table and is told it has just been taken
    await tableButton(pageB, 1, 'available').click();
    const alert = pageB.getByRole('alert');
    await expect(alert).toContainText('Error 409');
    await expect(alert).toContainText('the table has just been taken by another customer');
    await expect(pageB.getByRole('heading', { name: rounds.taken.name })).toBeVisible();   // still on C3, no hold

    // AF-3 step 2: the map refreshes and shows the table held
    stale = false;
    release.splice(0).forEach((r) => r());
    await expect(tableButton(pageB, 1, 'held')).toBeVisible();
    await expect(tableButton(pageB, 1, 'held')).toBeDisabled();
    await expect(pageB.getByTestId('counts').locator('div').nth(1)).toHaveText('1held');
    await expect(tableButton(pageB, 2, 'available')).toBeEnabled();
  } finally {
    await first.close();
    await second.close();
  }
});

test('UC-01 AF-4 Customer Cancels During the Hold', async ({ page }) => {
  await loginAsLineUser(page, `U-e2e-${t}-cancel`);
  await openRound(page, rounds.cancel.name);
  await holdTable(page, 1);

  // AF-4 step 1: Cancel releases the hold at once; C3 shows the table available again
  await page.getByRole('button', { name: 'Cancel the hold' }).click();
  await expect(page.getByRole('heading', { name: rounds.cancel.name })).toBeVisible();
  await expect(tableButton(page, 1, 'available')).toBeEnabled();
  await expect(page.getByTestId('counts').locator('div').first()).toHaveText(`${TABLES.length}available`);
  await expect(page.getByTestId('counts').locator('div').nth(1)).toHaveText('0held');

  // the booking is Cancelled under My Bookings (C9)
  await page.getByRole('link', { name: 'My Bookings' }).click();
  const row = page.getByRole('row', { name: rounds.cancel.id });
  await expect(row).toContainText('#1');
  await expect(row).toContainText('Cancelled');
});

test('UC-01 AF-1 Round Not Yet Open for Booking', async ({ page }) => {
  await loginAsLineUser(page, `U-e2e-${t}-early`);

  // C2 lists the round with its booking-open time and the status "not yet open"; it cannot be chosen
  const row = page.getByRole('row', { name: rounds.notYetOpen.name });
  await expect(row).toBeVisible();
  await expect(row).toContainText('not yet open');
  await expect(row).toContainText(/opens \d/);
  await expect(row).not.toContainText('Choose a table');
  await expect(row.getByRole('link')).toHaveCount(0);

  // the map of an open round stays reachable: the basic flow resumes at {Browse Rounds}
  await expect(page.getByRole('row', { name: rounds.basic.name }).getByRole('link', { name: 'Choose a table' })).toBeVisible();
});
