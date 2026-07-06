import { expect, type Page, test } from '@playwright/test'
import { signUpVerifyAndLogIn } from '../helpers/auth'

// Exercises the Team -> Epic -> Board -> Ticket-details drill-down and its breadcrumb trail.
// Teams/epics/tickets are shared global lists (no per-user scoping), and the suite runs
// single-worker (playwright.config.ts) since there's no per-test tenancy.

async function createTeam(page: Page, name: string) {
  await page.click('nav >> text=Teams')
  await expect(page).toHaveURL(/\/teams/)
  await page.click('button:has-text("Create team")')
  await page.fill('[role="dialog"] input[placeholder="Team name"]', name)
  await page.click('[role="dialog"] button:has-text("Create")')
  await expect(page.locator('li', { hasText: name })).toBeVisible()
}

test('drilling down from a team to a ticket via View epics -> View tickets -> a card shows a working breadcrumb', async ({
  page,
}) => {
  const email = `e2e-nav-drilldown-${Date.now()}@example.com`
  await signUpVerifyAndLogIn(page, email, 'correcthorse123')

  const teamName = `E2E Nav Team ${Date.now()}`
  const epicTitle = `E2E Nav Epic ${Date.now()}`
  const ticketTitle = `E2E Nav Ticket ${Date.now()}`
  await createTeam(page, teamName)

  // Team -> Epics, scoped by the "View epics" link (not the top nav + manual team pick).
  const teamRow = page.locator('li', { hasText: teamName })
  await teamRow.getByRole('link', { name: 'View epics' }).click()
  await expect(page).toHaveURL(/\/epics\?teamId=/)
  await expect(page.locator('select')).toHaveValue(/.+/) // preselected from the URL, not left blank

  await page.click('button:has-text("Create epic")')
  await page.fill('[role="dialog"] input[placeholder="Epic title"]', epicTitle)
  await page.click('[role="dialog"] button:has-text("Create")')
  await expect(page.locator('li', { hasText: epicTitle })).toBeVisible()

  // Epic -> Board, scoped by the "View tickets" link.
  const epicRow = page.locator('li', { hasText: epicTitle })
  await epicRow.getByRole('link', { name: 'View tickets' }).click()
  await expect(page).toHaveURL(/\/board\?teamId=.*epicId=/)
  await expect(page.getByRole('heading', { name: 'Board', level: 1 })).toBeVisible()

  await page.click('button:has-text("Create ticket")')
  await page.fill('[role="dialog"] input[placeholder="Ticket title"]', ticketTitle)
  await page.locator('[role="dialog"] label:has-text("Epic") + select').selectOption({ label: epicTitle })
  await page.locator('[data-testid="ticket-form-body"]').fill('body')
  await page.click('[role="dialog"] button:has-text("Create")')
  const card = page.locator('[data-testid^="board-card-"]', { hasText: ticketTitle })
  await expect(card).toBeVisible()

  // Board card -> Ticket details, with the full breadcrumb chain.
  await card.click()
  await expect(page).toHaveURL(/\/tickets\//)
  const breadcrumb = page.getByRole('navigation', { name: 'Breadcrumb' })
  await expect(breadcrumb).toContainText('Teams')
  await expect(breadcrumb).toContainText(teamName)
  await expect(breadcrumb).toContainText(epicTitle)
  await expect(breadcrumb.getByText(ticketTitle, { exact: true })).toBeVisible()

  // Clicking the epic crumb goes back to the board, scoped to that epic.
  await breadcrumb.getByRole('link', { name: epicTitle }).click()
  await expect(page).toHaveURL(/\/board\?teamId=.*epicId=/)
  await expect(card).toBeVisible()
})

test('a ticket with no epic shows a "No epic" breadcrumb segment that still links back to the board', async ({ page }) => {
  const email = `e2e-nav-no-epic-${Date.now()}@example.com`
  await signUpVerifyAndLogIn(page, email, 'correcthorse123')

  const teamName = `E2E Nav No Epic Team ${Date.now()}`
  const ticketTitle = `E2E Nav No Epic Ticket ${Date.now()}`
  await createTeam(page, teamName)

  await page.click('nav >> text=Board')
  await expect(page.getByRole('heading', { name: 'Board', level: 1 })).toBeVisible()
  await page.selectOption('select', { label: teamName })
  await page.click('button:has-text("Create ticket")')
  await page.fill('[role="dialog"] input[placeholder="Ticket title"]', ticketTitle)
  await page.locator('[data-testid="ticket-form-body"]').fill('body')
  await page.click('[role="dialog"] button:has-text("Create")')

  const card = page.locator('[data-testid^="board-card-"]', { hasText: ticketTitle })
  await card.click()
  await expect(page).toHaveURL(/\/tickets\//)

  const breadcrumb = page.getByRole('navigation', { name: 'Breadcrumb' })
  const noEpicCrumb = breadcrumb.getByRole('link', { name: 'No epic', exact: true })
  await expect(noEpicCrumb).toBeVisible()
  await noEpicCrumb.click()
  await expect(page).toHaveURL(/\/board\?teamId=/)
})

test('deleting a ticket from its detail page navigates back to the board and removes it', async ({ page }) => {
  const email = `e2e-nav-delete-${Date.now()}@example.com`
  await signUpVerifyAndLogIn(page, email, 'correcthorse123')

  const teamName = `E2E Nav Delete Team ${Date.now()}`
  const ticketTitle = `E2E Nav Delete Ticket ${Date.now()}`
  await createTeam(page, teamName)

  await page.click('nav >> text=Board')
  await page.selectOption('select', { label: teamName })
  await page.click('button:has-text("Create ticket")')
  await page.fill('[role="dialog"] input[placeholder="Ticket title"]', ticketTitle)
  await page.locator('[data-testid="ticket-form-body"]').fill('body')
  await page.click('[role="dialog"] button:has-text("Create")')

  const card = page.locator('[data-testid^="board-card-"]', { hasText: ticketTitle })
  await card.click()
  await expect(page).toHaveURL(/\/tickets\//)

  page.once('dialog', (dialog) => dialog.accept())
  await page.click('button:has-text("Delete ticket")')

  await expect(page).toHaveURL(/\/board\?teamId=/)
  await expect(page.locator('[data-testid^="board-card-"]', { hasText: ticketTitle })).toHaveCount(0)
})

test('opening a nonexistent ticket shows a clear message instead of a blank page', async ({ page }) => {
  const email = `e2e-nav-404-${Date.now()}@example.com`
  await signUpVerifyAndLogIn(page, email, 'correcthorse123')

  await page.goto('/tickets/00000000-0000-0000-0000-000000000000')
  await expect(page.getByText(/not found/i)).toBeVisible()
  await expect(page.getByRole('link', { name: 'Back to Teams' })).toBeVisible()
})
