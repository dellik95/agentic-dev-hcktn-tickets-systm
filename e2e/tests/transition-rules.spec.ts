import { expect, type Page, test } from '@playwright/test'
import { signUpVerifyAndLogIn } from '../helpers/auth'

// Configurable ticket state-transition rules: an empty rule set means unrestricted (today's
// default), and checking at least one box in the Workflow Settings matrix restricts the board's
// per-card status dropdown to only the checked transitions, enforced server-side too. Every test
// resets back to unrestricted afterward so it never leaks a restriction into a later test sharing
// this global (non-tenanted) setting.

async function goToWorkflowSettings(page: Page) {
  await page.click('nav >> text=Workflow Settings')
  await expect(page.getByRole('heading', { name: 'Workflow Settings' })).toBeVisible()
}

async function resetToUnrestricted(page: Page) {
  await goToWorkflowSettings(page)
  await page.click('button:has-text("Reset to unrestricted")')
  await expect(page.getByText('Reset to unrestricted — every transition is now allowed.')).toBeVisible()
}

test.afterEach(async ({ page }) => {
  await resetToUnrestricted(page)
})

test('an empty rule set leaves every transition allowed on the board dropdown', async ({ page }) => {
  const email = `e2e-transitions-default-${Date.now()}@example.com`
  await signUpVerifyAndLogIn(page, email, 'correcthorse123')

  const teamName = `E2E Transitions Default Team ${Date.now()}`
  const ticketTitle = `E2E Transitions Default Ticket ${Date.now()}`

  await page.click('nav >> text=Teams')
  await page.click('button:has-text("Create team")')
  await page.fill('[role="dialog"] input[placeholder="Team name"]', teamName)
  await page.click('[role="dialog"] button:has-text("Create")')
  await expect(page.locator('li', { hasText: teamName })).toBeVisible()

  await page.click('nav >> text=Board')
  await page.selectOption('select', { label: teamName })
  await page.click('button:has-text("Create ticket")')
  await page.fill('[role="dialog"] input[placeholder="Ticket title"]', ticketTitle)
  await page.locator('[data-testid="ticket-form-body"]').fill('body')
  await page.click('[role="dialog"] button:has-text("Create")')

  const card = page.locator('[data-testid^="board-card-"]', { hasText: ticketTitle })
  await expect(card).toBeVisible()
  const statusSelect = card.locator('select')
  const optionCount = await statusSelect.locator('option').count()
  expect(optionCount).toBe(5)
})

test('checking one transition restricts the board dropdown to it, and the server rejects the rest', async ({
  page,
}) => {
  const email = `e2e-transitions-restrict-${Date.now()}@example.com`
  const password = 'correcthorse123'
  await signUpVerifyAndLogIn(page, email, password)

  const teamName = `E2E Transitions Restrict Team ${Date.now()}`
  const ticketTitle = `E2E Transitions Restrict Ticket ${Date.now()}`

  await page.click('nav >> text=Teams')
  await page.click('button:has-text("Create team")')
  await page.fill('[role="dialog"] input[placeholder="Team name"]', teamName)
  await page.click('[role="dialog"] button:has-text("Create")')
  await expect(page.locator('li', { hasText: teamName })).toBeVisible()

  await page.click('nav >> text=Board')
  await page.selectOption('select', { label: teamName })
  await page.click('button:has-text("Create ticket")')
  await page.fill('[role="dialog"] input[placeholder="Ticket title"]', ticketTitle)
  await page.locator('[data-testid="ticket-form-body"]').fill('body')
  await page.click('[role="dialog"] button:has-text("Create")')
  const card = page.locator('[data-testid^="board-card-"]', { hasText: ticketTitle })
  await expect(card).toBeVisible()

  // Allow only New -> In Progress.
  await goToWorkflowSettings(page)
  await page.getByRole('checkbox', { name: 'Allow New to In Progress' }).check()
  await page.click('button:has-text("Save")')
  await expect(page.getByText('Transition rules saved.')).toBeVisible()

  await page.click('nav >> text=Board')
  await page.selectOption('select', { label: teamName })
  await expect(card).toBeVisible()

  // The dropdown now offers only the ticket's own current state (New, a no-op) plus In Progress.
  const statusSelect = card.locator('select')
  const values = await statusSelect.locator('option').evaluateAll((options) => options.map((o) => (o as HTMLOptionElement).value))
  expect(values.sort()).toEqual(['in_progress', 'new'])

  // Backend enforcement, independent of the UI: a disallowed transition is rejected outright.
  const accessToken = await (
    await page.request.post('/api/v1/auth/login', { data: { email, password } })
  ).json()
  const authHeaders = { Authorization: `Bearer ${accessToken.data.accessToken}` }
  const teamsRes = await page.request.get('/api/v1/teams', { headers: authHeaders })
  const teams = (await teamsRes.json()).data as { id: string; name: string }[]
  const team = teams.find((t) => t.name === teamName)!
  const ticketsRes = await page.request.get(`/api/v1/teams/${team.id}/tickets`, { headers: authHeaders })
  const tickets = (await ticketsRes.json()).data as { id: string; title: string }[]
  const ticket = tickets.find((t) => t.title === ticketTitle)!

  const rejectedRes = await page.request.patch(`/api/v1/tickets/${ticket.id}/state`, {
    headers: authHeaders,
    data: { state: 'done' },
  })
  expect(rejectedRes.status()).toBe(409)
  const rejectedBody = await rejectedRes.json()
  expect(rejectedBody.error.code).toBe('INVALID_STATE_TRANSITION')

  const allowedRes = await page.request.patch(`/api/v1/tickets/${ticket.id}/state`, {
    headers: authHeaders,
    data: { state: 'in_progress' },
  })
  expect(allowedRes.status()).toBe(200)
})

test('a duplicate transition pair is rejected with 400 when saving rules', async ({ page }) => {
  const email = `e2e-transitions-duplicate-${Date.now()}@example.com`
  const password = 'correcthorse123'
  await signUpVerifyAndLogIn(page, email, password)

  const accessToken = await (
    await page.request.post('/api/v1/auth/login', { data: { email, password } })
  ).json()
  const authHeaders = { Authorization: `Bearer ${accessToken.data.accessToken}` }

  const res = await page.request.put('/api/v1/ticket-state-transition-rules', {
    headers: authHeaders,
    data: {
      rules: [
        { fromState: 'new', toState: 'done' },
        { fromState: 'new', toState: 'done' },
      ],
    },
  })
  expect(res.status()).toBe(400)
  const body = await res.json()
  expect(body.success).toBe(false)
})
