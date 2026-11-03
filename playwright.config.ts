import { defineConfig, devices } from '@playwright/test'
const externalUrl = process.env.PLAYWRIGHT_BASE_URL

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  workers: 3,
  reporter: 'list',
  use: {
    baseURL: externalUrl || 'http://localhost:4173',
    locale: 'en-US',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'firefox',
      testIgnore: '**/accessibility.spec.ts',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testIgnore: '**/accessibility.spec.ts',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: externalUrl
    ? undefined
    : {
        command: 'npm run preview -- --host localhost --port 4173 --strictPort',
        url: 'http://localhost:4173',
        reuseExistingServer: !process.env.CI,
      },
})
