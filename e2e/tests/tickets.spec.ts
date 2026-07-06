import { expect, type Page, test } from '@playwright/test'
import { signUpVerifyAndLogIn } from '../helpers/auth'

// Teams/epics/tickets are shared global lists (no per-user scoping). Every interaction is scoped
// to this test's own row by name/title (see teams.spec.ts / epics.spec.ts for the same pattern),
// and the suite runs single-worker (playwright.config.ts) since there's no per-test tenancy.

async function createTeam(page: Page, name: string) {
  await page.click('nav >> text=Teams')
  await expect(page).toHaveURL(/\/teams/)
  await page.fill('input[placeholder="New team name"]', name)
  await page.click('button:has-text("Create")')
  await expect(page.locator('li', { hasText: name })).toBeVisible()
}

async function createEpic(page: Page, teamName: string, title: string) {
  await page.click('nav >> text=Epics')
  await expect(page).toHaveURL(/\/epics/)
  await page.selectOption('select', { label: teamName })
  await page.fill('input[placeholder="New epic title"]', title)
  await page.click('button:has-text("Create")')
  await expect(page.locator('li', { hasText: title })).toBeVisible()
}

async function goToTicketsFor(page: Page, teamName: string) {
  await page.click('nav >> text=Tickets')
  await expect(page).toHaveURL(/\/tickets/)
  await page.selectOption('select', { label: teamName })
}

test('create, edit, patch state, and delete a ticket', async ({ page }) => {
  const email = `e2e-tickets-${Date.now()}@example.com`
  await signUpVerifyAndLogIn(page, email, 'correcthorse123')

  const teamName = `E2E Ticket Team ${Date.now()}`
  await createTeam(page, teamName)
  await goToTicketsFor(page, teamName)

  const title = `E2E Ticket ${Date.now()}`
  await page.click('button:has-text("Create ticket")')
  await page.fill('input[placeholder="Ticket title"]', title)
  await page.locator('[data-testid="ticket-form-body"]').fill('Initial body')
  await page.click('button:has-text("Create")')

  const row = page.locator('li', { hasText: title })
  await expect(row).toBeVisible()
  await expect(row.getByText('bug', { exact: true })).toBeVisible() // default type
  await expect(row.getByText('New', { exact: true })).toBeVisible() // default state, human label

  // Edit: change title, and jump state directly from "new" to "done" (no sequence enforcement).
  await row.click()
  const renamedTitle = `${title} Renamed`
  await page.fill('input[placeholder="Ticket title"]', renamedTitle)
  const stateSelect = page.locator('label:has-text("State") + select')
  await stateSelect.selectOption({ label: 'Done' })
  await page.click('button:has-text("Save")')

  const renamedRow = page.locator('li', { hasText: renamedTitle })
  await expect(renamedRow).toBeVisible()
  await expect(renamedRow.getByText('Done', { exact: true })).toBeVisible()

  // No-op resubmit must not advance updatedAt — capture it, save unchanged, compare.
  await renamedRow.click()
  const updatedAtBefore = await page.locator('text=Updated at:').textContent()
  await page.click('button:has-text("Save")')
  await renamedRow.click()
  const updatedAtAfter = await page.locator('text=Updated at:').textContent()
  expect(updatedAtAfter).toBe(updatedAtBefore)
  await page.click('button:has-text("Cancel")')

  // Delete, confirming the browser dialog.
  page.once('dialog', (dialog) => dialog.accept())
  await renamedRow.getByRole('button', { name: 'Delete' }).click()
  await expect(page.locator('li', { hasText: renamedTitle })).toHaveCount(0)
})

test('team-change-clears-epic in the ticket form', async ({ page }) => {
  const email = `e2e-tickets-clear-epic-${Date.now()}@example.com`
  await signUpVerifyAndLogIn(page, email, 'correcthorse123')

  const teamA = `E2E Clear Epic Team A ${Date.now()}`
  const teamB = `E2E Clear Epic Team B ${Date.now()}`
  await createTeam(page, teamA)
  await createTeam(page, teamB)
  const epicTitle = `E2E Clear Epic ${Date.now()}`
  await createEpic(page, teamA, epicTitle)

  await goToTicketsFor(page, teamA)
  await page.click('button:has-text("Create ticket")')

  // Select team A's epic in the form.
  const epicSelect = page.locator('label:has-text("Epic") + select')
  await epicSelect.selectOption({ label: epicTitle })
  await expect(epicSelect).toHaveValue(/.+/)

  // Switching the form's team to B must clear the epic selection back to "No epic" immediately.
  const teamSelect = page.locator('label:has-text("Team") + select')
  await teamSelect.selectOption({ label: teamB })
  await expect(epicSelect).toHaveValue('')

  // Team A's epic must not even be an option once scoped to team B (dropdown re-scoped, not just cleared).
  await expect(epicSelect.locator('option', { hasText: epicTitle })).toHaveCount(0)
})

test('filters combine with AND logic', async ({ page }) => {
  const email = `e2e-tickets-filter-${Date.now()}@example.com`
  await signUpVerifyAndLogIn(page, email, 'correcthorse123')

  const teamName = `E2E Filter Team ${Date.now()}`
  await createTeam(page, teamName)
  await goToTicketsFor(page, teamName)

  const stamp = Date.now()
  async function quickCreate(type: 'bug' | 'feature' | 'fix', title: string) {
    await page.click('button:has-text("Create ticket")')
    await page.fill('input[placeholder="Ticket title"]', title)
    await page.locator('label:has-text("Type") + select').selectOption(type)
    await page.locator('[data-testid="ticket-form-body"]').fill('body')
    await page.click('button:has-text("Create")')
    await expect(page.locator('li', { hasText: title })).toBeVisible()
  }

  const bugTitle = `Login bug ${stamp}`
  const featureTitle = `Login feature ${stamp}`
  const otherBugTitle = `Unrelated bug ${stamp}`
  await quickCreate('bug', bugTitle)
  await quickCreate('feature', featureTitle)
  await quickCreate('bug', otherBugTitle)

  // type=bug AND q="login" must match only the bug ticket with "Login" in the title.
  // select #0 on the page is the page-level TeamSelector, #1 is the type filter.
  await page.locator('select').nth(1).selectOption('bug')
  await page.fill('input[placeholder="Search title…"]', 'Login')

  await expect(page.locator('li', { hasText: bugTitle })).toBeVisible()
  await expect(page.locator('li', { hasText: featureTitle })).toHaveCount(0)
  await expect(page.locator('li', { hasText: otherBugTitle })).toHaveCount(0)
})

test('a team with tickets cannot be deleted', async ({ page }) => {
  const email = `e2e-tickets-team-guard-${Date.now()}@example.com`
  await signUpVerifyAndLogIn(page, email, 'correcthorse123')

  const teamName = `E2E Ticket Guard Team ${Date.now()}`
  await createTeam(page, teamName)
  await goToTicketsFor(page, teamName)

  await page.click('button:has-text("Create ticket")')
  await page.fill('input[placeholder="Ticket title"]', 'Blocking ticket')
  await page.locator('[data-testid="ticket-form-body"]').fill('body')
  await page.click('button:has-text("Create")')
  await expect(page.locator('li', { hasText: 'Blocking ticket' })).toBeVisible()

  await page.click('nav >> text=Teams')
  const teamRow = page.locator('li', { hasText: teamName })
  page.once('dialog', (dialog) => dialog.accept())
  await teamRow.getByRole('button', { name: 'Delete' }).click()
  await expect(teamRow.getByText('still has tickets')).toBeVisible()
  await expect(teamRow).toBeVisible()
})

test('opening a different ticket for edit does not carry over stale form state (regression)', async ({ page }) => {
  const email = `e2e-tickets-stale-form-${Date.now()}@example.com`
  await signUpVerifyAndLogIn(page, email, 'correcthorse123')

  const teamName = `E2E Stale Form Team ${Date.now()}`
  await createTeam(page, teamName)
  await goToTicketsFor(page, teamName)

  const titleA = `Ticket A ${Date.now()}`
  const titleB = `Ticket B ${Date.now()}`
  for (const t of [titleA, titleB]) {
    await page.click('button:has-text("Create ticket")')
    await page.fill('input[placeholder="Ticket title"]', t)
    await page.locator('[data-testid="ticket-form-body"]').fill(`body for ${t}`)
    await page.click('button:has-text("Create")')
    await expect(page.locator('li', { hasText: t })).toBeVisible()
  }

  // Open A for edit, then — WITHOUT saving or cancelling — click B's row directly.
  await page.locator('li', { hasText: titleA }).click()
  await expect(page.locator('input[placeholder="Ticket title"]')).toHaveValue(titleA)
  await page.locator('li', { hasText: titleB }).click()

  // The form must now show B's values, not A's stale ones.
  await expect(page.locator('input[placeholder="Ticket title"]')).toHaveValue(titleB)
})

// page.request shares the browser context's cookie jar, but this app's access token lives in an
// in-memory JS closure (frontend/src/api/tokenStore.ts), not a cookie — so page.request calls are
// unauthenticated by default. Log in again via the API directly to get a token these calls can use.
async function apiLogIn(page: Page, email: string, password: string): Promise<string> {
  const res = await page.request.post('/api/v1/auth/login', { data: { email, password } })
  const body = await res.json()
  return body.data.accessToken as string
}

test('an invalid type filter value is rejected with 400, not a server error', async ({ page }) => {
  const email = `e2e-tickets-badfilter-${Date.now()}@example.com`
  const password = 'correcthorse123'
  await signUpVerifyAndLogIn(page, email, password)

  const teamName = `E2E Bad Filter Team ${Date.now()}`
  await createTeam(page, teamName)

  const accessToken = await apiLogIn(page, email, password)
  const authHeaders = { Authorization: `Bearer ${accessToken}` }

  const teamsRes = await page.request.get('/api/v1/teams', { headers: authHeaders })
  const teams = (await teamsRes.json()).data as { id: string; name: string }[]
  const team = teams.find((t) => t.name === teamName)!

  const res = await page.request.get(`/api/v1/teams/${team.id}/tickets?type=Bug`, { headers: authHeaders })
  expect(res.status()).toBe(400)
  const body = await res.json()
  expect(body.success).toBe(false)
})

test('a ticket cannot reference an epic from a different team (backend-enforced)', async ({ page }) => {
  const email = `e2e-tickets-cross-team-${Date.now()}@example.com`
  const password = 'correcthorse123'
  await signUpVerifyAndLogIn(page, email, password)

  const teamAName = `E2E XTeam A ${Date.now()}`
  const teamBName = `E2E XTeam B ${Date.now()}`
  await createTeam(page, teamAName)
  await createTeam(page, teamBName)
  const epicTitle = `E2E XTeam Epic ${Date.now()}`
  await createEpic(page, teamAName, epicTitle)

  const accessToken = await apiLogIn(page, email, password)
  const authHeaders = { Authorization: `Bearer ${accessToken}` }

  const teamsRes = await page.request.get('/api/v1/teams', { headers: authHeaders })
  const teams = (await teamsRes.json()).data as { id: string; name: string }[]
  const teamA = teams.find((t) => t.name === teamAName)!
  const teamB = teams.find((t) => t.name === teamBName)!

  const epicsRes = await page.request.get(`/api/v1/teams/${teamA.id}/epics`, { headers: authHeaders })
  const epics = (await epicsRes.json()).data as { id: string; title: string }[]
  const epic = epics.find((e) => e.title === epicTitle)!

  // The UI can never form this combination (the epic dropdown is scoped to the form's own team) —
  // this exercises the backend's own rejection directly, bypassing the UI entirely.
  const res = await page.request.post(`/api/v1/teams/${teamB.id}/tickets`, {
    headers: authHeaders,
    data: { type: 'bug', title: 'Cross-team attempt', body: 'body', epicId: epic.id },
  })
  expect(res.status()).toBe(400)
  const body = await res.json()
  expect(body.success).toBe(false)
  expect(body.error.code).toBe('EPIC_TEAM_MISMATCH')
})
