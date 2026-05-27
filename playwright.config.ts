import { defineConfig } from '@playwright/test';

export default defineConfig({
  workers: 1,
  testDir: '.',

  use: {
    baseURL: 'https://frontend-teal-five-57.vercel.app',
    headless: true,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 20_000,       
    navigationTimeout: 60_000,   
  },

  timeout: 90_000,   
  expect: {
    timeout: 15_000, 
  },

  retries: 1,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'html-report' }],
  ],
});