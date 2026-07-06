import { expect, test } from '@playwright/test'
import { signUpVerifyAndLogIn } from '../helpers/auth'

// Teams are a shared global list (no per-user scoping, by design — see docs/epics/EPIC-02-teams.md).
// Every interaction below is scoped to this test's own row by name, and assertions check for
// this test's entity specifically rather than "the list is empty" — other tests' leftover teams
// coexist in the same list within a run.

test('create, rename, and delete a team; duplicate names are rejected', async ({ page }) => {
  const email = `e2e-teams-${Date.now()}@example.com`
  await signUpVerifyAndLogIn(page, email, 'correcthorse123')

  await page.click('nav >> text=Teams')
  await expect(page).toHaveURL(/\/teams/)

  const teamName = `E2E Team ${Date.now()}`
  await page.fill('input[placeholder="New team name"]', teamName)
  await page.click('button:has-text("Create")')
  const row = page.locator('li', { hasText: teamName })
  await expect(row).toBeVisible()

  // Duplicate name (case-insensitive) is rejected with a 409 the UI surfaces inline.
  await page.fill('input[placeholder="New team name"]', teamName.toUpperCase())
  await page.click('button:has-text("Create")')
  await expect(page.getByText('already exists')).toBeVisible()

  // Rename in place. Once editing starts, the name moves from a text node into an <input value>,
  // which Playwright's hasText text-content match can't see — so `row` (found by hasText) stops
  // resolving the instant edit mode starts. Since only one row is ever mid-edit at a time (single
  // worker, one test interacting at once), the unscoped `li input`/`li button` is unambiguous here.
  await row.getByRole('button', { name: 'Rename' }).click()
  const renamedName = `${teamName} Renamed`
  await page.locator('li input').fill(renamedName)
  await page.locator('li').getByRole('button', { name: 'Save' }).click()
  const renamedRow = page.locator('li', { hasText: renamedName })
  await expect(renamedRow).toBeVisible()

  // Delete, confirming the browser dialog.
  page.once('dialog', (dialog) => dialog.accept())
  await renamedRow.getByRole('button', { name: 'Delete' }).click()
  await expect(page.locator('li', { hasText: renamedName })).toHaveCount(0)
})

test('empty team name is rejected', async ({ page }) => {
  const email = `e2e-teams-empty-${Date.now()}@example.com`
  await signUpVerifyAndLogIn(page, email, 'correcthorse123')

  await page.click('nav >> text=Teams')
  await page.fill('input[placeholder="New team name"]', '   ')
  await page.click('button:has-text("Create")')

  await expect(page.getByText('Team name is required.')).toBeVisible()
})
