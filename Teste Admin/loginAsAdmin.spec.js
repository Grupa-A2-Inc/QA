import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://frontend-teal-five-57.vercel.app/login');
  await page.getByRole('textbox', { name: 'e.g. student@school.com' }).click();
  await page.getByRole('textbox', { name: 'e.g. student@school.com' }).fill('georgeplesca36@gmail.com');
  await page.getByRole('textbox', { name: 'Enter your password' }).click();
  await page.getByRole('textbox', { name: 'Enter your password' }).fill('sixseven');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.locator('div').filter({ hasText: 'Admin DashboardOverview of' }).nth(2)).toBeVisible();
  await expect(page.getByText('Total Students0Calculated')).toBeVisible();
  await expect(page.getByText('Total Teachers0Calculated')).toBeVisible();
  await expect(page.getByText('Total Classes0Pending backend')).toBeVisible();
  await expect(page.getByText('Total Courses0Based on')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Customer support chat' })).toBeVisible();
});