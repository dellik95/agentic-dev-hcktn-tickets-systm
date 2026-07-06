import { defineConfig, devices } from '@playwright/test'

// Tests run against the real docker-compose stack (frontend + backend + mysql + mailpit) —
// there's no `webServer` here to auto-start; CI and local runs both bring the stack up
// themselves first (`docker compose up --build -d`) since Playwright can't drive `docker compose`.
export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // no isolation within a file...
  workers: 1, // ...and none across files either: teams/epics are a shared global list with no
  // per-test tenancy, so any concurrent worker races on the same rows (wrong "first match"
  // button, "list is empty" assertions broken by another test's leftover data). Single worker
  // trades a few seconds of wall-clock for a suite that isn't flaky by construction.
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
