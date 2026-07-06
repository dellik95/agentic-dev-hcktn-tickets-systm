import { defineConfig, devices } from '@playwright/test'

// Tests run against the real docker-compose stack (frontend + backend + mysql + mailpit) —
// there's no `webServer` here to auto-start; CI and local runs both bring the stack up
// themselves first (`docker compose up --build -d`) since Playwright can't drive `docker compose`.
export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // teams are a shared global list — parallel specs would race on names
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
