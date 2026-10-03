// The staff accounts of the Back-office Web App: an account created, its role changed, disabled through the dialog;
// the disabled account refused at the sign-in with a message; the manager unable to disable itself.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { tag } from '../helpers/seed';
import { confirmDialog, expectToast, openScreen, signIn, signOut } from '../helpers/backoffice';
import { signInAsManager } from '../helpers/ui';

const t = tag();
const panel = (page: Page): Locator => page.getByTestId('staff-accounts');
const accountRow = (page: Page, username: string): Locator => page.getByTestId('accounts').locator('tbody tr').filter({ has: page.getByRole('cell', { name: username, exact: true }) });

test.beforeEach(async ({ page }) => {
  await signInAsManager(page);
  await openScreen(page, 'Staff accounts');
});

test('an account is created, its role changed and it is disabled with the dialog; the disabled account is refused at sign-in; the manager cannot disable itself', async ({ page }) => {
  const username = `e2e-door-${t}`;
  const password = 'door-pass';

  // Create account: the toast, the row (selected) with role and status
  await panel(page).getByRole('button', { name: '+ Create account' }).click();
  await panel(page).getByLabel('Username').fill(username);
  await panel(page).getByLabel('Role', { exact: true }).selectOption('front_staff');
  await panel(page).getByLabel('Password', { exact: true }).fill('abc');
  await expect(panel(page).getByText('At least 4 characters')).toBeVisible();   // the field says what is wrong
  await panel(page).getByLabel('Password', { exact: true }).fill(password);
  await panel(page).getByRole('button', { name: 'Create', exact: true }).click();
  await expectToast(page, `Account ${username} created`);
  const row = accountRow(page, username);
  await expect(row).toContainText('Front staff');
  await expect(row).toContainText('Active');
  await expect(row).toHaveAttribute('aria-selected', 'true');
  await expect(panel(page).getByText(`Selected: ${username}`)).toBeVisible();

  // Change role: the toast, the row
  await panel(page).getByRole('button', { name: 'Change role' }).click();
  await panel(page).getByLabel(`Role of ${username}`).selectOption('owner');
  await panel(page).getByRole('button', { name: 'Save', exact: true }).click();
  await expectToast(page, `Role of ${username} changed to Owner`);
  await expect(row).toContainText('Owner');

  // Disable through the dialog: the toast, the row, and no second Disable
  await panel(page).getByRole('button', { name: 'Disable', exact: true }).click();
  await confirmDialog(page, `Disable ${username}?`, 'Disable');
  await expectToast(page, `Account ${username} disabled`);
  await expect(row).toContainText('Disabled');
  await expect(panel(page).getByRole('button', { name: 'Disable', exact: true })).toBeDisabled();
  await expect(panel(page).getByText('This account is disabled')).toBeVisible();

  // the manager cannot disable itself: the button is closed and the reason shown
  await accountRow(page, 'manager').click();
  await expect(panel(page).getByText('Selected: manager (you)')).toBeVisible();
  await expect(panel(page).getByRole('button', { name: 'Disable', exact: true })).toBeDisabled();
  await expect(panel(page).getByText('You cannot disable your own account.')).toBeVisible();

  // the disabled account is refused at the sign-in with a message
  await signOut(page);
  await signIn(page, username, password);
  await expectToast(page, 'Could not sign in: the account is disabled');
  await expect(page.locator('.field-error')).toHaveText('The account is disabled');
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.locator('.identity')).toHaveText('not signed in');
});
