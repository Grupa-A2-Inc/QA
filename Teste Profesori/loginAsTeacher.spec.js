import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://frontend-teal-five-57.vercel.app/login');
  await page.getByRole('textbox', { name: 'e.g. student@school.com' }).click();
  await page.getByRole('textbox', { name: 'e.g. student@school.com' }).fill('japonezul75@gmail.com');
  await page.getByRole('textbox', { name: 'Enter your password' }).click();
  await page.getByRole('textbox', { name: 'Enter your password' }).fill('parola123');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByRole('main')).toBeVisible();
});