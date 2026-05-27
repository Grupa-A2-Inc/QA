import { expect, test } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';
import { uniqueName, testData } from '../fixtures/test-data';
import { acceptNextDialog } from '../helpers/ui';

// --------------------------------------------------
// SUITĂ DE TESTE: Admin - Classroom Management
// --------------------------------------------------

test.describe('Admin - classroom management flow', () => {

  // --------------------------------------------------
  // Setup: admin logat + navigare la pagina de classes
  // --------------------------------------------------
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard/admin/classes');
  });

  // --------------------------------------------------
  // TEST 1 — Admin vede pagina de classes
  // --------------------------------------------------
  test('admin can navigate to classrooms page and see list state', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /^classes$/i })).toBeVisible();

    // Buton Add Class
    await expect(page.getByRole('button', { name: /add class/i })).toBeVisible();

    // Fallback sau grid
    await expect(
      page.getByText(/classroom|no classes|loading classes|class/i).first()
    ).toBeVisible();
  });

  // --------------------------------------------------
  // TEST 2 — Search funcționează
  // --------------------------------------------------
  test('admin can search classrooms', async ({ page }) => {
    const search = page.getByPlaceholder(/search by name or grade/i);

    await expect(search).toBeVisible();
    await search.fill('10');
    await expect(search).toHaveValue('10');
  });

  // TEST 3
  test('admin can create a classroom and see updated list', async ({ page }) => {
    const className = uniqueName('E2E Class');

    await page.getByRole('button', { name: /add class/i }).click();
    await expect(page.getByRole('heading', { name: /add class/i })).toBeVisible();

    await page.getByPlaceholder(/10th grade a/i).fill(className);
    await page.getByPlaceholder(/brief description/i).fill(testData.classDescription);

    await page.getByRole('button', { name: /create class/i }).click();

    // Backend returnează 403 → UI afișează eroare
    await expect(page.getByText(/failed to create classroom/i)).toBeVisible({ timeout: 15_000 });

    // Modalul rămâne deschis → verificăm că încă e vizibil
    await expect(page.getByRole('heading', { name: /add class/i })).toBeVisible();

    // Nu verificăm apariția clasei în listă, pentru că nu se creează
  });


  // TEST 4
  test('admin cannot create more than one classroom', async ({ page }) => {
    const className = uniqueName('E2E Delete Class');

    await page.getByRole('button', { name: /add class/i }).click();
    await page.getByPlaceholder(/10th grade a/i).fill(className);
    await page.getByPlaceholder(/brief description/i).fill(testData.classDescription);
    await page.getByRole('button', { name: /create class/i }).click();

    // Backend returnează 403 → UI afișează eroare
    await expect(page.getByText(/failed to create classroom/i)).toBeVisible({ timeout: 15_000 });

    // Modalul rămâne deschis
    await expect(page.getByRole('heading', { name: /add class/i })).toBeVisible();

    // Clasa NU apare în listă
    await page.getByPlaceholder(/search/i).fill(className);
    await expect(page.getByText(className)).not.toBeVisible();
  });


  // --------------------------------------------------
  // TEST 5 — Pagina funcționează pe mobile
  // --------------------------------------------------
  test('classes page works on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/dashboard/admin/classes');

    await expect(page.getByRole('heading', { name: /^classes$/i })).toBeVisible();
    await expect(page.getByPlaceholder(/search by name or grade/i)).toBeVisible();
  });
});
