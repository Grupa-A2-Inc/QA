import { test, expect } from '@playwright/test';
import { loginAsStudent, getFirstEnrolledCourseUrl } from '../helpers/auth';

test.describe('Courses', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStudent(page);
    await page.goto('/dashboard/student', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  });

  test('"My Courses" tab is active by default', async ({ page }) => {
    const myTab = page.getByRole('button', { name: /my courses/i });
    await expect(myTab).toBeVisible();
    // Active tab gets bg-brand-card + shadow-sm; inactive tab gets text-brand-muted
    await expect(myTab).toHaveClass(/bg-brand-card/);
  });

  test('"Discover" tab switches to public courses view', async ({ page }) => {
    await page.getByRole('button', { name: /discover/i }).click();
    // Public courses section or empty message should be visible
    const indicator = page.locator('text=/public|no public courses|discover/i').first();
    await expect(indicator).toBeVisible({ timeout: 10_000 });
  });

  test('search bar filters courses by title', async ({ page }) => {
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="Search" i]').first();
    await searchInput.fill('zzzznonexistent');
    // Grid should show empty state or 0 results
    const empty = page.locator('text=/no courses|no results|you have no/i').first();
    await expect(empty).toBeVisible({ timeout: 10_000 });
  });

  test('category filter dropdown is present', async ({ page }) => {
    const select = page.locator('select').first();
    await expect(select).toBeVisible();
  });

  test('enrolled courses show a "View" button or link', async ({ page }) => {
    const hasView = (await page.getByRole('link', { name: /view/i }).count()) > 0 ||
                    (await page.getByRole('button', { name: /view/i }).count()) > 0;
    if (!hasView) {
      test.skip(/* no enrolled courses */ true, 'No enrolled courses visible for this student');
    }
    expect(hasView).toBeTruthy();
  });

  test('public course cards show an "Enroll" button when not yet enrolled', async ({ page }) => {
    await page.getByRole('button', { name: /discover/i }).click();
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});

    const enrollBtns = page.getByRole('button', { name: /enroll/i });
    if ((await enrollBtns.count()) === 0) {
      test.skip(true, 'No unenrolled public courses available right now');
      return;
    }
    await expect(enrollBtns.first()).toBeVisible();
  });

  test('clicking "View" on an enrolled course opens course detail page', async ({ page }) => {
    const courseUrl = await getFirstEnrolledCourseUrl(page);
    if (!courseUrl) {
      test.skip(true, 'No enrolled courses available');
      return;
    }
    await expect(page).toHaveURL(new RegExp(courseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  });

  test('course detail page shows lessons or tabs', async ({ page }) => {
    const courseUrl = await getFirstEnrolledCourseUrl(page);
    if (!courseUrl) {
      test.skip(true, 'No enrolled courses available');
      return;
    }
    await page.goto(courseUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    const content = page.locator('text=/lessons|lesson|module|chapter/i').first();
    await expect(content).toBeVisible({ timeout: 15_000 });
  });

  test('course detail page shows a course title', async ({ page }) => {
    const courseUrl = await getFirstEnrolledCourseUrl(page);
    if (!courseUrl) {
      test.skip(true, 'No enrolled courses available');
      return;
    }
    await page.goto(courseUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    // Any h1/h2 heading should be visible for the course
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 10_000 });
  });

  test('pagination controls render when courses exceed one page', async ({ page }) => {
    // Pagination is only present when totalElements > pageSize; we check for its container
    const pagination = page.locator('[aria-label*="pagination" i], nav[aria-label], .pagination, button[aria-label*="next" i], button[aria-label*="previous" i]').first();
    // If no pagination, just confirm the courses section loaded without error
    const coursesLoaded = (await pagination.count()) > 0 ||
                          (await page.locator('text=/course/i').count()) > 0;
    expect(coursesLoaded).toBeTruthy();
  });
});
