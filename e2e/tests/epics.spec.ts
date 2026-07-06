import { expect, type Page, test } from '@playwright/test'
import { signUpVerifyAndLogIn } from '../helpers/auth'

// Teams and epics are shared global lists (no per-user scoping — see docs/epics/EPIC-02-teams.md,
// EPIC-03-epics.md). Every interaction is scoped to this test's own row by name/title, and
// assertions check for this test's entity specifically — other tests' leftover data coexists in
// the same lists within a run (see playwright.config.ts's `workers: 1` for why that's safe).

async function createTeam(page: Page, name: string) {
  await page.click('nav >> text=Teams')
  await expect(page).toHaveURL(/\/teams/)
  await page.click('button:has-text("Create team")')
  await page.fill('[role="dialog"] input[placeholder="Team name"]', name)
  await page.click('[role="dialog"] button:has-text("Create")')
  await expect(page.locator('li', { hasText: name })).toBeVisible()
}

test('create, rename, and delete an epic scoped to a team', async ({ page }) => {
  const email = `e2e-epics-${Date.now()}@example.com`
  await signUpVerifyAndLogIn(page, email, 'correcthorse123')

  const teamName = `E2E Epic Team ${Date.now()}`
  await createTeam(page, teamName)

  await page.click('nav >> text=Epics')
  await expect(page).toHaveURL(/\/epics/)
  await expect(page.getByText('Select a team to manage its epics.')).toBeVisible()

  await page.selectOption('select', { label: teamName })

  const epicTitle = `E2E Epic ${Date.now()}`
  await page.click('button:has-text("Create epic")')
  await page.fill('[role="dialog"] input[placeholder="Epic title"]', epicTitle)
  await page.locator('[data-testid="epic-create-description"]').fill('Initial description')
  await page.click('[role="dialog"] button:has-text("Create")')
  const row = page.locator('li', { hasText: epicTitle })
  await expect(row).toBeVisible()
  await expect(row.getByText('Initial description', { exact: true })).toBeVisible()

  // Rename via the modal: title and description both editable, no team control anywhere (an
  // epic's team is immutable after creation). The description editor is a TipTap contenteditable,
  // not a <textarea> — Playwright's fill() supports contenteditable directly.
  await row.getByRole('button', { name: 'Rename' }).click()
  const renamedTitle = `${epicTitle} Renamed`
  await page.fill('[role="dialog"] input[placeholder="Epic title"]', renamedTitle)
  await page.locator('[data-testid="epic-edit-description"]').fill('Updated description')
  await page.click('[role="dialog"] button:has-text("Save")')
  const renamedRow = page.locator('li', { hasText: renamedTitle })
  await expect(renamedRow).toBeVisible()
  await expect(renamedRow.getByText('Updated description', { exact: true })).toBeVisible()

  // Switching teams in the selector hides this team's epics (scoped, not global).
  const otherTeamName = `E2E Other Team ${Date.now()}`
  await createTeam(page, otherTeamName)
  await page.click('nav >> text=Epics')
  await page.selectOption('select', { label: otherTeamName })
  await expect(page.locator('li', { hasText: renamedTitle })).toHaveCount(0)

  // Switch back and delete.
  await page.selectOption('select', { label: teamName })
  await expect(renamedRow).toBeVisible()
  page.once('dialog', (dialog) => dialog.accept())
  await renamedRow.getByRole('button', { name: 'Delete' }).click()
  await expect(page.locator('li', { hasText: renamedTitle })).toHaveCount(0)
})

test('empty epic title is rejected', async ({ page }) => {
  const email = `e2e-epics-empty-${Date.now()}@example.com`
  await signUpVerifyAndLogIn(page, email, 'correcthorse123')

  const teamName = `E2E Epic Validation Team ${Date.now()}`
  await createTeam(page, teamName)

  await page.click('nav >> text=Epics')
  await page.selectOption('select', { label: teamName })
  await page.click('button:has-text("Create epic")')
  await page.fill('[role="dialog"] input[placeholder="Epic title"]', '   ')
  await page.click('[role="dialog"] button:has-text("Create")')

  await expect(page.getByText('Epic title is required.')).toBeVisible()
})

test('a team with epics cannot be deleted', async ({ page }) => {
  const email = `e2e-epics-team-guard-${Date.now()}@example.com`
  await signUpVerifyAndLogIn(page, email, 'correcthorse123')

  const teamName = `E2E Guarded Team ${Date.now()}`
  await createTeam(page, teamName)

  await page.click('nav >> text=Epics')
  await page.selectOption('select', { label: teamName })
  await page.click('button:has-text("Create epic")')
  await page.fill('[role="dialog"] input[placeholder="Epic title"]', 'Blocking Epic')
  await page.click('[role="dialog"] button:has-text("Create")')
  await expect(page.locator('li', { hasText: 'Blocking Epic' })).toBeVisible()

  await page.click('nav >> text=Teams')
  const teamRow = page.locator('li', { hasText: teamName })
  page.once('dialog', (dialog) => dialog.accept())
  await teamRow.getByRole('button', { name: 'Delete' }).click()
  await expect(teamRow.getByText('still has epics')).toBeVisible()
  // Team is still present — the guard blocked the delete, not just showed an error.
  await expect(teamRow).toBeVisible()
})
