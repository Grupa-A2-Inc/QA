import { test, expect } from '@playwright/test';
import { loginAsStudent } from '../helpers/auth';

test.describe('Student Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStudent(page);
    await page.goto('/dashboard/student', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  });

  test('dashboard page loads and URL is correct', async ({ page }) => {
    await expect(page).toHaveURL(/dashboard\/student/);
  });

  test('"My Courses" tab is visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: /my courses/i })).toBeVisible();
  });

  test('"Discover" tab is visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: /discover/i })).toBeVisible();
  });

  test('courses search bar is visible', async ({ page }) => {
    await expect(page.locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="Search" i]').first()).toBeVisible();
  });

  test('course count / header is displayed', async ({ page }) => {
    const header = page.locator('text=/course/i').first();
    await expect(header).toBeVisible({ timeout: 10_000 });
  });
});
