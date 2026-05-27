import { Page, expect } from '@playwright/test';
import { testUsers } from '../fixtures/users';

export async function clearSession(page: Page) {
  await page.context().clearCookies();
  // Sterge localStorage direct pe pagina curenta, nu cu addInitScript
  // (addInitScript ruleaza la FIECARE navigatie ulterioara si sterge token-ul)
  await page.evaluate(() => localStorage.clear()).catch(() => {});
}

export async function loginAsTeacher(page: Page) {
  await clearSession(page);

  await page.goto('/login');

  await page.fill('input[type="email"]', testUsers.teacher.email);
  await page.fill('input[type="password"]', testUsers.teacher.password);

  await page.getByRole('button', { name: /^log in$/i }).click();

  await page.waitForURL('**/dashboard**', { timeout: 60_000 });

  await expect(
    page.getByText(/my courses/i)
  ).toBeVisible({ timeout: 15_000 });
}

export async function loginAsAdmin(page: Page) {
  await clearSession(page);

  await page.waitForTimeout(1000);

  await page.goto('/login');

  await page.fill('input[type="email"]', testUsers.admin.email);
  await page.fill('input[type="password"]', testUsers.admin.password);

  await page.getByRole('button', { name: /^log in$/i }).click();

  const errorVisible = await page.getByText(/duplicate|error|could not/i)
    .isVisible()
    .catch(() => false);

  if (errorVisible) {
    await page.waitForTimeout(2000);
    await page.getByRole('button', { name: /^log in$/i }).click();
  }

  await page.waitForURL('**/dashboard**', { timeout: 60_000 });

  await expect(
    page.getByText(/admin dashboard/i)
  ).toBeVisible({ timeout: 15_000 });
}

export async function loginAsStudent(page: Page) {
  await clearSession(page);

  await page.goto('/login');

  await page.fill('input[type="email"]', testUsers.student.email);
  await page.fill('input[type="password"]', testUsers.student.password);

  await page.getByRole('button', { name: /^log in$/i }).click();

  await page.waitForURL('**/dashboard**', { timeout: 60_000 });

  await expect(page.getByText(/my courses|student dashboard/i))
    .toBeVisible({ timeout: 15_000 });
}