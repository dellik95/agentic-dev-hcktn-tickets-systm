import { expect, test } from '@playwright/test'
import { signUpVerifyAndLogIn } from '../helpers/auth'

test('sign up, verify email, log in, log out, and the board redirects when logged out', async ({ page }) => {
  const email = `e2e-auth-${Date.now()}@example.com`
  const password = 'correcthorse123'

  await signUpVerifyAndLogIn(page, email, password)
  await expect(page.getByText(`Logged in as ${email}`)).toBeVisible()

  await page.click('text=Log out')
  await expect(page).toHaveURL(/\/login/);

  // Protected route redirects an unauthenticated visitor straight back to /login.
  await page.goto('/');
  await expect(page).toHaveURL(/\/login/);
})

test('logging in before verifying shows the resend option instead of a generic error', async ({ page }) => {
  const email = `e2e-unverified-${Date.now()}@example.com`
  const password = 'correcthorse123'

  await page.goto('/signup')
  await page.fill('#email', email)
  await page.fill('#password', password)
  await page.click('button[type=submit]')
  await expect(page.getByText('Check your email')).toBeVisible()

  await page.goto('/login')
  await page.fill('#email', email)
  await page.fill('#password', password)
  await page.click('button[type=submit]')

  await expect(page.getByText('Please verify your email before logging in.')).toBeVisible()
  await expect(page.getByText('Resend verification email')).toBeVisible()
})
