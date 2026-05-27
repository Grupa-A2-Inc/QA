import { test, expect } from '@playwright/test';
import { loginAsStudent } from '../helpers/auth';

test.describe('Adaptive Learning', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStudent(page);
    await page.goto('/dashboard/student/adaptive', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  });

  test('adaptive page loads at correct URL', async ({ page }) => {
    await expect(page).toHaveURL(/dashboard\/student\/adaptive/);
  });

  test('"Adaptive Learning" heading is visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /adaptive learning/i })).toBeVisible({ timeout: 10_000 });
  });

  test('subject dropdown is visible with placeholder option', async ({ page }) => {
    const subjectSelect = page.locator('select').first();
    await expect(subjectSelect).toBeVisible();

    const placeholder = subjectSelect.locator('option[value=""]');
    await expect(placeholder).toHaveText(/choose a subject/i);
  });

  test('topic picker shows "Select a subject first" when no subject chosen', async ({ page }) => {
    await expect(page.locator('text=/select a subject first/i')).toBeVisible({ timeout: 10_000 });
  });

  test('question count slider is present with default value between 3 and 15', async ({ page }) => {
    const slider = page.locator('input[type="range"]');
    await expect(slider).toBeVisible();

    const value = Number(await slider.inputValue());
    expect(value).toBeGreaterThanOrEqual(3);
    expect(value).toBeLessThanOrEqual(15);
  });

  test('"Start session" button is disabled when no subject/topic selected', async ({ page }) => {
    const startBtn = page.getByRole('button', { name: /start session/i });
    await expect(startBtn).toBeVisible();
    await expect(startBtn).toBeDisabled();
  });

  test('selecting a subject enables the topic dropdown', async ({ page }) => {
    const subjectSelect = page.locator('select').first();
    await subjectSelect.selectOption({ index: 1 });

    // Topic picker should now show a select (not the "select a subject first" text)
    const topicSelect = page.locator('select').nth(1);
    await expect(topicSelect).toBeVisible({ timeout: 5_000 });
  });
});
