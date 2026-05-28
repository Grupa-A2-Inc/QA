const path = require('path');
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: '.',
  globalSetup: './helpers/global-setup.js',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  reporter: 'html',
  use: {
    baseURL: 'https://frontend-teal-five-57.vercel.app',
    storageState: path.resolve(__dirname, '.auth', 'teacher.json'),
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
