// UC-01 Reserve a Specific Table (project document, Section 2.2.1) on the Customer Web App, from the login to the
// payment. The Active zone map and the rounds are seeded through the gateway as the manager; every test has its own
// round. Every step asserts what the customer sees after the click: the screen, and the toast or the dialog.
import { expect, test, type APIRequestContext } from '@playwright/test';
import { freeDays, managerApi, PRICES, ROUND2, seedRound, seedZoneMap, SOFA6, tag, ZONE, type SeededRound } from '../helpers/seed';
import { bookingCard, holdTable, loginAsLineUser, openRound, roundCard, roundTitle, startAtOf, tableButton, thbText, toastWith } from '../helpers/ui';
import { answerDialog, confirmDialog } from '../helpers/customer';

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
  // steps 1–2: the LINE user id stands in for LINE Login; the toast and the footer name the customer
  const user = `U-e2e-${t}-basic`;
  await loginAsLineUser(page, user);

  // step 3: the round list shows the round with artist, date and start, the booking-open time and the status Open
  const card = roundCard(page, rounds.basic.id);
  await expect(card).toContainText('The E2E Band');
  await expect(card).toContainText(roundTitle(startAtOf(rounds.basic.date)));
  await expect(card).toContainText('Booking opened');
  await expect(card.locator('.badge')).toHaveText('Open');

  // steps 4–5: the zone map: the zone, a shape per table with its label and status, the price line of the zone
  await openRound(page, rounds.basic);
  await expect(page.getByTestId('table-map')).toContainText(ZONE.name);
  const table1 = tableButton(page, 1, 'available');
  await expect(table1).toContainText(`${ZONE.id}1`);
  await expect(table1).toHaveAttribute('title', new RegExp(`${SOFA6.name} · ${SOFA6.capacity} seats`));
  await expect(page.getByTestId('price-lines')).toContainText(
    `Zone ${ZONE.id}: ○ ${ROUND2.capacity} p ${PRICES[ROUND2.id].toLocaleString('en-US')} · sofa ${SOFA6.capacity} p ${PRICES[SOFA6.id].toLocaleString('en-US')} THB`);

  // steps 6–8: the tap holds the table: the toast says so, the summary shows the remaining hold time (15 minutes,
  // BRULE-02) in its app bar
  await holdTable(page, 1);
  await expect(toastWith(page, 'is held for you')).toHaveText(`Table ${ZONE.id}1 is held for you for 15 minutes`);
  await expect(page.getByTestId('countdown')).toHaveText(/^1[45]:\d\d$/);
  await expect(page.getByText(/^The table is held for you for 15 minutes \(until \d\d:\d\d\)\./)).toBeVisible();

  // step 9: the booking summary (round and artist, table, zone, type, package)
  const summary = page.getByTestId('summary');
  await expect(summary).toContainText('The E2E Band');
  await expect(summary).toContainText(`Table ${ZONE.id}1 · Zone ${ZONE.id} · ${SOFA6.name}`);
  await expect(summary).toContainText(`Package: ${thbText(PRICES[SOFA6.id])}`);

  // steps 10–11: the party size stepper; one person above the 6 seats adds the extra-person fee (BRULE-09); the
  // toast confirms the new party size and the fee follows
  await expect(page.getByTestId('party-size')).toHaveText(String(SOFA6.capacity));   // the party size starts at the capacity
  await expect(page.getByTestId('fee-total')).toHaveText(thbText(PRICES[SOFA6.id]));   // and the fee is the package price
  await page.getByRole('button', { name: 'more' }).click();
  await expect(toastWith(page, 'Party size set to')).toHaveText(`Party size set to ${SOFA6.capacity + 1}`);
  await expect(page.getByTestId('party-size')).toHaveText(String(SOFA6.capacity + 1));
  const fee = page.getByTestId('fee');
  await expect(fee).toContainText(`Package price${thbText(PRICES[SOFA6.id])}`);
  await expect(page.getByText(/^1 extra person × [\d,]+ THB$/)).toBeVisible();
  const extraFee = Number(/([\d,]+) THB/.exec((await page.getByTestId('fee-extra').textContent()) ?? '')?.[1].replace(/,/g, ''));
  expect(extraFee).toBeGreaterThan(0);
  await expect(page.getByTestId('fee-total')).toHaveText(thbText(PRICES[SOFA6.id] + extraFee));
  await expect(page.getByText('Paid in full now; nothing to pay at the venue.')).toBeVisible();

  // step 12: the first booking asks for the consent, the name and the mobile phone (UC-09); the toast says they are saved
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Your details' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Why we ask' })).toBeVisible();
  await page.getByLabel('Name', { exact: true }).fill('Somchai E2E');
  await page.getByLabel('Mobile phone', { exact: true }).fill('0812345678');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(toastWith(page, 'Details saved')).toHaveText('Details saved');

  // steps 13–14: the terms with the check-in window; Pay is disabled until they are accepted, then Pay the full
  // table fee; the toast records the acceptance
  await expect(page.getByRole('heading', { name: 'Booking terms' })).toBeVisible();
  const terms = page.getByTestId('terms');
  await expect(terms.locator('li').first()).toBeVisible();
  await expect(terms).toContainText('Check-in opens');
  await expect(terms).toContainText('The table is kept until');
  const pay = page.getByRole('button', { name: `Pay ${thbText(PRICES[SOFA6.id] + extraFee)}` });
  await expect(pay).toBeDisabled();
  await page.getByRole('checkbox').check();
  await expect(pay).toBeEnabled();
  await pay.click();
  await expect(toastWith(page, 'Terms accepted')).toHaveText('Terms accepted');

  // step 15: the amount and the hosted checkout (UC-10); the payment step is not available yet and the screen
  // says so in plain words, in the card and in a toast
  await expect(page.getByRole('heading', { name: 'Payment' })).toBeVisible();
  await expect(page.getByTestId('amount')).toHaveText(thbText(PRICES[SOFA6.id] + extraFee));
  await expect(page.getByTestId('payment-notice')).toContainText('The payment step is not available yet.');
  await expect(page.getByTestId('payment-notice')).not.toContainText('501');
  await expect(page.getByTestId('toast').filter({ hasText: 'Could not' })).toHaveCount(0);   // the screen explains it; no error toast
  await expect(page.getByText('No payment to wait for.')).toBeVisible();
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
    await openRound(pageB, rounds.taken);
    await expect(tableButton(pageB, 1, 'available')).toBeEnabled();
    stale = true;

    // the first customer holds table 1 (first lock wins, BRULE-03)
    await loginAsLineUser(pageA, `U-e2e-${t}-first`);
    await openRound(pageA, rounds.taken);
    await holdTable(pageA, 1);

    // AF-3 step 1: the second customer taps the same table and is told, in the toast, that it has just been taken
    await tableButton(pageB, 1, 'available').click();
    await expect(toastWith(pageB, 'was just taken')).toHaveText(`Table ${ZONE.id}1 was just taken by another customer. The map has been refreshed.`);
    await expect(pageB).toHaveURL(new RegExp(`/rounds/${rounds.taken.id}$`));   // still on the map, no hold
    await expect(pageB.getByRole('heading', { name: 'Your table is held' })).toHaveCount(0);

    // AF-3 step 2: the map refreshes and shows the table held
    stale = false;
    release.splice(0).forEach((r) => r());
    await expect(tableButton(pageB, 1, 'held')).toBeVisible();
    await expect(tableButton(pageB, 1, 'held')).toBeDisabled();
    await expect(tableButton(pageB, 2, 'available')).toBeEnabled();
  } finally {
    await first.close();
    await second.close();
  }
});

test('UC-01 AF-4 Customer Cancels During the Hold', async ({ page }) => {
  await loginAsLineUser(page, `U-e2e-${t}-cancel`);
  await openRound(page, rounds.cancel);
  await holdTable(page, 1);

  // AF-4 step 1: Cancel hold asks first, names the table, and releases the hold at once on Release the table; the
  // toast says the table is available again and the map shows it so
  await page.getByRole('button', { name: 'Cancel hold' }).click();
  await expect(confirmDialog(page, 'Cancel the hold?')).toContainText(`Table ${ZONE.id}1 will be released and may be taken by someone else.`);
  await answerDialog(page, 'Cancel the hold?', 'Release the table');
  await expect(toastWith(page, 'Hold cancelled')).toHaveText(`Hold cancelled. Table ${ZONE.id}1 is available again.`);
  await expect(page).toHaveURL(new RegExp(`/rounds/${rounds.cancel.id}$`));
  await expect(tableButton(page, 1, 'available')).toBeEnabled();
  await expect(page.getByTestId('table-map').getByRole('button', { name: /, held$/ })).toHaveCount(0);

  // the booking is Cancelled under My bookings
  await page.goto('/my-bookings');
  const card = bookingCard(page, rounds.cancel.id);
  await expect(card).toContainText(`Table ${ZONE.id}1`);
  await expect(card.locator('.badge')).toHaveText('Cancelled');
  await expect(card).toContainText('Cancelled by you');
});

test('UC-01 AF-1 Round Not Yet Open for Booking', async ({ page }) => {
  await loginAsLineUser(page, `U-e2e-${t}-early`);

  // the round list shows the round with its booking-open time and the status Not yet open; it cannot be selected
  const card = roundCard(page, rounds.notYetOpen.id);
  await expect(card).toBeVisible();
  await expect(card.locator('.badge')).toHaveText('Not yet open');
  await expect(card).toContainText('Booking opens');
  await expect(card.getByRole('button', { name: /^Opens in \d+ (day|hour)s?$/ })).toBeDisabled();
  await expect(card.getByRole('link')).toHaveCount(0);

  // the map of an open round stays reachable: the basic flow resumes at {Browse Rounds}
  await expect(roundCard(page, rounds.basic.id).getByRole('link', { name: 'Select this round' })).toBeVisible();
});
