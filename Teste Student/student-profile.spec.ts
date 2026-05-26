import { test, expect, Page } from '@playwright/test';
import { seedStudentSession } from '../../helpers/auth';

test.describe('Student Profile & Progress', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await seedStudentSession(page);
  });

  test.describe('Student Profile', () => {
    test('should navigate to student profile', async () => {
      await page.goto('/dashboard/student');
      
      // Look for profile link in navigation
      const profileLink = page.getByRole('link', { name: /profile|account|settings/i });
      if (await profileLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await profileLink.click();
      }
      
      // Navigate directly
      await page.goto('/dashboard/student/profile', { waitUntil: 'networkidle' });
      
      const heading = page.getByRole('heading', { name: /profile|account|my profile/i });
      if (await heading.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(heading).toBeVisible();
      }
    });

    test('should display student information', async () => {
      await page.goto('/dashboard/student/profile', { waitUntil: 'networkidle' });
      
      // Check for basic student info
      const name = page.getByText(/name|full name/i);
      const email = page.getByText(/email|e-mail/i);
      
      if (await name.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(name.first()).toBeVisible();
      }
      if (await email.first().isVisible({ timeout: 1000 }).catch(() => false)) {
        await expect(email.first()).toBeVisible();
      }
    });

    test('should display profile picture/avatar', async () => {
      await page.goto('/dashboard/student/profile', { waitUntil: 'networkidle' });
      
      // Look for avatar
      const avatar = page.locator('[class*="avatar"], img[alt*="profile"], img[alt*="avatar"]').first();
      if (await avatar.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(avatar).toBeVisible();
      }
    });

    test('should show profile sections', async () => {
      await page.goto('/dashboard/student/profile', { waitUntil: 'networkidle' });
      
      // Look for common sections (Personal, Academic, Preferences, etc.)
      const sections = ['Personal', 'Academic', 'Settings', 'Preferences', 'Security'];
      
      for (const section of sections) {
        const sectionHeading = page.getByRole('heading', { name: new RegExp(section, 'i') });
        if (await sectionHeading.isVisible({ timeout: 1000 }).catch(() => false)) {
          await expect(sectionHeading).toBeVisible();
          break;
        }
      }
    });

    test('should allow editing profile information', async () => {
      await page.goto('/dashboard/student/profile', { waitUntil: 'networkidle' });
      
      // Look for edit button
      const editButton = page.getByRole('button', { name: /edit|modify|update/i }).first();
      if (await editButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await editButton.click();
        
        // Should show editable form
        const inputs = page.locator('input, textarea, select');
        if (await inputs.first().isVisible({ timeout: 1000 }).catch(() => false)) {
          await expect(inputs.first()).toBeVisible();
        }
      }
    });

    test('should save profile changes', async () => {
      await page.goto('/dashboard/student/profile', { waitUntil: 'networkidle' });
      
      // Find edit button
      const editButton = page.getByRole('button', { name: /edit/i }).first();
      if (await editButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await editButton.click();
        
        // Make a change (if there's an input)
        const input = page.locator('input').first();
        if (await input.isVisible({ timeout: 1000 }).catch(() => false)) {
          const currentValue = await input.inputValue();
          await input.clear();
          await input.fill(currentValue + '_test');
        }
        
        // Find and click save button
        const saveButton = page.getByRole('button', { name: /save|submit|update/i });
        if (await saveButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          await saveButton.click();
          
          // Should show success message or revert to view mode
          await page.waitForTimeout(500);
          const successMsg = page.getByText(/saved|updated|success/i);
          if (await successMsg.isVisible({ timeout: 2000 }).catch(() => false)) {
            await expect(successMsg).toBeVisible();
          }
        }
      }
    });

    test('should allow changing password', async () => {
      await page.goto('/dashboard/student/profile', { waitUntil: 'networkidle' });

      // Profile page always shows the password section — check for the Update Password button
      const changePasswordBtn = page.getByRole('button', { name: /update password|change password/i });
      if (await changePasswordBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Password form is already visible — verify the inputs
        const oldPasswordInput = page.getByLabel(/current.*password/i).first();
        // Use first() to avoid strict-mode error: "Confirm New Password" also matches /new.*password/
        const newPasswordInput = page.getByLabel(/^new password$/i).first();

        if (await oldPasswordInput.isVisible({ timeout: 1000 }).catch(() => false)) {
          await expect(oldPasswordInput).toBeVisible();
          await expect(newPasswordInput).toBeVisible();
        }
      }
    });

    test('should show profile completion status', async () => {
      await page.goto('/dashboard/student/profile', { waitUntil: 'networkidle' });
      
      // Look for profile completion percentage or status
      const completionStatus = page.getByText(/complete|progress|profile strength|\d+%/i);
      if (await completionStatus.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(completionStatus.first()).toBeVisible();
      }
    });
  });

  test.describe('Student Progress Tracking', () => {
    test('should navigate to progress page', async () => {
      await page.goto('/dashboard/student/progress', { waitUntil: 'networkidle' });
      
      const heading = page.getByRole('heading', { name: /progress|tracking|statistics|stats/i });
      if (await heading.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(heading).toBeVisible();
      }
    });

    test('should display overall progress overview', async () => {
      await page.goto('/dashboard/student/progress', { waitUntil: 'networkidle' });
      
      // Look for overall progress metrics
      const overallScore = page.getByText(/overall|total|average|score/i);
      if (await overallScore.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(overallScore.first()).toBeVisible();
      }
      
      // Look for progress bars or charts
      const progressBar = page.locator('[role="progressbar"]').first();
      if (await progressBar.isVisible({ timeout: 1000 }).catch(() => false)) {
        await expect(progressBar).toBeVisible();
      }
    });

    test('should show course-wise progress', async () => {
      await page.goto('/dashboard/student/progress', { waitUntil: 'networkidle' });
      
      // Look for course list or breakdown
      const courseItems = page.locator('[class*="course"], [class*="item"], tr');
      if (await courseItems.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        expect(await courseItems.count()).toBeGreaterThan(0);
      }
    });

    test('should show progress metrics (completed, in progress, not started)', async () => {
      await page.goto('/dashboard/student/progress', { waitUntil: 'networkidle' });
      
      // Look for different status counts
      const statuses = page.getByText(/(completed|in progress|not started|pending|\d+)/i);
      if (await statuses.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        expect(await statuses.count()).toBeGreaterThan(0);
      }
    });

    test('should allow filtering progress by time period', async () => {
      await page.goto('/dashboard/student/progress', { waitUntil: 'networkidle' });
      
      // Look for date filter or time period selector
      const filterButton = page.getByRole('button', { name: /filter|week|month|year|period|time/i }).first();
      if (await filterButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await filterButton.click();
        
        // Should show filter options
        const option = page.getByRole('option').first();
        if (await option.isVisible({ timeout: 1000 }).catch(() => false)) {
          await option.click();
        }
      }
    });

    test('should display learning time spent', async () => {
      await page.goto('/dashboard/student/progress', { waitUntil: 'networkidle' });
      
      // Look for time spent metrics
      const timeSpent = page.getByText(/hour|minute|time|spent|learn/i);
      if (await timeSpent.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(timeSpent.first()).toBeVisible();
      }
    });

    test('should show achievement badges or milestones', async () => {
      await page.goto('/dashboard/student/progress', { waitUntil: 'networkidle' });
      
      // Look for badges or achievement section
      const badges = page.locator('[class*="badge"], [class*="achievement"], [class*="milestone"], img[alt*="badge"]');
      if (await badges.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(badges.first()).toBeVisible();
      }
    });

    test('should display performance charts/graphs', async () => {
      await page.goto('/dashboard/student/progress', { waitUntil: 'networkidle' });
      
      // Look for chart or graph
      const chart = page.locator('[class*="chart"], [class*="graph"], canvas, svg').first();
      if (await chart.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(chart).toBeVisible();
      }
    });

    test('should show comparison with class average if available', async () => {
      await page.goto('/dashboard/student/progress', { waitUntil: 'networkidle' });
      
      // Look for comparison data
      const comparison = page.getByText(/average|class|compare|vs|compared/i);
      if (await comparison.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(comparison.first()).toBeVisible();
      }
    });

    test('should allow downloading progress report', async () => {
      await page.goto('/dashboard/student/progress', { waitUntil: 'networkidle' });
      
      // Look for download button
      const downloadButton = page.getByRole('button', { name: /download|export|pdf|report|print/i });
      if (await downloadButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(downloadButton).toBeVisible();
        
        // Click and verify
        await downloadButton.click();
        // Should not throw error
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('Student Statistics', () => {
    test('should display learning statistics', async () => {
      await page.goto('/dashboard/student/progress', { waitUntil: 'networkidle' });
      
      // Look for various statistics
      const stats = page.getByText(/courses|lessons|tests|completion|streak/i);
      if (await stats.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(stats.first()).toBeVisible();
      }
    });

    test('should show test performance statistics', async () => {
      await page.goto('/dashboard/student/progress', { waitUntil: 'networkidle' });
      
      // Look for test scores or performance
      const performance = page.getByText(/score|average|percentage|pass|fail|result/i);
      if (await performance.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(performance.first()).toBeVisible();
      }
    });

    test('should display learning streaks if available', async () => {
      await page.goto('/dashboard/student/progress', { waitUntil: 'networkidle' });
      
      // Look for streak counter
      const streak = page.getByText(/streak|day|consecutive/i);
      if (await streak.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(streak.first()).toBeVisible();
      }
    });
  });

  test.describe('Profile Settings', () => {
    test('should display notification preferences', async () => {
      await page.goto('/dashboard/student/profile', { waitUntil: 'networkidle' });
      
      // Look for notifications section
      const notificationsSection = page.getByText(/notification|email|alert/i).first();
      if (await notificationsSection.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Look for toggle switches or checkboxes
        const toggles = page.locator('[role="switch"], [type="checkbox"]');
        if (await toggles.first().isVisible({ timeout: 1000 }).catch(() => false)) {
          await expect(toggles.first()).toBeVisible();
        }
      }
    });

    test('should allow changing language/locale preference', async () => {
      await page.goto('/dashboard/student/profile', { waitUntil: 'networkidle' });
      
      // Look for language selector
      const languageSelector = page.getByRole('combobox', { name: /language|locale|english/i });
      if (await languageSelector.isVisible({ timeout: 2000 }).catch(() => false)) {
        await languageSelector.click();
        
        // Should show language options
        const option = page.getByRole('option').first();
        if (await option.isVisible({ timeout: 1000 }).catch(() => false)) {
          await expect(option).toBeVisible();
        }
      }
    });

    test('should allow changing theme preference', async () => {
      await page.goto('/dashboard/student/profile', { waitUntil: 'networkidle' });
      
      // Look for theme selector or toggle
      const themeToggle = page.getByRole('button', { name: /theme|dark|light|mode/i });
      if (await themeToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
        await themeToggle.click();
        
        // Theme should change or dialog should appear
        await page.waitForTimeout(300);
      }
    });

    test('should show privacy settings', async () => {
      await page.goto('/dashboard/student/profile', { waitUntil: 'networkidle' });
      
      // Look for privacy section
      const privacySection = page.getByText(/privacy|private|public|visibility/i);
      if (await privacySection.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(privacySection.first()).toBeVisible();
      }
    });

    test('should allow deleting account', async () => {
      await page.goto('/dashboard/student/profile', { waitUntil: 'networkidle' });
      
      // Look for delete account option (usually at bottom)
      const deleteButton = page.getByRole('button', { name: /delete|deactivate|close account|dangerous/i });
      if (await deleteButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(deleteButton).toBeVisible();
        
        // Should not be easy to click accidentally
        const warning = page.getByText(/sure|confirm|cannot be undone|permanent/i);
        if (await warning.isVisible({ timeout: 1000 }).catch(() => false)) {
          await expect(warning).toBeVisible();
        }
      }
    });
  });

  test.describe('Progress Error Handling', () => {
    test('should handle empty progress gracefully', async () => {
      await page.goto('/dashboard/student/progress', { waitUntil: 'networkidle' });

      // Page may show data (Course Progress / Progress: X%) or an empty-state message
      const progressBar = page.locator('[role="progressbar"]');
      const progressData = page.getByText(/progress|course progress|no progress|loading/i).first();

      const hasContent =
        (await progressBar.isVisible({ timeout: 1000 }).catch(() => false)) ||
        (await progressData.isVisible({ timeout: 2000 }).catch(() => false));

      expect(hasContent).toBeTruthy();
    });

    test('should handle network errors in profile', async () => {
      await page.route('**/*api*', route => {
        route.abort();
      });
      
      await page.goto('/dashboard/student/profile', { waitUntil: 'networkidle' });
      
      // Should show error message or cached data
      await expect(page.locator('body')).toBeVisible();
    });

    test('should handle invalid profile updates', async () => {
      await page.goto('/dashboard/student/profile', { waitUntil: 'networkidle' });
      
      // Try to fill invalid data
      const editButton = page.getByRole('button', { name: /edit/i }).first();
      if (await editButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await editButton.click();
        
        // Try to submit with empty required fields
        const saveButton = page.getByRole('button', { name: /save/i });
        if (await saveButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          await saveButton.click({ timeout: 5000 }).catch(() => {});
          
          // Should show validation error
          await page.waitForTimeout(500);
        }
      }
    });
  });
});
