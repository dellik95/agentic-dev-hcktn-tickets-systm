import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { getVerificationToken } from './mailpit'

export async function signUpVerifyAndLogIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/signup')
  await page.fill('#email', email)
  await page.fill('#password', password)
  await page.click('button[type=submit]')
  await expect(page.getByText('Check your email')).toBeVisible()

  const token = await getVerificationToken(email)
  await page.goto(`/verify-email?token=${token}`)
  await expect(page.getByText('Email verified')).toBeVisible()

  await page.click('text=Go to login')
  await page.fill('#email', email)
  await page.fill('#password', password)
  await page.click('button[type=submit]')
  await expect(page).toHaveURL('/')
}
