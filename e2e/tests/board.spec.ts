import { expect, type Page, test } from '@playwright/test'
import { signUpVerifyAndLogIn } from '../helpers/auth'

// Teams/epics/tickets are shared global lists (no per-user scoping). Every interaction is scoped
// to this test's own row/ticket by name/title, and the suite runs single-worker
// (playwright.config.ts) since there's no per-test tenancy.

async function createTeam(page: Page, name: string) {
  await page.click('nav >> text=Teams')
  await expect(page).toHaveURL(/\/teams/)
  await page.click('button:has-text("Create team")')
  await page.fill('[role="dialog"] input[placeholder="Team name"]', name)
  await page.click('[role="dialog"] button:has-text("Create")')
  await expect(page.locator('li', { hasText: name })).toBeVisible()
}

async function goToBoardFor(page: Page, teamName: string) {
  await page.click('nav >> text=Board')
  await expect(page).toHaveURL(/\/board/)
  await expect(page.getByRole('heading', { name: 'Board', level: 1 })).toBeVisible()
  await page.selectOption('select', { label: teamName })
}

async function createTicketFromBoard(page: Page, title: string) {
  await page.click('button:has-text("Create ticket")')
  await page.fill('[role="dialog"] input[placeholder="Ticket title"]', title)
  await page.locator('[data-testid="ticket-form-body"]').fill('body')
  await page.click('[role="dialog"] button:has-text("Create")')
  await expect(page.locator('[data-testid^="board-card-"]', { hasText: title })).toBeVisible()
}

function cardFor(page: Page, title: string) {
  return page.locator('[data-testid^="board-card-"]', { hasText: title })
}

function columnFor(page: Page, state: string) {
  return page.locator(`[data-testid="board-column-${state}"]`)
}

test('selecting a team shows exactly 5 columns in the fixed workflow order', async ({ page }) => {
  const email = `e2e-board-columns-${Date.now()}@example.com`
  await signUpVerifyAndLogIn(page, email, 'correcthorse123')

  const teamName = `E2E Board Columns Team ${Date.now()}`
  await createTeam(page, teamName)
  await goToBoardFor(page, teamName)

  // Zero tickets: all 5 columns still render (only their content is empty), not zero columns.
  const headings = page.locator('main h2')
  await expect(headings).toHaveCount(5)
  await expect(headings.nth(0)).toHaveText('New')
  await expect(headings.nth(1)).toHaveText('Ready for Implementation')
  await expect(headings.nth(2)).toHaveText('In Progress')
  await expect(headings.nth(3)).toHaveText('Ready for Acceptance')
  await expect(headings.nth(4)).toHaveText('Done')
  await expect(page.getByText('This team has no tickets yet.')).toBeVisible()
})

test('the per-card status dropdown moves a card between columns (Jira-style quick change)', async ({ page }) => {
  const email = `e2e-board-dropdown-${Date.now()}@example.com`
  await signUpVerifyAndLogIn(page, email, 'correcthorse123')

  const teamName = `E2E Board Dropdown Team ${Date.now()}`
  const title = `E2E Dropdown Ticket ${Date.now()}`
  await createTeam(page, teamName)
  await goToBoardFor(page, teamName)
  await createTicketFromBoard(page, title)

  await expect(columnFor(page, 'new')).toContainText(title)

  const card = cardFor(page, title)
  // Wait for the PATCH to actually reach the server (not just the optimistic UI update) before
  // reloading below — a reload can abort an in-flight request, which would otherwise make this
  // test pass on optimistic state alone while never proving the change actually persisted.
  const patchResponse = page.waitForResponse(
    (res) => /\/api\/v1\/tickets\/.+\/state$/.test(res.url()) && res.request().method() === 'PATCH',
  )
  await card.locator('select').selectOption('done')
  await patchResponse

  await expect(columnFor(page, 'done')).toContainText(title)
  await expect(columnFor(page, 'new')).not.toContainText(title)

  // Persists server-side: a full reload must still show it in Done, not reset to New.
  await page.reload()
  await expect(columnFor(page, 'done')).toContainText(title)
})

test('dragging a card to a different column persists after a refresh', async ({ page }) => {
  const email = `e2e-board-drag-${Date.now()}@example.com`
  await signUpVerifyAndLogIn(page, email, 'correcthorse123')

  const teamName = `E2E Board Drag Team ${Date.now()}`
  const title = `E2E Drag Ticket ${Date.now()}`
  await createTeam(page, teamName)
  await goToBoardFor(page, teamName)
  await createTicketFromBoard(page, title)

  const card = cardFor(page, title)
  const targetColumn = columnFor(page, 'in_progress')

  const cardBox = await card.boundingBox()
  const targetBox = await targetColumn.boundingBox()
  if (!cardBox || !targetBox) throw new Error('Could not measure card/column for drag')

  // dnd-kit's PointerSensor needs real, gradual pointer movement past its activation-distance
  // threshold (8px) to start a drag — a single instantaneous move (or locator.dragTo, which doesn't
  // step through intermediate positions) doesn't reliably trigger it, so this drives the mouse by hand.
  // Also wait for the resulting PATCH to actually reach the server before reloading below — a
  // reload can abort an in-flight request, which would otherwise let this test pass on optimistic
  // UI state alone without proving the move persisted.
  const patchResponse = page.waitForResponse(
    (res) => /\/api\/v1\/tickets\/.+\/state$/.test(res.url()) && res.request().method() === 'PATCH',
  )
  await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(targetBox.x + targetBox.width / 2, cardBox.y + cardBox.height / 2, { steps: 10 })
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + 20, { steps: 10 })
  await page.mouse.up()
  await patchResponse

  await expect(targetColumn).toContainText(title)
  await expect(columnFor(page, 'new')).not.toContainText(title)

  await page.reload()
  await expect(columnFor(page, 'in_progress')).toContainText(title)
})

test('a failed state change shows a visible error and the card returns to its column', async ({ page }) => {
  const email = `e2e-board-rollback-${Date.now()}@example.com`
  await signUpVerifyAndLogIn(page, email, 'correcthorse123')

  const teamName = `E2E Board Rollback Team ${Date.now()}`
  const title = `E2E Rollback Ticket ${Date.now()}`
  await createTeam(page, teamName)
  await goToBoardFor(page, teamName)
  await createTicketFromBoard(page, title)

  // Force the PATCH the dropdown fires to fail, to exercise the optimistic-update rollback path.
  await page.route('**/api/v1/tickets/*/state', (route) => route.abort('failed'))

  const card = cardFor(page, title)
  await card.locator('select').selectOption('done')

  await expect(page.getByText(/Could not move ticket/)).toBeVisible()
  await expect(columnFor(page, 'new')).toContainText(title)
  await expect(columnFor(page, 'done')).not.toContainText(title)
})

test('type, epic, and search filters combine with AND logic on the board', async ({ page }) => {
  const email = `e2e-board-filters-${Date.now()}@example.com`
  await signUpVerifyAndLogIn(page, email, 'correcthorse123')

  const teamName = `E2E Board Filter Team ${Date.now()}`
  await createTeam(page, teamName)
  await goToBoardFor(page, teamName)

  const stamp = Date.now()
  async function quickCreate(type: 'bug' | 'feature' | 'fix', title: string) {
    await page.click('button:has-text("Create ticket")')
    await page.fill('[role="dialog"] input[placeholder="Ticket title"]', title)
    await page.locator('[role="dialog"] label:has-text("Type") + select').selectOption(type)
    await page.locator('[data-testid="ticket-form-body"]').fill('body')
    await page.click('[role="dialog"] button:has-text("Create")')
    await expect(cardFor(page, title)).toBeVisible()
  }

  const bugTitle = `Login bug ${stamp}`
  const featureTitle = `Login feature ${stamp}`
  const otherBugTitle = `Unrelated bug ${stamp}`
  await quickCreate('bug', bugTitle)
  await quickCreate('feature', featureTitle)
  await quickCreate('bug', otherBugTitle)

  // select #0 is the page-level TeamSelector, #1 is the type filter.
  await page.locator('select').nth(1).selectOption('bug')
  await page.fill('input[placeholder="Search title…"]', 'Login')

  await expect(cardFor(page, bugTitle)).toBeVisible()
  await expect(cardFor(page, featureTitle)).toHaveCount(0)
  await expect(cardFor(page, otherBugTitle)).toHaveCount(0)
})

test('the epic filter has a dedicated "No epic" option', async ({ page }) => {
  const email = `e2e-board-no-epic-filter-${Date.now()}@example.com`
  await signUpVerifyAndLogIn(page, email, 'correcthorse123')

  const teamName = `E2E Board No Epic Filter Team ${Date.now()}`
  const epicTitle = `E2E Board No Epic Filter Epic ${Date.now()}`
  await createTeam(page, teamName)

  await page.click('nav >> text=Epics')
  await page.selectOption('select', { label: teamName })
  await page.click('button:has-text("Create epic")')
  await page.fill('[role="dialog"] input[placeholder="Epic title"]', epicTitle)
  await page.click('[role="dialog"] button:has-text("Create")')
  await expect(page.locator('li', { hasText: epicTitle })).toBeVisible()

  await goToBoardFor(page, teamName)

  const withEpicTitle = `Has Epic ${Date.now()}`
  const noEpicTitle = `No Epic ${Date.now()}`
  await createTicketFromBoard(page, noEpicTitle)

  await page.click('button:has-text("Create ticket")')
  await page.fill('[role="dialog"] input[placeholder="Ticket title"]', withEpicTitle)
  await page.locator('[role="dialog"] label:has-text("Epic") + select').selectOption({ label: epicTitle })
  await page.locator('[data-testid="ticket-form-body"]').fill('body')
  await page.click('[role="dialog"] button:has-text("Create")')
  await expect(cardFor(page, withEpicTitle)).toBeVisible()

  // select #2 is the epic filter (0: team, 1: type, 2: epic).
  await page.locator('select').nth(2).selectOption({ label: 'No epic' })

  await expect(cardFor(page, noEpicTitle)).toBeVisible()
  await expect(cardFor(page, withEpicTitle)).toHaveCount(0)
})
