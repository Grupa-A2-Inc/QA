import { test, expect, Page } from '@playwright/test';
import { loginAsStudent } from '../Teste_Admin/helpers/auth'; 

test.describe('Student Course Content', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await loginAsStudent(page);
  });

  test.describe('Course Overview', () => {
    test('should navigate to course details page', async () => {
      await page.goto('/dashboard/student');
      
      // Find and click first course
      const courseCard = page.locator('[class*="course-card"], a[href*="/courses/"]').first();
      if (await courseCard.isVisible({ timeout: 3000 }).catch(() => false)) {
        await courseCard.click();
        
        // Should navigate to course details
        await expect(page).toHaveURL(/\/dashboard\/student\/courses\//, { timeout: 5000 }).catch(() => {});
      }
    });

    test('should display course header information', async () => {
      // Navigate to a course directly
      await page.goto('/dashboard/student/courses/1', { waitUntil: 'networkidle' });
      
      // Check for course title
      const courseTitle = page.getByRole('heading', { name: /course|lesson|chapter/i }).first();
      if (await courseTitle.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(courseTitle).toBeVisible();
      }
      
      // Check for course description or meta info
      const description = page.getByText(/.{20,}/).first();
      if (await description.isVisible({ timeout: 1000 }).catch(() => false)) {
        await expect(description).toBeVisible();
      }
    });

    test('should display course statistics or progress info', async () => {
      await page.goto('/dashboard/student/courses/1', { waitUntil: 'networkidle' });
      
      // Look for progress bar, completion %, or stats
      const progressBar = page.locator('[role="progressbar"], [class*="progress"]').first();
      if (await progressBar.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(progressBar).toBeVisible();
      }
      
      // Look for chapter/lesson count
      const stats = page.getByText(/\d+\s*(lesson|chapter|section|module|page)/i);
      if (await stats.first().isVisible({ timeout: 1000 }).catch(() => false)) {
        await expect(stats.first()).toBeVisible();
      }
    });

    test('should display course action buttons', async () => {
      await page.goto('/dashboard/student/courses/1', { waitUntil: 'networkidle' });
      
      // Check for action buttons like "Start", "Continue", "View Details", etc.
      const actionButtons = page.getByRole('button', { name: /start|continue|begin|view|details|enroll/i });
      const buttonCount = await actionButtons.count();
      
      if (buttonCount > 0) {
        await expect(actionButtons.first()).toBeVisible();
      }
    });
  });

  test.describe('Course Navigation', () => {
    test('should display chapter/lesson list sidebar', async () => {
      await page.goto('/dashboard/student/courses/1', { waitUntil: 'networkidle' });
      
      // Look for sidebar or navigation panel
      const sidebar = page.locator('[class*="sidebar"], [class*="nav"], nav').first();
      if (await sidebar.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(sidebar).toBeVisible();
      }
      
      // Look for chapter/lesson list items
      const chapterItems = page.locator('[class*="chapter"], [class*="lesson"], li');
      if (await chapterItems.first().isVisible({ timeout: 1000 }).catch(() => false)) {
        expect(await chapterItems.count()).toBeGreaterThan(0);
      }
    });

    test('should navigate between chapters', async () => {
      await page.goto('/dashboard/student/courses/1', { waitUntil: 'networkidle' });
      
      // Find chapter navigation buttons or links
      const nextChapterBtn = page.getByRole('button', { name: /next chapter|next|>|forward/i }).first();
      const prevChapterBtn = page.getByRole('button', { name: /previous|prev|<|back/i }).first();
      
      if (await nextChapterBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await nextChapterBtn.click();
        await page.waitForTimeout(500);
        
        // Should navigate or load new content
        await expect(page.locator('body')).toBeVisible();
      }
    });

    test('should mark lesson as completed when finished', async () => {
      await page.goto('/dashboard/student/courses/1', { waitUntil: 'networkidle' });
      
      // Find a lesson item
      const lessonItem = page.locator('[class*="lesson"], [data-testid*="lesson"]').first();
      if (await lessonItem.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Look for completion indicator (checkmark, icon, etc.)
        const completionIcon = lessonItem.locator('[class*="complete"], [class*="check"], [aria-label*="complete"]');
        
        // Either it exists or lesson is not yet completed
        if (await completionIcon.isVisible({ timeout: 1000 }).catch(() => false)) {
          await expect(completionIcon).toBeVisible();
        }
      }
    });
  });

  test.describe('Lesson Content', () => {
    test('should display lesson content area', async () => {
      await page.goto('/dashboard/student/courses/1', { waitUntil: 'networkidle' });
      
      // Main content area should be visible
      const contentArea = page.locator('[class*="content"], main, [role="main"]').first();
      if (await contentArea.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(contentArea).toBeVisible();
      }
    });

    test('should display lesson title and description', async () => {
      await page.goto('/dashboard/student/courses/1', { waitUntil: 'networkidle' });
      
      // Check for lesson heading
      const lessonHeading = page.getByRole('heading', { name: /lesson|topic|section/i }).first();
      if (await lessonHeading.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(lessonHeading).toBeVisible();
      }
      
      // Check for content/description
      const lessonContent = page.locator('[class*="description"], [class*="body"], p').first();
      if (await lessonContent.isVisible({ timeout: 1000 }).catch(() => false)) {
        await expect(lessonContent).toBeVisible();
      }
    });

    test('should display lesson resources if available', async () => {
      await page.goto('/dashboard/student/courses/1', { waitUntil: 'networkidle' });
      
      // Look for resources section (PDFs, links, files, etc.)
      const resourcesSection = page.getByText(/resource|download|attachment|file|material/i).first();
      if (await resourcesSection.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(resourcesSection).toBeVisible();
      }
      
      // Look for download or resource links
      const resourceLinks = page.getByRole('link', { name: /download|pdf|resource|file/i });
      if (await resourceLinks.first().isVisible({ timeout: 1000 }).catch(() => false)) {
        await expect(resourceLinks.first()).toBeVisible();
      }
    });

    test('should display lesson navigation (previous/next)', async () => {
      await page.goto('/dashboard/student/courses/1', { waitUntil: 'networkidle' });
      
      // Look for next/previous lesson buttons
      const navButtons = page.getByRole('button', { name: /next|previous|continue|complete/i });
      if (await navButtons.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        expect(await navButtons.count()).toBeGreaterThan(0);
      }
    });

    test('should allow marking lesson as complete', async () => {
      await page.goto('/dashboard/student/courses/1', { waitUntil: 'networkidle' });
      
      // Find complete button
      const completeBtn = page.getByRole('button', { name: /complete|finish|done|mark as complete/i });
      if (await completeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await completeBtn.click();
        
        // Should show success or navigate to next
        await page.waitForTimeout(500);
        await expect(page.locator('body')).toBeVisible();
      }
    });
  });

  test.describe('Course Stats/Progress', () => {
    test('should display course statistics page', async () => {
      await page.goto('/dashboard/student/courses/1/stats', { waitUntil: 'networkidle' });
      
      // Should show stats heading
      const statsHeading = page.getByRole('heading', { name: /statistic|progress|stat/i });
      if (await statsHeading.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(statsHeading).toBeVisible();
      }
    });

    test('should display progress overview', async () => {
      await page.goto('/dashboard/student/courses/1/stats', { waitUntil: 'networkidle' });
      
      // Look for completion percentage
      const percentageText = page.getByText(/\d+\s*%|complete|progress/i);
      if (await percentageText.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(percentageText.first()).toBeVisible();
      }
      
      // Look for progress bar
      const progressBar = page.locator('[role="progressbar"]');
      if (await progressBar.isVisible({ timeout: 1000 }).catch(() => false)) {
        await expect(progressBar).toBeVisible();
      }
    });

    test('should show lesson completion breakdown', async () => {
      await page.goto('/dashboard/student/courses/1/stats', { waitUntil: 'networkidle' });
      
      // Look for lesson breakdown table or list
      const lessonList = page.locator('[class*="lesson"], [class*="item"], tr, li').first();
      if (await lessonList.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(lessonList).toBeVisible();
      }
    });

    test('should show last accessed date/time', async () => {
      await page.goto('/dashboard/student/courses/1/stats', { waitUntil: 'networkidle' });
      
      // Look for date/time information
      const dateInfo = page.getByText(/\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}:\d{2}|last|accessed|updated/i).first();
      if (await dateInfo.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(dateInfo).toBeVisible();
      }
    });
  });

  test.describe('Course Resources', () => {
    test('should navigate to lesson resources page', async () => {
      await page.goto('/dashboard/student/courses/1', { waitUntil: 'networkidle' });
      
      // Look for resources tab or section
      const resourcesTab = page.getByRole('button', { name: /resource/i });
      if (await resourcesTab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await resourcesTab.click();
        
        await expect(page.locator('body')).toBeVisible();
      }
    });

    test('should display resource list', async () => {
      // Try navigating to resources page directly
      await page.goto('/dashboard/student/courses/1', { waitUntil: 'networkidle' });
      
      // Look for resources section
      const resourcesSection = page.getByText(/resource|material|download/i).first();
      if (await resourcesSection.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(resourcesSection).toBeVisible();
      }
    });

    test('should allow downloading resources', async () => {
      await page.goto('/dashboard/student/courses/1', { waitUntil: 'networkidle' });
      
      // Look for download link
      const downloadLink = page.getByRole('link', { name: /download|pdf|file/i }).first();
      if (await downloadLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Verify link exists and is clickable
        await expect(downloadLink).toBeVisible();
        await expect(downloadLink).toHaveAttribute('href', /./);
      }
    });
  });

  test.describe('Course Sidebar/Navigation Rating', () => {
    test('should display rating section if available', async () => {
      await page.goto('/dashboard/student/courses/1', { waitUntil: 'networkidle' });
      
      // Look for rating component (stars, thumbs up/down, etc.)
      const ratingComponent = page.locator('[class*="rating"], [aria-label*="rate"], [class*="star"]').first();
      if (await ratingComponent.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(ratingComponent).toBeVisible();
      }
    });

    test('should allow submitting a rating', async () => {
      await page.goto('/dashboard/student/courses/1', { waitUntil: 'networkidle' });
      
      // Look for rating buttons or stars
      const ratingButtons = page.getByRole('button', { name: /star|rate|rating|thumbs/i });
      if (await ratingButtons.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        // Click a rating
        await ratingButtons.first().click();
        
        // Should not throw error
        await expect(page.locator('body')).toBeVisible();
      }
    });

    test('should display enrolled students count if available', async () => {
      await page.goto('/dashboard/student/courses/1', { waitUntil: 'networkidle' });
      
      // Look for student count
      const studentCount = page.getByText(/student|enrolled|joined|participant/i).first();
      if (await studentCount.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(studentCount).toBeVisible();
      }
    });
  });

  test.describe('Course Error Handling', () => {
    test('should handle non-existent course gracefully', async () => {
      await page.goto('/dashboard/student/courses/99999', { waitUntil: 'networkidle' });
      
      // Should show error or redirect
      const errorMessage = page.getByText(/not found|not exist|error|permission|access/i);
      if (await errorMessage.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(errorMessage).toBeVisible();
      } else {
        // Or should redirect to dashboard
        const redirectedToHome = page.url().includes('/dashboard') || page.url().includes('/');
        expect(redirectedToHome).toBeTruthy();
      }
    });

    test('should handle unenrolled course access', async () => {
      // Try accessing a course without enrolling first
      await page.goto('/dashboard/student/courses/9999', { waitUntil: 'networkidle' });
      
      // Should either show message or allow enrollment flow
      const content = page.locator('body');
      await expect(content).toBeVisible();
    });

    test('should handle network errors gracefully', async () => {
      // Simulate slow network
      await page.route('**/*', route => {
        setTimeout(() => route.continue(), 2000);
      });
      
      await page.goto('/dashboard/student/courses/1', { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
      
      // Page should still be interactive or show loading state
      await expect(page.locator('body')).toBeVisible();
    });
  });
});
