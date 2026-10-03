// The booking steps of the Customer Web App: the hold and its toast, the map showing the table held and a second
// customer refused, the party size and the fee, the cancel dialog, the terms and the payment screen.
import { expect, test } from '../helpers/fixtures';
import { freeDays, PRICES, ROUND2, seedRound, SOFA6, ZONE, type SeededRound } from '../helpers/seed';
import { holdTable, loginAsLineUser, openRound, tableButton, thbText, toastWith } from '../helpers/ui';
import { acceptTermsAndPay, answerDialog, confirmDialog, continueToDetails, fillDetails, freezeTableMap, submitDetails } from '../helpers/customer';

const rounds = {} as Record<'hold' | 'taken' | 'terms', SeededRound>;
let t = '';

test.beforeAll(async ({ seed }) => {
  t = seed.t;
  const [d1, d2, d3] = await freeDays(seed.api, 3);
  rounds.hold = await seedRound(seed.api, seed.map.id, { name: `E2E ${t} hold`, day: d1 });
  rounds.taken = await seedRound(seed.api, seed.map.id, { name: `E2E ${t} taken`, day: d2 });
  rounds.terms = await seedRound(seed.api, seed.map.id, { name: `E2E ${t} terms`, day: d3 });
});

test('holding a table says so, the map shows it held, and a second customer who taps it is refused', async ({ browser }) => {
  const first = await browser.newContext();
  const second = await browser.newContext();
  const pageA = await first.newPage();
  const pageB = await second.newPage();
  try {
    // the second customer opens the map first and keeps it stale from here on
    const map = await freezeTableMap(pageB);
    await loginAsLineUser(pageB, `U-e2e-${t}-second`);
    await openRound(pageB, rounds.taken);
    await expect(tableButton(pageB, 1, 'available')).toBeEnabled();
    map.freeze();

    // the first customer taps table 1: the toast says it is held, the summary shows the countdown
    await loginAsLineUser(pageA, `U-e2e-${t}-first`);
    await openRound(pageA, rounds.taken);
    await tableButton(pageA, 1, 'available').click();
    await expect(toastWith(pageA, 'is held for you')).toHaveText(new RegExp(`^Table ${ZONE.id}1 is held for you for \\d+ minutes$`));
    await expect(pageA.getByRole('heading', { name: 'Your table is held' })).toBeVisible();
    await expect(pageA.getByTestId('countdown')).toHaveText(/^\d\d:\d\d$/);

    // back on the map the table is held (and not tappable), its neighbour still available
    await pageA.getByRole('link', { name: 'Back' }).click();
    await expect(pageA).toHaveURL(new RegExp(`/rounds/${rounds.taken.id}$`));
    await expect(tableButton(pageA, 1, 'held')).toBeDisabled();
    await expect(tableButton(pageA, 2, 'available')).toBeEnabled();

    // the second customer, on the stale map, taps the same table: refused with the "just taken" toast, no hold
    await tableButton(pageB, 1, 'available').click();
    await expect(toastWith(pageB, 'was just taken')).toHaveText(`Table ${ZONE.id}1 was just taken by another customer. The map has been refreshed.`);
    await expect(pageB).toHaveURL(new RegExp(`/rounds/${rounds.taken.id}$`));
    map.release();
    await expect(tableButton(pageB, 1, 'held')).toBeDisabled();
  } finally {
    await first.close();
    await second.close();
  }
});

test('the party size follows the stepper and the fee follows the party size', async ({ page }) => {
  await loginAsLineUser(page, `U-e2e-${t}-party`);
  await openRound(page, rounds.hold);
  await holdTable(page, 1);   // a 6-person sofa at 7,200
  const size = page.getByTestId('party-size');
  const total = page.getByTestId('fee-total');
  const price = PRICES[SOFA6.id];

  // the party size starts at the capacity: no extra person, the fee is the package price
  await expect(size).toHaveText(String(SOFA6.capacity));
  await expect(total).toHaveText(thbText(price));
  await expect(page.getByText('no extra person')).toBeVisible();

  // one more: the toast confirms, one extra person is charged
  await page.getByRole('button', { name: 'more' }).click();
  await expect(toastWith(page, 'Party size set to')).toHaveText(`Party size set to ${SOFA6.capacity + 1}`);
  await expect(size).toHaveText(String(SOFA6.capacity + 1));
  const unit = Number(/([\d,]+) THB/.exec((await page.getByTestId('fee-extra').textContent()) ?? '')?.[1].replace(/,/g, ''));
  expect(unit).toBeGreaterThan(0);
  await expect(page.getByText(`1 extra person × ${thbText(unit)}`)).toBeVisible();
  await expect(total).toHaveText(thbText(price + unit));

  // two more: two extra persons
  await page.getByRole('button', { name: 'more' }).click();
  await expect(toastWith(page, `Party size set to ${SOFA6.capacity + 2}`)).toBeVisible();
  await expect(size).toHaveText(String(SOFA6.capacity + 2));
  await expect(page.getByText(`2 extra persons × ${thbText(unit)}`)).toBeVisible();
  await expect(total).toHaveText(thbText(price + 2 * unit));

  // down again: the fee follows, back to the package price at the capacity, and below it nothing more is charged
  await page.getByRole('button', { name: 'fewer' }).click();
  await expect(toastWith(page, `Party size set to ${SOFA6.capacity + 1}`)).toBeVisible();
  await expect(total).toHaveText(thbText(price + unit));
  await page.getByRole('button', { name: 'fewer' }).click();
  await expect(toastWith(page, `Party size set to ${SOFA6.capacity}`)).toBeVisible();
  await expect(total).toHaveText(thbText(price));
  await expect(page.getByText('no extra person')).toBeVisible();
  await page.getByRole('button', { name: 'fewer' }).click();
  await expect(size).toHaveText(String(SOFA6.capacity - 1));
  await expect(total).toHaveText(thbText(price));
});

test('cancelling the hold asks first: Keep the hold keeps it, Release the table frees it on the map', async ({ page }) => {
  await loginAsLineUser(page, `U-e2e-${t}-cancel`);
  await openRound(page, rounds.hold);
  await holdTable(page, 2);

  // the dialog names the table; Keep the hold closes it and the hold goes on
  await page.getByRole('button', { name: 'Cancel hold' }).click();
  const dialog = confirmDialog(page, 'Cancel the hold?');
  await expect(dialog).toContainText(`Table ${ZONE.id}2 will be released and may be taken by someone else.`);
  await dialog.getByRole('button', { name: 'Keep the hold' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Your table is held' })).toBeVisible();
  await expect(page.getByTestId('countdown')).toBeVisible();
  await expect(page).toHaveURL(/\/bookings\/[^/]+$/);

  // Release the table: the toast says the table is available again and the map shows it so
  await page.getByRole('button', { name: 'Cancel hold' }).click();
  await answerDialog(page, 'Cancel the hold?', 'Release the table');
  await expect(toastWith(page, 'Hold cancelled')).toHaveText(`Hold cancelled. Table ${ZONE.id}2 is available again.`);
  await expect(page).toHaveURL(new RegExp(`/rounds/${rounds.hold.id}$`));
  await expect(tableButton(page, 2, 'available')).toBeEnabled();
});

test('the terms: Pay is disabled until the box is ticked; declining asks and then cancels the booking', async ({ page }) => {
  await loginAsLineUser(page, `U-e2e-${t}-terms`);
  await openRound(page, rounds.terms);
  await holdTable(page, 3);   // a 2-person round table at 2,400
  await continueToDetails(page);
  await fillDetails(page, { name: 'Terms E2E', phone: '0812345678' });
  await submitDetails(page);

  // Pay follows the box
  const pay = page.getByRole('button', { name: `Pay ${thbText(PRICES[ROUND2.id])}` });
  const box = page.getByRole('checkbox', { name: 'I have read and accept the booking terms' });
  await expect(pay).toBeDisabled();
  await box.check();
  await expect(pay).toBeEnabled();
  await box.uncheck();
  await expect(pay).toBeDisabled();

  // declining asks first; Keep the booking leaves everything as it is
  await page.getByRole('button', { name: 'Decline the terms and cancel the booking' }).click();
  const dialog = confirmDialog(page, 'Decline the terms?');
  await expect(dialog).toContainText('Your booking will be cancelled and the table released.');
  await dialog.getByRole('button', { name: 'Keep the booking' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Booking terms' })).toBeVisible();
  await expect(page.getByTestId('countdown')).toBeVisible();

  // Decline and cancel: the toast says the table is free again and the round list is back
  await page.getByRole('button', { name: 'Decline the terms and cancel the booking' }).click();
  await answerDialog(page, 'Decline the terms?', 'Decline and cancel');
  await expect(toastWith(page, 'Booking cancelled')).toHaveText(`Booking cancelled. Table ${ZONE.id}3 is available again.`);
  await expect(page.getByRole('heading', { name: 'Concert rounds' })).toBeVisible();
});

test('paying opens the payment screen, which says the payment step is not available yet', async ({ page }) => {
  await loginAsLineUser(page, `U-e2e-${t}-pay`);
  await openRound(page, rounds.terms);
  await holdTable(page, 4);   // a 6-person sofa at 7,200
  await continueToDetails(page);
  await fillDetails(page, { name: 'Pay E2E', phone: '0898765432' });
  await submitDetails(page);
  await acceptTermsAndPay(page, PRICES[SOFA6.id]);

  // the amount, the notice in place of the QR, the toast, no status code anywhere
  await expect(page.getByTestId('amount')).toHaveText(thbText(PRICES[SOFA6.id]));
  await expect(page.getByTestId('payment-notice')).toContainText('The payment step is not available yet.');
  await expect(page.getByTestId('payment-notice')).not.toContainText('501');
  await expect(page.getByTestId('toast').filter({ hasText: 'Could not' })).toHaveCount(0);   // the screen explains it; no error toast
  await expect(page.getByText('No payment to wait for.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cancel the booking' })).toBeEnabled();

  // the preview of the confirmation says the booking is not paid and the e-ticket not issued
  await page.getByRole('link', { name: 'Preview the confirmation screen' }).click();
  await expect(page.getByRole('heading', { name: 'Confirmation' })).toBeVisible();
  await expect(page.getByTestId('result')).toContainText('Booking held');
  await expect(page.getByTestId('result')).toContainText('Not paid yet');
  await expect(page.getByTestId('eticket-notice')).toContainText('The e-ticket is not available yet.');
  await expect(page.getByTestId('booking-reference')).toHaveText(new RegExp(`^SEATS-\\d{6}-${ZONE.id}4-····$`));
  await page.getByRole('link', { name: 'My bookings' }).click();
  await expect(page.getByRole('heading', { name: 'My bookings' })).toBeVisible();
});
