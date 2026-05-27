import { expect, test } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';
import { testData } from '../fixtures/test-data';

function uniqueEmail(prefix: string): string {
  const ts = Date.now();
  const rand = Math.floor(Math.random() * 100000);
  return `${prefix}-${ts}-${rand}@example.com`;
}

async function fillAndSubmitUserForm(page: any, firstName: string, lastName: string, email: string) {
  const firstNameInput = page.locator('input[placeholder="e.g. John"]');
  await firstNameInput.clear();
  await firstNameInput.pressSequentially(firstName, { delay: 50 });

  const lastNameInput = page.locator('input[placeholder="e.g. Smith"]');
  await lastNameInput.clear();
  await lastNameInput.pressSequentially(lastName, { delay: 50 });

  const emailInput = page.locator('input[type="email"]');
  await emailInput.clear();
  await emailInput.pressSequentially(email, { delay: 50 });

  await page.locator('form select').selectOption('STUDENT');

  await expect(firstNameInput).toHaveValue(firstName);
  await expect(lastNameInput).toHaveValue(lastName);
  await expect(emailInput).toHaveValue(email);

  await page.getByRole('button', { name: /^add user$/i }).click();

  // Daca apare eroare de server, fail imediat
  await expect(
    page.getByText(/failed to create/i)
  ).not.toBeVisible({ timeout: 5000 });

  // Asteapta ca backend-ul sa proceseze
  await page.waitForTimeout(2000);

  // Inchide modalul cu Escape daca e inca deschis
  const modalHeading = page.getByRole('heading', { name: /add user/i });
  if (await modalHeading.isVisible()) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  // Reload pentru re-fetch lista
  await page.reload();
  await page.waitForLoadState('networkidle');
}

test.describe('Admin - user management flow', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard/admin/users');
    await page.waitForLoadState('networkidle');
  });

  // ==================================================
  // TEST 1
  // ==================================================
  test('admin can navigate to users page and see list/table state', async ({ page }) => {

    await expect(
      page.getByRole('heading', { name: /user management/i })
    ).toBeVisible();

    await expect(
      page.getByRole('button', { name: /students/i })
    ).toBeVisible();

    await expect(
      page.getByRole('button', { name: /teachers/i })
    ).toBeVisible();

    await expect(
      page.getByPlaceholder(/search by name or email/i)
    ).toBeVisible();

    await expect(
      page.getByRole('button', { name: /add user/i })
    ).toBeVisible();
  });

  // ==================================================
  // TEST 2
  // ==================================================
  test('admin can search and filter users', async ({ page }) => {

    const search = page.getByPlaceholder(/search by name or email/i);

    await expect(search).toBeVisible();

    await search.fill('roxana');
    await expect(search).toHaveValue('roxana');

    await page.getByRole('button', { name: /students/i }).click();
    await page.getByRole('button', { name: /teachers/i }).click();

    await page.getByRole('button', { name: /^active$/i }).click();
    await page.getByRole('button', { name: /^inactive$/i }).click();
  });

  // ==================================================
  // TEST 3
  // ==================================================
  test('admin can open add user modal and validation works', async ({ page }) => {

    await page.getByRole('button', { name: /add user/i }).click();

    await expect(
      page.getByRole('heading', { name: /add user/i })
    ).toBeVisible();

    await page.getByRole('button', { name: /^add user$/i }).click();

    await expect(
      page.getByText(/first name is required/i)
    ).toBeVisible();
  });

  // ==================================================
  // TEST 4
  // ==================================================
  test('admin can add user and see updated list', async ({ page }) => {

    const email = uniqueEmail('student');

    await page.getByRole('button', { name: /add user/i }).click();

    await expect(
      page.getByRole('heading', { name: /add user/i })
    ).toBeVisible();

    await fillAndSubmitUserForm(page, testData.userFirstName, testData.userLastName, email);

    // Cauta userul creat
    const search = page.getByPlaceholder(/search by name or email/i);
    await search.fill(email);

    // Asteapta debounce 300ms + re-fetch backend
    await page.waitForTimeout(1000);

    await expect(
      page.locator('td').getByText(email, { exact: false })
    ).toBeVisible({ timeout: 15000 });
  });

  // ==================================================
  // TEST 5
  // ==================================================
  test('admin can add and then delete a user', async ({ page }) => {

    const email = uniqueEmail('delete-user');

    await page.getByRole('button', { name: /add user/i }).click();

    await expect(
      page.getByRole('heading', { name: /add user/i })
    ).toBeVisible();

    await fillAndSubmitUserForm(page, 'Delete', 'Candidate', email);

    // Cauta userul creat
    const search = page.getByPlaceholder(/search by name or email/i);
    await search.fill(email);

    // Asteapta debounce 300ms + re-fetch backend
    await page.waitForTimeout(1000);

    // Gaseste randul dupa email
    const row = page.locator('tr').filter({ hasText: email });
    await expect(row).toBeVisible({ timeout: 15000 });

    // Accept confirm dialog
    page.once('dialog', dialog => dialog.accept());

    // Delete — ultimul buton din rand
    await row.locator('button').last().click();

    // Verifica stergerea
    await page.waitForTimeout(1000);
    await expect(
      page.locator('td').getByText(email, { exact: false })
    ).not.toBeVisible({ timeout: 15000 });
  });

});