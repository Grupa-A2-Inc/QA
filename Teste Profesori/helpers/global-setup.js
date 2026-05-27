const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

module.exports = async function globalSetup() {
  const authDir = path.join(__dirname, '../.auth');
  fs.mkdirSync(authDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('https://frontend-teal-five-57.vercel.app/login');
  await page.getByRole('textbox', { name: 'e.g. student@school.com' }).fill('roxana.basarab7@gmail.com');
  await page.getByRole('textbox', { name: 'Enter your password' }).fill('teacher123');
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.waitForURL('**/dashboard**', { timeout: 90_000 });

  await context.storageState({ path: path.join(authDir, 'teacher.json') });
  await browser.close();
};
