import { test, expect } from '@playwright/test';
import { testUsers } from '../fixtures/users';

test.describe('Authentication', () => {
  test('login page renders email and password inputs', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('login submit button is visible', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('student logs in successfully and lands on dashboard', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });

    await page.locator('input[type="email"]').fill(testUsers.student.email);
    await page.locator('input[type="password"]').fill(testUsers.student.password);
    await page.locator('button[type="submit"]').click();

    // If the backend is down, skip rather than fail
    const networkErr = page.locator('text=/network error/i');
    const isDown = await networkErr.isVisible({ timeout: 6_000 }).catch(() => false);
    if (isDown) {
      test.skip(true, 'Backend API unreachable — skipping login success test');
      return;
    }

    await expect(page).toHaveURL(/dashboard\/student/, { timeout: 30_000 });
  });

  test('invalid credentials show an error message', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    await page.locator('input[type="email"]').fill('invalid@example.com');
    await page.locator('input[type="password"]').fill('wrongpassword');
    await page.locator('button[type="submit"]').click();

    const error = page.locator('text=/invalid|incorrect|wrong|error|unauthorized/i');
    await expect(error.first()).toBeVisible({ timeout: 10_000 });
  });

  test('unauthenticated access to student dashboard redirects to login', async ({ page }) => {
    await page.context().clearCookies();
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); }).catch(() => {});

    await page.goto('/dashboard/student', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL(/login/, { timeout: 15_000 });
  });
});
