import { test, expect } from '@playwright/test';
import { loginAsStudent } from '../helpers/auth';

test.describe('Student Rewards', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStudent(page);
    await page.goto('/dashboard/student/rewards', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  });

  test('rewards page loads at correct URL', async ({ page }) => {
    await expect(page).toHaveURL(/dashboard\/student\/rewards/);
  });

  test('"My Rewards" heading is visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /my rewards/i })).toBeVisible({ timeout: 10_000 });
  });

  test('wallet section is displayed', async ({ page }) => {
    await expect(page.locator('text=/wallet/i').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('input[placeholder*="0x"]')).toBeVisible();
  });

  test('"Save wallet" button is present', async ({ page }) => {
    await expect(page.getByRole('button', { name: /save wallet/i })).toBeVisible();
  });

  test('invalid EVM wallet address shows validation error', async ({ page }) => {
    await page.locator('input[placeholder*="0x"]').fill('not-a-valid-address');
    await page.getByRole('button', { name: /save wallet/i }).click();

    await expect(page.locator('text=/valid evm address/i')).toBeVisible({ timeout: 5_000 });
  });
});
