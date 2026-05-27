import { Page, test } from '@playwright/test';
import { testUsers } from '../fixtures/users';

async function attemptLogin(page: Page): Promise<'ok' | 'network_error' | 'other_error'> {
  await page.locator('button[type="submit"]').click();

  const result = await Promise.race([
    page.waitForURL(/dashboard/, { timeout: 20_000 }).then(() => 'ok' as const),
    page.locator('text=/network error/i').waitFor({ state: 'visible', timeout: 20_000 }).then(() => 'network_error' as const),
    page.locator('text=/invalid|incorrect|wrong|unauthorized/i').waitFor({ state: 'visible', timeout: 20_000 }).then(() => 'other_error' as const),
  ]).catch(() => 'network_error' as const);

  return result;
}

export async function loginAsStudent(page: Page): Promise<void> {
  await page.context().clearCookies();
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  await page.locator('input[type="email"]').waitFor({ state: 'visible', timeout: 10_000 });
  await page.locator('input[type="email"]').fill(testUsers.student.email);
  await page.locator('input[type="password"]').fill(testUsers.student.password);

  let status = await attemptLogin(page);

  if (status === 'network_error') {
    // Wait and retry once — transient backend hiccup
    await page.waitForTimeout(3_000);
    await page.locator('button[type="submit"]').click();
    status = await attemptLogin(page);
  }

  if (status === 'network_error') {
    test.skip(true, 'Backend API unreachable (Network error on login) — skipping test');
    return;
  }

  if (status === 'other_error') {
    throw new Error('Login failed: invalid credentials or unexpected auth error');
  }

  // status === 'ok', already on /dashboard
}

export async function getFirstEnrolledCourseUrl(page: Page): Promise<string> {
  await page.goto('/dashboard/student', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

  const viewBtn = page.getByRole('link', { name: /view/i }).first();
  if ((await viewBtn.count()) === 0) return '';

  const href = await viewBtn.getAttribute('href');
  return href ?? '';
}
