import { expect, type Page, test } from '@playwright/test'
import { signUpVerifyAndLogIn } from '../helpers/auth'

// Teams/epics/tickets/comments are shared global lists (no per-user scoping). Every interaction is
// scoped to this test's own row/ticket by name/title, and the suite runs single-worker
// (playwright.config.ts) since there's no per-test tenancy.

async function createTeam(page: Page, name: string) {
  await page.click('nav >> text=Teams')
  await expect(page).toHaveURL(/\/teams/)
  await page.click('button:has-text("Create team")')
  await page.fill('[role="dialog"] input[placeholder="Team name"]', name)
  await page.click('[role="dialog"] button:has-text("Create")')
  await expect(page.locator('li', { hasText: name })).toBeVisible()
}

async function goToTicketsFor(page: Page, teamName: string) {
  await page.click('nav >> text=Tickets')
  await expect(page).toHaveURL(/\/tickets/)
  await page.selectOption('select', { label: teamName })
}

async function createTicket(page: Page, title: string) {
  await page.click('button:has-text("Create ticket")')
  await page.fill('[role="dialog"] input[placeholder="Ticket title"]', title)
  await page.locator('[data-testid="ticket-form-body"]').fill('body')
  await page.click('[role="dialog"] button:has-text("Create")')
  await expect(page.locator('li', { hasText: title })).toBeVisible()
}

async function addComment(page: Page, body: string) {
  await page.locator('[role="dialog"] [data-testid="comment-body"]').fill(body)
  await page.click('[role="dialog"] button:has-text("Add comment")')
}

async function apiLogIn(page: Page, email: string, password: string): Promise<string> {
  const res = await page.request.post('/api/v1/auth/login', { data: { email, password } })
  const body = await res.json()
  return body.data.accessToken as string
}

test('add comments to a ticket; they render oldest-first and clear the composer', async ({ page }) => {
  const email = `e2e-comments-${Date.now()}@example.com`
  await signUpVerifyAndLogIn(page, email, 'correcthorse123')

  const teamName = `E2E Comment Team ${Date.now()}`
  const ticketTitle = `E2E Comment Ticket ${Date.now()}`
  await createTeam(page, teamName)
  await goToTicketsFor(page, teamName)
  await createTicket(page, ticketTitle)

  await page.locator('li', { hasText: ticketTitle }).click()
  await expect(page.locator('[role="dialog"]').getByRole('heading', { name: 'Comments' })).toBeVisible()
  await expect(page.locator('[role="dialog"]').getByText('No comments yet.')).toBeVisible()

  await addComment(page, 'First comment')
  const commentList = page.locator('[role="dialog"] ul li')
  await expect(commentList).toHaveCount(1)
  await expect(commentList.first()).toContainText('First comment')
  await expect(commentList.first()).toContainText(email)
  // Composer clears on success.
  await expect(page.locator('[role="dialog"] [data-testid="comment-body"]')).toHaveValue('')

  await addComment(page, 'Second comment')
  await expect(commentList).toHaveCount(2)
  // Oldest first: the first comment stays on top, the new one is appended at the bottom.
  await expect(commentList.nth(0)).toContainText('First comment')
  await expect(commentList.nth(1)).toContainText('Second comment')

  await page.click('[role="dialog"] button:has-text("Cancel")')
})

test('an empty comment is rejected client-side and never reaches the list', async ({ page }) => {
  const email = `e2e-comments-empty-${Date.now()}@example.com`
  await signUpVerifyAndLogIn(page, email, 'correcthorse123')

  const teamName = `E2E Comment Empty Team ${Date.now()}`
  const ticketTitle = `E2E Comment Empty Ticket ${Date.now()}`
  await createTeam(page, teamName)
  await goToTicketsFor(page, teamName)
  await createTicket(page, ticketTitle)

  await page.locator('li', { hasText: ticketTitle }).click()
  await addComment(page, '   ')
  await expect(page.locator('[role="dialog"]').getByText('Comment cannot be empty.')).toBeVisible()
  await expect(page.locator('[role="dialog"]').getByText('No comments yet.')).toBeVisible()
})

test('adding a comment does not change the parent ticket updatedAt (API-verified)', async ({ page }) => {
  const email = `e2e-comments-noop-${Date.now()}@example.com`
  const password = 'correcthorse123'
  await signUpVerifyAndLogIn(page, email, password)

  const teamName = `E2E Comment Noop Team ${Date.now()}`
  const ticketTitle = `E2E Comment Noop Ticket ${Date.now()}`
  await createTeam(page, teamName)
  await goToTicketsFor(page, teamName)
  await createTicket(page, ticketTitle)

  const accessToken = await apiLogIn(page, email, password)
  const authHeaders = { Authorization: `Bearer ${accessToken}` }

  const teamsRes = await page.request.get('/api/v1/teams', { headers: authHeaders })
  const teams = (await teamsRes.json()).data as { id: string; name: string }[]
  const team = teams.find((t) => t.name === teamName)!
  const ticketsRes = await page.request.get(`/api/v1/teams/${team.id}/tickets`, { headers: authHeaders })
  const tickets = (await ticketsRes.json()).data as { id: string; title: string; updatedAt: string }[]
  const ticket = tickets.find((t) => t.title === ticketTitle)!

  const beforeRes = await page.request.get(`/api/v1/tickets/${ticket.id}`, { headers: authHeaders })
  const before = (await beforeRes.json()).data as { updatedAt: string }

  const createRes = await page.request.post(`/api/v1/tickets/${ticket.id}/comments`, {
    headers: authHeaders,
    data: { body: 'Does not touch the ticket' },
  })
  expect(createRes.status()).toBe(201)

  const afterRes = await page.request.get(`/api/v1/tickets/${ticket.id}`, { headers: authHeaders })
  const after = (await afterRes.json()).data as { updatedAt: string }
  expect(after.updatedAt).toBe(before.updatedAt)
})

test('comment author is always the authenticated caller, never a client-supplied value', async ({ page }) => {
  const email = `e2e-comments-author-${Date.now()}@example.com`
  const password = 'correcthorse123'
  await signUpVerifyAndLogIn(page, email, password)

  const teamName = `E2E Comment Author Team ${Date.now()}`
  const ticketTitle = `E2E Comment Author Ticket ${Date.now()}`
  await createTeam(page, teamName)
  await goToTicketsFor(page, teamName)
  await createTicket(page, ticketTitle)

  const accessToken = await apiLogIn(page, email, password)
  const authHeaders = { Authorization: `Bearer ${accessToken}` }

  const teamsRes = await page.request.get('/api/v1/teams', { headers: authHeaders })
  const teams = (await teamsRes.json()).data as { id: string; name: string }[]
  const team = teams.find((t) => t.name === teamName)!
  const ticketsRes = await page.request.get(`/api/v1/teams/${team.id}/tickets`, { headers: authHeaders })
  const tickets = (await ticketsRes.json()).data as { id: string; title: string }[]
  const ticket = tickets.find((t) => t.title === ticketTitle)!

  // Attempt to spoof a different author via the request body — the server must ignore it and use
  // the JWT's own subject claim instead.
  const res = await page.request.post(`/api/v1/tickets/${ticket.id}/comments`, {
    headers: authHeaders,
    data: { body: 'Spoof attempt', authorId: '00000000-0000-0000-0000-000000000000', author: 'someone-else@example.com' },
  })
  expect(res.status()).toBe(201)
  const created = (await res.json()).data as { author: { email: string } }
  expect(created.author.email).toBe(email)
})

test('deleting a ticket cascades to its comments', async ({ page }) => {
  const email = `e2e-comments-cascade-${Date.now()}@example.com`
  const password = 'correcthorse123'
  await signUpVerifyAndLogIn(page, email, password)

  const teamName = `E2E Comment Cascade Team ${Date.now()}`
  const ticketTitle = `E2E Comment Cascade Ticket ${Date.now()}`
  await createTeam(page, teamName)
  await goToTicketsFor(page, teamName)
  await createTicket(page, ticketTitle)

  const accessToken = await apiLogIn(page, email, password)
  const authHeaders = { Authorization: `Bearer ${accessToken}` }

  const teamsRes = await page.request.get('/api/v1/teams', { headers: authHeaders })
  const teams = (await teamsRes.json()).data as { id: string; name: string }[]
  const team = teams.find((t) => t.name === teamName)!
  const ticketsRes = await page.request.get(`/api/v1/teams/${team.id}/tickets`, { headers: authHeaders })
  const tickets = (await ticketsRes.json()).data as { id: string; title: string }[]
  const ticket = tickets.find((t) => t.title === ticketTitle)!

  const commentRes = await page.request.post(`/api/v1/tickets/${ticket.id}/comments`, {
    headers: authHeaders,
    data: { body: 'About to be cascaded away' },
  })
  expect(commentRes.status()).toBe(201)

  const deleteRes = await page.request.delete(`/api/v1/tickets/${ticket.id}`, { headers: authHeaders })
  expect(deleteRes.status()).toBe(200)

  // The ticket (and, by the ON DELETE CASCADE FK, its comments) is gone — the comments endpoint
  // now 404s on the missing ticket rather than returning an orphaned/empty list.
  const commentsAfterRes = await page.request.get(`/api/v1/tickets/${ticket.id}/comments`, { headers: authHeaders })
  expect(commentsAfterRes.status()).toBe(404)
})
