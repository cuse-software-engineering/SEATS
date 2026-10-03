// UC-08 Manage Staff Accounts, the sign-in and sign-out of the Back-office Web App (screen B1, Table D.10).
import { expect, test } from '@playwright/test';

test('UC-08 Sign in and sign out', async ({ page }) => {
  // without a session every screen goes to B1: the centered sign-in card; the top bar says "not signed in"
  await page.goto('/rounds');
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole('heading', { name: 'SEATS back-office' })).toBeVisible();   // the card's title (the top bar is no heading)
  await expect(page.locator('.identity')).toHaveText('not signed in');

  // a wrong password is refused with the gateway's error
  await page.getByLabel('Username').fill('manager');
  await page.getByLabel('Password').fill('wrong');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  const alert = page.getByRole('alert');
  await expect(alert).toContainText('Error 401');
  await expect(alert).toContainText('wrong username or password');
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.locator('.identity')).toHaveText('not signed in');

  // the seeded manager signs in and lands on B3; the top bar names the account
  await page.getByLabel('Password').fill('manager');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Concert rounds' })).toBeVisible();
  await expect(page).toHaveURL(/\/rounds$/);
  await expect(page.locator('.identity')).toHaveText('signed in as manager');

  // a screen of the back-office from the sidebar, then Sign out from the sidebar
  await page.getByRole('link', { name: 'Zone maps' }).click();
  await expect(page.getByRole('heading', { name: 'Zone maps' })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole('heading', { name: 'SEATS back-office' })).toBeVisible();
  await expect(page.locator('.identity')).toHaveText('not signed in');
  await expect(page.locator('.notice')).toHaveCount(0);   // the sign-out call succeeded, no local-only notice

  // the session is gone: the screens need a sign-in again
  await page.goto('/zone-maps');
  await expect(page).toHaveURL(/\/sign-in$/);
});
