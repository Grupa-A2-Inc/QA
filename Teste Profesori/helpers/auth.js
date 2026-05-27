const { expect } = require('@playwright/test');

const testUsers = {
  teacher: {
    email: 'roxana.basarab7@gmail.com',
    password: 'teacher123',
  },
  admin: {
    email: 'admin.doe@mail.com',
    password: 'admindoe123',
  },
  student: {
    email: 'dfdavidqd7@gmail.com',
    password: 'studentdoe123',
  },
};

async function loginAsTeacher(page) {
  // If the browser context already has an auth session (via storageState), reuse it.
  // Navigate to dashboard; if redirected to /login, the session is missing — fall back to full login.
  await page.goto('/dashboard/teacher/', { waitUntil: 'load', timeout: 30_000 }).catch(() => {});
  if (!page.url().includes('/login')) {
    await expect(page.getByRole('heading', { name: /my courses/i })).toBeVisible({ timeout: 15_000 });
    return;
  }

  // Session missing or cleared — do a full login.
  await page.goto('/login', { waitUntil: 'load' });
  await page.getByRole('textbox', { name: 'e.g. student@school.com' }).fill(testUsers.teacher.email);
  await page.getByRole('textbox', { name: 'Enter your password' }).fill(testUsers.teacher.password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.waitForURL('**/dashboard**', { timeout: 90_000 });
  await expect(page.getByRole('heading', { name: /my courses/i })).toBeVisible({ timeout: 15_000 });
}

async function loginAsAdmin(page) {
  await page.context().clearCookies();
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'e.g. student@school.com' }).fill(testUsers.admin.email);
  await page.getByRole('textbox', { name: 'Enter your password' }).fill(testUsers.admin.password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.waitForURL('**/dashboard**', { timeout: 60_000 });
  await expect(page.getByText(/admin dashboard/i)).toBeVisible({ timeout: 15_000 });
}

module.exports = { loginAsTeacher, loginAsAdmin, testUsers };
