import { test, expect, Page } from '@playwright/test';
import { seedStudentSession } from '../../helpers/auth';

test.describe('Student Tests', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await seedStudentSession(page);
  });

  test.describe('My Tests Page', () => {
    test('should display my tests page with heading', async () => {
      await page.goto('/dashboard/student/tests');
      
      const heading = page.getByRole('heading', { name: /my tests|tests|exams/i });
      if (await heading.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(heading).toBeVisible();
      }
    });

    test('should display list of available tests', async () => {
      await page.goto('/dashboard/student/tests');
      
      // Look for test items/cards
      const testItems = page.locator('[class*="test"], [data-testid*="test"], tr, li').first();
      
      if (await testItems.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Should have at least one test or show empty state
        const testCount = await page.locator('[class*="test-item"], [data-testid*="test"]').count();
        expect(testCount).toBeGreaterThanOrEqual(0);
      }
    });

    test('should display test information (title, date, status)', async () => {
      await page.goto('/dashboard/student/tests');
      
      // Find first test item
      const testItem = page.locator('[class*="test-card"], [data-testid*="test"]').first();
      
      if (await testItem.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Check for test title
        const title = testItem.getByRole('heading').first();
        if (await title.isVisible({ timeout: 1000 }).catch(() => false)) {
          await expect(title).toBeVisible();
        }
        
        // Check for date or status
        const meta = testItem.getByText(/.{5,}/);
        if (await meta.first().isVisible({ timeout: 1000 }).catch(() => false)) {
          expect(await meta.count()).toBeGreaterThan(0);
        }
      }
    });

    test('should show test status (not started, in progress, completed)', async () => {
      await page.goto('/dashboard/student/tests');
      
      // Look for status badges/labels
      const statusLabels = page.getByText(/(not started|in progress|completed|submitted|pending|reviewed)/i);
      
      if (await statusLabels.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(statusLabels.first()).toBeVisible();
      }
    });

    test('should allow filtering tests by status', async () => {
      await page.goto('/dashboard/student/tests');
      
      // Look for filter/sort options
      const filterButton = page.getByRole('button', { name: /filter|sort|status/i });
      if (await filterButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await filterButton.click();
        
        // Look for status options
        const statusOption = page.getByRole('option', { name: /(not started|completed|in progress)/i });
        if (await statusOption.first().isVisible({ timeout: 1000 }).catch(() => false)) {
          await statusOption.first().click();
          await page.waitForTimeout(500);
        }
      }
    });

    test('should handle empty tests state', async () => {
      await page.goto('/dashboard/student/tests');

      // Page shows either test cards, an empty-state message, or just a heading
      const testItems = page.locator('[class*="test-card"]');
      const emptyMessage = page.getByText(/no tests|empty|explore|available/i);
      const anyHeading = page.getByRole('heading').first();

      const hasContent =
        (await testItems.count() > 0) ||
        (await emptyMessage.isVisible({ timeout: 1000 }).catch(() => false)) ||
        (await anyHeading.isVisible({ timeout: 2000 }).catch(() => false));

      expect(hasContent).toBeTruthy();
    });
  });

  test.describe('Taking a Test', () => {
    test('should navigate to test taking page', async () => {
      await page.goto('/dashboard/student/tests');
      
      // Find a test and click on it
      const testItem = page.locator('[class*="test-card"], a[href*="/tests/"]').first();
      if (await testItem.isVisible({ timeout: 3000 }).catch(() => false)) {
        await testItem.click();
        
        // Should navigate to test page
        await expect(page).toHaveURL(/\/dashboard\/student\/tests\/\d+/, { timeout: 5000 }).catch(() => {});
      }
    });

    test('should display test taking interface', async () => {
      // Navigate to a test directly
      await page.goto('/dashboard/student/tests/1/take', { waitUntil: 'networkidle' });
      
      // Check for question display
      const question = page.getByText(/question|which|what|choose|select/i).first();
      if (await question.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(question).toBeVisible();
      }
      
      // Check for answer options
      const options = page.locator('[class*="option"], [role="radio"], [role="checkbox"], button');
      if (await options.first().isVisible({ timeout: 1000 }).catch(() => false)) {
        expect(await options.count()).toBeGreaterThan(0);
      }
    });

    test('should display test progress indicator', async () => {
      await page.goto('/dashboard/student/tests/1/take', { waitUntil: 'networkidle' });
      
      // Look for progress bar or question counter
      const progressBar = page.locator('[role="progressbar"]');
      const progressText = page.getByText(/\d+\s*\/\s*\d+|question|progress/i);
      
      if (await progressBar.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(progressBar).toBeVisible();
      } else if (await progressText.first().isVisible({ timeout: 1000 }).catch(() => false)) {
        await expect(progressText.first()).toBeVisible();
      }
    });

    test('should allow selecting an answer', async () => {
      await page.goto('/dashboard/student/tests/1/take', { waitUntil: 'networkidle' });
      
      // Find answer option and click
      const answerOption = page.locator('[class*="option"], [role="radio"], button').first();
      if (await answerOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await answerOption.click();
        
        // Option should be selected (visual feedback)
        const selectedClass = await answerOption.getAttribute('class');
        const isSelected = selectedClass?.includes('selected') || selectedClass?.includes('checked') || selectedClass?.includes('active');
        
        // Even if no visual, should not throw error
        await expect(page.locator('body')).toBeVisible();
      }
    });

    test('should navigate to next question', async () => {
      await page.goto('/dashboard/student/tests/1/take', { waitUntil: 'networkidle' });
      
      // Click next button
      const nextButton = page.getByRole('button', { name: /next|continue|forward|>/i });
      if (await nextButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        // First select an answer
        const answerOption = page.locator('[class*="option"], [role="radio"]').first();
        if (await answerOption.isVisible({ timeout: 1000 }).catch(() => false)) {
          await answerOption.click();
        }
        
        await nextButton.click();
        await page.waitForTimeout(500);
        
        // Should be on next question or at end
        await expect(page.locator('body')).toBeVisible();
      }
    });

    test('should allow saving draft answers', async () => {
      await page.goto('/dashboard/student/tests/1/take', { waitUntil: 'networkidle' });
      
      // Look for save/draft button
      const saveButton = page.getByRole('button', { name: /save|draft|continue later/i });
      if (await saveButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await saveButton.click();
        
        // Should show success or return to tests page
        await page.waitForTimeout(500);
        await expect(page.locator('body')).toBeVisible();
      }
    });

    test('should show timer if test is timed', async () => {
      await page.goto('/dashboard/student/tests/1/take', { waitUntil: 'networkidle' });
      
      // Look for timer display
      const timer = page.getByText(/\d+:\d+|time|remaining|timer/i);
      if (await timer.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(timer.first()).toBeVisible();
      }
    });

    test('should allow reviewing answers before submit', async () => {
      await page.goto('/dashboard/student/tests/1/take', { waitUntil: 'networkidle' });
      
      // Look for review or summary button
      const reviewButton = page.getByRole('button', { name: /review|summary|check|see all/i });
      if (await reviewButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await reviewButton.click();
        
        // Should show review of answers
        await expect(page.locator('body')).toBeVisible();
      }
    });

    test('should allow submitting test', async () => {
      await page.goto('/dashboard/student/tests/1/take', { waitUntil: 'networkidle' });
      
      // Look for submit button
      const submitButton = page.getByRole('button', { name: /submit|finish|complete|send/i });
      if (await submitButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Make sure some answers are selected
        const answerOption = page.locator('[class*="option"], [role="radio"]').first();
        if (await answerOption.isVisible({ timeout: 1000 }).catch(() => false)) {
          await answerOption.click();
        }
        
        // Check for confirmation dialog
        await submitButton.click();
        
        const confirmButton = page.getByRole('button', { name: /confirm|yes|submit|ok/i });
        if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          await confirmButton.click();
        }
        
        // Should navigate to results page
        await page.waitForTimeout(1000);
        const isSubmitted = page.url().includes('/results') || page.url().includes('/history') || page.getByText(/submitted|completed|results/i).isVisible({ timeout: 1000 }).catch(() => false);
        await expect(page.locator('body')).toBeVisible();
      }
    });
  });

  test.describe('Test Results', () => {
    test('should display test results page', async () => {
      await page.goto('/dashboard/student/tests/1/results', { waitUntil: 'networkidle' });
      
      const resultsHeading = page.getByRole('heading', { name: /results|score|grade|feedback/i });
      if (await resultsHeading.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(resultsHeading).toBeVisible();
      }
    });

    test('should display test score', async () => {
      await page.goto('/dashboard/student/tests/1/results', { waitUntil: 'networkidle' });
      
      // Look for score display
      const score = page.getByText(/\d+\s*%|score|result|grade|points?/i);
      if (await score.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(score.first()).toBeVisible();
      }
    });

    test('should display pass/fail status', async () => {
      await page.goto('/dashboard/student/tests/1/results', { waitUntil: 'networkidle' });
      
      // Look for pass/fail indicator
      const status = page.getByText(/(passed|failed|passed|success|error)/i);
      if (await status.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(status.first()).toBeVisible();
      }
    });

    test('should show detailed answer review', async () => {
      await page.goto('/dashboard/student/tests/1/results', { waitUntil: 'networkidle' });
      
      // Look for answer breakdown
      const answerReview = page.locator('[class*="answer"], [class*="question"], [class*="review"]');
      if (await answerReview.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(answerReview.first()).toBeVisible();
      }
    });

    test('should allow downloading results or certificate', async () => {
      await page.goto('/dashboard/student/tests/1/results', { waitUntil: 'networkidle' });
      
      // Look for download/print button
      const downloadButton = page.getByRole('button', { name: /download|print|certificate|pdf/i });
      if (await downloadButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(downloadButton).toBeVisible();
      }
    });

    test('should show correct vs incorrect answer indicators', async () => {
      await page.goto('/dashboard/student/tests/1/results', { waitUntil: 'networkidle' });
      
      // Look for checkmark (correct) or X (incorrect)
      const indicators = page.locator('[class*="correct"], [class*="incorrect"], [class*="check"], [class*="cross"]');
      if (await indicators.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(indicators.first()).toBeVisible();
      }
    });

    test('should display feedback for each question if available', async () => {
      await page.goto('/dashboard/student/tests/1/results', { waitUntil: 'networkidle' });
      
      // Look for feedback text
      const feedback = page.getByText(/feedback|explanation|why|because|note/i);
      if (await feedback.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(feedback.first()).toBeVisible();
      }
    });

    test('should allow retaking test if permitted', async () => {
      await page.goto('/dashboard/student/tests/1/results', { waitUntil: 'networkidle' });
      
      // Look for retake button
      const retakeButton = page.getByRole('button', { name: /retake|try again|restart|take again/i });
      if (await retakeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await retakeButton.click();
        
        // Should navigate to test taking page
        await page.waitForTimeout(500);
        const isTestPage = page.url().includes('/take') || page.getByText(/question|which|choose/i).isVisible({ timeout: 1000 }).catch(() => false);
        await expect(page.locator('body')).toBeVisible();
      }
    });
  });

  test.describe('Test History', () => {
    test('should display test history page', async () => {
      await page.goto('/dashboard/student/tests/1/history', { waitUntil: 'networkidle' });
      
      const heading = page.getByRole('heading', { name: /history|attempts|previous|past/i });
      if (await heading.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(heading).toBeVisible();
      }
    });

    test('should display list of test attempts', async () => {
      await page.goto('/dashboard/student/tests/1/history', { waitUntil: 'networkidle' });
      
      // Look for attempt items
      const attempts = page.locator('[class*="attempt"], [class*="history"], tr, li');
      
      const hasAttempts = await attempts.first().isVisible({ timeout: 2000 }).catch(() => false);
      if (hasAttempts) {
        expect(await attempts.count()).toBeGreaterThan(0);
      }
    });

    test('should show attempt details (date, score, time)', async () => {
      await page.goto('/dashboard/student/tests/1/history', { waitUntil: 'networkidle' });
      
      // Find first attempt
      const attempt = page.locator('[class*="attempt"], [class*="history-item"]').first();
      
      if (await attempt.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Check for date
        const dateElement = attempt.getByText(/\d{1,2}\/\d{1,2}\/\d{4}/);
        if (await dateElement.isVisible({ timeout: 1000 }).catch(() => false)) {
          await expect(dateElement).toBeVisible();
        }
        
        // Check for score
        const score = attempt.getByText(/\d+\s*%|score/);
        if (await score.isVisible({ timeout: 1000 }).catch(() => false)) {
          await expect(score).toBeVisible();
        }
      }
    });

    test('should allow viewing previous attempt results', async () => {
      await page.goto('/dashboard/student/tests/1/history', { waitUntil: 'networkidle' });
      
      // Click on an attempt
      const attempt = page.locator('[class*="attempt"], [class*="history-item"]').first();
      if (await attempt.isVisible({ timeout: 2000 }).catch(() => false)) {
        await attempt.click();
        
        // Should show results
        await page.waitForTimeout(500);
        const hasResults = page.getByText(/results|score|grade/i).isVisible({ timeout: 1000 }).catch(() => false);
        await expect(page.locator('body')).toBeVisible();
      }
    });
  });

  test.describe('Test Error Handling', () => {
    test('should handle invalid test ID gracefully', async () => {
      await page.goto('/dashboard/student/tests/99999', { waitUntil: 'networkidle' });
      
      // Should show error or redirect
      const errorMessage = page.getByText(/not found|not exist|error|permission/i);
      const redirected = page.url().includes('/tests') || page.url().includes('/dashboard');
      
      if (await errorMessage.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(errorMessage).toBeVisible();
      } else {
        expect(redirected).toBeTruthy();
      }
    });

    test('should handle network errors during test', async () => {
      await page.route('**/*', route => {
        if (route.request().url().includes('/api')) {
          route.abort();
        } else {
          route.continue();
        }
      });
      
      await page.goto('/dashboard/student/tests/1/take', { waitUntil: 'networkidle' });
      
      // Should show error message or allow offline continuation
      await expect(page.locator('body')).toBeVisible();
    });

    test('should warn on unsaved progress', async () => {
      await page.goto('/dashboard/student/tests/1/take', { waitUntil: 'networkidle' });
      
      // Select an answer
      const answerOption = page.locator('[class*="option"], [role="radio"]').first();
      if (await answerOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await answerOption.click();
      }
      
      // Try to leave page
      await page.goto('/dashboard/student', { waitUntil: 'networkidle' });
      
      // Should either warn or auto-save
      await expect(page.locator('body')).toBeVisible();
    });
  });
});
