// UC-08 Manage Staff Accounts, the sign-in and sign-out of the Back-office Web App (the sign-in card, Table D.10).
import { expect, test } from '@playwright/test';
import { expectToast, openScreen } from '../helpers/backoffice';

test('UC-08 Sign in and sign out', async ({ page }) => {
  // without a session every screen goes to the sign-in: the centered card; the top bar says "not signed in"
  await page.goto('/rounds');
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole('heading', { name: 'SEATS back-office' })).toBeVisible();   // the card's title (the top bar is no heading)
  await expect(page.locator('.identity')).toHaveText('not signed in');

  // a wrong password is refused: the toast and the field say why, in the gateway's words
  await page.getByLabel('Username').fill('manager');
  await page.getByLabel('Password').fill('wrong');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expectToast(page, 'Could not sign in: wrong username or password');
  await expect(page.locator('.field-error')).toHaveText('Wrong username or password');
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.locator('.identity')).toHaveText('not signed in');

  // the seeded manager signs in and lands on the rounds; the toast and the top bar name the account
  await page.getByLabel('Password').fill('manager');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expectToast(page, 'Signed in as manager');
  await expect(page.getByRole('heading', { name: 'Concert rounds' })).toBeVisible();
  await expect(page).toHaveURL(/\/rounds$/);
  await expect(page.locator('.identity')).toHaveText('signed in as manager');

  // a screen of the back-office from the sidebar, then Sign out from the sidebar
  await openScreen(page, 'Zone maps');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole('heading', { name: 'SEATS back-office' })).toBeVisible();
  await expect(page.locator('.identity')).toHaveText('not signed in');
  await expectToast(page, 'Signed out');
  await expect(page.locator('.toast.error')).toHaveCount(0);   // the sign-out call succeeded: no local-only notice

  // the session is gone: the screens need a sign-in again
  await page.goto('/zone-maps');
  await expect(page).toHaveURL(/\/sign-in$/);
});
