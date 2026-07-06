const MAILPIT_URL = process.env.MAILPIT_URL ?? 'http://localhost:8025'

interface MailpitMessage {
  ID: string
  To: { Address: string }[]
}

export async function getVerificationToken(email: string): Promise<string> {
  const message = await findMessage(email, () => true)
  if (!message) throw new Error(`No verification email found for ${email}`)
  return extractToken(message.ID)
}

// A password-reset request can land in the same inbox as an earlier signup-verification email to
// the same address — filtering on the reset link's own path (not just "addressed to this email")
// keeps this from grabbing the wrong message's token regardless of Mailpit's list ordering.
export async function getPasswordResetToken(email: string): Promise<string> {
  const message = await findMessage(email, (html) => html.includes('reset-password'))
  if (!message) throw new Error(`No password reset email found for ${email}`)
  return extractToken(message.ID)
}

async function findMessage(email: string, htmlMatches: (html: string) => boolean): Promise<MailpitMessage | undefined> {
  const listRes = await fetch(`${MAILPIT_URL}/api/v1/messages`)
  const list = (await listRes.json()) as { messages: MailpitMessage[] }
  const candidates = list.messages.filter((m) => m.To[0]?.Address === email)

  for (const candidate of candidates) {
    const fullRes = await fetch(`${MAILPIT_URL}/api/v1/message/${candidate.ID}`)
    const full = (await fullRes.json()) as { HTML: string }
    if (htmlMatches(full.HTML)) return candidate
  }
  return undefined
}

async function extractToken(messageId: string): Promise<string> {
  const fullRes = await fetch(`${MAILPIT_URL}/api/v1/message/${messageId}`)
  const full = (await fullRes.json()) as { HTML: string }
  const match = full.HTML.match(/token=([^"&]+)/)
  if (!match) throw new Error('No token found in email HTML')
  return match[1]
}
