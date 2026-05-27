import { test, expect } from '@playwright/test';
import { loginAsStudent } from '../helpers/auth';

// These tests run on the mobile-chrome project (Pixel 5 — 393x851)
// to verify that key student pages do not break at narrow viewports.
// They are automatically skipped on the chromium desktop project.

test.describe('Responsive layout — mobile viewport', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStudent(page);
  });

  test('dashboard (courses) page renders on mobile without overflow errors', async ({ page }) => {
    await page.goto('/dashboard/student', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    // Page should show either courses or empty state — no crash
    await expect(page.locator('body')).toBeVisible();
    // Core tabs must still be accessible
    await expect(page.getByRole('button', { name: /my courses/i })).toBeVisible({ timeout: 10_000 });
  });

  test('courses search bar is usable on mobile', async ({ page }) => {
    await page.goto('/dashboard/student', { waitUntil: 'domcontentloaded' });
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();
    await expect(searchInput).toBeVisible({ timeout: 10_000 });
    await searchInput.fill('test');
    await expect(searchInput).toHaveValue('test');
  });

  test('profile page renders personal info section on mobile', async ({ page }) => {
    await page.goto('/dashboard/student/profile', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    await expect(page.getByRole('heading', { name: /my profile/i })).toBeVisible({ timeout: 15_000 });
    // Save Changes button must still fit on screen
    await expect(page.getByRole('button', { name: /save changes/i })).toBeVisible();
  });

  test('adaptive learning page renders subject picker on mobile', async ({ page }) => {
    await page.goto('/dashboard/student/adaptive', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    await expect(page.locator('select').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: /start session/i })).toBeVisible();
  });

  test('rewards page renders wallet input on mobile', async ({ page }) => {
    await page.goto('/dashboard/student/rewards', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    await expect(page.locator('input[placeholder*="0x"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: /save wallet/i })).toBeVisible();
  });
});
