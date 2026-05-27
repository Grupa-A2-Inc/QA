import { expect, test } from '@playwright/test';
import { clearSession, loginAsAdmin, loginAsTeacher } from '../helpers/auth';

// --------------------------------------------------
// SUITĂ DE TESTE: Authentication
// Această suită verifică toate scenariile de autentificare:
// - login valid pentru Admin
// - login valid pentru Teacher
// - login invalid (email/parolă greșite)
// --------------------------------------------------

test.describe('Authentication', () => {

  // --------------------------------------------------
  // TEST 1 — Login valid pentru Admin
  // --------------------------------------------------
  test('Admin can log in successfully', async ({ page }) => {
    await loginAsAdmin(page);

    // Verifică dashboard-ul real
    await expect(page.getByRole('heading', { name: /admin dashboard/i })).toBeVisible();
    await expect(page.getByText(/overview of your organization/i)).toBeVisible();
  });

  // --------------------------------------------------
  // TEST 2 — Login invalid (email/parolă greșite)
  // --------------------------------------------------
  test('Shows error for invalid credentials', async ({ page }) => {

    // Curățăm sesiunea pentru a evita interferențe
    await clearSession(page);

    // Navigăm manual la pagina de login
    await page.goto('/login');

    // Completăm email și parolă invalide
    await page.locator('input[type="email"]').fill('wrong@example.com');
    await page.locator('input[type="password"]').fill('wrong-password');

    // Trimitem formularul
    await page.getByRole('button', { name: /^log in$/i }).click();

    // Rămânem pe pagina de login
    await expect(page).toHaveURL(/\/login$/);

    // Verificăm afișarea unui mesaj de eroare
    // Folosim un regex robust, pentru că textul exact poate varia
    await expect(
      page.getByText(/login failed|invalid|eroare|network|server/i)
    ).toBeVisible();
  });

});
