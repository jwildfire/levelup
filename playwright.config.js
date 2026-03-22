import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 0,
  workers: 1,
  use: {
    headless: true,
    viewport: { width: 1024, height: 768 },
    baseURL: 'http://localhost:3001',
  },
  webServer: {
    command: 'npx serve . -p 3001 -L',
    port: 3001,
    reuseExistingServer: true,
  },
  projects: [
    {
      name: 'existing',
      testDir: './tests/existing',
    },
    {
      name: 'new',
      testDir: './tests/new',
    },
  ],
});
