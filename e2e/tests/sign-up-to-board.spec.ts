import { expect, test } from '@playwright/test'
import { signUpVerifyAndLogIn } from '../helpers/auth'

// EPIC-08 T08.5 — the project's single strongest end-to-end signal that all three tiers (frontend,
// API, database) are wired together correctly: sign up, verify via Mailpit's HTTP API (not by
// parsing UI email content), log in, create a team, an epic, and a ticket, drag it to another
// column, and confirm the move survives a full page refresh (i.e. it's server-persisted, not
// client-only state). Each individual step also has its own focused coverage elsewhere in this
// suite — this test's job is to prove the whole chain works continuously in one pass, per
// docs/epics/EPIC-08-testing-quality-nfr.md T08.5.
test('sign-up to board: full golden path from a brand-new account to a persisted drag', async ({ page }) => {
  const email = `e2e-golden-path-${Date.now()}@example.com`
  await signUpVerifyAndLogIn(page, email, 'correcthorse123')

  const teamName = `E2E Golden Path Team ${Date.now()}`
  const epicTitle = `E2E Golden Path Epic ${Date.now()}`
  const ticketTitle = `E2E Golden Path Ticket ${Date.now()}`

  await page.click('nav >> text=Teams')
  await page.click('button:has-text("Create team")')
  await page.fill('[role="dialog"] input[placeholder="Team name"]', teamName)
  await page.click('[role="dialog"] button:has-text("Create")')
  await expect(page.locator('li', { hasText: teamName })).toBeVisible()

  await page.click('nav >> text=Epics')
  await page.selectOption('select', { label: teamName })
  await page.click('button:has-text("Create epic")')
  await page.fill('[role="dialog"] input[placeholder="Epic title"]', epicTitle)
  await page.click('[role="dialog"] button:has-text("Create")')
  await expect(page.locator('li', { hasText: epicTitle })).toBeVisible()

  await page.click('nav >> text=Board')
  await expect(page.getByRole('heading', { name: 'Board', level: 1 })).toBeVisible()
  await page.selectOption('select', { label: teamName })
  await page.click('button:has-text("Create ticket")')
  await page.fill('[role="dialog"] input[placeholder="Ticket title"]', ticketTitle)
  await page.locator('[role="dialog"] label:has-text("Epic") + select').selectOption({ label: epicTitle })
  await page.locator('[data-testid="ticket-form-body"]').fill('End-to-end golden path body')
  await page.click('[role="dialog"] button:has-text("Create")')

  const card = page.locator('[data-testid^="board-card-"]', { hasText: ticketTitle })
  await expect(card).toBeVisible()

  const targetColumn = page.locator('[data-testid="board-column-in_progress"]')
  const cardBox = await card.boundingBox()
  const targetBox = await targetColumn.boundingBox()
  if (!cardBox || !targetBox) throw new Error('Could not measure card/column for drag')

  const patchResponse = page.waitForResponse(
    (res) => /\/api\/v1\/tickets\/.+\/state$/.test(res.url()) && res.request().method() === 'PATCH',
  )
  await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(targetBox.x + targetBox.width / 2, cardBox.y + cardBox.height / 2, { steps: 10 })
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + 20, { steps: 10 })
  await page.mouse.up()
  await patchResponse

  await expect(targetColumn).toContainText(ticketTitle)

  // The move is server-persisted, not client-only state — it must survive a full reload.
  await page.reload()
  await expect(page.locator('[data-testid="board-column-in_progress"]')).toContainText(ticketTitle)
})
