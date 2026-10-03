// The business parameters of the Back-office Web App: the hold period and the extra-person fee changed and saved,
// shown again after a reload, and a hold made through the gateway as a customer on a round published afterwards
// ends the new hold period ahead. The values are put back at the end.
import { expect, test, type APIRequestContext } from '@playwright/test';
import { freeDays, managerApi, seedRound, seedZoneMap, tag } from '../helpers/seed';
import { cancelBooking, customerApi, expectToast, holdTable, openScreen } from '../helpers/backoffice';
import { signInAsManager } from '../helpers/ui';

const t = tag();
let api: APIRequestContext;
interface Parameters { holdPeriodMinutes: number; checkInWindowHours: number; gracePeriodMinutes: number; extraPersonFee: number }

test.beforeAll(async () => { api = await managerApi(); });
test.afterAll(async () => { await api.dispose(); });

test('the hold period and the extra-person fee are saved, survive a reload, and a hold made afterwards uses the hold period', async ({ page }) => {
  const before = (await (await api.get('/api/business-parameters')).json()) as Parameters;
  const holdMinutes = before.holdPeriodMinutes + 1;
  const fee = before.extraPersonFee + 50;
  try {
    await signInAsManager(page);
    await openScreen(page, 'Business parameters');
    const card = page.getByTestId('business-parameters');
    await expect(card.getByLabel('Hold period')).toHaveValue(String(before.holdPeriodMinutes));
    await expect(card.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();   // nothing to save yet

    // the two values changed: the card shows the unsaved changes; Save says Saved
    await card.getByLabel('Hold period').fill(String(holdMinutes));
    await card.getByLabel('Extra-person fee').fill(String(fee));
    await expect(card).toContainText('Unsaved changes');
    await card.getByRole('button', { name: 'Save', exact: true }).click();
    await expectToast(page, 'Saved');
    await expect(card.locator('.badge.ok')).toHaveText('Saved');
    await expect(card).toContainText(/Last saved \d\d:\d\d by manager/);

    // a reload shows the saved values
    await page.reload();
    await expect(card.getByLabel('Hold period')).toHaveValue(String(holdMinutes));
    await expect(card.getByLabel('Extra-person fee')).toHaveValue(String(fee));
    await expect(card.getByLabel('Grace period')).toHaveValue(String(before.gracePeriodMinutes));

    // a round published now takes the hold period in force; a customer's hold on it ends that many minutes ahead
    const map = await seedZoneMap(api, t);
    const [day] = await freeDays(api, 1);
    const round = await seedRound(api, map.id, { name: `E2E ${t} hold period`, day });
    const customer = await customerApi(`U-e2e-${t}-hold`);
    const booking = await holdTable(customer, round.id, 1);
    expect(booking.status).toBe('Held');
    const minutes = (Date.parse(booking.holdEndsAt) - Date.parse(booking.createdAt)) / 60e3;
    expect(Math.round(minutes)).toBe(holdMinutes);
    expect(booking.remainingHoldSeconds).toBeGreaterThan((holdMinutes - 1) * 60);
    await cancelBooking(customer, booking.id);
    await customer.dispose();
  } finally {
    expect((await api.put('/api/business-parameters', { data: before })).ok()).toBeTruthy();   // the values as they were
  }
});
