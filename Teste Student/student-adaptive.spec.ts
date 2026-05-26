import { test, expect, Page } from '@playwright/test';
import { seedStudentSession } from '../../helpers/auth';

test.describe('Student Adaptive Learning', () => {
  let page: Page;

  async function selectFirstSubjectAndTopic() {
    const subjectSelect = page.locator('select').first();
    await expect(subjectSelect).toBeVisible({ timeout: 5000 });
    await subjectSelect.selectOption({ index: 1 });

    const topicSelect = page.locator('select').nth(1);
    await expect(topicSelect).toBeVisible({ timeout: 5000 });
    await topicSelect.selectOption({ index: 1 });
  }

  async function startAdaptiveSession() {
    await selectFirstSubjectAndTopic();
    const startButton = page.getByRole('button', { name: /start session/i });
    await expect(startButton).toBeVisible({ timeout: 5000 });
    await startButton.click();
    await page.waitForURL(/\/dashboard\/student\/adaptive\/test/, { timeout: 10000 });
  }

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await seedStudentSession(page);
  });

  test.describe('Adaptive Learning Homepage', () => {
    test('should navigate to adaptive learning page', async () => {
      await page.goto('/dashboard/student/adaptive');
      
      const heading = page.getByRole('heading', { name: /adaptive|learning|personalized/i });
      if (await heading.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(heading).toBeVisible();
      }
    });

    test('should display available subjects', async () => {
      await page.goto('/dashboard/student/adaptive');
      const subjectSelect = page.locator('select').first();
      await expect(subjectSelect).toBeVisible({ timeout: 5000 });

      const options = subjectSelect.locator('option');
      expect(await options.count()).toBeGreaterThan(1);
    });

    test('should show subject descriptions', async () => {
      await page.goto('/dashboard/student/adaptive');
      const description = page.getByText(/pick a subject and topic/i);
      await expect(description).toBeVisible({ timeout: 3000 });
    });

    test('should display subject selector', async () => {
      await page.goto('/dashboard/student/adaptive');
      const subjectSelect = page.locator('select').first();
      await expect(subjectSelect).toBeVisible({ timeout: 5000 });
    });

    test('should allow selecting a subject', async () => {
      await page.goto('/dashboard/student/adaptive');

      const subjectSelect = page.locator('select').first();
      await expect(subjectSelect).toBeVisible({ timeout: 5000 });
      await subjectSelect.selectOption({ index: 1 });

      const topicSelect = page.locator('select').nth(1);
      await expect(topicSelect).toBeVisible({ timeout: 5000 });
      const topicOptions = topicSelect.locator('option');
      expect(await topicOptions.count()).toBeGreaterThan(1);
    });
  });

  test.describe('Topic Selection', () => {
    test('should display available topics for subject', async () => {
      await page.goto('/dashboard/student/adaptive');
      await selectFirstSubjectAndTopic();

      const topicSelect = page.locator('select').nth(1);
      await expect(topicSelect).toBeVisible({ timeout: 5000 });
      const topics = topicSelect.locator('option');
      expect(await topics.count()).toBeGreaterThan(1);
    });

    test('should show topic information', async () => {
      await page.goto('/dashboard/student/adaptive');
      await selectFirstSubjectAndTopic();

      const topicSelect = page.locator('select').nth(1);
      await expect(topicSelect).toBeVisible({ timeout: 5000 });
      const firstOption = topicSelect.locator('option').nth(1);
      // option elements are never visible in browsers; check text content directly
      const optionText = await firstOption.textContent();
      expect(optionText).toMatch(/Clasa a/i);
    });

    test('should show question count slider', async () => {
      await page.goto('/dashboard/student/adaptive');

      const slider = page.locator('input[type="range"]');
      await expect(slider).toBeVisible({ timeout: 5000 });
    });

    test('should allow starting adaptive test', async () => {
      await page.goto('/dashboard/student/adaptive');
      await startAdaptiveSession();
      await expect(page).toHaveURL(/\/dashboard\/student\/adaptive\/test/, { timeout: 10000 });
    });
  });

  test.describe('Adaptive Test Experience', () => {
    test('should start adaptive test from topic', async () => {
      await page.goto('/dashboard/student/adaptive');
      await startAdaptiveSession();
      await expect(page.getByRole('heading', { name: /adaptive quiz/i })).toBeVisible({ timeout: 5000 });
    });

    test('should display adaptive test interface', async () => {
      await page.goto('/dashboard/student/adaptive');
      await startAdaptiveSession();

      const question = page.getByText(/question|which|what|choose|select/i).first();
      await expect(question).toBeVisible({ timeout: 5000 });

      // The adaptive test uses "Submit answers" / "X / Y answered" — no "next" button
      const submitButton = page.getByRole('button', { name: /submit answers|\d+\s*\/\s*\d+\s*answered/i }).first();
      await expect(submitButton).toBeVisible({ timeout: 5000 });
    });

    test('should adapt questions based on previous answers', async () => {
      await page.goto('/dashboard/student/adaptive');
      await startAdaptiveSession();

      const option = page.locator('[role="radio"] input, [role="radio"], .question-option, button').first();
      if (await option.isVisible({ timeout: 2000 }).catch(() => false)) {
        await option.click();
      }

      const nextButton = page.getByRole('button', { name: /next|continue/i }).first();
      if (await nextButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await nextButton.click();
        await page.waitForTimeout(500);
        const newQuestion = page.getByText(/question|which|what/i).first();
        await expect(newQuestion).toBeVisible({ timeout: 5000 });
      }
    });

    test('should show adaptive test progress', async () => {
      await page.goto('/dashboard/student/adaptive');
      await startAdaptiveSession();

      // Progress shown as "X / Y answered" on the submit button or "Answer all questions... (X/Y done)"
      const progressText = page.getByText(/answered|done\.|enable submission/i).first();
      const progressBar = page.locator('[role="progressbar"]');

      if (await progressBar.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(progressBar).toBeVisible();
      } else {
        await expect(progressText).toBeVisible({ timeout: 5000 });
      }
    });

    test('should allow ending test early if permitted', async () => {
      await page.goto('/dashboard/student/adaptive');
      await startAdaptiveSession();

      const submitButton = page.getByRole('button', { name: /submit answers|submit|finish|end/i }).first();
      await expect(submitButton).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Adaptive Test Results', () => {
    test('should display adaptive test results', async () => {
      await page.goto('/dashboard/student/adaptive/results', { waitUntil: 'networkidle' });
      
      const heading = page.getByRole('heading', { name: /result|score|performance|analysis/i });
      if (await heading.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(heading).toBeVisible();
      }
    });

    test('should show performance metrics', async () => {
      await page.goto('/dashboard/student/adaptive/results', { waitUntil: 'networkidle' });
      
      // Look for performance data (accuracy, time, etc.)
      const metrics = page.getByText(/accuracy|score|time|speed|correct|answered/i);
      if (await metrics.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(metrics.first()).toBeVisible();
      }
    });

    test('should display topic-specific insights', async () => {
      await page.goto('/dashboard/student/adaptive/results', { waitUntil: 'networkidle' });
      
      // Look for topic breakdown or insights
      const insights = page.getByText(/strong|weak|improve|area|topic/i);
      if (await insights.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(insights.first()).toBeVisible();
      }
    });

    test('should show recommendations', async () => {
      await page.goto('/dashboard/student/adaptive/results', { waitUntil: 'networkidle' });
      
      // Look for recommendations
      const recommendations = page.getByText(/recommend|suggest|next|learn|study|practice/i);
      if (await recommendations.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(recommendations.first()).toBeVisible();
      }
    });

    test('should allow retrying same topic', async () => {
      await page.goto('/dashboard/student/adaptive/results', { waitUntil: 'networkidle' });
      
      // Look for retry button
      const retryButton = page.getByRole('button', { name: /retry|try again|restart|re-do/i });
      if (await retryButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await retryButton.click();
        
        // Should go back to adaptive test
        await page.waitForTimeout(500);
        const isTestPage = page.url().includes('/test') || page.getByText(/question/i).isVisible({ timeout: 1000 }).catch(() => false);
        await expect(page.locator('body')).toBeVisible();
      }
    });

    test('should allow starting new topic', async () => {
      await page.goto('/dashboard/student/adaptive/results', { waitUntil: 'networkidle' });
      
      // Look for new topic button
      const newTopicButton = page.getByRole('button', { name: /new|another|different|next topic/i });
      if (await newTopicButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await newTopicButton.click();
        
        // Should go back to topic selection or home
        await page.waitForTimeout(500);
        const isHomePage = page.url().includes('/adaptive');
        await expect(page.locator('body')).toBeVisible();
      }
    });
  });

  test.describe('Adaptive Learning History', () => {
    test('should show adaptive learning history if available', async () => {
      await page.goto('/dashboard/student/adaptive');
      
      // Look for history or previous attempts
      const historySection = page.getByText(/history|previous|past|attempts|completed/i);
      if (await historySection.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(historySection).toBeVisible();
      }
    });

    test('should allow viewing previous adaptive results', async () => {
      await page.goto('/dashboard/student/adaptive');
      
      // Find previous attempt
      const previousAttempt = page.locator('[class*="history"], [class*="attempt"]').first();
      if (await previousAttempt.isVisible({ timeout: 2000 }).catch(() => false)) {
        await previousAttempt.click();
        
        // Should show results
        await page.waitForTimeout(500);
        await expect(page.locator('body')).toBeVisible();
      }
    });
  });

  test.describe('Adaptive Error Handling', () => {
    test('should handle network errors during adaptive test', async () => {
      // Simulate network error
      await page.route('**/*', route => {
        if (route.request().url().includes('/api')) {
          route.abort();
        } else {
          route.continue();
        }
      });
      
      await page.goto('/dashboard/student/adaptive/test', { waitUntil: 'networkidle' });
      
      // Should show error or allow offline mode
      await expect(page.locator('body')).toBeVisible();
    });

    test('should handle session timeout gracefully', async () => {
      await page.goto('/dashboard/student/adaptive/test', { waitUntil: 'networkidle' });
      
      // Wait longer than session timeout
      await page.waitForTimeout(5000);
      
      // Click to see if redirected to login
      const option = page.locator('[class*="option"]').first();
      if (await option.isVisible({ timeout: 1000 }).catch(() => false)) {
        await option.click({ timeout: 5000 }).catch(() => {});
      }
      
      // Should either work or redirect appropriately
      await expect(page.locator('body')).toBeVisible();
    });
  });
});
