import { test, expect } from '@playwright/test';
import { loginAsStudent } from '../helpers/auth';

test.describe('Student Profile', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStudent(page);
    await page.goto('/dashboard/student/profile', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  });

  test('profile page loads at correct URL', async ({ page }) => {
    await expect(page).toHaveURL(/dashboard\/student\/profile/);
  });

  test('"My Profile" heading is visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /my profile/i })).toBeVisible({ timeout: 15_000 });
  });

  test('avatar with the first letter of the user name is shown', async ({ page }) => {
    // Avatar is a div with a single uppercase letter inside a gradient circle
    const avatar = page.locator('div').filter({ hasText: /^[A-Z]$/ }).first();
    await expect(avatar).toBeVisible({ timeout: 10_000 });
  });

  test('"Student" role badge is displayed', async ({ page }) => {
    await expect(page.locator('text=Student').first()).toBeVisible({ timeout: 10_000 });
  });

  test('profile form contains First Name, Last Name and Email inputs', async ({ page }) => {
    const firstNameInput = page.locator('input[autocomplete="given-name"]');
    const lastNameInput  = page.locator('input[autocomplete="family-name"]');
    const emailInput     = page.locator('input[type="email"]');

    await expect(firstNameInput).toBeVisible();
    await expect(lastNameInput).toBeVisible();
    await expect(emailInput).toBeVisible();
  });

  test('"Save Changes" button is visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: /save changes/i })).toBeVisible();
  });

  test('"Change Password" section is present', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /change password/i })).toBeVisible();
  });

  test('password mismatch shows "Passwords do not match" error', async ({ page }) => {
    await page.locator('input[autocomplete="current-password"]').fill('currentpassword123');
    await page.locator('input[autocomplete="new-password"]').first().fill('newpass123');
    await page.locator('input[autocomplete="new-password"]').nth(1).fill('differentpass456');

    await page.getByRole('button', { name: /update password/i }).click();

    await expect(page.locator('text=/passwords do not match/i')).toBeVisible({ timeout: 5_000 });
  });
});
