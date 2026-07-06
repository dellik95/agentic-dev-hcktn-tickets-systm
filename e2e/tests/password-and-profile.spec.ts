import { expect, type Page, test } from '@playwright/test'
import { signUpVerifyAndLogIn } from '../helpers/auth'
import { getPasswordResetToken } from '../helpers/mailpit'

// Waits for the actual forgot-password network round-trip to complete before asserting the
// confirmation screen, rather than relying solely on the default assertion-retry window — under a
// full-suite run this request can occasionally take longer than the usual few hundred ms, and a
// bare click-then-assert intermittently caught it mid-flight.
async function submitForgotPassword(page: Page, email: string) {
  await page.fill('#email', email)
  const response = page.waitForResponse((res) => res.url().includes('/auth/forgot-password'))
  await page.click('button:has-text("Send reset link")')
  await response
  await expect(page.getByText('Check your email')).toBeVisible()
}

test('forgot password -> reset via emailed link -> log in with the new password, old one rejected', async ({
  page,
}) => {
  const email = `e2e-forgot-${Date.now()}@example.com`
  const oldPassword = 'correcthorse123'
  const newPassword = 'newhorsebattery456'
  await signUpVerifyAndLogIn(page, email, oldPassword)

  await page.click('text=Log out')
  await expect(page).toHaveURL('/login')

  await page.click('text=Forgot password?')
  await expect(page).toHaveURL(/\/forgot-password/)
  await submitForgotPassword(page, email)

  const token = await getPasswordResetToken(email)
  await page.goto(`/reset-password?token=${token}`)
  await page.fill('#newPassword', newPassword)
  await page.fill('#confirmNewPassword', newPassword)
  await page.click('button:has-text("Reset password")')
  await expect(page.getByText('Your password has been changed.')).toBeVisible()

  await page.click('text=Go to login')
  await page.fill('#email', email)
  await page.fill('#password', oldPassword)
  await page.click('button[type=submit]')
  await expect(page.getByText('Invalid email or password.')).toBeVisible()

  await page.fill('#password', newPassword)
  await page.click('button[type=submit]')
  await expect(page).toHaveURL('/')
})

test('a used password reset token cannot be reused', async ({ page }) => {
  const email = `e2e-reset-reuse-${Date.now()}@example.com`
  const oldPassword = 'correcthorse123'
  const newPassword = 'newhorsebattery456'
  await signUpVerifyAndLogIn(page, email, oldPassword)
  await page.click('text=Log out')
  await expect(page).toHaveURL('/login')

  await page.click('text=Forgot password?')
  await submitForgotPassword(page, email)

  const token = await getPasswordResetToken(email)
  await page.goto(`/reset-password?token=${token}`)
  await page.fill('#newPassword', newPassword)
  await page.fill('#confirmNewPassword', newPassword)
  await page.click('button:has-text("Reset password")')
  await expect(page.getByText('Your password has been changed.')).toBeVisible()

  // Reusing the same link a second time must fail, not silently reset the password again.
  await page.goto(`/reset-password?token=${token}`)
  await page.fill('#newPassword', 'yetanotherpassword789')
  await page.fill('#confirmNewPassword', 'yetanotherpassword789')
  await page.click('button:has-text("Reset password")')
  await expect(page.getByText('This password reset link is invalid or has already been used.')).toBeVisible()
})

test('changing password from the profile page requires the correct current password', async ({ page }) => {
  const email = `e2e-change-pw-${Date.now()}@example.com`
  const oldPassword = 'correcthorse123'
  const newPassword = 'newhorsebattery456'
  await signUpVerifyAndLogIn(page, email, oldPassword)

  await page.click('nav >> text=Profile')
  await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible()

  await page.fill('#currentPassword', 'totally-wrong-password')
  await page.fill('#newPassword', newPassword)
  await page.fill('#confirmNewPassword', newPassword)
  await page.click('button:has-text("Change password")')
  await expect(page.getByText('The current password is incorrect.')).toBeVisible()

  await page.fill('#currentPassword', oldPassword)
  await page.click('button:has-text("Change password")')
  await expect(page.getByText('Password changed.')).toBeVisible()

  await page.click('text=Log out')
  await page.fill('#email', email)
  await page.fill('#password', newPassword)
  await page.click('button[type=submit]')
  await expect(page).toHaveURL('/')
})

test('uploading an avatar shows it on the profile page and in the header', async ({ page }) => {
  const email = `e2e-avatar-${Date.now()}@example.com`
  await signUpVerifyAndLogIn(page, email, 'correcthorse123')

  await page.click('nav >> text=Profile')
  await expect(page.getByText('No avatar')).toBeVisible()

  // A minimal valid 1x1 transparent PNG, tiny enough to stay well under the size limit.
  const tinyPngBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
  await page.setInputFiles('input[type=file]', {
    name: 'avatar.png',
    mimeType: 'image/png',
    buffer: Buffer.from(tinyPngBase64, 'base64'),
  })
  await page.click('button:has-text("Save avatar")')
  await expect(page.getByText('Avatar updated.')).toBeVisible()

  await expect(page.getByAltText('Avatar preview')).toBeVisible()
  await page.reload()
  await expect(page.getByAltText('Avatar preview')).toBeVisible()

  // The header also reflects it once loaded.
  await expect(page.locator('header img')).toBeVisible()
})
