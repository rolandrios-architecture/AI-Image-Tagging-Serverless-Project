import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  webServer: {
    command: 'npm run dev',
    url: process.env.FRONT_URL || 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
  use: {
    headless: true,
    baseURL: process.env.FRONT_URL || 'http://localhost:5173',
  },
});
