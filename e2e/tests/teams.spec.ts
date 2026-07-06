import { expect, test } from '@playwright/test'
import { signUpVerifyAndLogIn } from '../helpers/auth'

test('create, rename, and delete a team; duplicate names are rejected', async ({ page }) => {
  const email = `e2e-teams-${Date.now()}@example.com`
  await signUpVerifyAndLogIn(page, email, 'correcthorse123')

  await page.click('nav >> text=Teams')
  await expect(page).toHaveURL(/\/teams/)

  const teamName = `E2E Team ${Date.now()}`
  await page.fill('input[placeholder="New team name"]', teamName)
  await page.click('button:has-text("Create")')
  await expect(page.getByText(teamName, { exact: true })).toBeVisible()

  // Duplicate name (case-insensitive) is rejected with a 409 the UI surfaces inline.
  await page.fill('input[placeholder="New team name"]', teamName.toUpperCase())
  await page.click('button:has-text("Create")')
  await expect(page.getByText('already exists')).toBeVisible()

  // Rename in place.
  await page.click('button:has-text("Rename")')
  const renamedName = `${teamName} Renamed`
  await page.locator('li input').fill(renamedName)
  await page.click('button:has-text("Save")')
  await expect(page.getByText(renamedName, { exact: true })).toBeVisible()

  // Delete, confirming the browser dialog.
  page.once('dialog', (dialog) => dialog.accept())
  await page.click('button:has-text("Delete")')
  await expect(page.getByText('No teams yet.')).toBeVisible()
})

test('empty team name is rejected', async ({ page }) => {
  const email = `e2e-teams-empty-${Date.now()}@example.com`
  await signUpVerifyAndLogIn(page, email, 'correcthorse123')

  await page.click('nav >> text=Teams')
  await page.fill('input[placeholder="New team name"]', '   ')
  await page.click('button:has-text("Create")')

  await expect(page.getByText('Team name is required.')).toBeVisible()
})
