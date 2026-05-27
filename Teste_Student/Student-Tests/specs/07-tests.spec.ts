import { test, expect } from '@playwright/test';
import { loginAsStudent, getFirstEnrolledCourseUrl } from '../helpers/auth';

test.describe('Student Tests', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStudent(page);
  });

  test('student tests page loads at /dashboard/student/tests', async ({ page }) => {
    await page.goto('/dashboard/student/tests', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/dashboard\/student\/tests/);
  });

  test('student tests page renders a heading', async ({ page }) => {
    await page.goto('/dashboard/student/tests', { waitUntil: 'domcontentloaded' });
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 10_000 });
  });

  test('course tests sub-page is accessible from course detail', async ({ page }) => {
    const courseUrl = await getFirstEnrolledCourseUrl(page);
    if (!courseUrl) {
      test.skip(true, 'No enrolled courses available');
      return;
    }
    const testsUrl = `${courseUrl}/tests`;
    await page.goto(testsUrl, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(new RegExp(testsUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  });

  test('"Take Test" link navigates to take-test page when a published test exists', async ({ page }) => {
    const courseUrl = await getFirstEnrolledCourseUrl(page);
    if (!courseUrl) {
      test.skip(true, 'No enrolled courses available');
      return;
    }

    await page.goto(courseUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    const takeTestLink = page.getByRole('link', { name: /take test/i });
    if ((await takeTestLink.count()) === 0) {
      test.skip(true, 'No published test available for enrolled course');
      return;
    }

    await takeTestLink.first().click();
    await expect(page).toHaveURL(/\/take/, { timeout: 15_000 });
  });

  test('take-test page shows question content when a test is available', async ({ page }) => {
    const courseUrl = await getFirstEnrolledCourseUrl(page);
    if (!courseUrl) {
      test.skip(true, 'No enrolled courses available');
      return;
    }

    await page.goto(courseUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    const takeTestLink = page.getByRole('link', { name: /take test/i });
    if ((await takeTestLink.count()) === 0) {
      test.skip(true, 'No published test available for enrolled course');
      return;
    }

    await takeTestLink.first().click();
    await page.waitForURL(/\/take/, { timeout: 15_000 });
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    // Test page should show at least one question or a loading indicator that resolves
    const content = page.locator('text=/question|q\./i, [class*="question"]').first();
    await expect(content).toBeVisible({ timeout: 20_000 });
  });
});
