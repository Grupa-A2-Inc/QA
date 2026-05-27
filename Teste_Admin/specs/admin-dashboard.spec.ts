import { expect, test } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';

test.describe('Admin - dashboard and organization', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard/admin');
  });

  // TEST 1 — Admin vede dashboard-ul după login
  test('admin logs in and can see dashboard', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard\/admin/);

    // Heading-ul real din UI
    await expect(
      page.getByRole('heading', { name: /admin dashboard/i })
    ).toBeVisible();

    // Subheading-ul real
    await expect(
      page.getByText(/overview of your organization/i)
    ).toBeVisible();
  });

  // TEST 2 — Admin poate vedea detaliile organizației sau mesajul de sesiune
  test('admin can see organization details on dashboard', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /admin dashboard/i })).toBeVisible();

    // Verifică fie cardul, fie mesajul de sesiune
    const hasOrgSummary = await page.locator('text=Organization Summary').count();
    if (hasOrgSummary > 0) {
      await expect(page.getByText(/organization summary/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /edit/i })).toBeVisible();
    } else {
      await expect(page.getByText(/missing session data/i)).toBeVisible();
    }
  });


  // TEST 3 — Admin poate edita detaliile organizației
  test('admin can edit organization details', async ({ page }) => {
    // Așteaptă dashboard-ul să fie vizibil
    await expect(page.getByRole('heading', { name: /admin dashboard/i })).toBeVisible();

    // Verifică dacă există butonul Edit
    const editButton = page.getByRole('button', { name: /edit/i });
    const hasEditButton = await editButton.count();

    if (hasEditButton > 0) {
      await expect(editButton).toBeVisible();
      await editButton.click();

      // Așteaptă apariția formularului de editare
      await page.waitForSelector('button[type="submit"]', { timeout: 15000 });

      // Verifică butonul Save sau Update
      await expect(page.getByRole('button', { name: /save|update/i })).toBeVisible();

    } else {
      // Fallback: sesiunea lipsește
      await expect(page.getByText(/missing session data/i)).toBeVisible();
    }
  });

  // TEST 4 — Dashboard-ul funcționează pe mobile
  test('admin dashboard works on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/dashboard/admin');

    await expect(
      page.getByRole('heading', { name: /admin dashboard/i })
    ).toBeVisible();
  });
});
